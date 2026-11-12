import { formatDistanceKm, formatDuration } from '@snowview/core';
import { isForecastError, type Money, type RouteResult, type TollInfo } from '@snowview/data';
import { Bus, Car } from 'lucide-react';
import { Skeleton } from '../components/StatusViews';
import type { RouteState } from '../data/routes';

function formatMoney(m: Money): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: m.currencyCode }).format(
    m.amount,
  );
}

function tollText(toll: TollInfo | null): string {
  if (!toll) return '—';
  if (toll.kind === 'none') return 'Sin peajes previstos';
  if (toll.kind === 'unknown') return 'Hay peajes, pero Google no da el precio';
  return `Peajes: ${toll.prices.map(formatMoney).join(' + ')}`;
}

function routeErrorText(error: unknown): string {
  if (isForecastError(error)) {
    if (error.kind === 'auth') return 'Google rechazó la clave. Revísala en Ajustes.';
    if (error.kind === 'offline') return 'Sin conexión con Google Maps.';
    if (error.kind === 'rate-limited') return 'Demasiadas consultas seguidas. Espera un poco.';
    return error.message;
  }
  return 'No se pudo calcular la ruta.';
}

export function DriveCard({ state }: { state: RouteState }) {
  const r: RouteResult | null | undefined = state.route;
  return (
    <section
      aria-label="Ruta en coche"
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5"
    >
      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Car className="size-4 text-ice" aria-hidden="true" /> En coche
      </h4>
      {state.loading ? (
        <Skeleton className="h-16" />
      ) : state.error ? (
        <p role="alert" className="text-xs text-[#FFB4A8]">
          {routeErrorText(state.error)}
        </p>
      ) : r === null ? (
        <p className="text-xs text-muted">Google no encontró ruta en coche.</p>
      ) : r ? (
        <div className="flex flex-col gap-1.5 text-sm">
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-display text-2xl font-semibold">
              {formatDuration(r.durationMin)}
            </span>
            <span className="text-muted">{formatDistanceKm(r.distanceKm)}</span>
          </p>
          {r.trafficDelayMin !== null && (
            <p
              className={`text-xs ${r.trafficDelayMin >= 10 ? 'font-semibold text-amber-200' : 'text-muted'}`}
            >
              {r.trafficDelayMin >= 5
                ? `+${formatDuration(r.trafficDelayMin)} por tráfico o incidencias (habitual: ${formatDuration(r.typicalDurationMin ?? 0)})`
                : 'Sin retrasos de tráfico ahora'}
            </p>
          )}
          <p className="text-xs">{tollText(r.toll)}</p>
        </div>
      ) : null}
    </section>
  );
}

export function BusCard({ state }: { state: RouteState }) {
  const r = state.route;
  return (
    <section
      aria-label="Ruta en autobús"
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5"
    >
      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Bus className="size-4 text-indigo" aria-hidden="true" /> En autobús
      </h4>
      {state.loading ? (
        <Skeleton className="h-16" />
      ) : state.error ? (
        <p role="alert" className="text-xs text-[#FFB4A8]">
          {routeErrorText(state.error)}
        </p>
      ) : r === null ? (
        <p className="text-xs text-muted">
          Google no tiene una ruta en autobús hasta esta estación. Suele pasar donde no hay línea
          regular o no está publicada.
        </p>
      ) : r ? (
        <div className="flex flex-col gap-1.5 text-sm">
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-display text-2xl font-semibold">
              {formatDuration(r.durationMin)}
            </span>
            <span className="text-muted">{formatDistanceKm(r.distanceKm)}</span>
          </p>
          <p className="text-xs">
            {r.fare ? `Tarifa estimada: ${formatMoney(r.fare)}` : 'Tarifa no disponible'}
            {r.transfers !== null && r.lines.length > 0 && (
              <span className="text-muted">
                {' · '}
                {r.transfers === 0
                  ? 'sin transbordos'
                  : `${r.transfers} transbordo${r.transfers > 1 ? 's' : ''}`}
              </span>
            )}
          </p>
          {r.lines.length > 0 && <p className="text-xs text-muted">Líneas: {r.lines.join(', ')}</p>}
        </div>
      ) : null}
    </section>
  );
}
