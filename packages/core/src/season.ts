/**
 * Historial de nevadas por temporada de esquí. Una temporada va del 1 de octubre al 31 de mayo y se
 * identifica por el año en que empieza (la 2025/26 es 2025). Las fechas son AAAA-MM-DD locales de
 * la estación, tal como las entrega data/.
 */

/** Nieve de un día. `null` si el proveedor no tiene dato. */
export interface DailySnowRecord {
  date: string;
  snowfallCm: number | null;
}

/** Un día cuenta como "de nieve" desde este mínimo, para no contar el goteo de décimas. */
export const SNOWY_DAY_CM = 1;

export const SEASON_START = { month: 10, day: 1 } as const;
export const SEASON_END = { month: 5, day: 31 } as const;

/** Meses de la temporada en orden: octubre a mayo. */
export const SEASON_MONTHS = [10, 11, 12, 1, 2, 3, 4, 5] as const;

const round1 = (n: number) => Math.round(n * 10) / 10;

function parts(date: string): { y: number; m: number; d: number } {
  return { y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)), d: Number(date.slice(8, 10)) };
}

/**
 * Año en que empieza la temporada de una fecha. De junio a septiembre (fuera de temporada) devuelve
 * la que va a empezar, para que "la temporada actual" en verano sea la próxima.
 */
export function seasonOf(date: string): number {
  const { y, m } = parts(date);
  return m >= 6 ? y : y - 1;
}

/** "2025/26". */
export function seasonLabel(startYear: number): string {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/** Primer y último día de la temporada. */
export function seasonRange(startYear: number): { start: string; end: string } {
  return { start: `${startYear}-10-01`, end: `${startYear + 1}-05-31` };
}

/** Días entre dos fechas AAAA-MM-DD, ambas incluidas (0 si la segunda es anterior). */
export function daysBetweenInclusive(from: string, to: string): number {
  const a = Date.UTC(parts(from).y, parts(from).m - 1, parts(from).d);
  const b = Date.UTC(parts(to).y, parts(to).m - 1, parts(to).d);
  return b < a ? 0 : Math.round((b - a) / 86_400_000) + 1;
}

export interface SeasonSummary {
  startYear: number;
  label: string;
  /** Nieve total de los días con dato, en cm. */
  totalCm: number;
  /** Días con al menos {@link SNOWY_DAY_CM} cm. */
  snowyDays: number;
  /** Día de más nieve, o null si no nevó. */
  maxDay: { date: string; cm: number } | null;
  /** Nieve por mes, octubre a mayo (los meses que aún no han llegado, a 0). */
  months: { month: number; totalCm: number }[];
  daysWithData: number;
  /** Días que ya deberían tener dato (hasta `lastDate` o el final de la temporada). */
  daysExpected: number;
  /** true si todos los días esperados tienen dato. */
  complete: boolean;
}

/**
 * Resume una temporada. Solo cuentan los días dentro de ella, y los duplicados se ignoran (gana el
 * primero). `lastDate` es el último día para el que se espera dato: en la temporada en curso es
 * "hoy menos el retraso del proveedor", de modo que no se marque incompleta por días futuros.
 */
export function summarizeSeason(
  records: readonly DailySnowRecord[],
  startYear: number,
  lastDate?: string,
): SeasonSummary {
  const { start, end } = seasonRange(startYear);
  const limit = lastDate !== undefined && lastDate < end ? lastDate : end;
  const monthTotals = new Map<number, number>(SEASON_MONTHS.map((m) => [m, 0]));
  const seen = new Set<string>();
  let total = 0;
  let snowyDays = 0;
  let withData = 0;
  let maxDay: SeasonSummary['maxDay'] = null;

  for (const r of records) {
    if (r.date < start || r.date > limit || seen.has(r.date)) continue;
    seen.add(r.date);
    if (r.snowfallCm === null || !Number.isFinite(r.snowfallCm)) continue;
    const cm = Math.max(0, r.snowfallCm);
    withData++;
    total += cm;
    if (cm >= SNOWY_DAY_CM) snowyDays++;
    if (cm > 0 && (maxDay === null || cm > maxDay.cm)) maxDay = { date: r.date, cm: round1(cm) };
    const month = parts(r.date).m;
    monthTotals.set(month, (monthTotals.get(month) ?? 0) + cm);
  }

  const daysExpected = daysBetweenInclusive(start, limit);
  return {
    startYear,
    label: seasonLabel(startYear),
    totalCm: round1(total),
    snowyDays,
    maxDay,
    months: SEASON_MONTHS.map((month) => ({ month, totalCm: round1(monthTotals.get(month) ?? 0) })),
    daysWithData: withData,
    daysExpected,
    complete: withData === daysExpected,
  };
}
