/** Conversión de longitudes a centímetros, la unidad interna de SnowView para la nieve. */

export type LengthUnit = 'cm' | 'mm' | 'm';

const TO_CM: Record<LengthUnit, number> = { mm: 0.1, cm: 1, m: 100 };

/** Normaliza la cadena de unidad que dan los proveedores ("cm", "mm", "m", con espacios o mayúsculas). */
export function parseLengthUnit(raw: string): LengthUnit | null {
  const unit = raw.trim().toLowerCase();
  return unit === 'cm' || unit === 'mm' || unit === 'm' ? unit : null;
}

/** Convierte a cm. Conserva null y descarta valores no finitos (NaN, Infinity) como null. */
export function toCm(value: number | null, unit: LengthUnit): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return value * TO_CM[unit];
}
