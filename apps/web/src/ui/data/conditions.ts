import {
  RATING_LIMITS,
  dayConditions,
  rateDay,
  type DayConditions,
  type DayRating,
  type Discipline,
  type StationForecast,
} from '@snowview/core';
import type { CuratedStation } from '@snowview/data';

/** Un día valorado, con las medidas en las que se basa la nota. */
export interface RatedDay {
  rating: DayRating;
  conditions: DayConditions;
}

/** Valora los próximos `days` días de una estación para una disciplina. */
export function rateStationDays(
  forecast: StationForecast,
  station: CuratedStation,
  nowMs: number,
  days: number,
  discipline: Discipline,
): RatedDay[] {
  return dayConditions(forecast, station.timeZone, nowMs, days).map((conditions) => ({
    conditions,
    rating: rateDay(conditions, discipline),
  }));
}

/** Estación con sus días valorados. */
export interface StationDays {
  stationId: string;
  days: readonly RatedDay[];
}

export interface Pick {
  stationId: string;
  date: string;
  score: number;
  day: RatedDay;
}

/** Nota media de los días con nota, o null si ninguno la tiene. */
export function averageScore(days: readonly RatedDay[]): number | null {
  const scores = days.flatMap((d) => (d.rating.score === null ? [] : [d.rating.score]));
  return scores.length === 0 ? null : scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Mejores opciones para ir: el mejor día de cada estación, de mayor a menor nota. Con empate de
 * nota gana el día más próximo y, si siguen empatadas, la estación con mejor nota media.
 */
export function topPicks(entries: readonly StationDays[], limit = 3): Pick[] {
  const picks: Pick[] = [];
  for (const entry of entries) {
    let best: RatedDay | undefined;
    for (const d of entry.days) {
      const s = d.rating.score;
      if (s === null) continue;
      if (best === undefined || s > (best.rating.score ?? -1)) best = d;
    }
    if (best?.rating.score != null) {
      picks.push({
        stationId: entry.stationId,
        date: best.rating.date,
        score: best.rating.score,
        day: best,
      });
    }
  }
  const avg = new Map(entries.map((e) => [e.stationId, averageScore(e.days) ?? -1]));
  return picks
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.date.localeCompare(b.date) ||
        (avg.get(b.stationId) ?? 0) - (avg.get(a.stationId) ?? 0),
    )
    .slice(0, Math.max(0, limit));
}

/** Nota mínima para recomendar un día: la de "aceptable". Por debajo, ninguna estación destaca. */
export const MIN_RECOMMENDED_SCORE = RATING_LIMITS.aceptable;

/**
 * Para cada fecha, las estaciones con la nota más alta ese día (todas las empatadas), siempre que
 * llegue a {@link MIN_RECOMMENDED_SCORE}: si todas están mal, no se marca ninguna.
 */
export function bestPerDay(
  entries: readonly StationDays[],
  minScore: number = MIN_RECOMMENDED_SCORE,
): Map<string, Set<string>> {
  const best = new Map<string, { score: number; ids: Set<string> }>();
  for (const entry of entries) {
    for (const d of entry.days) {
      const s = d.rating.score;
      if (s === null || s < minScore) continue;
      const cur = best.get(d.rating.date);
      if (!cur || s > cur.score)
        best.set(d.rating.date, { score: s, ids: new Set([entry.stationId]) });
      else if (s === cur.score) cur.ids.add(entry.stationId);
    }
  }
  return new Map([...best].map(([date, v]) => [date, v.ids]));
}

/** Ordena las estaciones por nota media (las que no tienen nota, al final). */
export function sortByAverage(entries: readonly StationDays[]): StationDays[] {
  return [...entries].sort((a, b) => (averageScore(b.days) ?? -1) - (averageScore(a.days) ?? -1));
}
