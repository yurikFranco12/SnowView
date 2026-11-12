/**
 * @snowview/data — previsión, estaciones, errores y límite de peticiones.
 *
 * La UI solo depende de este paquete, nunca de un proveedor concreto, para poder cambiar de
 * proveedor de previsión sin tocar las pantallas.
 *
 * Proveedor actual: Open-Meteo (https://open-meteo.com), sin clave de API.
 * LICENCIA: uso gratuito solo no comercial; datos CC BY 4.0, hay que citar la fuente en la app.
 * Si SnowView se distribuye con fines comerciales, hay que contratar un plan o cambiar de
 * proveedor. Ver README.md.
 */
import { SNOW_UNIT } from '@snowview/core';

export const FORECAST_PROVIDER = {
  id: 'open-meteo',
  name: 'Open-Meteo',
  url: 'https://open-meteo.com',
  attribution: 'Datos meteorológicos de Open-Meteo.com (CC BY 4.0)',
  freeUse: 'non-commercial',
} as const;

/** Unidad a la que data/ normaliza toda la nieve antes de entregarla. */
export const NORMALIZED_SNOW_UNIT = SNOW_UNIT;

export { ForecastError, isForecastError, type ForecastErrorKind } from './errors';
export { RateLimiter } from './rateLimiter';
export type { ForecastProvider, ForecastRequestOptions } from './provider';
export {
  FORECAST_DAYS,
  OPEN_METEO_ATTRIBUTION,
  buildForecastUrl,
  createOpenMeteoProvider,
  parseForecastResponse,
  type OpenMeteoOptions,
} from './openMeteo';
export {
  FIELD_MASK,
  GOOGLE_ROUTES_URL,
  buildRoutesBody,
  createGoogleRoutesProvider,
  decodePolyline,
  parseMoney,
  parseRoutesResponse,
  type GoogleRoutesOptions,
  type Money,
  type RouteResult,
  type RoutesProvider,
  type TollInfo,
  type TravelMode,
} from './routes';
export {
  ARCHIVE_DELAY_DAYS,
  buildHistoryUrl,
  createOpenMeteoHistory,
  parseHistoryResponse,
  type HistoryProvider,
  type OpenMeteoHistoryOptions,
} from './history';
export {
  MIN_REFRESH_SECONDS,
  WEBCAMS,
  getWebcams,
  parseWebcams,
  stationsWithWebcams,
  type Webcam,
} from './webcams';
export {
  STATIONS,
  getStation,
  parseStations,
  searchStations,
  type CuratedStation,
} from './stations';
