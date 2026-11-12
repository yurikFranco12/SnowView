import type { StationForecast } from '@snowview/core';
import { storage } from '../../platform/storage';

const KEY = 'forecast-cache';

/** Una previsión guardada deja de servir pasados estos días: ya no describe el futuro. */
export const CACHE_MAX_AGE_MS = 3 * 24 * 3_600_000;

export type ForecastCache = Record<string, StationForecast>;

function isForecast(v: unknown): v is StationForecast {
  if (typeof v !== 'object' || v === null) return false;
  const f = v as Partial<StationForecast>;
  return (
    typeof f.stationId === 'string' &&
    typeof f.fetchedAt === 'number' &&
    Array.isArray(f.base?.hours) &&
    Array.isArray(f.top?.hours)
  );
}

/** Se queda con las previsiones bien formadas y no caducadas. */
export function pruneCache(raw: unknown, nowMs: number): ForecastCache {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const result: ForecastCache = {};
  for (const [id, value] of Object.entries(raw)) {
    if (isForecast(value) && nowMs - value.fetchedAt <= CACHE_MAX_AGE_MS) result[id] = value;
  }
  return result;
}

/** Cuánto hace que se obtuvo una previsión, en minutos (nunca negativo). */
export function ageMinutes(forecast: StationForecast, nowMs: number): number {
  return Math.max(0, Math.round((nowMs - forecast.fetchedAt) / 60_000));
}

/**
 * La previsión está desfasada si es más vieja que 1,5 veces el intervalo de refresco (más 5 min):
 * señal de que las últimas consultas fallaron y se muestran datos guardados.
 */
export function isOutdated(minutes: number, refreshMinutes: number): boolean {
  return minutes > refreshMinutes * 1.5 + 5;
}

/** "hace 25 min", "hace 3 h", "hace 2 días". */
export function formatAge(minutes: number): string {
  if (minutes < 60) return `hace ${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} días`;
}

let memory: Promise<ForecastCache> | undefined;

function load(): Promise<ForecastCache> {
  memory ??= storage
    .get<unknown>(KEY)
    .then((raw) => pruneCache(raw, Date.now()))
    .catch(() => ({}));
  return memory;
}

/** Última previsión guardada de una estación, si sirve todavía. */
export async function loadCachedForecast(stationId: string): Promise<StationForecast | undefined> {
  return pruneCache(await load(), Date.now())[stationId];
}

/** Guarda la última previsión de una estación (una por estación). */
export async function saveCachedForecast(forecast: StationForecast): Promise<void> {
  const cache = await load();
  cache[forecast.stationId] = forecast;
  try {
    await storage.set(KEY, pruneCache(cache, Date.now()));
  } catch {
    // Sin almacenamiento disponible: la caché solo vive en memoria.
  }
}
