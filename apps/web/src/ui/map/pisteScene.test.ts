import { describe, expect, it } from 'vitest';
import {
  fitBox,
  homeBox,
  makeProjection,
  percentile,
  toPath,
  toXY,
  zoomBox,
  type RawPiste,
} from './pisteScene';

const station = { latitude: 42, longitude: 1 };

describe('proyección local', () => {
  const p = makeProjection(station);
  it('pone la estación en el origen', () => {
    expect(toXY(p, 1, 42)).toEqual([0, 0]);
  });
  it('1° de latitud son 1000 unidades, y el norte queda arriba (y negativa)', () => {
    expect(toXY(p, 1, 41)[1]).toBeCloseTo(1000, 6);
    expect(toXY(p, 1, 43)[1]).toBeCloseTo(-1000, 6);
  });
  it('corrige la longitud con el coseno de la latitud', () => {
    expect(toXY(p, 2, 42)[0]).toBeCloseTo(Math.cos((42 * Math.PI) / 180) * 1000, 6);
  });
  it('escribe un trazo SVG', () => {
    expect(
      toPath(p, [
        [1, 42],
        [1, 41],
      ]),
    ).toBe('M0.0 0.0L0.0 1000.0');
  });
});

describe('percentile', () => {
  it('devuelve 0 sin datos y respeta los extremos', () => {
    expect(percentile([], 0.5)).toBe(0);
    expect(percentile([5, 1, 3], 0)).toBe(1);
    expect(percentile([5, 1, 3], 1)).toBe(5);
  });
});

describe('homeBox', () => {
  const p = makeProjection(station);
  const line = (lon: number, lat: number): RawPiste => ({ d: 'blue', c: [[lon, lat]] });
  it('ignora lo suelto lejos y deja margen', () => {
    const pistes: RawPiste[] = [];
    for (let i = 0; i < 100; i++) pistes.push(line(1 + i * 0.0001, 42 - i * 0.0001));
    pistes.push(line(5, 45)); // una pista perdida
    const box = homeBox(p, pistes);
    expect(box.w).toBeLessThan(50);
    expect(box.h).toBeLessThan(50);
  });
  it('sin pistas devuelve una caja por defecto', () => {
    expect(homeBox(p, []).w).toBe(20);
  });
});

describe('fitBox y zoomBox', () => {
  it('mantienen la proporción del lienzo', () => {
    const box = fitBox({ x: 0, y: 0, w: 10, h: 10 }, 2);
    expect(box.w / box.h).toBeCloseTo(2, 6);
    expect(box.x + box.w / 2).toBeCloseTo(5, 6);
  });
  it('acercar reduce la caja y mantiene el punto bajo el cursor', () => {
    const home = { x: 0, y: 0, w: 100, h: 50 };
    const z = zoomBox(home, home, 0.5, 0.25, 0.5);
    expect(z.w).toBe(50);
    expect(z.x + z.w * 0.25).toBeCloseTo(home.x + home.w * 0.25, 6);
  });
  it('no pasa de los límites de zoom', () => {
    const home = { x: 0, y: 0, w: 100, h: 50 };
    expect(zoomBox(home, home, 100).w).toBe(300);
    expect(zoomBox(home, home, 0.0001).w).toBe(2.5);
  });
});
