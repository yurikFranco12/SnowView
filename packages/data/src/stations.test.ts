import { describe, expect, it } from 'vitest';
import { RateLimiter } from './rateLimiter';
import { STATIONS, parseStations, searchStations } from './stations';

describe('stations.json', () => {
  it('la lista curada es válida y tiene estaciones del Pirineo y de Sierra Nevada', () => {
    expect(STATIONS.length).toBeGreaterThanOrEqual(5);
    expect(STATIONS.some((s) => s.id === 'sierra-nevada')).toBe(true);
    expect(STATIONS.some((s) => s.region.includes('Pirineo'))).toBe(true);
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
    expect(searchStations('candanchu').map((s) => s.id)).toEqual(['candanchu']);
    expect(searchStations('SIERRA').map((s) => s.id)).toEqual(['sierra-nevada']);
  });

  it('busca también por región', () => {
    expect(searchStations('andorra').map((s) => s.id)).toEqual(['grandvalira']);
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
