import type { StationSummary } from './forecast';

/** Qué estación gana en cada medida. Con empate ganan todas las empatadas; sin nieve, ninguna. */
export interface CompareHighlights {
  topSnow: ReadonlySet<string>;
  next48h: ReadonlySet<string>;
  calmestWind: ReadonlySet<string>;
}

/** Máximo de estaciones que se comparan a la vez: más no cabe legible en pantalla. */
export const MAX_COMPARED = 4;

function winners(
  summaries: readonly StationSummary[],
  value: (s: StationSummary) => number | null,
  better: (a: number, b: number) => boolean,
  mustBePositive: boolean,
): Set<string> {
  let best: number | null = null;
  for (const s of summaries) {
    const v = value(s);
    if (v === null) continue;
    if (best === null || better(v, best)) best = v;
  }
  const result = new Set<string>();
  if (best === null || (mustBePositive && best <= 0)) return result;
  for (const s of summaries) if (value(s) === best) result.add(s.station.id);
  return result;
}

/** Resalta la estación con más nieve en el periodo, más en las próximas 48 h y menos viento. */
export function highlightBest(summaries: readonly StationSummary[]): CompareHighlights {
  return {
    topSnow: winners(
      summaries,
      (s) => s.topTotalCm,
      (a, b) => a > b,
      true,
    ),
    next48h: winners(
      summaries,
      (s) => s.next48hCm,
      (a, b) => a > b,
      true,
    ),
    // Con una sola estación no hay con qué compararla.
    calmestWind:
      summaries.length < 2
        ? new Set()
        : winners(
            summaries,
            (s) => s.current?.windKmh ?? null,
            (a, b) => a < b,
            false,
          ),
  };
}

/** Añade o quita una estación de la selección, respetando el máximo. */
export function toggleCompared(ids: readonly string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  return ids.length >= MAX_COMPARED ? [...ids] : [...ids, id];
}
