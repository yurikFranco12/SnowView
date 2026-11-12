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
export {
  HOUR_MS,
  accumulateSnow,
  dailySnowfall,
  localDateKey,
  sumDays,
  type DailySnow,
  type SnowAccumulation,
} from './accumulation';
