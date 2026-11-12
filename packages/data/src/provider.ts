import type { Station, StationForecast } from '@snowview/core';

export interface ForecastRequestOptions {
  /** Permite cancelar la petición (TanStack Query lo pasa al cambiar de pantalla). */
  signal?: AbortSignal;
}

/**
 * Proveedor de previsión. La UI solo conoce esta interfaz: cambiar de Open-Meteo a otro proveedor
 * es escribir otra implementación, sin tocar las pantallas.
 */
export interface ForecastProvider {
  readonly id: string;
  /** Texto de atribución que la UI debe mostrar junto a los datos. */
  readonly attribution: string;
  getForecast(station: Station, options?: ForecastRequestOptions): Promise<StationForecast>;
}
