import {
  HOUR_MS,
  localDateKey,
  seasonOf,
  seasonRange,
  summarizeSeason,
  type SeasonSummary,
} from '@snowview/core';
import { ARCHIVE_DELAY_DAYS, createOpenMeteoHistory, getStation } from '@snowview/data';
import { useQuery } from '@tanstack/react-query';
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

/**
 * Resumen de las últimas temporadas de una estación. Una sola consulta por estación que cubre todas
 * las temporadas (antes eran cinco): menos peticiones, no se agota el límite al cambiar de estación
 * y todas las temporadas llegan a la vez.
 */
export function useSeasonHistory(stationId: string | undefined): SeasonResult[] {
  const now = useNow(60 * 60_000);
  const station = stationId ? getStation(stationId) : undefined;
  const timeZone = station?.timeZone ?? 'UTC';
  const today = localDateKey(now, timeZone);
  const lastDate = lastArchiveDate(now, timeZone);
  const years = seasonsToShow(today);

  const oldest = years[years.length - 1] ?? latestSeason(today);
  const newest = years[0] ?? oldest;
  const start = seasonRange(oldest).start;
  const newestEnd = seasonRange(newest).end;
  const finished = newestEnd <= lastDate;
  const to = finished ? newestEnd : lastDate;

  const query = useQuery({
    queryKey: ['history', stationId, oldest, newest, finished ? 'closed' : to],
    enabled: station !== undefined && to >= start,
    // Si la temporada más reciente ya terminó, nada cambia: se guarda mientras la app esté abierta.
    staleTime: finished ? Infinity : 6 * 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    refetchInterval: false as const,
    queryFn: ({ signal }: { signal: AbortSignal }) => {
      if (!station) throw new Error('Estación desconocida');
      return historyProvider.getDailySnow(station, start, to, { signal });
    },
  });

  return years.map((year) => {
    const { end } = seasonRange(year);
    return {
      startYear: year,
      summary: query.data ? summarizeSeason(query.data, year, lastDate) : undefined,
      loading: query.isPending && query.fetchStatus !== 'idle',
      error: query.error ?? null,
      inProgress: end > lastDate,
    };
  });
}
