import { HOUR_MS, localDateKey } from './accumulation';
import type { HourlyPoint, StationForecast } from './models';

/**
 * Condiciones para esquiar o hacer snowboard un día, a partir de la previsión de la estación.
 *
 * Es una HEURÍSTICA propia, no una medida oficial: combina cobertura de nieve, nieve reciente,
 * temperatura, viento y tiempo en una nota de 0 a 100. Los pesos y límites están aquí, juntos y con
 * su porqué, para poder ajustarlos (ver ADR 0007).
 */

export type Discipline = 'ski' | 'snowboard';
export type Rating = 'excelente' | 'buena' | 'aceptable' | 'floja' | 'mala';

/** Horas locales de pistas abiertas: de 9:00 a 16:59. Solo cuentan temperatura, viento y tiempo. */
export const LIFT_HOURS = { from: 9, to: 17 } as const;
/** Cuánta nieve caída antes del día cuenta como "reciente". */
export const RECENT_SNOW_HOURS = 72;

/** Datos de un día local, ya resumidos. Lo que falta es null. */
export interface DayConditions {
  /** Fecha local AAAA-MM-DD. */
  date: string;
  /** Nieve caída ese día en la cima, en cm. */
  snowfallCm: number;
  /** Nieve caída en las 72 h anteriores y hasta las 18:00 de ese día, en cm. */
  recentSnowCm: number;
  /** Grosor medio de nieve en la cima y en la base, en cm. */
  depthTopCm: number | null;
  depthBaseCm: number | null;
  /** Temperatura media en horario de pistas, en la cima (°C). */
  tempC: number | null;
  /** Viento máximo en horario de pistas en la cima (km/h): el mayor entre viento y 0,7 × ráfaga. */
  windKmh: number | null;
  /** Horas de pistas con lluvia o llovizna, con niebla y con nieve cayendo. */
  rainHours: number;
  fogHours: number;
  snowHours: number;
  /** Horas de pistas con dato. 0 = no hay previsión de ese día. */
  liftHoursWithData: number;
}

export interface DayRating {
  date: string;
  discipline: Discipline;
  /** 0 a 100. null si no hay datos para valorar el día. */
  score: number | null;
  rating: Rating | null;
  /** Motivos principales, de más a menos peso, en español. */
  reasons: string[];
  /** Falta algún dato (por ejemplo, el grosor de nieve). */
  incomplete: boolean;
}

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const FOG_CODES = new Set([45, 48]);

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
/** Interpola de 0 en `a` a 1 en `b` (a puede ser mayor que b para curvas descendentes). */
const ramp = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));

const hourFormatters = new Map<string, Intl.DateTimeFormat>();

/** Hora local (0 a 23) de un instante en una zona horaria IANA. */
export function localHour(timeMs: number, timeZone: string): number {
  let fmt = hourFormatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' });
    hourFormatters.set(timeZone, fmt);
  }
  return Number(fmt.format(timeMs));
}

function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
}

const finite = (v: number | null): v is number => v !== null && Number.isFinite(v);

/** Agrupa las horas por día local. */
function groupByDay(hours: readonly HourlyPoint[], timeZone: string): Map<string, HourlyPoint[]> {
  const byDay = new Map<string, HourlyPoint[]>();
  for (const h of hours) {
    const key = localDateKey(h.time, timeZone);
    const list = byDay.get(key);
    if (list) list.push(h);
    else byDay.set(key, [h]);
  }
  return byDay;
}

/**
 * Resume la previsión en condiciones por día local, a partir del día local de `fromMs` y durante
 * `days` días. Los días sin horas en la previsión salen con `liftHoursWithData = 0`.
 */
export function dayConditions(
  forecast: StationForecast,
  timeZone: string,
  fromMs: number,
  days: number,
): DayConditions[] {
  const top = groupByDay(forecast.top.hours, timeZone);
  const base = groupByDay(forecast.base.hours, timeZone);
  const topSnow = forecast.top.hours.filter((h) => finite(h.snowfallCm));

  const first = localDateKey(fromMs, timeZone);
  let cursor = Date.UTC(
    Number(first.slice(0, 4)),
    Number(first.slice(5, 7)) - 1,
    Number(first.slice(8, 10)),
    12,
  );
  const result: DayConditions[] = [];

  for (let i = 0; i < Math.max(0, Math.floor(days)); i++, cursor += 24 * HOUR_MS) {
    const date = new Date(cursor).toISOString().slice(0, 10);
    const dayHours = top.get(date) ?? [];
    const lift = dayHours.filter((h) => {
      const hr = localHour(h.time, timeZone);
      return hr >= LIFT_HOURS.from && hr < LIFT_HOURS.to;
    });
    const dayStart = dayHours[0]?.time;

    const snowfall = dayHours.reduce((s, h) => s + Math.max(0, h.snowfallCm ?? 0), 0);
    const recent =
      dayStart === undefined
        ? 0
        : topSnow
            .filter(
              (h) =>
                h.time >= dayStart - RECENT_SNOW_HOURS * HOUR_MS &&
                h.time < dayStart + 18 * HOUR_MS,
            )
            .reduce((s, h) => s + Math.max(0, h.snowfallCm ?? 0), 0);

    const winds = lift.flatMap((h) => {
      const w = finite(h.windKmh) ? h.windKmh : null;
      const g = finite(h.gustKmh) ? h.gustKmh * 0.7 : null;
      return w === null && g === null ? [] : [Math.max(w ?? 0, g ?? 0)];
    });

    result.push({
      date,
      snowfallCm: Math.round(snowfall * 10) / 10,
      recentSnowCm: Math.round(recent * 10) / 10,
      depthTopCm: mean(dayHours.map((h) => h.snowDepthCm).filter(finite)),
      depthBaseCm: mean((base.get(date) ?? []).map((h) => h.snowDepthCm).filter(finite)),
      tempC: mean(lift.map((h) => h.temperatureC).filter(finite)),
      windKmh: winds.length === 0 ? null : Math.max(...winds),
      rainHours: lift.filter((h) => h.weatherCode !== null && RAIN_CODES.has(h.weatherCode)).length,
      fogHours: lift.filter((h) => h.weatherCode !== null && FOG_CODES.has(h.weatherCode)).length,
      snowHours: lift.filter((h) => h.weatherCode !== null && SNOW_CODES.has(h.weatherCode)).length,
      liftHoursWithData: lift.length,
    });
  }
  return result;
}

/** Cómo pesa cada medida según la disciplina. Suma 100 en cada una. */
const WEIGHTS: Record<
  Discipline,
  Record<'cover' | 'fresh' | 'temp' | 'wind' | 'weather', number>
> = {
  // Esquí: la cobertura manda; el viento molesta pero se esquía con él.
  ski: { cover: 35, fresh: 20, temp: 15, wind: 20, weather: 10 },
  // Snowboard: la nieve reciente rinde más (flota mejor), y el viento y las zonas llanas con poca
  // nieve penalizan más (hay que empujar o quitarse la tabla).
  snowboard: { cover: 30, fresh: 25, temp: 10, wind: 25, weather: 10 },
};

export const RATING_LIMITS = { excelente: 80, buena: 65, aceptable: 45, floja: 25 } as const;

export function ratingOf(score: number): Rating {
  if (score >= RATING_LIMITS.excelente) return 'excelente';
  if (score >= RATING_LIMITS.buena) return 'buena';
  if (score >= RATING_LIMITS.aceptable) return 'aceptable';
  if (score >= RATING_LIMITS.floja) return 'floja';
  return 'mala';
}

export const RATING_LABEL: Record<Rating, string> = {
  excelente: 'Excelente',
  buena: 'Buena',
  aceptable: 'Aceptable',
  floja: 'Floja',
  mala: 'Mala',
};

/**
 * Nota de un día para una disciplina. Cada medida da una fracción de 0 a 1 que se multiplica por
 * su peso; después hay topes por condiciones que impiden o estropean el día (poca nieve, viento
 * que cierra remontes, lluvia). Los datos que faltan cuentan como neutros (0,5) y marcan el día
 * como incompleto; sin ningún dato de pistas no hay nota.
 */
export function rateDay(c: DayConditions, discipline: Discipline): DayRating {
  if (c.liftHoursWithData === 0) {
    return { date: c.date, discipline, score: null, rating: null, reasons: [], incomplete: true };
  }
  const w = WEIGHTS[discipline];
  const reasons: { text: string; weight: number }[] = [];
  let incomplete = false;

  // Cobertura: menos de 20 cm no hay esquí; a partir de 100 cm, cobertura plena.
  let cover = 0.5;
  if (c.depthTopCm === null) incomplete = true;
  else {
    cover = ramp(c.depthTopCm, 20, 100);
    reasons.push({
      text:
        c.depthTopCm < 30
          ? `Poca nieve (${Math.round(c.depthTopCm)} cm)`
          : `${Math.round(c.depthTopCm)} cm de nieve en la cima`,
      weight: w.cover * (1 - cover) + 0.01,
    });
  }
  // Nieve reciente: 0 cm → 0; 30 cm o más en 72 h → 1.
  const fresh = ramp(c.recentSnowCm, 0, 30);
  if (c.recentSnowCm >= 5) {
    reasons.push({
      text: `Nieve reciente: ${Math.round(c.recentSnowCm)} cm`,
      weight: w.fresh * fresh,
    });
  }
  // Temperatura: de −12 a −2 °C es lo ideal; subir de 0 °C estropea la nieve; bajo −20 °C, mucho frío.
  let temp = 0.5;
  if (c.tempC === null) incomplete = true;
  else {
    if (c.tempC > -2) temp = 1 - ramp(c.tempC, -2, 4);
    else if (c.tempC < -12) temp = 1 - 0.6 * ramp(-c.tempC, 12, 22);
    else temp = 1;
    if (c.tempC > 0)
      reasons.push({
        text: `Temperatura alta (${Math.round(c.tempC)} °C)`,
        weight: w.temp * (1 - temp),
      });
    else if (c.tempC < -15)
      reasons.push({ text: `Mucho frío (${Math.round(c.tempC)} °C)`, weight: w.temp * (1 - temp) });
  }
  // Viento: hasta 20 km/h no molesta; entre 40 y 70 km/h los remontes empiezan a cerrar.
  let wind = 0.5;
  if (c.windKmh === null) incomplete = true;
  else {
    wind =
      c.windKmh <= 20
        ? 1
        : c.windKmh <= 40
          ? 1 - 0.5 * ramp(c.windKmh, 20, 40)
          : 0.5 * (1 - ramp(c.windKmh, 40, 70));
    if (c.windKmh > 30)
      reasons.push({
        text: `Viento fuerte (${Math.round(c.windKmh)} km/h)`,
        weight: w.wind * (1 - wind),
      });
  }
  // Tiempo: la lluvia lo estropea, la niebla quita visibilidad, la nevada cayendo la reduce algo.
  const n = Math.max(1, c.liftHoursWithData);
  const weather = clamp01(
    1 - (c.rainHours / n) * 1 - (c.fogHours / n) * 0.7 - (c.snowHours / n) * 0.3,
  );
  if (c.rainHours > 0)
    reasons.push({ text: `Lluvia (${c.rainHours} h)`, weight: w.weather * (c.rainHours / n) + 5 });
  else if (c.fogHours / n >= 0.4) reasons.push({ text: 'Niebla', weight: w.weather * 0.7 });

  let score =
    w.cover * cover + w.fresh * fresh + w.temp * temp + w.wind * wind + w.weather * weather;

  // Topes: condiciones que arruinan el día aunque lo demás sea bueno.
  if (c.depthTopCm !== null && c.depthTopCm < 10) score = Math.min(score, 20);
  if (c.windKmh !== null && c.windKmh >= 70) score = Math.min(score, 20);
  else if (c.windKmh !== null && c.windKmh >= 55) score = Math.min(score, 45);
  if (c.rainHours >= 3) score = Math.min(score, 40);
  if (discipline === 'snowboard' && c.depthTopCm !== null && c.depthTopCm < 30)
    score = Math.min(score, 45);

  const rounded = Math.round(score);
  return {
    date: c.date,
    discipline,
    score: rounded,
    rating: ratingOf(rounded),
    reasons: reasons
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((r) => r.text),
    incomplete,
  };
}
