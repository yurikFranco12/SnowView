/**
 * Geometría de la vista 3D de líneas de la montaña: malla en metros a partir de la malla de
 * altitudes y cámara (giro, inclinación y algo de perspectiva). TypeScript puro, sin navegador,
 * para poder probarlo.
 */
import { distanceToLines, elevationAt, type TerrainGrid } from './terrain';

const M_PER_DEG = 111_320;

export interface RidgeMesh {
  nx: number;
  ny: number;
  /** Metros al este y al norte del centro de la malla, y altitud con la exageración aplicada. */
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  /** Altitud real (m) de cada punto. */
  h: Float32Array;
  /** true si el punto está lo bastante cerca de las pistas como para dibujarse. */
  visible: Uint8Array;
  zMin: number;
  zMax: number;
  cellX: number;
  cellY: number;
  exaggeration: number;
}

export function buildRidgeMesh(
  g: TerrainGrid,
  latitude: number,
  lines: readonly (readonly (readonly [number, number])[])[],
  reachCells: number,
  exaggeration = 2.4,
): RidgeMesh {
  const cellX = g.dLon * M_PER_DEG * Math.cos((latitude * Math.PI) / 180);
  const cellY = g.dLat * M_PER_DEG;
  const dist = distanceToLines(g, lines);
  const n = g.nx * g.ny;
  const mesh: RidgeMesh = {
    nx: g.nx,
    ny: g.ny,
    x: new Float32Array(n),
    y: new Float32Array(n),
    z: new Float32Array(n),
    h: new Float32Array(n),
    visible: new Uint8Array(n),
    zMin: Infinity,
    zMax: -Infinity,
    cellX,
    cellY,
    exaggeration,
  };
  for (const v of g.z) {
    mesh.zMin = Math.min(mesh.zMin, v);
    mesh.zMax = Math.max(mesh.zMax, v);
  }
  if (!Number.isFinite(mesh.zMin)) {
    mesh.zMin = 0;
    mesh.zMax = 0;
  }
  for (let j = 0; j < g.ny; j++) {
    for (let i = 0; i < g.nx; i++) {
      const k = j * g.nx + i;
      const h = g.z[k] ?? mesh.zMin;
      mesh.x[k] = (i - (g.nx - 1) / 2) * cellX;
      mesh.y[k] = ((g.ny - 1) / 2 - j) * cellY; // j crece hacia el sur
      mesh.z[k] = (h - mesh.zMin) * exaggeration;
      mesh.h[k] = h;
      mesh.visible[k] = (dist[k] ?? 1e9) <= reachCells ? 1 : 0;
    }
  }
  return mesh;
}

/** Posición en el mundo de un punto geográfico, apoyado sobre la superficie; undefined si no hay terreno. */
export function worldPoint(
  mesh: RidgeMesh,
  g: TerrainGrid,
  lon: number,
  lat: number,
  lift = 0,
): [number, number, number] | undefined {
  const h = elevationAt(g, lon, lat);
  if (h === undefined) return undefined;
  const fi = (lon - g.lon0) / g.dLon;
  const fj = (g.lat0 - lat) / g.dLat;
  return [
    (fi - (g.nx - 1) / 2) * mesh.cellX,
    ((g.ny - 1) / 2 - fj) * mesh.cellY,
    (h - mesh.zMin) * mesh.exaggeration + lift,
  ];
}

export interface Camera {
  /** Giro alrededor de la vertical, en radianes (0 = mirando al norte desde el sur). */
  yaw: number;
  /** Inclinación sobre el horizonte, en radianes. */
  pitch: number;
  scale: number;
  cx: number;
  cy: number;
  /** Perspectiva: lo lejano se ve más pequeño (1/m de profundidad). */
  persp: number;
}

/** Proyecta un punto del mundo a pantalla: [x, y, profundidad]; más profundidad = más lejos. */
export function project(cam: Camera, x: number, y: number, z: number): [number, number, number] {
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const xr = x * cy - y * sy;
  const yr = x * sy + y * cy;
  const f = 1 / Math.max(0.3, 1 + yr * cam.persp);
  const sx = xr * f;
  const up = z * Math.cos(cam.pitch) + yr * Math.sin(cam.pitch);
  return [cam.cx + sx * cam.scale, cam.cy - up * f * cam.scale, yr];
}

/** Escala y centra la cámara para que todos los puntos quepan en el lienzo, con margen. */
export function fitCamera(
  base: Camera,
  mesh: RidgeMesh,
  width: number,
  height: number,
  margin = 0.78,
): Camera {
  const unit: Camera = { ...base, scale: 1, cx: 0, cy: 0 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  // Se mide con el giro extremo y sin él, para que el vaivén no recorte los bordes.
  for (const yaw of [-Math.abs(base.yaw), 0, Math.abs(base.yaw)]) {
    for (let k = 0; k < mesh.x.length; k++) {
      if (!mesh.visible[k]) continue;
      const [sx, sy] = project({ ...unit, yaw }, mesh.x[k] ?? 0, mesh.y[k] ?? 0, mesh.z[k] ?? 0);
      minX = Math.min(minX, sx);
      maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy);
      maxY = Math.max(maxY, sy);
    }
  }
  if (!Number.isFinite(minX)) return { ...base, cx: width / 2, cy: height / 2 };
  const scale = Math.min(width / (maxX - minX), height / (maxY - minY)) * margin;
  return {
    ...base,
    scale,
    cx: width / 2 - ((minX + maxX) / 2) * scale,
    cy: height / 2 - ((minY + maxY) / 2) * scale,
  };
}

/** Tramos consecutivos de puntos visibles de una fila de la malla: [desde, hasta] inclusive. */
export function visibleRuns(mesh: RidgeMesh, row: number): [number, number][] {
  const runs: [number, number][] = [];
  let start = -1;
  for (let i = 0; i < mesh.nx; i++) {
    const on = mesh.visible[row * mesh.nx + i] === 1;
    if (on && start < 0) start = i;
    if ((!on || i === mesh.nx - 1) && start >= 0) {
      const end = on ? i : i - 1;
      if (end > start) runs.push([start, end]);
      start = -1;
    }
  }
  return runs;
}
