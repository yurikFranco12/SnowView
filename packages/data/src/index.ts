/**
 * @snowview/data — clientes de API, caché, normalización y errores (Fase 1b).
 *
 * La UI solo depende de este paquete, nunca de un proveedor concreto, para poder cambiar de
 * proveedor de previsión sin tocar las pantallas.
 */
import { SNOW_UNIT } from '@snowview/core';

/**
 * Proveedor de previsión: Open-Meteo (https://open-meteo.com), sin clave de API.
 *
 * LICENCIA: el uso gratuito de la API de Open-Meteo es solo para fines no comerciales.
 * Los datos se publican bajo CC BY 4.0 y hay que citar la fuente en la app.
 * Si SnowView se distribuye con fines comerciales, hay que contratar un plan de pago o cambiar de
 * proveedor. Ver README.md.
 */
export const FORECAST_PROVIDER = {
  id: 'open-meteo',
  name: 'Open-Meteo',
  url: 'https://open-meteo.com',
  attribution: 'Datos meteorológicos de Open-Meteo.com (CC BY 4.0)',
  freeUse: 'non-commercial',
} as const;

/** Unidad a la que data/ normaliza toda la nieve antes de entregarla. */
export const NORMALIZED_SNOW_UNIT = SNOW_UNIT;
