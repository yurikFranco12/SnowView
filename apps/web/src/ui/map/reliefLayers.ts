import { geoPath } from 'd3-geo';
import type { Feature, MultiLineString } from 'geojson';
import provincesData from './data/provinces.json';
import reliefBounds from './data/relief-bounds.json';
import { project } from './projection';

/**
 * Capas de relieve y de provincias del mapa. Se generan con `scripts/build-map-relief.mjs` a partir
 * de datos abiertos (ver docs/adr/0010-relieve-y-provincias.md): provincias de España, departamentos
 * de Francia y parroquias de Andorra; un relieve sombreado y curvas de nivel cada 500 m.
 */

/** Dibuja geometría en longitud y latitud directamente en el lienzo base del mapa. */
const toCanvas = geoPath({
  stream: (sink) => ({
    point: (lon: number, lat: number) => {
      const [x, y] = project(lon, lat);
      sink.point(x, y);
    },
    lineStart: () => sink.lineStart(),
    lineEnd: () => sink.lineEnd(),
    polygonStart: () => sink.polygonStart(),
    polygonEnd: () => sink.polygonEnd(),
    sphere: () => sink.sphere?.(),
  }),
}).digits(4);

/** Líneas que separan provincias, departamentos y parroquias (sin repetir las fronteras de país). */
export const PROVINCES_PATH: string =
  toCanvas({
    type: 'Feature',
    properties: {},
    geometry: provincesData,
  } as Feature<MultiLineString>) ?? '';

import reliefCoarse from './data/relief.png';
import reliefNorth from './data/relief-north.png';
import reliefSierraNevada from './data/relief-sierra-nevada.png';

export interface ReliefImage {
  url: string;
  /** Rectángulo del lienzo base que ocupa la imagen (la proyección es lineal en Mercator). */
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Bounds {
  file: string;
  west: number;
  east: number;
  north: number;
  south: number;
}

const FILES: Record<string, string> = {
  'relief.png': reliefCoarse,
  'relief-north.png': reliefNorth,
  'relief-sierra-nevada.png': reliefSierraNevada,
};

function toImage(b: Bounds): ReliefImage {
  const url = FILES[b.file];
  if (!url) throw new Error(`Falta la imagen de relieve ${b.file}`);
  const [x0, y0] = project(b.west, b.north);
  const [x1, y1] = project(b.east, b.south);
  return { url, x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

const bounds = reliefBounds as unknown as { coarse: Bounds; details: Bounds[] };

/** Relieve de toda la zona, a baja resolución (unos 2 km por celda). */
export const RELIEF_COARSE: ReliefImage = toImage(bounds.coarse);
/** Relieve a resolución completa (unos 470 m por celda) de las zonas con estaciones. */
export const RELIEF_DETAILS: readonly ReliefImage[] = bounds.details.map(toImage);

export interface ContourPaths {
  /** Curvas de nivel "intermedias". */
  minor: string;
  /** Curvas "maestras", cada 1000 m. */
  major: string;
  intervalM: number;
}

interface ContoursFile {
  intervalM: number;
  levels: { m: number; lines: [number, number][][] }[];
}

let cached: Promise<ContourPaths> | undefined;

/**
 * Carga las curvas de nivel (un archivo de ~0,5 MB) solo cuando se abre el mapa, y las convierte en
 * dos trazados SVG. Se guarda el resultado: la segunda llamada es instantánea.
 */
export function loadContourPaths(): Promise<ContourPaths> {
  cached ??= import('./data/contours.json').then((module) => {
    const data = module.default as unknown as ContoursFile;
    const minor: string[] = [];
    const major: string[] = [];
    for (const level of data.levels) {
      const target = level.m % 1000 === 0 ? major : minor;
      target.push(
        toCanvas({
          type: 'Feature',
          properties: {},
          geometry: { type: 'MultiLineString', coordinates: level.lines },
        } as Feature<MultiLineString>) ?? '',
      );
    }
    return { minor: minor.join(''), major: major.join(''), intervalM: data.intervalM };
  });
  return cached;
}
