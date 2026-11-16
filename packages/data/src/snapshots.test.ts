import { describe, expect, it, vi } from 'vitest';
import { ForecastError } from './errors';
import { RateLimiter } from './rateLimiter';
import {
  SNAPSHOT_BATCH_SIZE,
  buildSnapshotUrl,
  createOpenMeteoSnapshots,
  parseSnapshotResponse,
} from './snapshots';
import { STATIONS } from './stations';

const two = STATIONS.slice(0, 2);
const first = two[0];
if (!first) throw new Error('stations.json está vacío');

/** Una ubicación con la forma real de la respuesta (comprobada contra la API el 2026-11-15). */
const location = (snow: (number | null)[], depthM: number | null = 0.21) => ({
  latitude: 45.29,
  longitude: 6.62,
  elevation: 3200,
  current_units: { temperature_2m: '°C', weather_code: 'wmo code', snow_depth: 'm' },
  current: { time: 1794742200, temperature_2m: -5, weather_code: 71, snow_depth: depthM },
  daily_units: { time: 'unixtime', snowfall_sum: 'cm' },
  daily: { time: snow.map((_, i) => 1794697200 + i * 86400), snowfall_sum: snow },
});

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

describe('buildSnapshotUrl', () => {
  it('pide solo la cima de cada estación, en el mismo orden', () => {
    const url = new URL(buildSnapshotUrl(two));
    expect(url.searchParams.get('latitude')).toBe(two.map((s) => s.latitude).join(','));
    expect(url.searchParams.get('elevation')).toBe(two.map((s) => s.topElevationM).join(','));
    expect(url.searchParams.get('daily')).toBe('snowfall_sum');
    expect(url.searchParams.get('current')).toContain('snow_depth');
    expect(url.searchParams.get('timezone')).toBe('auto');
  });
});

describe('parseSnapshotResponse', () => {
  it('normaliza la nieve diaria y pasa el espesor de metros a cm', () => {
    const [a, b] = parseSnapshotResponse([location([1.12, 0, 26.36]), location([0, null])], two, 9);
    expect(a?.stationId).toBe(two[0]?.id);
    expect(a?.fetchedAt).toBe(9);
    expect(a?.dailySnowCm).toEqual([1.12, 0, 26.36]);
    expect(a?.snowDepthCm).toBeCloseTo(21);
    expect(a?.temperatureC).toBe(-5);
    expect(a?.weatherCode).toBe(71);
    expect(b?.dailySnowCm).toEqual([0, null]);
  });

  it('acepta una sola ubicación sin lista y datos actuales incompletos', () => {
    const raw = { ...location([3]), current: {} };
    const [only] = parseSnapshotResponse(raw, two.slice(0, 1), 0);
    expect(only?.dailySnowCm).toEqual([3]);
    expect(only?.temperatureC).toBeNull();
    expect(only?.snowDepthCm).toBeNull();
  });

  it('rechaza una respuesta con otro número de ubicaciones o sin nieve diaria', () => {
    expect(() => parseSnapshotResponse([location([1])], two, 0)).toThrow(/ubicaciones/);
    expect(() => parseSnapshotResponse([{ daily: {} }], two.slice(0, 1), 0)).toThrow(/nieve/);
  });

  it('convierte el error del proveedor', () => {
    expect(() => parseSnapshotResponse({ error: true, reason: 'malo' }, two, 0)).toThrow('malo');
  });
});

describe('createOpenMeteoSnapshots', () => {
  it('reparte las estaciones en lotes y conserva el orden', async () => {
    const many = Array.from({ length: SNAPSHOT_BATCH_SIZE + 5 }, (_, i) => ({
      ...first,
      id: `s${i}`,
    }));
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const n = (new URL(String(input)).searchParams.get('latitude') ?? '').split(',').length;
      return Promise.resolve(jsonResponse(Array.from({ length: n }, () => location([2]))));
    });
    const provider = createOpenMeteoSnapshots({ fetch: fetchMock as typeof fetch, now: () => 7 });
    const result = await provider.getSnapshots(many);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.map((r) => r.stationId)).toEqual(many.map((s) => s.id));
  });

  it('sin conexión, límite de peticiones y límite propio dan errores tipados', async () => {
    const offline = createOpenMeteoSnapshots({
      fetch: (() => Promise.reject(new TypeError('red'))) as typeof fetch,
    });
    await expect(offline.getSnapshots(two)).rejects.toMatchObject({ kind: 'offline' });

    const limited = createOpenMeteoSnapshots({
      fetch: (() =>
        Promise.resolve(
          jsonResponse({}, { status: 429, headers: { 'Retry-After': '5' } }),
        )) as typeof fetch,
    });
    await expect(limited.getSnapshots(two)).rejects.toMatchObject({
      kind: 'rate-limited',
      retryAfterMs: 5000,
    });

    const own = createOpenMeteoSnapshots({
      fetch: (() => Promise.resolve(jsonResponse([location([1]), location([1])]))) as typeof fetch,
      limiter: new RateLimiter(1, 60_000),
    });
    await own.getSnapshots(two);
    await expect(own.getSnapshots(two)).rejects.toBeInstanceOf(ForecastError);
  });
});
