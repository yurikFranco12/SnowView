import { describe, expect, it } from 'vitest';
import { RateLimiter } from './rateLimiter';
import {
  COUNTRIES,
  STATIONS,
  countryName,
  getStation,
  parseStations,
  searchStations,
} from './stations';

describe('stations.json', () => {
  it('la lista curada es válida y tiene estaciones del Pirineo y de Sierra Nevada', () => {
    expect(STATIONS.length).toBeGreaterThanOrEqual(5);
    expect(STATIONS.some((s) => s.id === 'sierra-nevada')).toBe(true);
    expect(STATIONS.some((s) => s.region.includes('Pirineo'))).toBe(true);
  });

  it('cubre España, Francia, Portugal y Andorra con ids únicos y países conocidos', () => {
    const codes = new Set<string>(COUNTRIES.map((c) => c.code));
    expect(STATIONS.every((s) => codes.has(s.country))).toBe(true);
    for (const code of codes) expect(STATIONS.some((s) => s.country === code)).toBe(true);
    expect(STATIONS.length).toBeGreaterThan(60);
    expect(new Set(STATIONS.map((s) => s.id)).size).toBe(STATIONS.length);
    // Algunas estaciones conocidas de cada macizo.
    for (const name of ['Astún', 'Panticosa', 'Chamonix', 'Val Thorens', 'Serra da Estrela']) {
      expect(searchStations(name).length, name).toBeGreaterThan(0);
    }
  });

  it('las cotas son plausibles y las zonas horarias corresponden al país', () => {
    const zones: Record<string, string> = {
      ES: 'Europe/Madrid',
      FR: 'Europe/Paris',
      PT: 'Europe/Lisbon',
      AD: 'Europe/Andorra',
    };
    for (const s of STATIONS) {
      expect(s.baseElevationM, s.id).toBeGreaterThan(150);
      expect(s.topElevationM, s.id).toBeLessThan(4000);
      expect(s.timeZone, s.id).toBe(zones[s.country]);
    }
  });

  it('las estaciones verificadas a mano siguen marcadas como tales', () => {
    expect(getStation('baqueira-beret')?.elevationsVerified).toBe(true);
    expect(getStation('formigal')?.baseElevationM).toBe(1510);
  });

  it('rechaza una cima por debajo de la base', () => {
    const bad = {
      stations: [{ ...STATIONS[0], topElevationM: 1000, baseElevationM: 1500 }],
    };
    expect(() => parseStations(bad)).toThrow(/cima/);
  });

  it('rechaza ids repetidos y zonas horarias desconocidas', () => {
    expect(() => parseStations({ stations: [STATIONS[0], STATIONS[0]] })).toThrow(/repetido/);
    expect(() =>
      parseStations({ stations: [{ ...STATIONS[0], timeZone: 'Marte/Olympus' }] }),
    ).toThrow(/zona horaria/);
  });
});

describe('searchStations', () => {
  it('busca sin distinguir tildes ni mayúsculas', () => {
    expect(searchStations('candanchu').map((s) => s.id)).toContain('candanchu');
    expect(searchStations('SIERRA NEV').map((s) => s.id)).toEqual(['sierra-nevada']);
  });

  it('busca también por región y por país', () => {
    expect(searchStations('andorra').map((s) => s.id)).toContain('grandvalira');
    expect(searchStations('granada').map((s) => s.id)).toEqual(['sierra-nevada']);
    const french = searchStations('francia');
    expect(french.length).toBeGreaterThan(40);
    expect(french.every((s) => s.country === 'FR')).toBe(true);
    expect(countryName('PT')).toBe('Portugal');
  });

  it('consulta vacía: todas', () => {
    expect(searchStations('  ')).toHaveLength(STATIONS.length);
  });
});

describe('RateLimiter', () => {
  it('permite N peticiones por ventana y dice cuánto esperar', () => {
    let t = 0;
    const limiter = new RateLimiter(2, 1000, () => t);
    limiter.acquire();
    limiter.acquire();
    expect(() => limiter.acquire()).toThrow(/Demasiadas/);
    t = 999;
    try {
      limiter.acquire();
    } catch (e) {
      expect((e as { retryAfterMs: number }).retryAfterMs).toBe(1);
    }
    t = 1000;
    expect(() => limiter.acquire()).not.toThrow();
  });

  it('pause() bloquea hasta que pase el tiempo', () => {
    let t = 0;
    const limiter = new RateLimiter(10, 1000, () => t);
    limiter.pause(5000);
    expect(() => limiter.acquire()).toThrow(/esperar/);
    t = 5000;
    expect(() => limiter.acquire()).not.toThrow();
  });
});
