import { geoMercator } from 'd3-geo';

/** Lienzo del mapa, en unidades de dibujo. El SVG se escala a la ventana. */
export const MAP_W = 1000;
export const MAP_H = 600;

/** Mercator con el mundo entero repartido en 1000 unidades de ancho (zoom k = 1). */
export const projection = geoMercator()
  .scale(MAP_W / (2 * Math.PI))
  .translate([MAP_W / 2, MAP_H / 2]);

export type Point = readonly [number, number];

/** Longitud y latitud → posición en el lienzo base. */
export function project(longitude: number, latitude: number): Point {
  const p = projection([longitude, latitude]);
  if (!p) throw new Error(`No se puede proyectar ${latitude}, ${longitude}`);
  return p;
}

/** Zoom con el que una franja de `spanDegrees` grados de longitud ocupa `fill` del ancho. */
export function zoomForSpan(spanDegrees: number, fill = 0.8): number {
  return (360 * fill) / spanDegrees;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 600;

/** Encuadre: qué punto del lienzo base queda en el centro y con cuánto zoom. */
export interface View {
  x: number;
  y: number;
  zoom: number;
}

/** Vista del mundo entero, algo desplazada al norte donde está la tierra. */
export const WORLD_VIEW: View = { x: MAP_W / 2, y: project(0, 28)[1], zoom: 1 };

const [spainX, spainY] = project(-2.2, 40.2);
/** Vista de España, el sur de Francia y Andorra juntos. */
export const SPAIN_VIEW: View = { x: spainX, y: spainY, zoom: zoomForSpan(17) };

/** Vista de una estación: unos 1,2 grados de ancho (unos 90 km). */
export function stationView(longitude: number, latitude: number): View {
  const [x, y] = project(longitude, latitude);
  return { x, y, zoom: zoomForSpan(1.2) };
}

/**
 * Encuadre que contiene todos los puntos con un margen (`fill` = fracción del lienzo que ocupan).
 * Con un solo punto, o con puntos casi iguales, no pasa de `MAX_ZOOM`.
 */
export function fitView(
  points: readonly { longitude: number; latitude: number }[],
  fill = 0.7,
): View {
  if (points.length === 0) return SPAIN_VIEW;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const p of points) {
    const [x, y] = project(p.longitude, p.latitude);
    xs.push(x);
    ys.push(y);
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 1e-6);
  const h = Math.max(maxY - minY, 1e-6);
  const zoom = Math.min(
    MAX_ZOOM,
    Math.max(MIN_ZOOM, Math.min((MAP_W * fill) / w, (MAP_H * fill) / h)),
  );
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom };
}

/** Traslación (en unidades del lienzo) que deja el punto (x, y) de la vista en el centro. */
export function translateFor(view: View): { tx: number; ty: number } {
  return { tx: MAP_W / 2 - view.zoom * view.x, ty: MAP_H / 2 - view.zoom * view.y };
}

/** Posición en pantalla (lienzo) de un punto base con una vista dada. */
export function toScreen(point: Point, view: View): Point {
  const { tx, ty } = translateFor(view);
  return [tx + view.zoom * point[0], ty + view.zoom * point[1]];
}

/** Opacidad de una capa entre dos zooms: 0 en `from`, 1 en `to` (o al revés si from > to). */
export function layerOpacity(zoom: number, from: number, to: number): number {
  const t = (Math.log(zoom) - Math.log(from)) / (Math.log(to) - Math.log(from));
  return Math.min(1, Math.max(0, t));
}
