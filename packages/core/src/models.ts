/** Modelos del dominio de SnowView. Independientes del proveedor de previsión. */

/** Estación de esquí de la lista curada (`stations/`). */
export interface Station {
  id: string;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  /** Cota de la base, en metros. */
  baseElevationM: number;
  /** Cota de la cima, en metros. */
  topElevationM: number;
  /** Zona horaria IANA, para agrupar por días locales (p. ej. "Europe/Madrid"). */
  timeZone: string;
}

/** Una hora de previsión. Cualquier valor puede faltar (null) si el proveedor no lo da. */
export interface HourlyPoint {
  /** Inicio de la hora, en milisegundos UTC. */
  time: number;
  /** Nieve caída en esa hora, en cm. */
  snowfallCm: number | null;
  /** Grosor de nieve en el suelo, en cm. */
  snowDepthCm: number | null;
  temperatureC: number | null;
  windKmh: number | null;
  gustKmh: number | null;
  /** Código de tiempo WMO. */
  weatherCode: number | null;
  /**
   * Altitud de la isoterma de 0 °C, en metros. Opcional: las previsiones guardadas por versiones
   * anteriores de la app no lo traen.
   */
  freezingLevelM?: number | null;
}

/** Previsión a una cota concreta. */
export interface ElevationForecast {
  elevationM: number;
  hours: HourlyPoint[];
}

/** Previsión completa de una estación: base y cima. */
export interface StationForecast {
  stationId: string;
  /** Momento en que se obtuvo, en milisegundos UTC. */
  fetchedAt: number;
  base: ElevationForecast;
  top: ElevationForecast;
  /** Atribución que la UI debe mostrar (licencia de los datos). */
  attribution: string;
}

/**
 * Resumen ligero de una estación en la cima: lo justo para ordenar muchas estaciones a la vez sin
 * pedir la previsión completa de cada una.
 */
export interface StationSnapshot {
  stationId: string;
  /** Momento en que se obtuvo, en milisegundos UTC. */
  fetchedAt: number;
  /** Nieve prevista en la cima cada día local, en cm; el primero es hoy. */
  dailySnowCm: (number | null)[];
  /** Tiempo actual en la cima. */
  temperatureC: number | null;
  weatherCode: number | null;
  snowDepthCm: number | null;
}
