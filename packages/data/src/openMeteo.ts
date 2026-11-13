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
import { fetchJson } from './http';
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
 * - `freezing_level_height`: altitud de la isoterma de 0 °C, en metros (comprobado 2026-11-13).
 * - `timeformat=unixtime` da instantes UTC en segundos, sin problemas de cambio de hora.
 */

export const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
export const OPEN_METEO_ATTRIBUTION = 'Datos meteorológicos de Open-Meteo.com (CC BY 4.0)';
export const FORECAST_DAYS = 14;
const DEFAULT_TIMEOUT_MS = 15_000;

const HOURLY = [
  'snowfall',
  'snow_depth',
  'temperature_2m',
  'wind_speed_10m',
  'wind_gusts_10m',
  'weather_code',
  'freezing_level_height',
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
  const freezing = column('freezing_level_height');

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
      freezingLevelM: numberOrNull(freezing[i]),
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
      const json = await fetchJson(
        buildForecastUrl(station),
        { doFetch, limiter, timeoutMs },
        request.signal,
      );
      return parseForecastResponse(json, station, now());
    },
  };
}
