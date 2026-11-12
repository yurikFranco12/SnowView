import { geoPath } from 'd3-geo';
import type { Feature, MultiLineString } from 'geojson';
import provincesData from './data/provinces.json';
import { project } from './projection';

/**
 * Líneas que separan provincias (España), departamentos (Francia) y parroquias (Andorra), sin
 * repetir las fronteras de país. Se generan con `scripts/build-map-provinces.mjs` a partir de
 * Natural Earth (dominio público).
 */
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

export const PROVINCES_PATH: string =
  toCanvas({
    type: 'Feature',
    properties: {},
    geometry: provincesData,
  } as Feature<MultiLineString>) ?? '';
