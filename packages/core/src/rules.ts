import { HOUR_MS, accumulateSnow } from './accumulation';
import type { HourlyPoint, StationForecast } from './models';

/**
 * Regla de aviso del usuario: "más de `thresholdCm` cm en las próximas `windowHours` h" en una
 * estación, con condiciones opcionales de viento y temperatura.
 */
export interface AlertRule {
  id: string;
  stationId: string;
  /** Nieve que hay que alcanzar, en cm. */
  thresholdCm: number;
  /** Ventana hacia delante desde la hora en curso, en horas. */
  windowHours: number;
  /** Cota a la que se mira la previsión. */
  elevation: 'top' | 'base';
  /** Opcional: el viento máximo de la ventana no debe superar este valor (km/h). */
  maxWindKmh?: number;
  /**
   * Opcional: la temperatura más alta de la ventana no debe superar este valor (°C), para que la
   * nieve sea fiable.
   */
  maxTemperatureC?: number;
  enabled: boolean;
}

export const MAX_WINDOW_HOURS = 336; // 14 días, lo máximo que pide la app

export type RuleStatus = 'cumplida' | 'en-curso' | 'pendiente';

/** Resultado de evaluar una regla contra una previsión. */
export interface RuleEvaluation {
  rule: AlertRule;
  /** Inicio de la ventana evaluada (hora en curso), en ms UTC. */
  windowStartMs: number;
  totalCm: number;
  /** true si todas las horas de la ventana tienen dato de nieve. */
  complete: boolean;
  windMaxKmh: number | null;
  temperatureMaxC: number | null;
  /** Se alcanzó el umbral de nieve. */
  thresholdMet: boolean;
  /** Se cumplen las condiciones opcionales (sin dato suficiente cuenta como no cumplida). */
  conditionsMet: boolean;
  /** Umbral y condiciones: la regla pide avisar. */
  met: boolean;
  /** Avance hacia el umbral de nieve, de 0 a 1. */
  progress: number;
  status: RuleStatus;
  /**
   * Identifica el evento de nieve que dispara la regla, o null si no se cumple. Ver
   * {@link eventKey}.
   */
  eventKey: string | null;
}

/** Errores de validación de una regla, en español para mostrarlos tal cual. */
export function validateRule(rule: AlertRule): string[] {
  const errors: string[] = [];
  if (!rule.stationId) errors.push('Elige una estación.');
  if (!Number.isFinite(rule.thresholdCm) || rule.thresholdCm <= 0) {
    errors.push('La nieve debe ser mayor que 0 cm.');
  }
  if (
    !Number.isInteger(rule.windowHours) ||
    rule.windowHours < 1 ||
    rule.windowHours > MAX_WINDOW_HOURS
  ) {
    errors.push(`El periodo debe ser de 1 a ${MAX_WINDOW_HOURS} horas.`);
  }
  if (rule.maxWindKmh !== undefined && !(Number.isFinite(rule.maxWindKmh) && rule.maxWindKmh > 0)) {
    errors.push('El viento máximo debe ser mayor que 0 km/h.');
  }
  if (rule.maxTemperatureC !== undefined && !Number.isFinite(rule.maxTemperatureC)) {
    errors.push('La temperatura no es válida.');
  }
  return errors;
}

/** Recupera reglas guardadas descartando las que estén mal formadas. */
export function parseRules(raw: unknown): AlertRule[] {
  if (!Array.isArray(raw)) return [];
  const rules: AlertRule[] = [];
  for (const item of raw as unknown[]) {
    if (typeof item !== 'object' || item === null) continue;
    const r = item as Record<string, unknown>;
    if (typeof r['id'] !== 'string' || typeof r['stationId'] !== 'string') continue;
    if (typeof r['thresholdCm'] !== 'number' || typeof r['windowHours'] !== 'number') continue;
    const rule: AlertRule = {
      id: r['id'],
      stationId: r['stationId'],
      thresholdCm: r['thresholdCm'],
      windowHours: r['windowHours'],
      elevation: r['elevation'] === 'base' ? 'base' : 'top',
      enabled: r['enabled'] !== false,
    };
    if (typeof r['maxWindKmh'] === 'number') rule.maxWindKmh = r['maxWindKmh'];
    if (typeof r['maxTemperatureC'] === 'number') rule.maxTemperatureC = r['maxTemperatureC'];
    if (validateRule(rule).length === 0) rules.push(rule);
  }
  return rules;
}

/** Inicio de la hora (UTC) a la que pertenece un instante. */
export function startOfHour(ms: number): number {
  return Math.floor(ms / HOUR_MS) * HOUR_MS;
}

/** Separación sin nieve a partir de la cual dos nevadas son episodios distintos. */
export const EPISODE_GAP_HOURS = 12;

/**
 * Inicio (ms UTC) del episodio de nieve al que pertenece la primera hora con nieve de la ventana.
 * Un episodio es una racha de horas con nieve sin huecos de {@link EPISODE_GAP_HOURS} h o más.
 * Así, mientras la ventana se desliza hora a hora, la misma nevada conserva el mismo inicio y no
 * vuelve a avisar.
 */
export function snowEpisodeStart(
  points: readonly HourlyPoint[],
  windowStartMs: number,
  windowHours: number,
): number | null {
  const endMs = windowStartMs + windowHours * HOUR_MS;
  const snowy = points
    .filter((p) => p.snowfallCm !== null && p.snowfallCm > 0)
    .map((p) => p.time)
    .sort((a, b) => a - b);
  const first = snowy.find((t) => t >= windowStartMs && t < endMs);
  if (first === undefined) return null;
  let start = first;
  for (let i = snowy.indexOf(first) - 1; i >= 0; i--) {
    const t = snowy[i];
    if (t === undefined || start - t >= EPISODE_GAP_HOURS * HOUR_MS) break;
    start = t;
  }
  return start;
}

/** Clave del evento: estación + regla + inicio del episodio de nieve. */
export function eventKey(rule: AlertRule, episodeStartMs: number): string {
  return `${rule.stationId}|${rule.id}|${episodeStartMs}`;
}

function maxOf(values: readonly (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return nums.length === 0 ? null : Math.max(...nums);
}

/**
 * Evalúa una regla con la previsión de su estación. La ventana empieza en la hora en curso.
 * El umbral cuenta lo que haya de dato aunque la ventana esté incompleta; `complete` lo avisa.
 */
export function evaluateRule(
  rule: AlertRule,
  forecast: StationForecast,
  nowMs: number,
): RuleEvaluation {
  const points = (rule.elevation === 'base' ? forecast.base : forecast.top).hours;
  const windowStartMs = startOfHour(nowMs);
  const acc = accumulateSnow(points, windowStartMs, rule.windowHours);
  const endMs = windowStartMs + rule.windowHours * HOUR_MS;
  const inWindow = points.filter((p) => p.time >= windowStartMs && p.time < endMs);

  const windMaxKmh = maxOf(inWindow.map((p) => p.windKmh));
  const temperatureMaxC = maxOf(inWindow.map((p) => p.temperatureC));

  const windOk =
    rule.maxWindKmh === undefined || (windMaxKmh !== null && windMaxKmh <= rule.maxWindKmh);
  const tempOk =
    rule.maxTemperatureC === undefined ||
    (temperatureMaxC !== null && temperatureMaxC <= rule.maxTemperatureC);

  // "Más de X cm": estrictamente por encima del umbral.
  const thresholdMet = rule.thresholdCm > 0 && acc.totalCm > rule.thresholdCm;
  const conditionsMet = windOk && tempOk;
  const met = rule.enabled && thresholdMet && conditionsMet;
  const progress =
    rule.thresholdCm > 0 ? Math.min(1, Math.max(0, acc.totalCm / rule.thresholdCm)) : 0;

  const episode = met ? snowEpisodeStart(points, windowStartMs, rule.windowHours) : null;

  return {
    rule,
    windowStartMs,
    totalCm: acc.totalCm,
    complete: acc.complete,
    windMaxKmh,
    temperatureMaxC,
    thresholdMet,
    conditionsMet,
    met,
    progress,
    status: met ? 'cumplida' : progress > 0 ? 'en-curso' : 'pendiente',
    eventKey: episode === null ? null : eventKey(rule, episode),
  };
}

/** Registro de avisos ya enviados: clave de evento → momento del aviso (ms UTC). */
export type NotifiedLog = Readonly<Record<string, number>>;

/** Evaluaciones que cumplen la regla y cuyo evento todavía no se avisó. */
export function pickNewAlerts(
  evaluations: readonly RuleEvaluation[],
  log: NotifiedLog,
): RuleEvaluation[] {
  const seen = new Set<string>();
  return evaluations.filter((e) => {
    if (!e.met || e.eventKey === null) return false;
    if (e.eventKey in log || seen.has(e.eventKey)) return false;
    seen.add(e.eventKey);
    return true;
  });
}

/** Devuelve un registro nuevo con los eventos de `alerts` marcados como avisados. */
export function markNotified(
  log: NotifiedLog,
  alerts: readonly RuleEvaluation[],
  nowMs: number,
): NotifiedLog {
  const next: Record<string, number> = { ...log };
  for (const a of alerts) if (a.eventKey !== null) next[a.eventKey] = nowMs;
  return next;
}

/** Elimina del registro los avisos más antiguos que `maxAgeMs` (por defecto, 14 días). */
export function pruneLog(
  log: NotifiedLog,
  nowMs: number,
  maxAgeMs = MAX_WINDOW_HOURS * HOUR_MS,
): NotifiedLog {
  return Object.fromEntries(Object.entries(log).filter(([, at]) => nowMs - at <= maxAgeMs));
}

/**
 * Hasta cuántas horas por delante se programan avisos con la previsión ya descargada. Más allá de
 * 5 días la previsión cambia demasiado para avisar sin volver a consultarla.
 */
export const SCHEDULE_HORIZON_HOURS = 120;

/** Aviso que se cumplirá en el futuro según la previsión actual. */
export interface PlannedAlert {
  /** Evaluación de la regla en el instante `atMs`. */
  evaluation: RuleEvaluation;
  /** Momento (ms UTC, en punto) en que la regla pasará a cumplirse. */
  atMs: number;
}

/**
 * Primer momento futuro en que la regla se cumplirá con la previsión actual, para un evento que aún
 * no se avisó. Sirve para programar el aviso en el sistema y que llegue aunque la app esté cerrada
 * (Android). El evento que ya se cumple ahora no se programa: ese se avisa al momento.
 */
export function planUpcomingAlert(
  rule: AlertRule,
  forecast: StationForecast,
  nowMs: number,
  log: NotifiedLog,
  horizonHours = SCHEDULE_HORIZON_HOURS,
): PlannedAlert | null {
  if (!rule.enabled) return null;
  const current = evaluateRule(rule, forecast, nowMs).eventKey;
  const first = startOfHour(nowMs) + HOUR_MS;
  for (let h = 0; h < horizonHours; h++) {
    const atMs = first + h * HOUR_MS;
    const evaluation = evaluateRule(rule, forecast, atMs);
    if (!evaluation.met || evaluation.eventKey === null) continue;
    if (evaluation.eventKey === current || evaluation.eventKey in log) continue;
    return { evaluation, atMs };
  }
  return null;
}

/** Devuelve un registro nuevo con las claves de evento dadas marcadas como avisadas. */
export function markKeysNotified(
  log: NotifiedLog,
  keys: readonly { eventKey: string; atMs: number }[],
): NotifiedLog {
  const next: Record<string, number> = { ...log };
  for (const k of keys) next[k.eventKey] = k.atMs;
  return next;
}

/**
 * Identificador numérico estable de un evento (entero positivo de 31 bits, como pide Android).
 * El aviso inmediato y el programado del mismo evento comparten identificador, así que el sistema
 * muestra uno solo.
 */
export function notificationId(key: string): number {
  let hash = 0x811c9dc5; // FNV-1a de 32 bits
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 1 || 1) | 0;
}
