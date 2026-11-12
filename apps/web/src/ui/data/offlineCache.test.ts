import type { StationForecast } from '@snowview/core';
import { describe, expect, it } from 'vitest';
import { CACHE_MAX_AGE_MS, ageMinutes, formatAge, isOutdated, pruneCache } from './offlineCache';

const NOW = Date.UTC(2026, 10, 12, 12);

function forecast(stationId: string, fetchedAt: number): StationForecast {
  return {
    stationId,
    fetchedAt,
    base: { elevationM: 1500, hours: [] },
    top: { elevationM: 2500, hours: [] },
    attribution: 'test',
  };
}

describe('pruneCache', () => {
  it('conserva las previsiones recientes', () => {
    const f = forecast('a', NOW - 3_600_000);
    expect(pruneCache({ a: f }, NOW)).toEqual({ a: f });
  });

  it('descarta las caducadas', () => {
    expect(pruneCache({ a: forecast('a', NOW - CACHE_MAX_AGE_MS - 1) }, NOW)).toEqual({});
  });

  it('descarta entradas mal formadas y entradas que no son un objeto', () => {
    expect(pruneCache({ a: { stationId: 'a' }, b: 'x', c: null }, NOW)).toEqual({});
    expect(pruneCache(undefined, NOW)).toEqual({});
    expect(pruneCache([1, 2], NOW)).toEqual({});
  });
});

describe('ageMinutes y formatAge', () => {
  it('calcula la edad en minutos y no pasa de cero', () => {
    expect(ageMinutes(forecast('a', NOW - 5 * 60_000), NOW)).toBe(5);
    expect(ageMinutes(forecast('a', NOW + 60_000), NOW)).toBe(0);
  });

  it('la escribe en minutos, horas o días', () => {
    expect(formatAge(0)).toBe('hace 1 min');
    expect(formatAge(25)).toBe('hace 25 min');
    expect(formatAge(180)).toBe('hace 3 h');
    expect(formatAge(60 * 72)).toBe('hace 3 días');
  });
});

describe('isOutdated', () => {
  it('con refresco de 60 min, avisa pasados 95 min', () => {
    expect(isOutdated(60, 60)).toBe(false);
    expect(isOutdated(95, 60)).toBe(false);
    expect(isOutdated(96, 60)).toBe(true);
  });

  it('se adapta al intervalo elegido', () => {
    expect(isOutdated(200, 180)).toBe(false);
    expect(isOutdated(30, 15)).toBe(true);
  });
});
