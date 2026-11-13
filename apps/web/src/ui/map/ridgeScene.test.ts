import { describe, expect, it } from 'vitest';
import {
  buildRidgeMesh,
  drawOrder,
  fitCamera,
  project,
  projectMesh,
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
const cam: Camera = { yaw: 0, pitch: 0.6, scale: 1, cx: 0, cy: 0, persp: 0, ox: 0, oy: 0, oz: 0 };

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
  it('gira alrededor del punto de pivote', () => {
    const c = { ...cam, ox: 10, oy: 20, oz: 5, yaw: 1.3 };
    const [x, y] = project(c, 10, 20, 5);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(0, 6);
  });
  it('en media vuelta lo que estaba lejos queda cerca', () => {
    const a = project({ ...cam, yaw: 0 }, 0, 100, 0)[2];
    const b = project({ ...cam, yaw: Math.PI }, 0, 100, 0)[2];
    expect(a).toBeCloseTo(-b, 6);
  });
  it('el ajuste mete la malla en el lienzo desde cualquier giro', () => {
    const mesh = buildRidgeMesh(grid, 42, [[[1.002, 41.998]]], 10, 2);
    const fit = fitCamera(cam, mesh, 800, 400);
    const xs = new Float32Array(mesh.x.length);
    const ys = new Float32Array(mesh.x.length);
    for (let yaw = 0; yaw < Math.PI * 2; yaw += 0.5) {
      for (const pitch of [0.3, 0.9]) {
        projectMesh({ ...fit, yaw, pitch }, mesh, xs, ys);
        for (let k = 0; k < xs.length; k++) {
          expect(xs[k]).toBeGreaterThanOrEqual(0);
          expect(xs[k]).toBeLessThanOrEqual(800);
          expect(ys[k]).toBeGreaterThanOrEqual(0);
          expect(ys[k]).toBeLessThanOrEqual(400);
        }
      }
    }
  });
});

describe('orden de dibujo', () => {
  it('mirando al norte se dibujan las filas de norte a sur', () => {
    const o = drawOrder(0, 4, 3);
    expect(o.axis).toBe('row');
    expect(o.lines).toEqual([0, 1, 2]);
  });
  it('mirando al sur, al revés', () => {
    expect(drawOrder(Math.PI, 4, 3).lines).toEqual([2, 1, 0]);
  });
  it('de lado se dibujan columnas', () => {
    expect(drawOrder(Math.PI / 2, 4, 3)).toEqual({ axis: 'col', lines: [3, 2, 1, 0] });
    expect(drawOrder(-Math.PI / 2, 4, 3)).toEqual({ axis: 'col', lines: [0, 1, 2, 3] });
  });
  it('siempre va de lejos a cerca', () => {
    const mesh = buildRidgeMesh(grid, 42, [[[1.002, 41.998]]], 10, 2);
    for (let yaw = -7; yaw < 7; yaw += 0.37) {
      const { axis, lines } = drawOrder(yaw, mesh.nx, mesh.ny);
      const depths = lines.map((l) => {
        const k = axis === 'row' ? l * mesh.nx + 2 : 2 * mesh.nx + l;
        return project({ ...cam, yaw }, mesh.x[k] ?? 0, mesh.y[k] ?? 0, 0)[2];
      });
      for (let n = 1; n < depths.length; n++) {
        expect(depths[n] ?? 0).toBeLessThanOrEqual(depths[n - 1] ?? 0);
      }
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
    expect(visibleRuns(mesh, 0, 'col')).toEqual([[0, 4]]);
  });
});
