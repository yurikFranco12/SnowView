/**
 * @snowview/core — lógica pura de SnowView.
 *
 * Aquí vivirán los modelos, el cálculo de acumulados y la evaluación de reglas (Fase 1b y 1c).
 * Este paquete no importa nada de React, Tauri ni del navegador.
 */

/** Unidad en la que core/ trabaja siempre con la nieve. data/ normaliza a esta unidad. */
export const SNOW_UNIT = 'cm' as const;

export type SnowUnit = typeof SNOW_UNIT;
