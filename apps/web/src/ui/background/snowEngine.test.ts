import { describe, expect, it } from 'vitest';
import {
  MAX_DT_SECONDS,
  createSnowField,
  flakeCount,
  spawnFlake,
  stepSnowField,
  type Random,
} from './snowEngine';

/** Generador pseudoaleatorio determinista para que los tests sean reproducibles. */
function seeded(seed: number): Random {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('snowEngine', () => {
  it('ajusta el número de copos al área y a la intensidad', () => {
    expect(flakeCount(1280, 820, 1)).toBe(180);
    expect(flakeCount(1280, 820, 0.5)).toBe(90);
    expect(flakeCount(640, 820, 1)).toBe(90);
    expect(flakeCount(1280, 820, 0)).toBe(0);
  });

  it('las capas cercanas son más grandes y rápidas que las lejanas', () => {
    const random = seeded(1);
    const flakes = Array.from({ length: 2000 }, () => spawnFlake(100, 100, true, random));
    const avg = (layer: number, key: 'r' | 'v') => {
      const sel = flakes.filter((f) => f.layer === layer);
      return sel.reduce((s, f) => s + f[key], 0) / sel.length;
    };
    expect(avg(0, 'r')).toBeLessThan(avg(1, 'r'));
    expect(avg(1, 'r')).toBeLessThan(avg(2, 'r'));
    expect(avg(0, 'v')).toBeLessThan(avg(1, 'v'));
    expect(avg(1, 'v')).toBeLessThan(avg(2, 'v'));
  });

  it('limita el delta-time a 50 ms', () => {
    const field = createSnowField(1280, 820, 1, seeded(2));
    const before = field.flakes.map((f) => f.y);
    stepSnowField(field, 5, seeded(3)); // un "frame" de 5 s, por ejemplo tras una pausa
    expect(field.time).toBeCloseTo(MAX_DT_SECONDS);
    field.flakes.forEach((f, i) => {
      const prev = before[i] ?? 0;
      if (f.y >= prev) expect(f.y - prev).toBeLessThanOrEqual(f.v * MAX_DT_SECONDS + 1e-9);
    });
  });

  it('los copos que salen por abajo reaparecen arriba (bucle continuo)', () => {
    const field = createSnowField(200, 100, 1, seeded(4));
    const first = field.flakes[0];
    if (!first) throw new Error('sin copos');
    first.y = 109.9;
    first.v = 100;
    stepSnowField(field, 0.05, seeded(5));
    expect(field.flakes[0]?.y).toBe(-10);
    expect(field.flakes.length).toBe(flakeCount(200, 100, 1));
  });

  it('ignora delta-time negativos', () => {
    const field = createSnowField(200, 100, 1, seeded(6));
    stepSnowField(field, -1);
    expect(field.time).toBe(0);
  });
});
