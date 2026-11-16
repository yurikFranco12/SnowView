import type { StationSnapshot } from '@snowview/core';
import { STATIONS, createOpenMeteoSnapshots } from '@snowview/data';
import { useQuery } from '@tanstack/react-query';
import { storage } from '../../platform/storage';

const KEY = 'snapshot-cache';
/** El resumen de todas las estaciones se vuelve a pedir, como mucho, cada tres horas. */
export const SNAPSHOT_STALE_MS = 3 * 3_600_000;
/** Un resumen guardado deja de servir pasado un día. */
const CACHE_MAX_AGE_MS = 24 * 3_600_000;

const provider = createOpenMeteoSnapshots();

function isSnapshot(v: unknown): v is StationSnapshot {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Partial<StationSnapshot>;
  return (
    typeof s.stationId === 'string' &&
    typeof s.fetchedAt === 'number' &&
    Array.isArray(s.dailySnowCm)
  );
}

/** Se queda con los resúmenes guardados bien formados y recientes. */
export function pruneSnapshots(raw: unknown, nowMs: number): StationSnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (v): v is StationSnapshot => isSnapshot(v) && nowMs - v.fetchedAt <= CACHE_MAX_AGE_MS,
  );
}

/** Nieve prevista en los primeros `days` días; null si no hay ningún dato. */
export function snapshotSnowCm(snapshot: StationSnapshot, days: number): number | null {
  const values = snapshot.dailySnowCm.slice(0, days).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + Math.max(0, b), 0) * 10) / 10;
}

/** ¿Sirve el resumen guardado sin volver a consultar? Reciente y con todas las estaciones. */
export function isFreshAndComplete(
  cached: readonly StationSnapshot[],
  stationIds: readonly string[],
  nowMs: number,
): boolean {
  const byId = new Map(cached.map((s) => [s.stationId, s]));
  return stationIds.every((id) => {
    const s = byId.get(id);
    return s !== undefined && nowMs - s.fetchedAt < SNAPSHOT_STALE_MS;
  });
}

async function fetchAllSnapshots(signal: AbortSignal): Promise<StationSnapshot[]> {
  // Al abrir la app varias veces seguidas se reutiliza el resumen guardado: pedirlo de nuevo son
  // cientos de ubicaciones contra el límite gratuito de Open-Meteo.
  const saved = pruneSnapshots(await storage.get<unknown>(KEY).catch(() => null), Date.now());
  if (
    isFreshAndComplete(
      saved,
      STATIONS.map((s) => s.id),
      Date.now(),
    )
  )
    return saved;
  try {
    const list = await provider.getSnapshots(STATIONS, { signal });
    void storage.set(KEY, list).catch(() => undefined);
    return list;
  } catch (error) {
    if (signal.aborted) throw error;
    // Sin conexión o con el límite de peticiones agotado: sirve el último resumen guardado.
    if (saved.length > 0) return saved;
    throw error;
  }
}

/**
 * Resumen de todas las estaciones del catálogo (nieve prevista por día y tiempo actual en la cima).
 * Una sola consulta compartida por todas las pantallas; no se refresca sola para no gastar el
 * límite gratuito de Open-Meteo.
 */
export function useSnapshots(enabled = true) {
  const query = useQuery({
    queryKey: ['snapshots'],
    queryFn: ({ signal }) => fetchAllSnapshots(signal),
    enabled,
    staleTime: SNAPSHOT_STALE_MS,
    refetchInterval: false,
  });
  const byId = new Map((query.data ?? []).map((s) => [s.stationId, s]));
  return { ...query, byId };
}
