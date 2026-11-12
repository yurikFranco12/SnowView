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

/**
 * Metros que mide una unidad del lienzo base a una latitud. El mundo mide 1000 unidades de ancho
 * (la circunferencia de la Tierra) y Mercator ensancha las unidades con 1/cos(latitud).
 */
export function metersPerUnit(latitude: number): number {
  return (40_075_017 / MAP_W) * Math.cos((latitude * Math.PI) / 180);
}

/** Radio, en unidades del lienzo base, de una distancia en metros a esa latitud. */
export function metersToUnits(meters: number, latitude: number): number {
  return meters / metersPerUnit(latitude);
}

/** Punto del lienzo base → longitud y latitud. */
export function unproject(x: number, y: number): { longitude: number; latitude: number } | null {
  const p = projection.invert?.([x, y]);
  return p ? { longitude: p[0], latitude: p[1] } : null;
}

/** Punto de la pantalla del lienzo (0..1000, 0..600) → punto del lienzo base, según la vista. */
export function screenToBase(point: Point, view: View): Point {
  const { tx, ty } = translateFor(view);
  return [(point[0] - tx) / view.zoom, (point[1] - ty) / view.zoom];
}

/**
 * Zona que cubre el mapa detallado (longitud y latitud). El usuario no puede mover ni alejar el
 * mapa más allá: así no se ve el borde de los datos. La animación de entrada sí parte del mundo.
 */
export const COVERAGE = { west: -17, east: 17, south: 28, north: 53 } as const;

/** Zoom mínimo que puede poner el usuario: con él, la pantalla cabe dentro de la cobertura. */
export const USER_MIN_ZOOM = 12;

/**
 * Ajusta una vista para que la pantalla (1000×600 unidades del lienzo, a ese zoom) quede siempre
 * dentro de la cobertura: limita el zoom a [USER_MIN_ZOOM, MAX_ZOOM] y el centro a lo que deja ver.
 * Si la cobertura fuera más pequeña que la pantalla en algún eje, se centra en ese eje.
 */
export function clampView(view: View): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(USER_MIN_ZOOM, view.zoom));
  const [x0, y0] = project(COVERAGE.west, COVERAGE.north);
  const [x1, y1] = project(COVERAGE.east, COVERAGE.south);
  const halfW = MAP_W / 2 / zoom;
  const halfH = MAP_H / 2 / zoom;
  const clampAxis = (value: number, min: number, max: number, half: number) =>
    max - min <= 2 * half ? (min + max) / 2 : Math.min(max - half, Math.max(min + half, value));
  return {
    zoom,
    x: clampAxis(view.x, x0, x1, halfW),
    y: clampAxis(view.y, y0, y1, halfH),
  };
}
