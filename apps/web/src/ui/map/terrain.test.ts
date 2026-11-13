import { describe, expect, it } from 'vitest';
import {
  contourSegments,
  distanceToLines,
  elevationAt,
  hillshade,
  resampleGrid,
  smoothGrid,
  shadeImage,
  type TerrainGrid,
} from './terrain';

/** Rampa que sube hacia el este: 0 m en la columna 0, 100 m por columna. */
function ramp(nx = 6, ny = 5): TerrainGrid {
  const z: number[] = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) z.push(i * 100);
  return { lon0: 1, lat0: 43, dLon: 0.001, dLat: 0.001, nx, ny, z };
}

describe('elevationAt', () => {
  it('interpola entre los puntos de la malla', () => {
    const g = ramp();
    expect(elevationAt(g, 1.0015, 42.998)).toBeCloseTo(150, 5);
  });
  it('devuelve undefined fuera de la malla', () => {
    expect(elevationAt(ramp(), 0.5, 43)).toBeUndefined();
    expect(elevationAt(ramp(), 1.002, 44)).toBeUndefined();
  });
});

describe('hillshade', () => {
  it('es uniforme en un terreno plano y está entre 0 y 1', () => {
    const g = ramp();
    g.z.fill(500);
    const s = hillshade(g, 43);
    expect(Math.max(...s) - Math.min(...s)).toBeCloseTo(0, 6);
    expect(s[0]).toBeGreaterThan(0);
    expect(s[0]).toBeLessThanOrEqual(1);
  });
  it('ilumina más una ladera que mira al oeste que una que mira al este', () => {
    const west = ramp(); // sube hacia el este: la ladera mira al oeste, hacia el sol
    const east = ramp();
    east.z = east.z.map((v) => 500 - v); // baja hacia el este: mira al este
    const mid = 2 * west.nx + 2;
    expect(hillshade(west, 43)[mid] ?? 0).toBeGreaterThan(hillshade(east, 43)[mid] ?? 0);
  });
});

describe('distanceToLines', () => {
  it('mide en celdas la distancia a una línea', () => {
    const g = ramp(8, 3);
    // línea vertical sobre la columna 0
    const d = distanceToLines(g, [
      [
        [1, 43],
        [1, 42.998],
      ],
    ]);
    expect(d[0]).toBe(0);
    expect(d[3]).toBeCloseTo(3, 5);
    expect(d[7]).toBeCloseTo(7, 5);
  });
});

describe('shadeImage', () => {
  it('deja opaco junto a las pistas y transparente lejos', () => {
    const g = ramp(20, 3);
    const img = shadeImage(g, 43, [[[1, 43]]], 5);
    expect(img.rgba[3]).toBeGreaterThan(200);
    expect(img.rgba[(g.nx - 1) * 4 + 3]).toBe(0);
  });
});

describe('contourSegments', () => {
  it('traza una curva por cada nivel que cruza la malla', () => {
    const g = ramp();
    const levels = contourSegments(g, 100).map((c) => c.level);
    expect(levels).toEqual([100, 200, 300, 400, 500]);
    const c200 = contourSegments(g, 100).find((c) => c.level === 200);
    // en una rampa, la curva de 200 m es una recta vertical en la columna 2
    expect(
      c200?.segments.every(([x1, , x2]) => Math.abs(x1 - 2) < 1e-9 && Math.abs(x2 - 2) < 1e-9),
    ).toBe(true);
  });
});

describe('suavizado y remuestreo', () => {
  const g: TerrainGrid = {
    lon0: 0,
    lat0: 1,
    dLon: 0.01,
    dLat: 0.01,
    nx: 3,
    ny: 3,
    z: [0, 0, 0, 0, 90, 0, 0, 0, 0],
  };
  it('el suavizado baja los picos y conserva el tamaño', () => {
    const s = smoothGrid(g, 1);
    expect(s.z.length).toBe(9);
    expect(s.z[4]).toBeLessThan(90);
    expect(s.z[4]).toBeGreaterThan(0);
  });
  it('el remuestreo duplica la resolución y respeta los puntos originales', () => {
    const r = resampleGrid(g, 2);
    expect(r.nx).toBe(5);
    expect(r.dLon).toBeCloseTo(0.005, 9);
    expect(r.z[2 * 5 + 2]).toBe(90);
    expect(r.z[2 * 5 + 3]).toBeCloseTo(45, 6);
    expect(resampleGrid(g, 1)).toBe(g);
  });
});
