import { parseLengthUnit, toCm, type DailySnowRecord, type Station } from '@snowview/core';
import { ForecastError } from './errors';
import { fetchJson } from './http';
import { RateLimiter } from './rateLimiter';

/**
 * Historial de nieve diaria con la API histórica de Open-Meteo (reanálisis ERA5 y similares).
 *
 * Parámetros verificados en https://open-meteo.com/en/docs/historical-weather-api el 2026-11-12:
 * - Endpoint `https://archive-api.open-meteo.com/v1/archive`; obligatorios `latitude`, `longitude`,
 *   `start_date` y `end_date` (AAAA-MM-DD).
 * - `daily=snowfall_sum` en cm. Con variables diarias, `timezone` es obligatorio: se usa la de la
 *   estación para que el día sea el día local.
 * - `elevation` ajusta la cota (downscaling): se usa la cima, como en la previsión.
 * - Datos desde 1940 (ERA5, ~25 km) con 5 días de retraso. Es un reanálisis de rejilla gruesa: da
 *   la tendencia de cada temporada, no la nieve exacta que midió la estación.
 *
 * Misma licencia que la previsión: uso gratuito no comercial, datos CC BY 4.0.
 */
export const OPEN_METEO_ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
/** Días de retraso de los datos históricos respecto a hoy. */
export const ARCHIVE_DELAY_DAYS = 5;
const DEFAULT_TIMEOUT_MS = 20_000;

export function buildHistoryUrl(station: Station, startDate: string, endDate: string): string {
  const params = new URLSearchParams({
    latitude: station.latitude.toString(),
    longitude: station.longitude.toString(),
    elevation: String(station.topElevationM),
    start_date: startDate,
    end_date: endDate,
    daily: 'snowfall_sum',
    timezone: station.timeZone,
  });
  return `${OPEN_METEO_ARCHIVE_URL}?${params.toString()}`;
}

function invalid(message: string): never {
  throw new ForecastError('invalid-data', message);
}

/** Convierte la respuesta del archivo en días con la nieve en cm. */
export function parseHistoryResponse(json: unknown): DailySnowRecord[] {
  if (typeof json === 'object' && json !== null && (json as { error?: unknown }).error === true) {
    throw new ForecastError(
      'provider',
      String((json as { reason?: unknown }).reason ?? 'Error del proveedor'),
    );
  }
  const root = json as { daily?: Record<string, unknown>; daily_units?: Record<string, unknown> };
  const daily = root?.daily;
  if (!daily || !Array.isArray(daily.time)) invalid('La respuesta no trae días (daily.time).');
  const times = daily.time as unknown[];
  const values = daily.snowfall_sum;
  if (!Array.isArray(values) || values.length !== times.length) {
    invalid('La serie "snowfall_sum" no tiene tantos días como "time".');
  }
  const rawUnit = root.daily_units?.snowfall_sum;
  const unit = rawUnit === undefined ? 'cm' : parseLengthUnit(String(rawUnit));
  if (!unit) invalid(`Unidad desconocida para "snowfall_sum": ${String(rawUnit)}`);

  return times.map((date, i) => {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      invalid(`Día ${i} no válido.`);
    const v: unknown = values[i];
    return { date, snowfallCm: toCm(typeof v === 'number' && Number.isFinite(v) ? v : null, unit) };
  });
}

export interface HistoryProvider {
  readonly attribution: string;
  /** Nieve diaria (cm) entre dos fechas locales, ambas incluidas. */
  getDailySnow(
    station: Station,
    startDate: string,
    endDate: string,
    options?: { signal?: AbortSignal },
  ): Promise<DailySnowRecord[]>;
}

export interface OpenMeteoHistoryOptions {
  fetch?: typeof fetch;
  limiter?: RateLimiter;
  timeoutMs?: number;
}

export function createOpenMeteoHistory(options: OpenMeteoHistoryOptions = {}): HistoryProvider {
  const doFetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  // La app pide una sola llamada por estación (todas las temporadas juntas); 30 por minuto, muy por
  // debajo de los 600 de Open-Meteo, dejan cambiar de estación sin toparse con el límite propio.
  const limiter = options.limiter ?? new RateLimiter(30, 60_000);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    attribution: 'Datos históricos de Open-Meteo.com (CC BY 4.0)',
    async getDailySnow(station, startDate, endDate, request = {}) {
      const json = await fetchJson(
        buildHistoryUrl(station, startDate, endDate),
        { doFetch, limiter, timeoutMs },
        request.signal,
      );
      return parseHistoryResponse(json);
    },
  };
}
