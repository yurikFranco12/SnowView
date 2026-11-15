import { parseLengthUnit, toCm, type Station, type StationSnapshot } from '@snowview/core';
import { ForecastError } from './errors';
import { fetchJson } from './http';
import { FORECAST_DAYS, OPEN_METEO_URL } from './openMeteo';
import type { ForecastRequestOptions } from './provider';
import { RateLimiter } from './rateLimiter';

/**
 * Resumen de muchas estaciones en pocas llamadas a Open-Meteo, para la clasificación.
 *
 * Con cientos de estaciones no se puede pedir la previsión completa de todas: Open-Meteo cuenta
 * cada ubicación de una llamada como una petición (límite gratuito: 600 por minuto, 5.000 por hora
 * y 10.000 por día). Aquí se pide solo la cima de cada estación, con la nieve de cada día y el
 * tiempo actual: una ubicación por estación y pocas variables. La previsión completa (base y cima,
 * hora a hora) se sigue pidiendo solo para las favoritas y la ficha que se abre.
 *
 * Parámetros verificados contra la API el 2026-11-15: `daily=snowfall_sum` en cm, `current` admite
 * `snow_depth` (en metros) y las listas de `latitude`, `longitude` y `elevation` van en paralelo.
 */

/** Estaciones por llamada: la URL queda en unos 2 KB. */
export const SNAPSHOT_BATCH_SIZE = 100;
const DEFAULT_TIMEOUT_MS = 20_000;

export function buildSnapshotUrl(stations: readonly Station[], days = FORECAST_DAYS): string {
  const params = new URLSearchParams({
    latitude: stations.map((s) => s.latitude).join(','),
    longitude: stations.map((s) => s.longitude).join(','),
    elevation: stations.map((s) => s.topElevationM).join(','),
    daily: 'snowfall_sum',
    current: 'temperature_2m,weather_code,snow_depth',
    forecast_days: String(days),
    timeformat: 'unixtime',
    // Días locales de cada estación (España, Francia y Portugal no comparten huso).
    timezone: 'auto',
    temperature_unit: 'celsius',
  });
  return `${OPEN_METEO_URL}?${params.toString()}`;
}

interface RawSnapshot {
  current_units?: Record<string, unknown>;
  current?: Record<string, unknown>;
  daily_units?: Record<string, unknown>;
  daily?: Record<string, unknown>;
}

const numberOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

function unitOf(raw: unknown, fallback: 'cm' | 'm', name: string) {
  if (raw === undefined) return fallback;
  const unit = typeof raw === 'string' ? parseLengthUnit(raw) : null;
  if (!unit) throw new ForecastError('invalid-data', `Unidad desconocida para "${name}".`);
  return unit;
}

/** Convierte la respuesta (una ubicación por estación, en el mismo orden) en resúmenes. */
export function parseSnapshotResponse(
  json: unknown,
  stations: readonly Station[],
  fetchedAt: number,
): StationSnapshot[] {
  if (typeof json === 'object' && json !== null && (json as { error?: unknown }).error === true) {
    throw new ForecastError(
      'provider',
      String((json as { reason?: unknown }).reason ?? 'Error del proveedor'),
    );
  }
  const list = (Array.isArray(json) ? json : [json]) as RawSnapshot[];
  if (list.length !== stations.length) {
    throw new ForecastError(
      'invalid-data',
      `Se esperaban ${stations.length} ubicaciones y llegaron ${list.length}.`,
    );
  }
  return stations.map((station, i) => {
    const raw = list[i] ?? {};
    const snow = raw.daily?.snowfall_sum;
    if (!Array.isArray(snow)) {
      throw new ForecastError('invalid-data', 'La respuesta no trae la nieve diaria.');
    }
    const snowUnit = unitOf(raw.daily_units?.snowfall_sum, 'cm', 'snowfall_sum');
    const depthUnit = unitOf(raw.current_units?.snow_depth, 'm', 'snow_depth');
    return {
      stationId: station.id,
      fetchedAt,
      dailySnowCm: snow.map((v) => toCm(numberOrNull(v), snowUnit)),
      temperatureC: numberOrNull(raw.current?.temperature_2m),
      weatherCode: numberOrNull(raw.current?.weather_code),
      snowDepthCm: toCm(numberOrNull(raw.current?.snow_depth), depthUnit),
    };
  });
}

export interface SnapshotProvider {
  /** Resumen de las estaciones dadas, en el mismo orden. */
  getSnapshots(
    stations: readonly Station[],
    options?: ForecastRequestOptions,
  ): Promise<StationSnapshot[]>;
}

export interface OpenMeteoSnapshotOptions {
  fetch?: typeof fetch;
  limiter?: RateLimiter;
  timeoutMs?: number;
  now?: () => number;
}

export function createOpenMeteoSnapshots(options: OpenMeteoSnapshotOptions = {}): SnapshotProvider {
  const doFetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  // Cada llamada lleva hasta 100 ubicaciones: 12 por minuto son como mucho 1.200 de las del
  // proveedor en ráfaga, y la pantalla no vuelve a pedirlas hasta pasadas unas horas.
  const limiter = options.limiter ?? new RateLimiter(12, 60_000);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const now = options.now ?? Date.now;

  return {
    async getSnapshots(stations, request = {}) {
      const result: StationSnapshot[] = [];
      for (let i = 0; i < stations.length; i += SNAPSHOT_BATCH_SIZE) {
        const batch = stations.slice(i, i + SNAPSHOT_BATCH_SIZE);
        const json = await fetchJson(
          buildSnapshotUrl(batch),
          { doFetch, limiter, timeoutMs },
          request.signal,
        );
        result.push(...parseSnapshotResponse(json, batch, now()));
      }
      return result;
    },
  };
}
