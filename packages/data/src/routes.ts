import type { LatLng } from '@snowview/core';
import { ForecastError } from './errors';
import { fetchJson } from './http';
import { RateLimiter } from './rateLimiter';

/**
 * Rutas en coche y en autobús con Google Routes API (`computeRoutes`).
 *
 * Verificado en la documentación de Google el 2026-11-12 (NO contra la API real: hace falta una
 * clave con facturación, que el desarrollo no tiene):
 * - Con `routingPreference: TRAFFIC_AWARE`, `duration` incluye el tráfico en tiempo real y
 *   `staticDuration` solo el histórico. La diferencia es el retraso por tráfico (obras y
 *   accidentes incluidos, pero Google no entrega la lista de incidencias).
 * - Con `extraComputations: ["TOLLS"]`, `travelAdvisory.tollInfo` ausente = sin peajes previstos;
 *   presente sin `estimatedPrice` = hay peajes pero no se conoce el precio; presente con precio =
 *   precio estimado para un turismo. La documentación no lista los países con datos de peajes.
 * - En modo `TRANSIT` no se admiten `routingPreference` ni `extraComputations`; la tarifa llega en
 *   `travelAdvisory.transitFare` solo si Google la conoce para todos los tramos. Sin ruta de
 *   transporte público, la respuesta no trae `routes`.
 * - Cada llamada con tráfico o peajes se factura a tarifa superior: por eso el límite propio de
 *   peticiones es bajo y la UI guarda cada resultado unos minutos.
 */
export const GOOGLE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const DEFAULT_TIMEOUT_MS = 20_000;

export type TravelMode = 'drive' | 'bus';

export interface Money {
  currencyCode: string;
  amount: number;
}

/** Peaje de una ruta en coche. */
export type TollInfo = { kind: 'none' } | { kind: 'unknown' } | { kind: 'priced'; prices: Money[] };

export interface RouteResult {
  mode: TravelMode;
  distanceKm: number;
  /** Duración prevista saliendo ahora (en coche, con tráfico en tiempo real), en minutos. */
  durationMin: number;
  /** Duración habitual sin incidencias, solo en coche. */
  typicalDurationMin: number | null;
  /** Retraso por tráfico sobre lo habitual, en minutos (0 si no hay). Solo en coche. */
  trafficDelayMin: number | null;
  /** Peaje, solo en coche. */
  toll: TollInfo | null;
  /** Tarifa del autobús, si Google la conoce. */
  fare: Money | null;
  /** Líneas de autobús usadas (por ejemplo "ALSA 120"), solo en autobús. */
  lines: string[];
  /** Número de transbordos, solo en autobús. */
  transfers: number | null;
  /** Trazado de la ruta, listo para dibujar. */
  path: LatLng[];
}

/** Decodifica una polilínea codificada de Google (precisión 1e5) en puntos. */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const readValue = (): number | undefined => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      if (index >= encoded.length) return undefined;
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    const dLat = readValue();
    const dLng = readValue();
    if (dLat === undefined || dLng === undefined) break;
    lat += dLat;
    lng += dLng;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

/** "1234s" → 1234 segundos. null si no tiene ese formato. */
export function parseDurationSeconds(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d+(?:\.\d+)?)s$/.exec(value);
  return m ? Number(m[1]) : null;
}

/** `{currencyCode, units, nanos}` de Google → importe. `units` y `nanos` se omiten si valen 0. */
export function parseMoney(value: unknown): Money | null {
  if (typeof value !== 'object' || value === null) return null;
  const m = value as { currencyCode?: unknown; units?: unknown; nanos?: unknown };
  if (typeof m.currencyCode !== 'string') return null;
  const units = m.units === undefined ? 0 : Number(m.units);
  const nanos = m.nanos === undefined ? 0 : Number(m.nanos);
  if (!Number.isFinite(units) || !Number.isFinite(nanos)) return null;
  return { currencyCode: m.currencyCode, amount: Math.round((units + nanos / 1e9) * 100) / 100 };
}

function parseToll(advisory: unknown): TollInfo {
  const toll = (advisory as { tollInfo?: unknown } | undefined)?.tollInfo;
  if (toll === undefined || toll === null) return { kind: 'none' };
  const list = (toll as { estimatedPrice?: unknown }).estimatedPrice;
  if (!Array.isArray(list) || list.length === 0) return { kind: 'unknown' };
  const prices = list.flatMap((p) => {
    const money = parseMoney(p);
    return money ? [money] : [];
  });
  return prices.length === 0 ? { kind: 'unknown' } : { kind: 'priced', prices };
}

function invalid(message: string): never {
  throw new ForecastError('invalid-data', message);
}

interface RawStep {
  transitDetails?: { transitLine?: { nameShort?: string; name?: string } };
}

/**
 * Convierte la respuesta de `computeRoutes` en una ruta. Devuelve null si Google no encontró
 * ninguna (en transporte público es lo normal en estaciones sin línea de autobús).
 */
export function parseRoutesResponse(json: unknown, mode: TravelMode): RouteResult | null {
  if (typeof json !== 'object' || json === null) invalid('La respuesta de rutas no es un objeto.');
  const routes = (json as { routes?: unknown }).routes;
  if (routes === undefined || (Array.isArray(routes) && routes.length === 0)) return null;
  if (!Array.isArray(routes)) invalid('"routes" no es una lista.');
  const route = routes[0] as Record<string, unknown>;

  const distanceM = route['distanceMeters'];
  const durationS = parseDurationSeconds(route['duration']);
  if (typeof distanceM !== 'number' || durationS === null) {
    invalid('La ruta no trae distancia o duración.');
  }
  const staticS = parseDurationSeconds(route['staticDuration']);
  const encoded = (route['polyline'] as { encodedPolyline?: unknown } | undefined)?.encodedPolyline;
  const advisory = route['travelAdvisory'] as Record<string, unknown> | undefined;

  const result: RouteResult = {
    mode,
    distanceKm: Math.round((distanceM / 1000) * 10) / 10,
    durationMin: Math.round(durationS / 60),
    typicalDurationMin: null,
    trafficDelayMin: null,
    toll: null,
    fare: null,
    lines: [],
    transfers: null,
    path: typeof encoded === 'string' ? decodePolyline(encoded) : [],
  };

  if (mode === 'drive') {
    if (staticS !== null) {
      result.typicalDurationMin = Math.round(staticS / 60);
      result.trafficDelayMin = Math.max(0, Math.round((durationS - staticS) / 60));
    }
    result.toll = parseToll(advisory);
  } else {
    result.fare = parseMoney(advisory?.['transitFare']);
    const legs = route['legs'] as { steps?: RawStep[] }[] | undefined;
    const lines: string[] = [];
    for (const leg of legs ?? []) {
      for (const step of leg.steps ?? []) {
        const line = step.transitDetails?.transitLine;
        const name = line?.nameShort ?? line?.name;
        if (name) lines.push(name);
      }
    }
    result.lines = lines;
    result.transfers = Math.max(0, lines.length - 1);
  }
  return result;
}

function waypoint(p: LatLng) {
  return { location: { latLng: { latitude: p.latitude, longitude: p.longitude } } };
}

/** Cuerpo de la petición. `departure` debe ser ahora o futuro: se usa un minuto de margen. */
export function buildRoutesBody(
  mode: TravelMode,
  origin: LatLng,
  destination: LatLng,
  nowMs: number,
): Record<string, unknown> {
  const base = {
    origin: waypoint(origin),
    destination: waypoint(destination),
    departureTime: new Date(nowMs + 60_000).toISOString(),
    languageCode: 'es-ES',
    units: 'METRIC',
  };
  if (mode === 'drive') {
    return {
      ...base,
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      extraComputations: ['TOLLS'],
      routeModifiers: { vehicleInfo: { emissionType: 'GASOLINE' } },
    };
  }
  return {
    ...base,
    travelMode: 'TRANSIT',
    transitPreferences: { allowedTravelModes: ['BUS'], routingPreference: 'FEWER_TRANSFERS' },
  };
}

/** Campos que se piden: solo lo necesario, para pagar y descargar lo mínimo. */
export const FIELD_MASK: Record<TravelMode, string> = {
  drive:
    'routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.travelAdvisory.tollInfo',
  bus: 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.travelAdvisory.transitFare,routes.legs.steps.transitDetails.transitLine',
};

export interface RoutesProvider {
  /** Ruta de `origin` a `destination`. null si no hay ninguna. */
  getRoute(
    mode: TravelMode,
    origin: LatLng,
    destination: LatLng,
    options?: { signal?: AbortSignal },
  ): Promise<RouteResult | null>;
}

export interface GoogleRoutesOptions {
  /** Clave de Google Maps Platform del propio usuario. Nunca va en el código ni en git. */
  apiKey: string;
  /** Otra URL con la misma API (por ejemplo, un servidor intermedio propio). */
  endpoint?: string;
  fetch?: typeof fetch;
  limiter?: RateLimiter;
  timeoutMs?: number;
  now?: () => number;
}

export function createGoogleRoutesProvider(options: GoogleRoutesOptions): RoutesProvider {
  if (!options.apiKey.trim()) throw new Error('Falta la clave de Google Maps.');
  const doFetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  // Las llamadas con tráfico y peajes cuestan más: 12 por minuto protegen de bucles y facturas.
  const limiter = options.limiter ?? new RateLimiter(12, 60_000);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const now = options.now ?? Date.now;
  const endpoint = options.endpoint ?? GOOGLE_ROUTES_URL;

  return {
    async getRoute(mode, origin, destination, request = {}) {
      const json = await fetchJson(
        endpoint,
        { doFetch, limiter, timeoutMs, service: 'Google Maps' },
        request.signal,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': options.apiKey.trim(),
            'X-Goog-FieldMask': FIELD_MASK[mode],
          },
          body: JSON.stringify(buildRoutesBody(mode, origin, destination, now())),
        },
      );
      return parseRoutesResponse(json, mode);
    },
  };
}
