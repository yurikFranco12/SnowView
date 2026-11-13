import { describe, expect, it } from 'vitest';
import { normalizeText } from './CommandPalette';
import { linePath, niceMax } from './HourlyChart';

describe('niceMax', () => {
  it('sube al siguiente tope redondo', () => {
    expect(niceMax(0.3, 1)).toBe(1);
    expect(niceMax(1.2, 1)).toBe(2);
    expect(niceMax(3.4, 1)).toBe(5);
    expect(niceMax(7, 1)).toBe(10);
    expect(niceMax(63, 40)).toBe(100);
  });
  it('respeta el mínimo', () => {
    expect(niceMax(0, 40)).toBe(50);
    expect(niceMax(12, 40)).toBe(50);
  });
});

describe('linePath', () => {
  const x = (i: number) => i * 10;
  const y = (v: number) => 100 - v;
  it('une los puntos seguidos', () => {
    expect(linePath([1, 2, 3], x, y)).toBe('M0.0 99.0L10.0 98.0L20.0 97.0');
  });
  it('corta la línea donde faltan datos', () => {
    expect(linePath([1, null, 3, 4], x, y)).toBe('M0.0 99.0M20.0 97.0L30.0 96.0');
  });
  it('sin datos no dibuja nada', () => {
    expect(linePath([null, null], x, y)).toBe('');
  });
});

describe('normalizeText', () => {
  it('quita tildes, mayúsculas y espacios de los extremos', () => {
    expect(normalizeText('  Candanchú ')).toBe('candanchu');
    expect(normalizeText('ESTACIÓN')).toBe('estacion');
  });
});
