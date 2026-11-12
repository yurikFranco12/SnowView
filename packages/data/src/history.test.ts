import { describe, expect, it, vi } from 'vitest';
import { ForecastError } from './errors';
import { buildHistoryUrl, createOpenMeteoHistory, parseHistoryResponse } from './history';
import { RateLimiter } from './rateLimiter';
import { getStation } from './stations';

const station = getStation('formigal');
if (!station) throw new Error('falta Formigal en stations.json');

const body = {
  daily_units: { time: 'iso8601', snowfall_sum: 'cm' },
  daily: { time: ['2025-11-01', '2025-11-02', '2025-11-03'], snowfall_sum: [0, 12.5, null] },
};

function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('buildHistoryUrl', () => {
  it('pide la nieve diaria a la cima, en la zona horaria de la estación', () => {
    const url = new URL(buildHistoryUrl(station, '2025-10-01', '2026-05-31'));
    expect(url.origin + url.pathname).toBe('https://archive-api.open-meteo.com/v1/archive');
    expect(url.searchParams.get('daily')).toBe('snowfall_sum');
    expect(url.searchParams.get('timezone')).toBe('Europe/Madrid');
    expect(url.searchParams.get('elevation')).toBe(String(station.topElevationM));
    expect(url.searchParams.get('start_date')).toBe('2025-10-01');
    expect(url.searchParams.get('end_date')).toBe('2026-05-31');
  });
});

describe('parseHistoryResponse', () => {
  it('convierte los días y deja los nulos como "sin dato"', () => {
    expect(parseHistoryResponse(body)).toEqual([
      { date: '2025-11-01', snowfallCm: 0 },
      { date: '2025-11-02', snowfallCm: 12.5 },
      { date: '2025-11-03', snowfallCm: null },
    ]);
  });

  it('normaliza otras unidades a cm', () => {
    const mm = { ...body, daily_units: { snowfall_sum: 'mm' } };
    expect(parseHistoryResponse(mm)[1]?.snowfallCm).toBe(1.25);
  });

  it('rechaza una unidad desconocida', () => {
    const bad = { ...body, daily_units: { snowfall_sum: 'pulgadas raras' } };
    expect(() => parseHistoryResponse(bad)).toThrowError(ForecastError);
  });

  it('rechaza respuestas sin días o con series de otro tamaño', () => {
    expect(() => parseHistoryResponse({})).toThrowError(ForecastError);
    expect(() =>
      parseHistoryResponse({ daily: { time: ['2025-11-01'], snowfall_sum: [1, 2] } }),
    ).toThrowError(ForecastError);
    expect(() => parseHistoryResponse({ daily: { time: ['2025-11-01'] } })).toThrowError(
      ForecastError,
    );
  });

  it('rechaza fechas con formato inesperado', () => {
    expect(() =>
      parseHistoryResponse({ daily: { time: ['1/11/2025'], snowfall_sum: [1] } }),
    ).toThrowError(ForecastError);
  });

  it('convierte el error del proveedor', () => {
    expect(() =>
      parseHistoryResponse({ error: true, reason: 'fechas fuera de rango' }),
    ).toThrowError(/fechas fuera de rango/);
  });
});

describe('createOpenMeteoHistory', () => {
  it('devuelve los días de la respuesta', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(body));
    const history = createOpenMeteoHistory({ fetch: fetchMock });
    const days = await history.getDailySnow(station, '2025-11-01', '2025-11-03');
    expect(days).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('traduce un fallo de red a "offline"', async () => {
    const history = createOpenMeteoHistory({
      fetch: vi.fn().mockRejectedValue(new TypeError('x')),
    });
    await expect(history.getDailySnow(station, '2025-11-01', '2025-11-03')).rejects.toMatchObject({
      kind: 'offline',
    });
  });

  it('respeta el límite de peticiones', async () => {
    const history = createOpenMeteoHistory({
      fetch: vi.fn().mockResolvedValue(jsonResponse(body)),
      limiter: new RateLimiter(1, 60_000),
    });
    await history.getDailySnow(station, '2025-11-01', '2025-11-03');
    await expect(history.getDailySnow(station, '2025-11-01', '2025-11-03')).rejects.toMatchObject({
      kind: 'rate-limited',
    });
  });

  it('un 429 pausa y avisa de cuánto esperar', async () => {
    const history = createOpenMeteoHistory({
      fetch: vi
        .fn()
        .mockResolvedValue(jsonResponse({}, { status: 429, headers: { 'Retry-After': '30' } })),
    });
    await expect(history.getDailySnow(station, '2025-11-01', '2025-11-03')).rejects.toMatchObject({
      kind: 'rate-limited',
      retryAfterMs: 30_000,
    });
  });
});
