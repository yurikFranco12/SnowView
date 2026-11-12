import {
  HOUR_MS,
  localDateKey,
  seasonOf,
  seasonRange,
  summarizeSeason,
  type SeasonSummary,
} from '@snowview/core';
import { ARCHIVE_DELAY_DAYS, createOpenMeteoHistory, getStation } from '@snowview/data';
import { useQueries } from '@tanstack/react-query';
import { useNow } from '../hooks/useNow';

/** Único proveedor de historial de la app. */
export const historyProvider = createOpenMeteoHistory();

/** Cuántas temporadas se muestran: la última y las cuatro anteriores. */
const SEASONS_SHOWN = 5;

/**
 * Última temporada que ya ha empezado. En verano (de junio a septiembre) la "actual" todavía no ha
 * empezado y se muestra la que acaba de terminar.
 */
export function latestSeason(today: string): number {
  const s = seasonOf(today);
  return seasonRange(s).start > today ? s - 1 : s;
}

/** Último día con dato en el archivo: hoy menos el retraso del proveedor, en la fecha local. */
export function lastArchiveDate(nowMs: number, timeZone: string): string {
  return localDateKey(nowMs - ARCHIVE_DELAY_DAYS * 24 * HOUR_MS, timeZone);
}

/** Temporadas a mostrar, de la más reciente a la más antigua. */
export function seasonsToShow(today: string, count = SEASONS_SHOWN): number[] {
  const latest = latestSeason(today);
  return Array.from({ length: count }, (_, i) => latest - i);
}

export interface SeasonResult {
  startYear: number;
  summary: SeasonSummary | undefined;
  loading: boolean;
  error: unknown;
  /** La temporada aún no ha terminado: sus cifras crecerán. */
  inProgress: boolean;
}

/** Resumen de las últimas temporadas de una estación (una consulta por temporada). */
export function useSeasonHistory(stationId: string | undefined): SeasonResult[] {
  const now = useNow(60 * 60_000);
  const station = stationId ? getStation(stationId) : undefined;
  const timeZone = station?.timeZone ?? 'UTC';
  const today = localDateKey(now, timeZone);
  const lastDate = lastArchiveDate(now, timeZone);
  const years = seasonsToShow(today);

  const queries = useQueries({
    queries: years.map((year) => {
      const { start, end } = seasonRange(year);
      const finished = end <= lastDate;
      const to = finished ? end : lastDate;
      return {
        queryKey: ['history', stationId, year, finished ? 'closed' : to],
        enabled: station !== undefined && to >= start,
        // Una temporada cerrada no cambia: se guarda mientras la app esté abierta.
        staleTime: finished ? Infinity : 6 * 60 * 60_000,
        gcTime: 24 * 60 * 60_000,
        refetchInterval: false as const,
        queryFn: ({ signal }: { signal: AbortSignal }) => {
          if (!station) throw new Error('Estación desconocida');
          return historyProvider.getDailySnow(station, start, to, { signal });
        },
      };
    }),
  });

  return years.map((year, i) => {
    const q = queries[i];
    const { end } = seasonRange(year);
    return {
      startYear: year,
      summary: q?.data ? summarizeSeason(q.data, year, lastDate) : undefined,
      loading: q?.isPending ?? true,
      error: q?.error ?? null,
      inProgress: end > lastDate,
    };
  });
}
