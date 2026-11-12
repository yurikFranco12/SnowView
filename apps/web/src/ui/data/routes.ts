import type { LatLng } from '@snowview/core';
import {
  createGoogleRoutesProvider,
  isForecastError,
  type CuratedStation,
  type RouteResult,
  type TravelMode,
} from '@snowview/data';
import { useQueries } from '@tanstack/react-query';
import { useRoutesKey } from '../state/routesKeyStore';

/** Cada cuánto se vuelve a pedir una ruta: el tráfico cambia, pero cada petición cuesta dinero. */
export const ROUTE_STALE_MS = 10 * 60_000;

/** Redondea a 3 decimales (unos 100 m): moverse un poco no repite la petición. */
export const roundCoord = (n: number) => Math.round(n * 1000) / 1000;

export interface RouteState {
  mode: TravelMode;
  route: RouteResult | null | undefined;
  loading: boolean;
  error: unknown;
}

/**
 * Rutas en coche y en autobús de `origin` a la estación. No pide nada sin clave de Google o sin la
 * ubicación del usuario; el resultado se guarda 10 minutos.
 */
export function useStationRoutes(
  station: CuratedStation | undefined,
  origin: LatLng | undefined,
): { drive: RouteState; bus: RouteState; enabled: boolean } {
  const apiKey = useRoutesKey((s) => s.apiKey);
  const enabled = !!station && !!origin && !!apiKey;
  const modes: TravelMode[] = ['drive', 'bus'];

  const results = useQueries({
    queries: modes.map((mode) => ({
      // La clave no entra en la caché: si cambia, se reintenta a mano.
      queryKey: [
        'route',
        mode,
        station?.id,
        origin ? roundCoord(origin.latitude) : null,
        origin ? roundCoord(origin.longitude) : null,
      ],
      enabled,
      staleTime: ROUTE_STALE_MS,
      gcTime: ROUTE_STALE_MS * 3,
      refetchInterval: false as const,
      refetchOnWindowFocus: false,
      retry: (count: number, error: unknown) =>
        isForecastError(error) && error.retryable && error.kind !== 'auth' && count < 1,
      queryFn: ({ signal }: { signal: AbortSignal }) => {
        if (!station || !origin || !apiKey) throw new Error('Faltan datos para la ruta');
        const provider = createGoogleRoutesProvider({ apiKey });
        return provider.getRoute(
          mode,
          { latitude: roundCoord(origin.latitude), longitude: roundCoord(origin.longitude) },
          { latitude: station.latitude, longitude: station.longitude },
          { signal },
        );
      },
    })),
  });

  const toState = (mode: TravelMode, i: number): RouteState => ({
    mode,
    route: results[i]?.data,
    loading: enabled && (results[i]?.isPending ?? false),
    error: results[i]?.error ?? null,
  });
  return { drive: toState('drive', 0), bus: toState('bus', 1), enabled };
}
