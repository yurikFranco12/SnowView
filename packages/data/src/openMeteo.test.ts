import { describe, expect, it, vi } from 'vitest';
import fixture from './__fixtures__/open-meteo-baqueira-2d.json';
import { ForecastError } from './errors';
import { buildForecastUrl, createOpenMeteoProvider, parseForecastResponse } from './openMeteo';
import { RateLimiter } from './rateLimiter';
import { getStation } from './stations';

const station = getStation('baqueira-beret');
if (!station) throw new Error('falta Baqueira-Beret en stations.json');

/** Copia profunda del ejemplo real para poder modificarlo en cada test. */
const realResponse = () => structuredClone(fixture) as unknown as Record<string, unknown>[];

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('buildForecastUrl', () => {
  it('pide base y cima en una sola llamada, en unixtime y 14 días', () => {
    const url = new URL(buildForecastUrl(station));
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(url.searchParams.get('elevation')).toBe('1500,2610');
    expect(url.searchParams.get('latitude')).toBe('42.6996,42.6996');
    expect(url.searchParams.get('timeformat')).toBe('unixtime');
    expect(url.searchParams.get('forecast_days')).toBe('14');
    expect(url.searchParams.get('hourly')).toContain('snowfall');
    expect(url.searchParams.get('hourly')).toContain('snow_depth');
  });
});

describe('parseForecastResponse (respuesta real de Open-Meteo)', () => {
  it('convierte la respuesta real en base y cima normalizadas', () => {
    const forecast = parseForecastResponse(realResponse(), station, 123);
    expect(forecast.stationId).toBe('baqueira-beret');
    expect(forecast.fetchedAt).toBe(123);
    expect(forecast.base.elevationM).toBe(1500);
    expect(forecast.top.elevationM).toBe(2610);
    expect(forecast.base.hours).toHaveLength(48);
    const first = forecast.top.hours[0];
    expect(first?.time).toBe((fixture[1]?.hourly.time[0] ?? 0) * 1000);
    expect(forecast.attribution).toContain('Open-Meteo');
  });

  it('pasa el grosor de nieve de metros a cm', () => {
    const raw = realResponse();
    const hourly = (raw[1] as { hourly: { snow_depth: number[] } }).hourly;
    hourly.snow_depth[0] = 0.85;
    expect(parseForecastResponse(raw, station, 0).top.hours[0]?.snowDepthCm).toBeCloseTo(85);
  });

  it('respeta la unidad declarada si la nieve llega en mm', () => {
    const raw = realResponse();
    const loc = raw[0] as { hourly_units: Record<string, string>; hourly: { snowfall: number[] } };
    loc.hourly_units.snowfall = 'mm';
    loc.hourly.snowfall[0] = 25;
    expect(parseForecastResponse(raw, station, 0).base.hours[0]?.snowfallCm).toBeCloseTo(2.5);
  });

  it('datos incompletos: una variable que falta queda como null, no como 0', () => {
    const raw = realResponse();
    delete (raw[0] as { hourly: Record<string, unknown> }).hourly.wind_gusts_10m;
    (raw[0] as { hourly: { snowfall: (number | null)[] } }).hourly.snowfall[3] = null;
    const base = parseForecastResponse(raw, station, 0).base;
    expect(base.hours.every((h) => h.gustKmh === null)).toBe(true);
    expect(base.hours[3]?.snowfallCm).toBeNull();
  });

  it('rechaza series de longitud distinta a la de las horas', () => {
    const raw = realResponse();
    (raw[0] as { hourly: { snowfall: number[] } }).hourly.snowfall.pop();
    expect(() => parseForecastResponse(raw, station, 0)).toThrow(ForecastError);
  });

  it('rechaza una unidad desconocida', () => {
    const raw = realResponse();
    (raw[0] as { hourly_units: Record<string, string> }).hourly_units.snowfall = 'inch';
    expect(() => parseForecastResponse(raw, station, 0)).toThrow(/Unidad desconocida/);
  });

  it('rechaza una respuesta con una sola ubicación', () => {
    expect(() => parseForecastResponse(realResponse()[0], station, 0)).toThrow(/2 ubicaciones/);
  });
});

describe('createOpenMeteoProvider', () => {
  const kindOf = async (p: Promise<unknown>) => {
    try {
      await p;
    } catch (e) {
      return e instanceof ForecastError ? e.kind : 'otro';
    }
    return 'sin error';
  };

  it('devuelve la previsión cuando todo va bien', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(realResponse()));
    const provider = createOpenMeteoProvider({ fetch: fetchMock, now: () => 42 });
    const forecast = await provider.getForecast(station);
    expect(forecast.fetchedAt).toBe(42);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('sin conexión: error "offline" y reintentable', async () => {
    const provider = createOpenMeteoProvider({
      fetch: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    const error = await provider.getForecast(station).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ForecastError);
    expect((error as ForecastError).kind).toBe('offline');
    expect((error as ForecastError).retryable).toBe(true);
  });

  it('tiempo agotado: error "timeout"', async () => {
    const provider = createOpenMeteoProvider({
      timeoutMs: 10,
      fetch: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    });
    expect(await kindOf(provider.getForecast(station))).toBe('timeout');
  });

  it('cancelación desde fuera: error "aborted"', async () => {
    const controller = new AbortController();
    const provider = createOpenMeteoProvider({
      fetch: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    });
    const pending = provider.getForecast(station, { signal: controller.signal });
    controller.abort();
    expect(await kindOf(pending)).toBe('aborted');
  });

  it('HTTP 429: error "rate-limited" con Retry-After y bloquea la siguiente petición', async () => {
    let t = 1_000_000;
    const limiter = new RateLimiter(30, 60_000, () => t);
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        { error: true, reason: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '120' } },
      ),
    );
    const provider = createOpenMeteoProvider({ fetch: fetchMock, limiter });
    const error = (await provider.getForecast(station).catch((e: unknown) => e)) as ForecastError;
    expect(error.kind).toBe('rate-limited');
    expect(error.retryAfterMs).toBe(120_000);
    // La siguiente petición ni siquiera sale a la red.
    expect(await kindOf(provider.getForecast(station))).toBe('rate-limited');
    expect(fetchMock).toHaveBeenCalledOnce();
    t += 121_000;
    fetchMock.mockImplementationOnce(async () => jsonResponse(realResponse()));
    expect(await kindOf(provider.getForecast(station))).toBe('sin error');
  });

  it('HTTP 400 con error de Open-Meteo: error "provider" con el motivo, no reintentable', async () => {
    const provider = createOpenMeteoProvider({
      fetch: async () =>
        jsonResponse({ error: true, reason: 'Parameter elevation invalid' }, { status: 400 }),
    });
    const error = (await provider.getForecast(station).catch((e: unknown) => e)) as ForecastError;
    expect(error.kind).toBe('provider');
    expect(error.message).toBe('Parameter elevation invalid');
    expect(error.retryable).toBe(false);
  });

  it('HTTP 503 sin JSON: error "provider" reintentable', async () => {
    const provider = createOpenMeteoProvider({
      fetch: async () => new Response('Service Unavailable', { status: 503 }),
    });
    const error = (await provider.getForecast(station).catch((e: unknown) => e)) as ForecastError;
    expect(error.kind).toBe('provider');
    expect(error.retryable).toBe(true);
  });

  it('respuesta 200 que no es JSON: error "invalid-data"', async () => {
    const provider = createOpenMeteoProvider({
      fetch: async () => new Response('<html>', { status: 200 }),
    });
    expect(await kindOf(provider.getForecast(station))).toBe('invalid-data');
  });
});

// Prueba contra la API real. Desactivada por defecto para no depender de internet ni gastar
// cuota en cada `pnpm test`. Para lanzarla: SNOWVIEW_LIVE=1 pnpm --filter @snowview/data test
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env;
describe.runIf(env?.SNOWVIEW_LIVE === '1')('Open-Meteo en vivo', () => {
  it('descarga y normaliza la previsión real de 14 días', async () => {
    const forecast = await createOpenMeteoProvider().getForecast(station);
    expect(forecast.top.hours.length).toBeGreaterThanOrEqual(14 * 24 - 1);
    expect(forecast.top.elevationM).toBe(2610);
  }, 20_000);
});
