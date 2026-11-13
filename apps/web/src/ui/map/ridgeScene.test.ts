import { describe, expect, it } from 'vitest';
import {
  buildRidgeMesh,
  fitCamera,
  project,
  visibleRuns,
  worldPoint,
  type Camera,
} from './ridgeScene';
import type { TerrainGrid } from './terrain';

const grid: TerrainGrid = {
  lon0: 1,
  lat0: 42,
  dLon: 0.001,
  dLat: 0.001,
  nx: 5,
  ny: 5,
  // pico en el centro
  z: [
    1000, 1000, 1000, 1000, 1000, 1000, 1100, 1200, 1100, 1000, 1000, 1200, 1500, 1200, 1000, 1000,
    1100, 1200, 1100, 1000, 1000, 1000, 1000, 1000, 1000,
  ],
};
const cam: Camera = { yaw: 0, pitch: 0.6, scale: 1, cx: 0, cy: 0, persp: 0 };

describe('malla de relieve', () => {
  const mesh = buildRidgeMesh(grid, 42, [[[1.002, 41.998]]], 10, 2);
  it('centra la malla y exagera la altura', () => {
    expect(mesh.x[2 * 5 + 2]).toBeCloseTo(0, 6);
    expect(mesh.y[2 * 5 + 2]).toBeCloseTo(0, 6);
    expect(mesh.z[2 * 5 + 2]).toBe((1500 - 1000) * 2);
    expect(mesh.zMax).toBe(1500);
  });
  it('el norte queda en y positiva', () => {
    expect((mesh.y[0] ?? 0) > (mesh.y[20] ?? 0)).toBe(true);
  });
  it('coloca un punto geográfico sobre la superficie', () => {
    const p = worldPoint(mesh, grid, 1.002, 41.998, 5);
    expect(p?.[0]).toBeCloseTo(0, 3);
    expect(p?.[2]).toBeCloseTo(1005, 3);
    expect(worldPoint(mesh, grid, 5, 5)).toBeUndefined();
  });
});

describe('cámara', () => {
  it('lo lejano (norte) queda más arriba y con más profundidad', () => {
    const near = project(cam, 0, -100, 0);
    const far = project(cam, 0, 100, 0);
    expect(far[1]).toBeLessThan(near[1]);
    expect(far[2]).toBeGreaterThan(near[2]);
  });
  it('lo alto queda más arriba en pantalla', () => {
    expect(project(cam, 0, 0, 100)[1]).toBeLessThan(project(cam, 0, 0, 0)[1]);
  });
  it('la perspectiva achica lo lejano', () => {
    const p = { ...cam, persp: 0.001 };
    expect(Math.abs(project(p, 100, 500, 0)[0])).toBeLessThan(
      Math.abs(project(p, 100, -500, 0)[0]),
    );
  });
  it('el ajuste mete la malla en el lienzo', () => {
    const mesh = buildRidgeMesh(grid, 42, [[[1.002, 41.998]]], 10, 2);
    const fit = fitCamera(cam, mesh, 800, 400);
    for (let k = 0; k < mesh.x.length; k++) {
      const [sx, sy] = project(fit, mesh.x[k] ?? 0, mesh.y[k] ?? 0, mesh.z[k] ?? 0);
      expect(sx).toBeGreaterThanOrEqual(0);
      expect(sx).toBeLessThanOrEqual(800);
      expect(sy).toBeGreaterThanOrEqual(0);
      expect(sy).toBeLessThanOrEqual(400);
    }
  });
});

describe('tramos visibles', () => {
  it('separa los tramos y descarta puntos sueltos', () => {
    const mesh = buildRidgeMesh(grid, 42, [[[1.002, 41.998]]], 10, 2);
    mesh.visible.fill(0);
    [0, 1, 2, 4].forEach((i) => (mesh.visible[i] = 1));
    expect(visibleRuns(mesh, 0)).toEqual([[0, 2]]);
    mesh.visible.fill(1);
    expect(visibleRuns(mesh, 0)).toEqual([[0, 4]]);
  });
});
