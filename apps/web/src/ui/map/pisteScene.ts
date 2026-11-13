/**
 * Geometría del mapa de pistas: proyección local alrededor de la estación y encuadre. TypeScript
 * puro, sin React ni navegador, para poder probarlo.
 */

export type Difficulty = 'green' | 'blue' | 'red' | 'black' | 'freeride' | 'unknown';
export type LonLat = readonly [number, number];

export interface RawPiste {
  d: Difficulty;
  n?: string;
  c: LonLat[];
}
export interface RawLift {
  k: string;
  n?: string;
  c: LonLat[];
}
export interface PisteData {
  pistes: RawPiste[];
  lifts: RawLift[];
}

/** Rectángulo en unidades de la escena. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Proyección local: 1° de latitud = 1000 unidades; la longitud se corrige con el coseno. */
export interface SceneProjection {
  lon0: number;
  lat0: number;
  kx: number;
}

export function makeProjection(station: { latitude: number; longitude: number }): SceneProjection {
  return {
    lon0: station.longitude,
    lat0: station.latitude,
    kx: Math.cos((station.latitude * Math.PI) / 180) * 1000,
  };
}

export function toXY(p: SceneProjection, lon: number, lat: number): [number, number] {
  return [(lon - p.lon0) * p.kx, (p.lat0 - lat) * 1000];
}

export function toPath(p: SceneProjection, pts: readonly LonLat[]): string {
  return pts
    .map(([lon, lat], i) => {
      const [x, y] = toXY(p, lon, lat);
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join('');
}

/** Valor por debajo del cual queda la fracción `f` (0 a 1) de los números dados. */
export function percentile(values: readonly number[], f: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((u, v) => u - v);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(f * sorted.length)))] ?? 0;
}

/**
 * Encuadre de la estación: la zona donde se concentran las pistas, sin contar las que quedan sueltas
 * lejos (el 2 % más externo por cada lado), con un margen.
 */
export function homeBox(p: SceneProjection, pistes: readonly RawPiste[]): Box {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const piste of pistes) {
    for (const [lon, lat] of piste.c) {
      const [x, y] = toXY(p, lon, lat);
      xs.push(x);
      ys.push(y);
    }
  }
  if (xs.length === 0) return { x: -10, y: -10, w: 20, h: 20 };
  const minX = percentile(xs, 0.02);
  const maxX = percentile(xs, 0.98);
  const minY = percentile(ys, 0.02);
  const maxY = percentile(ys, 0.98);
  const margin = Math.max(maxX - minX, maxY - minY) * 0.12;
  return {
    x: minX - margin,
    y: minY - margin,
    w: maxX - minX + 2 * margin,
    h: maxY - minY + 2 * margin,
  };
}

/** Ajusta una caja a la proporción del lienzo, sin deformar el mapa. */
export function fitBox(box: Box, ratio: number): Box {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  let w = box.w;
  let h = box.h;
  if (w / h < ratio) w = h * ratio;
  else h = w / ratio;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** Acerca (factor < 1) o aleja (> 1) la caja alrededor de un punto relativo (0 a 1) del lienzo. */
export function zoomBox(view: Box, home: Box, factor: number, fx = 0.5, fy = 0.5): Box {
  const w = Math.min(Math.max(view.w * factor, home.w / 40), home.w * 3);
  const h = (w / view.w) * view.h;
  return {
    x: view.x + view.w * fx - w * fx,
    y: view.y + view.h * fy - h * fy,
    w,
    h,
  };
}

/**
 * Kilómetros de pista esquiable: suma de la longitud de las pistas de descenso. Se excluye el fuera
 * de pista (no está preparado). Es una aproximación: sale de OpenStreetMap y puede contar dos veces
 * tramos que comparten trazado.
 */
export function pisteLengthKm(p: SceneProjection, pistes: readonly RawPiste[]): number {
  let units = 0;
  for (const piste of pistes) {
    if (piste.d === 'freeride') continue;
    let prev: [number, number] | undefined;
    for (const [lon, lat] of piste.c) {
      const xy = toXY(p, lon, lat);
      if (prev) units += Math.hypot(xy[0] - prev[0], xy[1] - prev[1]);
      prev = xy;
    }
  }
  return (units * 111.32) / 1000; // 1000 unidades = 1° de latitud = 111,32 km
}
