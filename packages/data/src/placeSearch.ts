import type { LatLng } from '@snowview/core';
import { ForecastError } from './errors';
import { fetchJson } from './http';
import { RateLimiter } from './rateLimiter';

/**
 * Buscador de pueblos y ciudades para fijar la ubicación del usuario, con Photon
 * (https://photon.komoot.io), un buscador de OpenStreetMap pensado para autocompletar. Sin clave.
 *
 * Verificado el 2026-11-12 con consultas reales ("Guriezo", "Castro Urd", "Cauterets", "Benasque"):
 * - `layer=city` (municipios, pueblos y ciudades) y `layer=locality` (núcleos y parajes) dejan fuera
 *   calles, paradas y comercios; `lang=default` da los nombres en el idioma del lugar.
 * - `bbox` limita la búsqueda a la zona de las estaciones (España, Francia, Portugal y Andorra).
 * - Responde con CORS abierto.
 *
 * Datos © colaboradores de OpenStreetMap (ODbL): la interfaz debe citarlo. El servicio es de uso
 * razonable, no masivo: la interfaz espera a que se deje de escribir y cancela lo anterior.
 */
export const PHOTON_URL = 'https://photon.komoot.io/api/';
export const PLACE_SEARCH_ATTRIBUTION = 'Búsqueda: Photon · datos © colaboradores de OpenStreetMap';
/** Zona de búsqueda: oeste, sur, este, norte. Cubre España, Francia, Portugal y Andorra. */
export const SEARCH_BBOX = [-10, 35.5, 10, 51.5] as const;
/** Se empieza a buscar a partir de este número de letras. */
export const MIN_QUERY_LENGTH = 3;

export interface PlaceResult extends LatLng {
  /** Identificador estable (tipo y número de OpenStreetMap). */
  id: string;
  name: string;
  /** Provincia o comarca, si la hay y es distinta de la comunidad. */
  county: string | undefined;
  /** Comunidad autónoma, región… */
  state: string | undefined;
  country: string | undefined;
  /** "Guriezo, Cantabria": lo que se muestra al elegirlo. */
  label: string;
}

interface RawFeature {
  geometry?: { coordinates?: unknown };
  properties?: Record<string, unknown>;
}

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined;

/** "Guriezo, Cantabria": el nombre y la región; en otro país, también el país. */
export function placeLabel(p: {
  name: string;
  state?: string | undefined;
  county?: string | undefined;
  country?: string | undefined;
  countryCode?: string | undefined;
}): string {
  const region = p.state ?? p.county;
  const parts = [p.name];
  if (region && region !== p.name) parts.push(region);
  if (p.countryCode && p.countryCode !== 'ES' && p.country) parts.push(p.country);
  return parts.join(', ');
}

/** Convierte la respuesta de Photon en lugares, sin repetidos ni resultados sin nombre o posición. */
export function parsePlaces(json: unknown): PlaceResult[] {
  const features = (json as { features?: unknown } | null)?.features;
  if (!Array.isArray(features)) {
    throw new ForecastError(
      'invalid-data',
      'El buscador de lugares devolvió un formato inesperado.',
    );
  }
  const seen = new Set<string>();
  const results: PlaceResult[] = [];
  for (const f of features as RawFeature[]) {
    const props = f.properties ?? {};
    const coords = f.geometry?.coordinates;
    const name = str(props['name']);
    if (!name || !Array.isArray(coords)) continue;
    const [longitude, latitude] = coords as unknown[];
    if (typeof longitude !== 'number' || typeof latitude !== 'number') continue;
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;
    const state = str(props['state']);
    const county = str(props['county']);
    const country = str(props['country']);
    const countryCode = str(props['countrycode']);
    const label = placeLabel({ name, state, county, country, countryCode });
    if (seen.has(label)) continue; // el mismo pueblo suele salir como núcleo y como municipio
    seen.add(label);
    const osmId = props['osm_id'];
    const osmType = str(props['osm_type']);
    results.push({
      id: `${osmType ?? '?'}${typeof osmId === 'number' ? osmId : `${latitude},${longitude}`}`,
      name,
      county: county && county !== state && county !== name ? county : undefined,
      state,
      country,
      label,
      latitude,
      longitude,
    });
  }
  return results;
}

export function buildPlaceSearchUrl(query: string, limit = 8): string {
  const params = new URLSearchParams({ q: query.trim(), limit: String(limit), lang: 'default' });
  params.append('layer', 'city');
  params.append('layer', 'locality');
  params.set('bbox', SEARCH_BBOX.join(','));
  return `${PHOTON_URL}?${params.toString()}`;
}

export interface PlaceSearchProvider {
  readonly attribution: string;
  /** Busca lugares por nombre. Con menos de {@link MIN_QUERY_LENGTH} letras devuelve una lista vacía. */
  search(query: string, options?: { signal?: AbortSignal }): Promise<PlaceResult[]>;
}

export interface PlaceSearchOptions {
  fetch?: typeof fetch;
  limiter?: RateLimiter;
  timeoutMs?: number;
}

export function createPlaceSearch(options: PlaceSearchOptions = {}): PlaceSearchProvider {
  const doFetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  // 30 búsquedas por minuto: de sobra al escribir con espera, y respetuoso con un servicio gratuito.
  const limiter = options.limiter ?? new RateLimiter(30, 60_000);
  const timeoutMs = options.timeoutMs ?? 10_000;
  return {
    attribution: PLACE_SEARCH_ATTRIBUTION,
    async search(query, request = {}) {
      if (query.trim().length < MIN_QUERY_LENGTH) return [];
      const json = await fetchJson(
        buildPlaceSearchUrl(query),
        { doFetch, limiter, timeoutMs, service: 'el buscador de lugares' },
        request.signal,
      );
      return parsePlaces(json);
    },
  };
}
