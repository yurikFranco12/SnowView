/**
 * Relieve de una estación a partir de una malla de altitudes (de norte a sur, de oeste a este):
 * sombreado, curvas de nivel y la silueta de la montaña alrededor de las pistas. Es TypeScript puro,
 * sin acceso al navegador, para poder probarlo.
 */

export interface TerrainGrid {
  /** Longitud del borde oeste y latitud del borde norte (centro de la primera celda). */
  lon0: number;
  lat0: number;
  /** Separación entre puntos, en grados. */
  dLon: number;
  dLat: number;
  nx: number;
  ny: number;
  /** Altitudes en metros, por filas de norte a sur. */
  z: number[];
}

const M_PER_DEG = 111_320;

const at = (g: TerrainGrid, i: number, j: number): number => {
  const ci = Math.min(g.nx - 1, Math.max(0, i));
  const cj = Math.min(g.ny - 1, Math.max(0, j));
  return g.z[cj * g.nx + ci] ?? 0;
};

/** Altitud en un punto (interpolación bilineal); undefined si queda fuera de la malla. */
export function elevationAt(g: TerrainGrid, lon: number, lat: number): number | undefined {
  const fi = (lon - g.lon0) / g.dLon;
  const fj = (g.lat0 - lat) / g.dLat;
  if (fi < 0 || fj < 0 || fi > g.nx - 1 || fj > g.ny - 1) return undefined;
  const i = Math.min(g.nx - 2, Math.floor(fi));
  const j = Math.min(g.ny - 2, Math.floor(fj));
  const tx = fi - i;
  const ty = fj - j;
  const top = at(g, i, j) * (1 - tx) + at(g, i + 1, j) * tx;
  const bottom = at(g, i, j + 1) * (1 - tx) + at(g, i + 1, j + 1) * tx;
  return top * (1 - ty) + bottom * ty;
}

/** Sombreado de 0 (sombra) a 1 (luz), con el sol al noroeste y a 40° sobre el horizonte. */
export function hillshade(g: TerrainGrid, latitude: number): Float32Array {
  const cellX = g.dLon * M_PER_DEG * Math.cos((latitude * Math.PI) / 180);
  const cellY = g.dLat * M_PER_DEG;
  const altitude = (40 * Math.PI) / 180;
  const azimuth = (315 * Math.PI) / 180; // desde el norte, en sentido horario
  const lightE = Math.sin(azimuth) * Math.cos(altitude);
  const lightN = Math.cos(azimuth) * Math.cos(altitude);
  const lightUp = Math.sin(altitude);
  const out = new Float32Array(g.nx * g.ny);
  for (let j = 0; j < g.ny; j++) {
    for (let i = 0; i < g.nx; i++) {
      // Pendiente con el método de Horn (8 vecinos).
      const a = at(g, i - 1, j - 1);
      const b = at(g, i, j - 1);
      const c = at(g, i + 1, j - 1);
      const d = at(g, i - 1, j);
      const f = at(g, i + 1, j);
      const gg = at(g, i - 1, j + 1);
      const h = at(g, i, j + 1);
      const k = at(g, i + 1, j + 1);
      const dzdx = (c + 2 * f + k - (a + 2 * d + gg)) / (8 * cellX);
      // j crece hacia el sur: el norte es -y, así que se invierte el signo.
      const dzdy = -(gg + 2 * h + k - (a + 2 * b + c)) / (8 * cellY);
      // Normal de la superficie (este, norte, arriba) por el vector hacia el sol.
      const shade = (-dzdx * lightE - dzdy * lightN + lightUp) / Math.hypot(dzdx, dzdy, 1);
      out[j * g.nx + i] = Math.min(1, Math.max(0, shade));
    }
  }
  return out;
}

/** Cuánto se aleja cada punto de la malla de las líneas dadas, en celdas (transformada de distancia). */
export function distanceToLines(
  g: TerrainGrid,
  lines: readonly (readonly (readonly [number, number])[])[],
): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(g.nx * g.ny).fill(INF);
  const mark = (fi: number, fj: number) => {
    const i = Math.round(fi);
    const j = Math.round(fj);
    if (i >= 0 && j >= 0 && i < g.nx && j < g.ny) d[j * g.nx + i] = 0;
  };
  for (const line of lines) {
    for (let p = 0; p < line.length; p++) {
      const [lon, lat] = line[p] as readonly [number, number];
      const fi = (lon - g.lon0) / g.dLon;
      const fj = (g.lat0 - lat) / g.dLat;
      mark(fi, fj);
      const next = line[p + 1];
      if (next) {
        const gi = (next[0] - g.lon0) / g.dLon;
        const gj = (g.lat0 - next[1]) / g.dLat;
        const steps = Math.ceil(Math.max(Math.abs(gi - fi), Math.abs(gj - fj)) * 2);
        for (let s = 1; s < steps; s++)
          mark(fi + ((gi - fi) * s) / steps, fj + ((gj - fj) * s) / steps);
      }
    }
  }
  const D1 = 1;
  const D2 = Math.SQRT2;
  const relax = (i: number, j: number, di: number, dj: number, w: number) => {
    const ni = i + di;
    const nj = j + dj;
    if (ni < 0 || nj < 0 || ni >= g.nx || nj >= g.ny) return;
    const v = (d[nj * g.nx + ni] ?? INF) + w;
    if (v < (d[j * g.nx + i] ?? INF)) d[j * g.nx + i] = v;
  };
  for (let j = 0; j < g.ny; j++) {
    for (let i = 0; i < g.nx; i++) {
      relax(i, j, -1, 0, D1);
      relax(i, j, 0, -1, D1);
      relax(i, j, -1, -1, D2);
      relax(i, j, 1, -1, D2);
    }
  }
  for (let j = g.ny - 1; j >= 0; j--) {
    for (let i = g.nx - 1; i >= 0; i--) {
      relax(i, j, 1, 0, D1);
      relax(i, j, 0, 1, D1);
      relax(i, j, 1, 1, D2);
      relax(i, j, -1, 1, D2);
    }
  }
  return d;
}

export interface ShadedImage {
  width: number;
  height: number;
  /** RGBA, listo para un ImageData. */
  rgba: Uint8ClampedArray;
  /** Distancia de cada punto a las pistas, en celdas. */
  dist: Float32Array;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

/**
 * Imagen del relieve con los tonos de la app: valles azul noche, cumbres azul hielo, luz y sombra
 * del sol. La opacidad cae con la distancia a las pistas: queda la silueta de la montaña, no un
 * rectángulo.
 */
export function shadeImage(
  g: TerrainGrid,
  latitude: number,
  lines: readonly (readonly (readonly [number, number])[])[],
  reachCells: number,
): ShadedImage {
  const shade = hillshade(g, latitude);
  const dist = distanceToLines(g, lines);
  let zMin = Infinity;
  let zMax = -Infinity;
  for (const v of g.z) {
    zMin = Math.min(zMin, v);
    zMax = Math.max(zMax, v);
  }
  const span = Math.max(1, zMax - zMin);
  const low = [18, 30, 92];
  const high = [104, 140, 200];
  const rgba = new Uint8ClampedArray(g.nx * g.ny * 4);
  for (let n = 0; n < g.nx * g.ny; n++) {
    const height = ((g.z[n] ?? zMin) - zMin) / span;
    const light = 0.45 + 0.85 * (shade[n] ?? 0.5);
    const base = Math.pow(height, 0.9);
    for (let c = 0; c < 3; c++) {
      rgba[n * 4 + c] = Math.round(
        Math.min(255, lerp(low[c] ?? 0, high[c] ?? 0, base * 0.8 + 0.1) * light),
      );
    }
    rgba[n * 4 + 3] = Math.round(255 * 0.92 * smooth((1 - (dist[n] ?? 1e9) / reachCells) * 2));
  }
  return { width: g.nx, height: g.ny, rgba, dist };
}

/**
 * Curvas de nivel por «marching squares». Devuelve segmentos por nivel, con las coordenadas en
 * celdas de la malla (columna, fila), para que quien dibuja las convierta a su sistema.
 */
export function contourSegments(
  g: TerrainGrid,
  interval: number,
): { level: number; segments: [number, number, number, number][] }[] {
  let zMin = Infinity;
  let zMax = -Infinity;
  for (const v of g.z) {
    zMin = Math.min(zMin, v);
    zMax = Math.max(zMax, v);
  }
  const result: { level: number; segments: [number, number, number, number][] }[] = [];
  const first = Math.ceil(zMin / interval) * interval;
  for (let level = first; level <= zMax; level += interval) {
    const segments: [number, number, number, number][] = [];
    for (let j = 0; j < g.ny - 1; j++) {
      for (let i = 0; i < g.nx - 1; i++) {
        const tl = at(g, i, j);
        const tr = at(g, i + 1, j);
        const br = at(g, i + 1, j + 1);
        const bl = at(g, i, j + 1);
        // Puntos donde el nivel corta cada lado de la celda.
        const pts: [number, number][] = [];
        const cut = (v1: number, v2: number, x1: number, y1: number, x2: number, y2: number) => {
          if (v1 < level === v2 < level) return;
          const t = (level - v1) / (v2 - v1);
          pts.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
        };
        cut(tl, tr, i, j, i + 1, j);
        cut(tr, br, i + 1, j, i + 1, j + 1);
        cut(bl, br, i, j + 1, i + 1, j + 1);
        cut(tl, bl, i, j, i, j + 1);
        if (pts.length === 2) {
          const [p, q] = pts as [[number, number], [number, number]];
          segments.push([p[0], p[1], q[0], q[1]]);
        } else if (pts.length === 4) {
          const [p0, p1, p2, p3] = pts as [
            [number, number],
            [number, number],
            [number, number],
            [number, number],
          ];
          segments.push([p0[0], p0[1], p3[0], p3[1]], [p1[0], p1[1], p2[0], p2[1]]);
        }
      }
    }
    if (segments.length > 0) result.push({ level, segments });
  }
  return result;
}

/** Suaviza las altitudes (filtro [1 2 1] en cada eje, `passes` veces) para quitar dientes de sierra. */
export function smoothGrid(g: TerrainGrid, passes: number): TerrainGrid {
  const z = g.z.slice();
  for (let p = 0; p < passes; p++) {
    const tmp = z.slice();
    const read = (arr: number[], i: number, j: number) =>
      arr[Math.min(g.ny - 1, Math.max(0, j)) * g.nx + Math.min(g.nx - 1, Math.max(0, i))] ?? 0;
    for (let j = 0; j < g.ny; j++) {
      for (let i = 0; i < g.nx; i++) {
        tmp[j * g.nx + i] = (read(z, i - 1, j) + 2 * read(z, i, j) + read(z, i + 1, j)) / 4;
      }
    }
    for (let j = 0; j < g.ny; j++) {
      for (let i = 0; i < g.nx; i++) {
        z[j * g.nx + i] = (read(tmp, i, j - 1) + 2 * read(tmp, i, j) + read(tmp, i, j + 1)) / 4;
      }
    }
  }
  return { ...g, z };
}

/** Malla `factor` veces más fina (interpolación bilineal), con los mismos bordes. */
export function resampleGrid(g: TerrainGrid, factor: number): TerrainGrid {
  if (factor <= 1) return g;
  const nx = (g.nx - 1) * factor + 1;
  const ny = (g.ny - 1) * factor + 1;
  const z: number[] = new Array<number>(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const fi = i / factor;
      const fj = j / factor;
      const i0 = Math.min(g.nx - 2, Math.floor(fi));
      const j0 = Math.min(g.ny - 2, Math.floor(fj));
      const tx = fi - i0;
      const ty = fj - j0;
      const top = at(g, i0, j0) * (1 - tx) + at(g, i0 + 1, j0) * tx;
      const bottom = at(g, i0, j0 + 1) * (1 - tx) + at(g, i0 + 1, j0 + 1) * tx;
      z[j * nx + i] = top * (1 - ty) + bottom * ty;
    }
  }
  return { ...g, nx, ny, dLon: g.dLon / factor, dLat: g.dLat / factor, z };
}
