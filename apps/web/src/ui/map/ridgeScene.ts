/**
 * Geometría de la vista 3D de líneas de la montaña: malla en metros a partir de la malla de
 * altitudes, cámara con giro completo de 360° (giro, inclinación y algo de perspectiva) y el orden
 * de dibujo de lejos a cerca. TypeScript puro, sin navegador, para poder probarlo.
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
  /** 1 si el punto está lo bastante cerca de las pistas como para dibujarse. */
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
  /** Giro alrededor de la vertical, en radianes (0 = mirando al norte desde el sur). Sin límite. */
  yaw: number;
  /** Inclinación sobre el horizonte, en radianes. */
  pitch: number;
  scale: number;
  /** Centro del lienzo, en píxeles. */
  cx: number;
  cy: number;
  /** Perspectiva: lo lejano se ve más pequeño (1/m de profundidad). */
  persp: number;
  /** Punto del mundo que queda en el centro del lienzo y sobre el que gira la cámara. */
  ox: number;
  oy: number;
  oz: number;
}

type Out = { [i: number]: number };

function projectTo(cam: Camera, x: number, y: number, z: number, out: Out): void {
  const dx = x - cam.ox;
  const dy = y - cam.oy;
  const dz = z - cam.oz;
  const c = Math.cos(cam.yaw);
  const s = Math.sin(cam.yaw);
  const xr = dx * c - dy * s;
  const yr = dx * s + dy * c;
  const f = 1 / Math.max(0.3, 1 + yr * cam.persp);
  const up = dz * Math.cos(cam.pitch) + yr * Math.sin(cam.pitch);
  out[0] = cam.cx + xr * f * cam.scale;
  out[1] = cam.cy - up * f * cam.scale;
  out[2] = yr;
}

/** Proyecta un punto del mundo a pantalla: [x, y, profundidad]; más profundidad = más lejos. */
export function project(cam: Camera, x: number, y: number, z: number): [number, number, number] {
  const out: [number, number, number] = [0, 0, 0];
  projectTo(cam, x, y, z, out);
  return out;
}

/**
 * Proyector para una cámara fija: las constantes trigonométricas se calculan una sola vez, no por
 * punto. Escribe [x, y, profundidad] en `out`.
 */
export function makeProjector(cam: Camera): (x: number, y: number, z: number, out: Out) => void {
  const c = Math.cos(cam.yaw);
  const s = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const { ox, oy, oz, persp, scale, cx, cy } = cam;
  return (x, y, z, out) => {
    const dx = x - ox;
    const dy = y - oy;
    const dz = z - oz;
    const yr = dx * s + dy * c;
    const f = scale / Math.max(0.3, 1 + yr * persp);
    out[0] = cx + (dx * c - dy * s) * f;
    out[1] = cy - (dz * cp + yr * sp) * f;
    out[2] = yr;
  };
}

/** Proyecta la malla de una vez; se salta los puntos que no se dibujan. */
export function projectMesh(
  cam: Camera,
  mesh: RidgeMesh,
  outX: Float32Array,
  outY: Float32Array,
): void {
  const proj = makeProjector(cam);
  const tmp: [number, number, number] = [0, 0, 0];
  for (let k = 0; k < mesh.x.length; k++) {
    if (!mesh.visible[k]) continue;
    proj(mesh.x[k] ?? 0, mesh.y[k] ?? 0, mesh.z[k] ?? 0, tmp);
    outX[k] = tmp[0];
    outY[k] = tmp[1];
  }
}

/**
 * Escala y centra la cámara para que la montaña quepa en el lienzo desde cualquier ángulo: se mide
 * en varios giros e inclinaciones y se toma el caso peor, así el zoom no «late» al girar.
 */
export function fitCamera(
  base: Camera,
  mesh: RidgeMesh,
  width: number,
  height: number,
  margin = 0.92,
): Camera {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  const step = Math.max(1, Math.floor(mesh.x.length / 4000));
  const idx: number[] = [];
  for (let k = 0; k < mesh.x.length; k += step) {
    if (!mesh.visible[k]) continue;
    idx.push(k);
    minX = Math.min(minX, mesh.x[k] ?? 0);
    maxX = Math.max(maxX, mesh.x[k] ?? 0);
    minY = Math.min(minY, mesh.y[k] ?? 0);
    maxY = Math.max(maxY, mesh.y[k] ?? 0);
    minZ = Math.min(minZ, mesh.z[k] ?? 0);
    maxZ = Math.max(maxZ, mesh.z[k] ?? 0);
  }
  if (idx.length === 0) {
    return { ...base, cx: width / 2, cy: height / 2, ox: 0, oy: 0, oz: 0 };
  }
  const pivot: Camera = {
    ...base,
    scale: 1,
    cx: 0,
    cy: 0,
    ox: (minX + maxX) / 2,
    oy: (minY + maxY) / 2,
    oz: (minZ + maxZ) / 2,
  };
  let halfW = 1e-6;
  let halfH = 1e-6;
  const tmp: [number, number, number] = [0, 0, 0];
  for (let a = 0; a < 12; a++) {
    for (const pitch of [0.3, 0.9]) {
      const cam = { ...pivot, yaw: (a * Math.PI) / 6, pitch };
      for (const k of idx) {
        projectTo(cam, mesh.x[k] ?? 0, mesh.y[k] ?? 0, mesh.z[k] ?? 0, tmp);
        halfW = Math.max(halfW, Math.abs(tmp[0]));
        halfH = Math.max(halfH, Math.abs(tmp[1]));
      }
    }
  }
  const scale = Math.min(width / 2 / halfW, height / 2 / halfH) * margin;
  return { ...pivot, scale, cx: width / 2, cy: height / 2 };
}

/**
 * Orden de dibujo de lejos a cerca para cualquier giro. Según el ángulo se recorren las filas de la
 * malla (este-oeste) o las columnas (norte-sur), las que quedan más de cara a la cámara.
 */
export function drawOrder(
  yaw: number,
  nx: number,
  ny: number,
): { axis: 'row' | 'col'; lines: number[] } {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  if (Math.abs(c) >= Math.abs(s)) {
    // Fila j: el norte es j pequeña. Mirando al norte (c > 0) lo lejano es j pequeña.
    const asc = c > 0;
    return { axis: 'row', lines: Array.from({ length: ny }, (_, n) => (asc ? n : ny - 1 - n)) };
  }
  // Columna i: lo lejano es el este (i grande) cuando s > 0.
  const desc = s > 0;
  return { axis: 'col', lines: Array.from({ length: nx }, (_, n) => (desc ? nx - 1 - n : n)) };
}

/** Índice de la malla del punto `pos` de la línea `line` (fila o columna). */
export function meshIndex(mesh: RidgeMesh, axis: 'row' | 'col', line: number, pos: number): number {
  return axis === 'row' ? line * mesh.nx + pos : pos * mesh.nx + line;
}

/** Tramos consecutivos de puntos visibles de una línea: [desde, hasta] inclusive. */
export function visibleRuns(
  mesh: RidgeMesh,
  line: number,
  axis: 'row' | 'col' = 'row',
): [number, number][] {
  const len = axis === 'row' ? mesh.nx : mesh.ny;
  const runs: [number, number][] = [];
  let start = -1;
  for (let p = 0; p < len; p++) {
    const on = mesh.visible[meshIndex(mesh, axis, line, p)] === 1;
    if (on && start < 0) start = p;
    if ((!on || p === len - 1) && start >= 0) {
      const end = on ? p : p - 1;
      if (end > start) runs.push([start, end]);
      start = -1;
    }
  }
  return runs;
}
