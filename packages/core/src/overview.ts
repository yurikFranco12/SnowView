import { localDateKey, HOUR_MS } from './accumulation';
import { localHour } from './conditions';
import type { HourlyPoint } from './models';

/**
 * Resumen del tiempo de cada día local a una cota: lo que hace falta para una ficha de previsión
 * (nieve, temperaturas, viento, cielo y nivel de congelación). TypeScript puro.
 */
export interface DayOverview {
  /** Fecha local AAAA-MM-DD. */
  date: string;
  /** Nieve caída ese día, en cm. */
  snowCm: number;
  tMinC: number | null;
  tMaxC: number | null;
  /** Viento medio máximo y ráfaga máxima del día, en km/h. */
  maxWindKmh: number | null;
  maxGustKmh: number | null;
  /** Código WMO que mejor describe el día (ver {@link significantWeatherCode}). */
  weatherCode: number | null;
  /** Altitud media de la isoterma de 0 °C entre las 9:00 y las 17:00, en metros. */
  freezingLevelM: number | null;
  /** Grosor de nieve a mediodía (o el dato más cercano), en cm. */
  snowDepthCm: number | null;
  hoursWithData: number;
}

const finite = (v: number | null | undefined): v is number =>
  v !== null && v !== undefined && Number.isFinite(v);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Gravedad de cada familia de códigos WMO: lo que más condiciona un día de esquí va primero. */
function severity(code: number): number {
  if (code >= 95) return 6; // tormenta
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 5; // nieve
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 4; // lluvia
  if (code >= 51 && code <= 57) return 3; // llovizna
  if (code === 45 || code === 48) return 2; // niebla
  if (code === 3) return 1;
  return 0;
}

/**
 * Código que resume un conjunto de horas. La precipitación manda si ocupa al menos una de cada seis
 * horas (o dos horas): dentro de la familia más grave que lo cumpla se toma el código más
 * frecuente. Si no, el más frecuente de todos. Así dos horas de nevada no se pierden entre veinte
 * de nubes, pero una hora suelta de llovizna no convierte el día en «lluvioso».
 */
export function significantWeatherCode(codes: readonly (number | null)[]): number | null {
  const valid = codes.filter(finite);
  if (valid.length === 0) return null;
  const mostFrequent = (list: readonly number[]): number => {
    const count = new Map<number, number>();
    for (const c of list) count.set(c, (count.get(c) ?? 0) + 1);
    let best = list[0] ?? 0;
    for (const [c, n] of count) {
      const bestN = count.get(best) ?? 0;
      if (n > bestN || (n === bestN && c > best)) best = c;
    }
    return best;
  };
  const threshold = Math.max(2, Math.ceil(valid.length / 6));
  for (const level of [6, 5, 4, 3, 2]) {
    const family = valid.filter((c) => severity(c) === level);
    if (family.length >= Math.min(threshold, valid.length)) return mostFrequent(family);
  }
  return mostFrequent(valid);
}

/** Resumen de `days` días locales a partir del día local de `fromMs`. */
export function dailyOverview(
  points: readonly HourlyPoint[],
  timeZone: string,
  fromMs: number,
  days: number,
): DayOverview[] {
  const byDate = new Map<string, HourlyPoint[]>();
  const seen = new Set<number>();
  for (const p of points) {
    if (seen.has(p.time)) continue;
    seen.add(p.time);
    const key = localDateKey(p.time, timeZone);
    const list = byDate.get(key);
    if (list) list.push(p);
    else byDate.set(key, [p]);
  }

  const result: DayOverview[] = [];
  const firstKey = localDateKey(fromMs, timeZone);
  let cursor = Date.UTC(
    Number(firstKey.slice(0, 4)),
    Number(firstKey.slice(5, 7)) - 1,
    Number(firstKey.slice(8, 10)),
    12,
  );
  for (let i = 0; i < Math.max(0, Math.floor(days)); i++) {
    const date = new Date(cursor).toISOString().slice(0, 10);
    cursor += 24 * HOUR_MS;
    const hours = byDate.get(date) ?? [];
    const temps = hours.map((h) => h.temperatureC).filter(finite);
    const winds = hours.map((h) => h.windKmh).filter(finite);
    const gusts = hours.map((h) => h.gustKmh).filter(finite);
    const daytime = hours.filter((h) => {
      const lh = localHour(h.time, timeZone);
      return lh >= 9 && lh < 17;
    });
    const freezing = daytime.map((h) => h.freezingLevelM).filter(finite);
    // Grosor a mediodía; si no hay dato a esa hora, el más cercano.
    let depth: number | null = null;
    let bestGap = Infinity;
    for (const h of hours) {
      if (!finite(h.snowDepthCm)) continue;
      const gap = Math.abs(localHour(h.time, timeZone) - 12);
      if (gap < bestGap) {
        bestGap = gap;
        depth = h.snowDepthCm;
      }
    }
    let snow = 0;
    let withData = 0;
    for (const h of hours) {
      if (!finite(h.snowfallCm)) continue;
      snow += Math.max(0, h.snowfallCm);
      withData++;
    }
    result.push({
      date,
      snowCm: round1(snow),
      tMinC: temps.length ? Math.min(...temps) : null,
      tMaxC: temps.length ? Math.max(...temps) : null,
      maxWindKmh: winds.length ? Math.max(...winds) : null,
      maxGustKmh: gusts.length ? Math.max(...gusts) : null,
      weatherCode: significantWeatherCode(
        (daytime.length ? daytime : hours).map((h) => h.weatherCode),
      ),
      freezingLevelM: freezing.length
        ? Math.round(freezing.reduce((a, b) => a + b, 0) / freezing.length)
        : null,
      snowDepthCm: depth === null ? null : round1(depth),
      hoursWithData: withData,
    });
  }
  return result;
}

/** Tipo de cielo para elegir un icono, a partir del código WMO. */
export type SkyKind =
  'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm' | 'unknown';

export function skyKind(code: number | null): SkyKind {
  if (code === null) return 'unknown';
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'unknown';
}

/**
 * Sensación térmica por viento (fórmula de Environment Canada / NWS), válida con 10 °C o menos y
 * viento de más de 4,8 km/h; fuera de ese rango devuelve la temperatura tal cual.
 */
export function windChillC(temperatureC: number, windKmh: number): number {
  if (temperatureC > 10 || windKmh <= 4.8) return temperatureC;
  const v = Math.pow(windKmh, 0.16);
  return round1(13.12 + 0.6215 * temperatureC - 11.37 * v + 0.3965 * temperatureC * v);
}
