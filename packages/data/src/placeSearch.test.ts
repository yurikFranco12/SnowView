import { describe, expect, it, vi } from 'vitest';
import tauriConf from '../../../src-tauri/tauri.conf.json';
import { ForecastError } from './errors';
import {
  MIN_QUERY_LENGTH,
  PHOTON_URL,
  buildPlaceSearchUrl,
  createPlaceSearch,
  parsePlaces,
  placeLabel,
} from './placeSearch';
import { RateLimiter } from './rateLimiter';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

// Forma real de la respuesta de Photon para "Guriezo" (recortada a lo que usa la app).
const GURIEZO = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [-3.3249535, 43.3368356] },
  properties: {
    osm_type: 'R',
    osm_id: 340158,
    name: 'Guriezo',
    county: 'Cantabria',
    state: 'Cantabria',
    country: 'España',
    countrycode: 'ES',
    type: 'city',
  },
};
const CAUTERETS = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [-0.1141, 42.8892] },
  properties: {
    osm_type: 'R',
    osm_id: 7424,
    name: 'Cauterets',
    county: 'Hautes-Pyrénées',
    state: 'Occitanie',
    country: 'France',
    countrycode: 'FR',
    type: 'city',
  },
};

describe('placeLabel', () => {
  it('pone el nombre y la comunidad, sin repetir si coinciden', () => {
    expect(placeLabel({ name: 'Guriezo', state: 'Cantabria' })).toBe('Guriezo, Cantabria');
    expect(placeLabel({ name: 'Cantabria', state: 'Cantabria' })).toBe('Cantabria');
  });

  it('en España no añade el país; en otro país, sí', () => {
    expect(
      placeLabel({ name: 'Madrid', state: 'Madrid', countryCode: 'ES', country: 'España' }),
    ).toBe('Madrid');
    expect(
      placeLabel({ name: 'Cauterets', state: 'Occitanie', countryCode: 'FR', country: 'France' }),
    ).toBe('Cauterets, Occitanie, France');
  });

  it('sin comunidad usa la provincia o comarca', () => {
    expect(placeLabel({ name: 'Benasque', county: 'Huesca' })).toBe('Benasque, Huesca');
  });
});

describe('parsePlaces', () => {
  it('convierte los resultados reales en lugares', () => {
    const [g, c] = parsePlaces({ features: [GURIEZO, CAUTERETS] });
    expect(g).toMatchObject({
      name: 'Guriezo',
      label: 'Guriezo, Cantabria',
      latitude: 43.3368356,
      longitude: -3.3249535,
    });
    expect(c?.label).toBe('Cauterets, Occitanie, France');
    expect(c?.county).toBe('Hautes-Pyrénées');
    // la provincia igual a la comunidad no se repite
    expect(g?.county).toBeUndefined();
  });

  it('no repite el mismo lugar', () => {
    const second = {
      ...GURIEZO,
      properties: { ...GURIEZO.properties, osm_id: 1, type: 'locality' },
    };
    expect(parsePlaces({ features: [GURIEZO, second] })).toHaveLength(1);
  });

  it('descarta resultados sin nombre o sin posición válida', () => {
    const noName = { ...GURIEZO, properties: { ...GURIEZO.properties, name: '  ' } };
    const noCoords = { properties: GURIEZO.properties, geometry: { coordinates: ['x', 'y'] } };
    const missing = { properties: { name: 'Algo' } };
    expect(parsePlaces({ features: [noName, noCoords, missing, GURIEZO] })).toHaveLength(1);
  });

  it('rechaza una respuesta que no es una lista de resultados', () => {
    expect(() => parsePlaces({})).toThrowError(ForecastError);
    expect(() => parsePlaces(null)).toThrowError(ForecastError);
  });
});

describe('buildPlaceSearchUrl', () => {
  it('busca solo municipios y núcleos, en el idioma del lugar y en la zona de las estaciones', () => {
    const url = new URL(buildPlaceSearchUrl('  Guriezo '));
    expect(url.origin + url.pathname).toBe(PHOTON_URL);
    expect(url.searchParams.get('q')).toBe('Guriezo');
    expect(url.searchParams.getAll('layer')).toEqual(['city', 'locality']);
    expect(url.searchParams.get('lang')).toBe('default');
    expect(url.searchParams.get('bbox')).toBe('-10,35.5,10,51.5');
  });
});

describe('createPlaceSearch', () => {
  it('no consulta con muy pocas letras', async () => {
    const fetchMock = vi.fn();
    const search = createPlaceSearch({ fetch: fetchMock });
    expect(await search.search('Gu')).toEqual([]);
    expect(await search.search('  ')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(MIN_QUERY_LENGTH).toBe(3);
  });

  it('devuelve los lugares de la respuesta', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ features: [GURIEZO] }));
    const search = createPlaceSearch({ fetch: fetchMock });
    const places = await search.search('Guriezo');
    expect(places[0]?.label).toBe('Guriezo, Cantabria');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('traduce un fallo de red a "offline" nombrando al buscador', async () => {
    const search = createPlaceSearch({ fetch: vi.fn().mockRejectedValue(new TypeError('red')) });
    await expect(search.search('Guriezo')).rejects.toMatchObject({
      kind: 'offline',
      message: expect.stringContaining('buscador de lugares'),
    });
  });

  it('respeta el límite de búsquedas', async () => {
    const search = createPlaceSearch({
      fetch: vi.fn().mockResolvedValue(jsonResponse({ features: [] })),
      limiter: new RateLimiter(1, 60_000),
    });
    await search.search('Guriezo');
    await expect(search.search('Laredo')).rejects.toMatchObject({ kind: 'rate-limited' });
  });
});

describe('CSP de Tauri', () => {
  it('permite conectar con el buscador de lugares', () => {
    const directives = (tauriConf.app.security.csp as string).split(';').map((d) => d.trim());
    const connect = directives.find((d) => d.startsWith('connect-src ')) ?? '';
    expect(connect.split(/\s+/)).toContain(new URL(PHOTON_URL).origin);
  });
});
