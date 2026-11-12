import {
  HOUR_MS,
  accumulateSnow,
  dailySnowfall,
  describeWeatherCode,
  sumDays,
  type DailySnow,
  type HourlyPoint,
  type StationForecast,
} from '@snowview/core';
import {
  createOpenMeteoProvider,
  getStation,
  isForecastError,
  type CuratedStation,
  type ForecastErrorKind,
} from '@snowview/data';
import { QueryClient, useQuery } from '@tanstack/react-query';

/** Único proveedor de la app. Cambiar de proveedor es cambiar esta línea. */
export const provider = createOpenMeteoProvider();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // La previsión cambia cada pocas horas: 30 min de frescura y refresco cada hora.
      staleTime: 30 * 60_000,
      gcTime: 6 * 60 * 60_000,
      refetchInterval: 60 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => isForecastError(error) && error.retryable && failureCount < 3,
      retryDelay: (attempt, error) =>
        isForecastError(error) && error.retryAfterMs !== undefined
          ? error.retryAfterMs
          : Math.min(2000 * 2 ** attempt, 30_000),
    },
  },
});

export function useStationForecast(stationId: string | undefined) {
  const station = stationId ? getStation(stationId) : undefined;
  return useQuery({
    queryKey: ['forecast', stationId],
    enabled: station !== undefined,
    queryFn: ({ signal }) => {
      if (!station) throw new Error('Estación desconocida');
      return provider.getForecast(station, { signal });
    },
  });
}

/** Datos ya preparados para pintar una estación en un periodo. */
export interface StationSummary {
  station: CuratedStation;
  days: DailySnow[];
  topTotalCm: number;
  baseTotalCm: number;
  next48hCm: number;
  current: HourlyPoint | undefined;
  condition: string;
  /** Hay horas sin dato en el periodo. */
  incomplete: boolean;
}

/** Hora en curso: la última que ha empezado ya. */
function currentHour(hours: readonly HourlyPoint[], now: number): HourlyPoint | undefined {
  let found: HourlyPoint | undefined;
  for (const h of hours) {
    if (h.time <= now) found = h;
    else break;
  }
  return found ?? hours[0];
}

export function summarize(
  forecast: StationForecast,
  station: CuratedStation,
  periodDays: number,
  now: number = Date.now(),
): StationSummary {
  const days = dailySnowfall(forecast.top.hours, station.timeZone, now, periodDays);
  const baseDays = dailySnowfall(forecast.base.hours, station.timeZone, now, periodDays);
  const startOfHour = Math.floor(now / HOUR_MS) * HOUR_MS;
  const current = currentHour(forecast.top.hours, now);
  const expectedHours = days.length * 24;
  const hoursWithData = days.reduce((s, d) => s + d.hoursWithData, 0);
  return {
    station,
    days,
    topTotalCm: sumDays(days),
    baseTotalCm: sumDays(baseDays),
    next48hCm: accumulateSnow(forecast.top.hours, startOfHour, 48).totalCm,
    current,
    condition: describeWeatherCode(current?.weatherCode ?? null),
    // ±1 h por el cambio de hora; el primer día empieza a medianoche y puede faltar alguna hora pasada.
    incomplete: hoursWithData < expectedHours - 26,
  };
}

/** Mensaje para el usuario según el tipo de error. */
export function errorMessage(error: unknown): { title: string; detail: string } {
  const kind: ForecastErrorKind | undefined = isForecastError(error) ? error.kind : undefined;
  switch (kind) {
    case 'offline':
      return { title: 'Sin conexión', detail: 'Comprueba tu conexión a internet.' };
    case 'timeout':
      return { title: 'Open-Meteo tarda en responder', detail: 'Lo intentaremos de nuevo.' };
    case 'rate-limited':
      return {
        title: 'Demasiadas consultas',
        detail: 'Hemos hecho muchas peticiones seguidas. Espera un momento.',
      };
    case 'invalid-data':
      return {
        title: 'Datos incompletos',
        detail: 'La previsión llegó con un formato inesperado.',
      };
    case 'provider':
      return { title: 'Open-Meteo devolvió un error', detail: (error as Error).message };
    default:
      return { title: 'No se pudo cargar la previsión', detail: 'Inténtalo de nuevo.' };
  }
}

const shortDay = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });

/** "Ju", "Vi"… a partir de una fecha AAAA-MM-DD. */
export function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const label = shortDay.format(new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1)).replace('.', '');
  return label.charAt(0).toUpperCase() + label.slice(1, 2);
}

export function formatCm(cm: number): string {
  return cm >= 10
    ? Math.round(cm).toString()
    : cm.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}
