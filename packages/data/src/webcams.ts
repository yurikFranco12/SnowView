import webcamsFile from '../../../stations/webcams.json';
import { getStation } from './stations';

/**
 * Webcams de las estaciones (`stations/webcams.json`). Cada una puede tener una imagen que se
 * refresca cada cierto tiempo, un reproductor en directo (iframe), o las dos cosas.
 */
export interface Webcam {
  id: string;
  stationId: string;
  name: string;
  elevationM?: number;
  /** Imagen fija que el propietario actualiza cada pocos minutos. */
  image?: { url: string; refreshSeconds: number };
  /** Reproductor en directo para incrustar. */
  live?: { url: string };
  /** A quién se atribuye la imagen. */
  credit: string;
  /** Página oficial donde se publica. */
  pageUrl: string;
}

/** Refresco mínimo permitido: no se bombardea a los servidores de las estaciones. */
export const MIN_REFRESH_SECONDS = 60;

function fail(msg: string): never {
  throw new Error(`webcams.json no es válido: ${msg}`);
}

function isHttps(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Valida la lista de webcams. Se ejecuta al cargar y en los tests: un error en el JSON se ve pronto. */
export function parseWebcams(raw: unknown): Webcam[] {
  const list = (raw as { webcams?: unknown } | null)?.webcams;
  if (!Array.isArray(list)) fail('falta la lista "webcams"');
  const ids = new Set<string>();
  return list.map((item: unknown, i) => {
    const w = item as Record<string, unknown>;
    const where = `webcam ${i} (${String(w['id'])})`;
    for (const key of ['id', 'stationId', 'name', 'credit'] as const) {
      if (typeof w[key] !== 'string' || !w[key]) fail(`${where}: falta "${key}"`);
    }
    const id = w['id'] as string;
    if (ids.has(id)) fail(`${where}: id repetido`);
    ids.add(id);
    if (!getStation(w['stationId'] as string)) fail(`${where}: estación desconocida`);
    if (!isHttps(w['pageUrl'])) fail(`${where}: "pageUrl" debe ser una URL https`);

    const image = w['image'] as { url?: unknown; refreshSeconds?: unknown } | undefined;
    const live = w['live'] as { url?: unknown } | undefined;
    if (!image && !live) fail(`${where}: necesita "image" o "live"`);
    if (image) {
      if (!isHttps(image.url)) fail(`${where}: "image.url" debe ser una URL https`);
      if (typeof image.refreshSeconds !== 'number' || image.refreshSeconds < MIN_REFRESH_SECONDS) {
        fail(`${where}: "image.refreshSeconds" debe ser al menos ${MIN_REFRESH_SECONDS}`);
      }
    }
    if (live && !isHttps(live.url)) fail(`${where}: "live.url" debe ser una URL https`);
    const elevation = w['elevationM'];
    if (elevation !== undefined && (typeof elevation !== 'number' || !(elevation > 0))) {
      fail(`${where}: "elevationM" no es válida`);
    }

    const cam: Webcam = {
      id,
      stationId: w['stationId'] as string,
      name: w['name'] as string,
      credit: w['credit'] as string,
      pageUrl: w['pageUrl'],
    };
    if (typeof elevation === 'number') cam.elevationM = elevation;
    if (image)
      cam.image = { url: image.url as string, refreshSeconds: image.refreshSeconds as number };
    if (live) cam.live = { url: live.url as string };
    return cam;
  });
}

export const WEBCAMS: readonly Webcam[] = parseWebcams(webcamsFile);

/** Webcams de una estación, en el orden del archivo. */
export function getWebcams(stationId: string): Webcam[] {
  return WEBCAMS.filter((w) => w.stationId === stationId);
}

/** Estaciones que tienen al menos una webcam. */
export function stationsWithWebcams(): string[] {
  return [...new Set(WEBCAMS.map((w) => w.stationId))];
}
