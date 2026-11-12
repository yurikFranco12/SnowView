import type { HourlyPoint } from './models';

export const HOUR_MS = 3_600_000;

/** Resultado de sumar nieve en una ventana de tiempo. */
export interface SnowAccumulation {
  /** Suma de las horas con dato, en cm (redondeada a 0,1 cm). */
  totalCm: number;
  /** Horas de la ventana que tienen dato. */
  hoursWithData: number;
  /** Horas que pide la ventana. */
  hoursExpected: number;
  /** true si todas las horas de la ventana tienen dato. */
  complete: boolean;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Suma la nieve de las horas que EMPIEZAN dentro de [startMs, startMs + hours h).
 *
 * Trabaja con instantes UTC, así que una ventana de 48 h son siempre 48 horas reales, también en
 * los días de cambio de hora. Los valores null cuentan como "sin dato" (no como 0) y hacen que la
 * ventana quede incompleta. Una ventana de 0 horas o sin puntos da 0 cm e incompleta salvo que no
 * se esperara ninguna hora.
 */
export function accumulateSnow(
  points: readonly HourlyPoint[],
  startMs: number,
  hours: number,
): SnowAccumulation {
  const hoursExpected = Math.max(0, Math.floor(hours));
  const endMs = startMs + hoursExpected * HOUR_MS;
  let total = 0;
  let hoursWithData = 0;
  const seen = new Set<number>();

  for (const p of points) {
    if (p.time < startMs || p.time >= endMs || seen.has(p.time)) continue;
    seen.add(p.time); // una hora duplicada no cuenta dos veces
    if (p.snowfallCm === null || !Number.isFinite(p.snowfallCm)) continue;
    total += Math.max(0, p.snowfallCm);
    hoursWithData++;
  }

  return {
    totalCm: round1(total),
    hoursWithData,
    hoursExpected,
    complete: hoursWithData === hoursExpected,
  };
}

/** Nieve de un día local. */
export interface DailySnow {
  /** Fecha local en formato AAAA-MM-DD. */
  date: string;
  totalCm: number;
  /** Horas con dato ese día (23, 24 o 25 según el cambio de hora). */
  hoursWithData: number;
}

const dateKeyFormatters = new Map<string, Intl.DateTimeFormat>();

/** Fecha local AAAA-MM-DD de un instante en una zona horaria IANA. */
export function localDateKey(timeMs: number, timeZone: string): string {
  let fmt = dateKeyFormatters.get(timeZone);
  if (!fmt) {
    // en-CA formatea como AAAA-MM-DD.
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dateKeyFormatters.set(timeZone, fmt);
  }
  return fmt.format(timeMs);
}

/**
 * Agrupa la nieve por días locales de la estación, empezando por el día local de `fromMs`, y
 * devuelve `days` días (los que no tengan horas aparecen con 0 cm y 0 horas).
 * Un día con cambio de hora tiene 23 o 25 horas: se respeta, no se fuerza a 24.
 */
export function dailySnowfall(
  points: readonly HourlyPoint[],
  timeZone: string,
  fromMs: number,
  days: number,
): DailySnow[] {
  const byDate = new Map<string, { total: number; hours: number }>();
  for (const p of points) {
    if (p.snowfallCm === null || !Number.isFinite(p.snowfallCm)) continue;
    const key = localDateKey(p.time, timeZone);
    const acc = byDate.get(key) ?? { total: 0, hours: 0 };
    acc.total += Math.max(0, p.snowfallCm);
    acc.hours++;
    byDate.set(key, acc);
  }

  const result: DailySnow[] = [];
  const firstKey = localDateKey(fromMs, timeZone);
  // Avanza de día en día local: mediodía UTC + 24 h nunca se salta ni repite un día local.
  let cursor = Date.UTC(
    Number(firstKey.slice(0, 4)),
    Number(firstKey.slice(5, 7)) - 1,
    Number(firstKey.slice(8, 10)),
    12,
  );
  for (let i = 0; i < Math.max(0, Math.floor(days)); i++) {
    const key = new Date(cursor).toISOString().slice(0, 10);
    const acc = byDate.get(key);
    result.push({ date: key, totalCm: round1(acc?.total ?? 0), hoursWithData: acc?.hours ?? 0 });
    cursor += 24 * HOUR_MS;
  }
  return result;
}

/** Suma de una lista de días. */
export function sumDays(days: readonly DailySnow[]): number {
  return round1(days.reduce((s, d) => s + d.totalCm, 0));
}
