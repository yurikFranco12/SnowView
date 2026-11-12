import { describe, expect, it } from 'vitest';
import { parseLengthUnit, toCm } from './units';

describe('unidades', () => {
  it('convierte mm, cm y m a cm', () => {
    expect(toCm(12, 'mm')).toBeCloseTo(1.2);
    expect(toCm(3, 'cm')).toBe(3);
    expect(toCm(0.45, 'm')).toBeCloseTo(45);
  });

  it('conserva null y descarta valores no finitos', () => {
    expect(toCm(null, 'cm')).toBeNull();
    expect(toCm(Number.NaN, 'm')).toBeNull();
    expect(toCm(Number.POSITIVE_INFINITY, 'mm')).toBeNull();
  });

  it('interpreta las cadenas de unidad del proveedor', () => {
    expect(parseLengthUnit('cm')).toBe('cm');
    expect(parseLengthUnit(' M ')).toBe('m');
    expect(parseLengthUnit('inch')).toBeNull();
  });
});
