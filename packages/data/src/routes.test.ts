import { describe, expect, it, vi } from 'vitest';
import tauriConf from '../../../src-tauri/tauri.conf.json';
import { ForecastError } from './errors';
import { RateLimiter } from './rateLimiter';
import {
  FIELD_MASK,
  GOOGLE_ROUTES_URL,
  buildRoutesBody,
  createGoogleRoutesProvider,
  decodePolyline,
  parseDurationSeconds,
  parseMoney,
  parseRoutesResponse,
} from './routes';

const madrid = { latitude: 40.4168, longitude: -3.7038 };
const baqueira = { latitude: 42.6996, longitude: 0.93165 };
const NOW = Date.UTC(2026, 11, 12, 9, 0, 0);

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

// Ejemplo de la documentación de Google (algoritmo de polilíneas codificadas).
const GOOGLE_POLYLINE_EXAMPLE = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

const driveBody = {
  routes: [
    {
      distanceMeters: 563_400,
      duration: '19800s',
      staticDuration: '18000s',
      polyline: { encodedPolyline: GOOGLE_POLYLINE_EXAMPLE },
      travelAdvisory: {
        tollInfo: { estimatedPrice: [{ currencyCode: 'EUR', units: '23', nanos: 450_000_000 }] },
      },
    },
  ],
};

describe('decodePolyline', () => {
  it('decodifica el ejemplo de Google', () => {
    const pts = decodePolyline(GOOGLE_POLYLINE_EXAMPLE);
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual({ latitude: 38.5, longitude: -120.2 });
    expect(pts[1]?.latitude).toBeCloseTo(40.7, 5);
    expect(pts[1]?.longitude).toBeCloseTo(-120.95, 5);
    expect(pts[2]?.latitude).toBeCloseTo(43.252, 5);
    expect(pts[2]?.longitude).toBeCloseTo(-126.453, 5);
  });

  it('con texto vacío o truncado no falla ni inventa puntos', () => {
    expect(decodePolyline('')).toEqual([]);
    expect(decodePolyline('_p~iF')).toEqual([]); // falta la longitud
  });
});

describe('parseDurationSeconds y parseMoney', () => {
  it('lee los formatos de Google', () => {
    expect(parseDurationSeconds('1234s')).toBe(1234);
    expect(parseDurationSeconds('12.5s')).toBe(12.5);
    expect(parseDurationSeconds('12 minutos')).toBeNull();
    expect(parseDurationSeconds(12)).toBeNull();
  });

  it('el importe suma unidades y nanos, y tolera que falte alguno', () => {
    expect(parseMoney({ currencyCode: 'EUR', units: '23', nanos: 450_000_000 })).toEqual({
      currencyCode: 'EUR',
      amount: 23.45,
    });
    expect(parseMoney({ currencyCode: 'EUR', nanos: 500_000_000 })?.amount).toBe(0.5);
    expect(parseMoney({ currencyCode: 'EUR', units: '4' })?.amount).toBe(4);
    expect(parseMoney({ units: '4' })).toBeNull();
    expect(parseMoney(null)).toBeNull();
  });
});

describe('parseRoutesResponse (coche)', () => {
  it('lee distancia, tiempo con tráfico, retraso, peaje y trazado', () => {
    const r = parseRoutesResponse(driveBody, 'drive');
    expect(r).toMatchObject({
      mode: 'drive',
      distanceKm: 563.4,
      durationMin: 330,
      typicalDurationMin: 300,
      trafficDelayMin: 30,
      toll: { kind: 'priced', prices: [{ currencyCode: 'EUR', amount: 23.45 }] },
    });
    expect(r?.path).toHaveLength(3);
  });

  it('sin tollInfo no hay peajes; con tollInfo sin precio, el precio se desconoce', () => {
    const noToll = { routes: [{ ...driveBody.routes[0], travelAdvisory: {} }] };
    expect(parseRoutesResponse(noToll, 'drive')?.toll).toEqual({ kind: 'none' });
    const unknown = { routes: [{ ...driveBody.routes[0], travelAdvisory: { tollInfo: {} } }] };
    expect(parseRoutesResponse(unknown, 'drive')?.toll).toEqual({ kind: 'unknown' });
  });

  it('el retraso nunca es negativo', () => {
    const faster = { routes: [{ ...driveBody.routes[0], duration: '17000s' }] };
    expect(parseRoutesResponse(faster, 'drive')?.trafficDelayMin).toBe(0);
  });

  it('sin duración habitual no inventa retraso', () => {
    const noStatic = { routes: [{ ...driveBody.routes[0], staticDuration: undefined }] };
    const r = parseRoutesResponse(noStatic, 'drive');
    expect(r?.trafficDelayMin).toBeNull();
    expect(r?.typicalDurationMin).toBeNull();
  });
});

describe('parseRoutesResponse (autobús)', () => {
  const busBody = {
    routes: [
      {
        distanceMeters: 480_000,
        duration: '25200s',
        polyline: { encodedPolyline: GOOGLE_POLYLINE_EXAMPLE },
        travelAdvisory: { transitFare: { currencyCode: 'EUR', units: '31', nanos: 500_000_000 } },
        legs: [
          {
            steps: [
              { transitDetails: { transitLine: { nameShort: 'ALSA 120' } } },
              { navigationInstruction: 'camina' },
              { transitDetails: { transitLine: { name: 'Autobús a la estación' } } },
            ],
          },
        ],
      },
    ],
  };

  it('lee tiempo, tarifa, líneas y transbordos', () => {
    const r = parseRoutesResponse(busBody, 'bus');
    expect(r).toMatchObject({
      mode: 'bus',
      durationMin: 420,
      fare: { currencyCode: 'EUR', amount: 31.5 },
      lines: ['ALSA 120', 'Autobús a la estación'],
      transfers: 1,
      toll: null,
      trafficDelayMin: null,
    });
  });

  it('sin tarifa de Google, la tarifa es null', () => {
    const noFare = { routes: [{ ...busBody.routes[0], travelAdvisory: {} }] };
    expect(parseRoutesResponse(noFare, 'bus')?.fare).toBeNull();
  });
});

describe('parseRoutesResponse (casos límite)', () => {
  it('una respuesta sin rutas es "no hay ruta", no un error', () => {
    expect(parseRoutesResponse({}, 'bus')).toBeNull();
    expect(parseRoutesResponse({ routes: [] }, 'drive')).toBeNull();
  });

  it('rechaza respuestas mal formadas', () => {
    expect(() => parseRoutesResponse(null, 'drive')).toThrowError(ForecastError);
    expect(() => parseRoutesResponse({ routes: 5 }, 'drive')).toThrowError(ForecastError);
    expect(() => parseRoutesResponse({ routes: [{ duration: '5s' }] }, 'drive')).toThrowError(
      ForecastError,
    );
  });
});

describe('buildRoutesBody', () => {
  it('en coche pide tráfico en tiempo real y peajes', () => {
    const b = buildRoutesBody('drive', madrid, baqueira, NOW);
    expect(b['travelMode']).toBe('DRIVE');
    expect(b['routingPreference']).toBe('TRAFFIC_AWARE');
    expect(b['extraComputations']).toEqual(['TOLLS']);
    expect(b['departureTime']).toBe('2026-12-12T09:01:00.000Z');
    expect(b['origin']).toEqual({ location: { latLng: madrid } });
  });

  it('en autobús pide solo autobús y no usa opciones que el transporte público no admite', () => {
    const b = buildRoutesBody('bus', madrid, baqueira, NOW);
    expect(b['travelMode']).toBe('TRANSIT');
    expect(b['transitPreferences']).toMatchObject({ allowedTravelModes: ['BUS'] });
    expect(b).not.toHaveProperty('routingPreference');
    expect(b).not.toHaveProperty('extraComputations');
  });

  it('la máscara de campos pide solo lo necesario', () => {
    expect(FIELD_MASK.drive).toContain('routes.travelAdvisory.tollInfo');
    expect(FIELD_MASK.drive).not.toContain('routes.*');
    expect(FIELD_MASK.bus).toContain('routes.travelAdvisory.transitFare');
  });
});

describe('createGoogleRoutesProvider', () => {
  it('envía la clave y la máscara en cabeceras y la petición por POST', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(driveBody));
    const provider = createGoogleRoutesProvider({
      apiKey: ' MI_CLAVE ',
      fetch: fetchMock,
      now: () => NOW,
    });
    const route = await provider.getRoute('drive', madrid, baqueira);
    expect(route?.durationMin).toBe(330);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://routes.googleapis.com/directions/v2:computeRoutes');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Goog-Api-Key']).toBe('MI_CLAVE');
    expect(headers['X-Goog-FieldMask']).toBe(FIELD_MASK.drive);
    expect(JSON.parse(init.body as string).travelMode).toBe('DRIVE');
  });

  it('exige una clave', () => {
    expect(() => createGoogleRoutesProvider({ apiKey: '  ' })).toThrowError(/clave/);
  });

  it('una clave rechazada da un error de tipo "auth" con el motivo de Google', async () => {
    const body = {
      error: { code: 403, message: 'API key not valid', status: 'PERMISSION_DENIED' },
    };
    const provider = createGoogleRoutesProvider({
      apiKey: 'x',
      fetch: vi.fn().mockResolvedValue(jsonResponse(body, { status: 403 })),
    });
    await expect(provider.getRoute('drive', madrid, baqueira)).rejects.toMatchObject({
      kind: 'auth',
      status: 403,
      message: 'API key not valid',
    });
  });

  it('traduce el fallo de red a "offline" nombrando a Google', async () => {
    const provider = createGoogleRoutesProvider({
      apiKey: 'x',
      fetch: vi.fn().mockRejectedValue(new TypeError('red')),
    });
    await expect(provider.getRoute('bus', madrid, baqueira)).rejects.toMatchObject({
      kind: 'offline',
      message: expect.stringContaining('Google Maps'),
    });
  });

  it('respeta el límite de peticiones para no disparar la factura', async () => {
    const provider = createGoogleRoutesProvider({
      apiKey: 'x',
      fetch: vi.fn().mockResolvedValue(jsonResponse(driveBody)),
      limiter: new RateLimiter(1, 60_000),
    });
    await provider.getRoute('drive', madrid, baqueira);
    await expect(provider.getRoute('drive', madrid, baqueira)).rejects.toMatchObject({
      kind: 'rate-limited',
    });
  });

  it('permite una URL propia (servidor intermedio)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    const provider = createGoogleRoutesProvider({
      apiKey: 'x',
      endpoint: 'https://mi-servidor.example/rutas',
      fetch: fetchMock,
    });
    expect(await provider.getRoute('bus', madrid, baqueira)).toBeNull();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://mi-servidor.example/rutas');
  });
});

describe('CSP de Tauri', () => {
  it('permite conectar con la API de rutas de Google', () => {
    const directives = (tauriConf.app.security.csp as string).split(';').map((d) => d.trim());
    const connect = directives.find((d) => d.startsWith('connect-src ')) ?? '';
    expect(connect.split(/\s+/)).toContain(new URL(GOOGLE_ROUTES_URL).origin);
  });
});
