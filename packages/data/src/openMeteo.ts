import {
  parseLengthUnit,
  toCm,
  type ElevationForecast,
  type HourlyPoint,
  type Station,
  type StationForecast,
} from '@snowview/core';
import { ForecastError } from './errors';
import type { ForecastProvider, ForecastRequestOptions } from './provider';
import { RateLimiter } from './rateLimiter';

/**
 * Cliente de Open-Meteo (https://open-meteo.com), sin clave de API.
 *
 * LICENCIA: el uso gratuito de la API es solo para fines no comerciales y los datos se publican
 * bajo CC BY 4.0 (hay que citar la fuente). Límites del uso gratuito: 600 llamadas por minuto,
 * 5.000 por hora y 10.000 por día. Ver README.md.
 *
 * Parámetros verificados en https://open-meteo.com/en/docs el 2026-11-12:
 * - `snowfall`: nieve de la hora anterior, en cm. `snow_depth`: grosor, en METROS.
 * - `elevation` admite una lista: se piden base y cima en una sola llamada (respuesta en lista).
 * - `timeformat=unixtime` da instantes UTC en segundos, sin problemas de cambio de hora.
 */

export const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
export const OPEN_METEO_ATTRIBUTION = 'Datos meteorológicos de Open-Meteo.com (CC BY 4.0)';
export const FORECAST_DAYS = 14;
const DEFAULT_TIMEOUT_MS = 15_000;
/** Si el proveedor responde 429 sin decir cuánto esperar. */
const DEFAULT_RATE_LIMIT_PAUSE_MS = 60_000;

const HOURLY = [
  'snowfall',
  'snow_depth',
  'temperature_2m',
  'wind_speed_10m',
  'wind_gusts_10m',
  'weather_code',
] as const;
type HourlyVar = (typeof HOURLY)[number];

export function buildForecastUrl(station: Station, days = FORECAST_DAYS): string {
  const lat = station.latitude.toString();
  const lon = station.longitude.toString();
  const params = new URLSearchParams({
    latitude: `${lat},${lat}`,
    longitude: `${lon},${lon}`,
    elevation: `${station.baseElevationM},${station.topElevationM}`,
    hourly: HOURLY.join(','),
    forecast_days: String(days),
    timeformat: 'unixtime',
    timezone: 'GMT',
    wind_speed_unit: 'kmh',
    temperature_unit: 'celsius',
  });
  return `${OPEN_METEO_URL}?${params.toString()}`;
}

interface RawLocation {
  elevation?: unknown;
  hourly_units?: Record<string, unknown>;
  hourly?: Record<string, unknown>;
}

function invalid(message: string): never {
  throw new ForecastError('invalid-data', message);
}

function numberOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Convierte una ubicación de la respuesta en horas normalizadas (nieve y grosor en cm). */
export function parseLocation(raw: RawLocation, requestedElevationM: number): ElevationForecast {
  const hourly = raw.hourly;
  const units = raw.hourly_units ?? {};
  if (!hourly || !Array.isArray(hourly.time)) invalid('La respuesta no trae horas (hourly.time).');
  const times = hourly.time as unknown[];
  if (times.length === 0) invalid('La respuesta trae 0 horas.');

  const column = (name: HourlyVar): unknown[] => {
    const values = hourly[name];
    if (values === undefined) return new Array<unknown>(times.length).fill(null); // dato incompleto
    if (!Array.isArray(values) || values.length !== times.length) {
      invalid(`La serie "${name}" no tiene tantas horas como "time".`);
    }
    return values;
  };

  const lengthUnit = (name: 'snowfall' | 'snow_depth') => {
    const raw = units[name];
    if (raw === undefined) return name === 'snowfall' ? 'cm' : 'm'; // unidades por defecto documentadas
    const unit = typeof raw === 'string' ? parseLengthUnit(raw) : null;
    if (!unit) invalid(`Unidad desconocida para "${name}": ${String(raw)}`);
    return unit;
  };

  const snowUnit = lengthUnit('snowfall');
  const depthUnit = lengthUnit('snow_depth');
  const snowfall = column('snowfall');
  const depth = column('snow_depth');
  const temp = column('temperature_2m');
  const wind = column('wind_speed_10m');
  const gust = column('wind_gusts_10m');
  const code = column('weather_code');

  const hours: HourlyPoint[] = times.map((t, i) => {
    if (typeof t !== 'number' || !Number.isFinite(t)) invalid(`Hora ${i} no válida.`);
    return {
      time: t * 1000,
      snowfallCm: toCm(numberOrNull(snowfall[i]), snowUnit),
      snowDepthCm: toCm(numberOrNull(depth[i]), depthUnit),
      temperatureC: numberOrNull(temp[i]),
      windKmh: numberOrNull(wind[i]),
      gustKmh: numberOrNull(gust[i]),
      weatherCode: numberOrNull(code[i]),
    };
  });

  return { elevationM: numberOrNull(raw.elevation) ?? requestedElevationM, hours };
}

/** Convierte la respuesta completa (lista de dos ubicaciones: base y cima). */
export function parseForecastResponse(
  json: unknown,
  station: Station,
  fetchedAt: number,
): StationForecast {
  if (typeof json === 'object' && json !== null && (json as { error?: unknown }).error === true) {
    throw new ForecastError(
      'provider',
      String((json as { reason?: unknown }).reason ?? 'Error del proveedor'),
    );
  }
  const list = Array.isArray(json) ? json : [json];
  if (list.length !== 2)
    invalid(`Se esperaban 2 ubicaciones (base y cima) y llegaron ${list.length}.`);
  const [base, top] = list as [RawLocation, RawLocation];
  return {
    stationId: station.id,
    fetchedAt,
    base: parseLocation(base, station.baseElevationM),
    top: parseLocation(top, station.topElevationM),
    attribution: OPEN_METEO_ATTRIBUTION,
  };
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

export interface OpenMeteoOptions {
  fetch?: typeof fetch;
  limiter?: RateLimiter;
  timeoutMs?: number;
  now?: () => number;
}

export function createOpenMeteoProvider(options: OpenMeteoOptions = {}): ForecastProvider {
  const doFetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  // 30 peticiones por minuto: de sobra para unas pocas favoritas, y 20 veces por debajo del límite.
  const limiter = options.limiter ?? new RateLimiter(30, 60_000);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const now = options.now ?? Date.now;

  return {
    id: 'open-meteo',
    attribution: OPEN_METEO_ATTRIBUTION,

    async getForecast(station: Station, request: ForecastRequestOptions = {}) {
      limiter.acquire();

      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      const onAbort = () => controller.abort();
      request.signal?.addEventListener('abort', onAbort, { once: true });

      let response: Response;
      try {
        response = await doFetch(buildForecastUrl(station), { signal: controller.signal });
      } catch (cause) {
        if (timedOut)
          throw new ForecastError('timeout', 'Open-Meteo no respondió a tiempo.', { cause });
        if (request.signal?.aborted)
          throw new ForecastError('aborted', 'Petición cancelada.', { cause });
        throw new ForecastError('offline', 'Sin conexión con Open-Meteo.', { cause });
      } finally {
        clearTimeout(timer);
        request.signal?.removeEventListener('abort', onAbort);
      }

      if (response.status === 429) {
        const retryAfterMs =
          parseRetryAfter(response.headers.get('Retry-After')) ?? DEFAULT_RATE_LIMIT_PAUSE_MS;
        limiter.pause(retryAfterMs);
        throw new ForecastError(
          'rate-limited',
          'Open-Meteo pide esperar antes de volver a consultar.',
          {
            status: 429,
            retryAfterMs,
          },
        );
      }

      let json: unknown;
      try {
        json = await response.json();
      } catch (cause) {
        throw new ForecastError(
          response.ok ? 'invalid-data' : 'provider',
          response.ok
            ? 'La respuesta no es JSON válido.'
            : `Open-Meteo respondió ${response.status}.`,
          { status: response.status, cause },
        );
      }

      if (!response.ok) {
        const reason = (json as { reason?: unknown } | null)?.reason;
        throw new ForecastError(
          'provider',
          typeof reason === 'string' ? reason : `Open-Meteo respondió ${response.status}.`,
          { status: response.status },
        );
      }

      return parseForecastResponse(json, station, now());
    },
  };
}
