import { describe, expect, it } from 'vitest';
import {
  MAP_H,
  MAP_W,
  MAX_ZOOM,
  SPAIN_VIEW,
  fitView,
  layerOpacity,
  metersToUnits,
  project,
  screenToBase,
  unproject,
  stationView,
  toScreen,
  zoomForSpan,
} from './projection';

describe('project', () => {
  it('pone el meridiano 0 y el ecuador en el centro del lienzo base', () => {
    const [x, y] = project(0, 0);
    expect(x).toBeCloseTo(MAP_W / 2, 6);
    expect(y).toBeCloseTo(MAP_H / 2, 6);
  });

  it('el este queda a la derecha y el norte arriba', () => {
    const [x0, y0] = project(0, 0);
    const [x1, y1] = project(10, 10);
    expect(x1).toBeGreaterThan(x0);
    expect(y1).toBeLessThan(y0);
  });

  it('el mundo entero mide 1000 unidades de ancho', () => {
    expect(project(180, 0)[0] - project(-180, 0)[0]).toBeCloseTo(MAP_W, 6);
  });
});

describe('vistas', () => {
  it('el centro de una vista cae en el centro de la pantalla', () => {
    for (const view of [SPAIN_VIEW, stationView(0.93, 42.7)]) {
      const [sx, sy] = toScreen([view.x, view.y], view);
      expect(sx).toBeCloseTo(MAP_W / 2, 6);
      expect(sy).toBeCloseTo(MAP_H / 2, 6);
    }
  });

  it('la vista de una estación acerca mucho más que la de España', () => {
    expect(stationView(0.93, 42.7).zoom).toBeGreaterThan(SPAIN_VIEW.zoom * 8);
  });

  it('zoomForSpan: media circunferencia llena el ancho con zoom 0,8 × 2 ...', () => {
    expect(zoomForSpan(360, 1)).toBeCloseTo(1, 9);
    expect(zoomForSpan(1.2)).toBeCloseTo(240, 6);
  });
});

describe('fitView', () => {
  const madrid = { latitude: 40.4168, longitude: -3.7038 };
  const baqueira = { latitude: 42.6996, longitude: 0.93165 };

  it('deja todos los puntos dentro del lienzo', () => {
    const view = fitView([madrid, baqueira]);
    for (const p of [madrid, baqueira]) {
      const [sx, sy] = toScreen(project(p.longitude, p.latitude), view);
      expect(sx).toBeGreaterThan(0);
      expect(sx).toBeLessThan(MAP_W);
      expect(sy).toBeGreaterThan(0);
      expect(sy).toBeLessThan(MAP_H);
    }
  });

  it('con un solo punto no pasa del zoom máximo', () => {
    expect(fitView([baqueira]).zoom).toBe(MAX_ZOOM);
  });

  it('sin puntos vuelve a la vista de España', () => {
    expect(fitView([])).toEqual(SPAIN_VIEW);
  });
});

describe('layerOpacity', () => {
  it('va de 0 a 1 entre dos zooms y se queda en los extremos', () => {
    expect(layerOpacity(1, 2, 8)).toBe(0);
    expect(layerOpacity(2, 2, 8)).toBeCloseTo(0, 9);
    expect(layerOpacity(4, 2, 8)).toBeCloseTo(0.5, 9);
    expect(layerOpacity(100, 2, 8)).toBe(1);
  });

  it('también sirve para desvanecer (from mayor que to)', () => {
    expect(layerOpacity(2, 8, 2)).toBe(1);
    expect(layerOpacity(100, 8, 2)).toBe(0);
  });
});

describe('metros y unidades', () => {
  it('a mayor latitud, la misma distancia ocupa más unidades', () => {
    expect(metersToUnits(10_000, 60)).toBeGreaterThan(metersToUnits(10_000, 0));
    // cos(60°) = 0,5: el doble de unidades
    expect(metersToUnits(10_000, 60) / metersToUnits(10_000, 0)).toBeCloseTo(2, 6);
  });

  it('el ecuador mide 40.075 m por unidad', () => {
    expect(metersToUnits(40_075, 0)).toBeCloseTo(1, 2);
  });
});

describe('unproject y screenToBase', () => {
  it('unproject deshace a project', () => {
    const [x, y] = project(-3.3667, 43.3167);
    const back = unproject(x, y);
    expect(back?.longitude).toBeCloseTo(-3.3667, 6);
    expect(back?.latitude).toBeCloseTo(43.3167, 6);
  });

  it('un clic en el centro de la pantalla es el centro de la vista', () => {
    const view = stationView(-3.3667, 43.3167);
    const [bx, by] = screenToBase([MAP_W / 2, MAP_H / 2], view);
    expect(bx).toBeCloseTo(view.x, 6);
    expect(by).toBeCloseTo(view.y, 6);
  });

  it('screenToBase y toScreen son inversas', () => {
    const view = fitView([
      { latitude: 40, longitude: -3 },
      { latitude: 43, longitude: 1 },
    ]);
    const base: [number, number] = [510, 130];
    const [sx, sy] = toScreen(base, view);
    const [bx, by] = screenToBase([sx, sy], view);
    expect(bx).toBeCloseTo(base[0], 6);
    expect(by).toBeCloseTo(base[1], 6);
  });
});
