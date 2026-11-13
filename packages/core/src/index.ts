/**
 * @snowview/core — lógica pura de SnowView: modelos, unidades y acumulados de nieve.
 * Este paquete no importa nada de React, Tauri ni del navegador.
 */

/** Unidad en la que core/ trabaja siempre con la nieve. data/ normaliza a esta unidad. */
export const SNOW_UNIT = 'cm' as const;
export type SnowUnit = typeof SNOW_UNIT;

export type { Station, HourlyPoint, ElevationForecast, StationForecast } from './models';
export { parseLengthUnit, toCm, type LengthUnit } from './units';
export { describeWeatherCode, isSnowCode } from './weather';
export { formatDistanceKm, formatDuration, haversineKm, isValidLatLng, type LatLng } from './geo';
export {
  LIFT_HOURS,
  RATING_LABEL,
  RATING_LIMITS,
  RECENT_SNOW_HOURS,
  dayConditions,
  localHour,
  rateDay,
  ratingOf,
  type DayConditions,
  type DayRating,
  type Discipline,
  type Rating,
} from './conditions';
export {
  SEASON_END,
  SEASON_MONTHS,
  SEASON_START,
  SNOWY_DAY_CM,
  daysBetweenInclusive,
  seasonLabel,
  seasonOf,
  seasonRange,
  summarizeSeason,
  type DailySnowRecord,
  type SeasonSummary,
} from './season';
export {
  EPISODE_GAP_HOURS,
  MAX_WINDOW_HOURS,
  evaluateRule,
  eventKey,
  markNotified,
  parseRules,
  pickNewAlerts,
  pruneLog,
  snowEpisodeStart,
  startOfHour,
  validateRule,
  type AlertRule,
  type NotifiedLog,
  type RuleEvaluation,
  type RuleStatus,
} from './rules';
export {
  dailyOverview,
  significantWeatherCode,
  skyKind,
  windChillC,
  type DayOverview,
  type SkyKind,
} from './overview';
export {
  HOUR_MS,
  accumulateSnow,
  dailySnowfall,
  localDateKey,
  sumDays,
  type DailySnow,
  type SnowAccumulation,
} from './accumulation';
