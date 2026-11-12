import { formatDistanceKm, haversineKm } from '@snowview/core';
import type { CuratedStation } from '@snowview/data';
import { useQueryClient } from '@tanstack/react-query';
import { KeyRound, Map as MapIcon, Route as RouteIcon, RotateCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useStationRoutes } from '../data/routes';
import { useAppStore } from '../state/appStore';
import { useRoutesKey } from '../state/routesKeyStore';
import { BusCard, DriveCard } from './RouteCards';
import type { UserLocation } from './useUserLocation';

export function StationDetail({
  station,
  location,
  onFocusRoute,
  routeFocused,
  onFocusStation,
  onOpenPisteMap,
}: {
  station: CuratedStation;
  location: UserLocation;
  onFocusRoute: () => void;
  routeFocused: boolean;
  onFocusStation: () => void;
  onOpenPisteMap: () => void;
}) {
  const setView = useAppStore((s) => s.setView);
  const hasKey = useRoutesKey((s) => !!s.apiKey);
  const queryClient = useQueryClient();
  const { drive, bus, enabled } = useStationRoutes(station, location.position);
  const straight = location.position ? haversineKm(location.position, station) : undefined;

  return (
    <motion.section
      key={station.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      aria-label={`Detalle de ${station.name}`}
      className="flex flex-col gap-3"
    >
      <div>
        <h3 className="font-display text-xl font-semibold">{station.name}</h3>
        <p className="text-xs text-muted">
          {station.region} · base {station.baseElevationM.toLocaleString('es-ES')} m · cima{' '}
          {station.topElevationM.toLocaleString('es-ES')} m
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onFocusStation}
          aria-pressed={!routeFocused}
          className={`rounded-xl px-3 py-1.5 text-xs transition-colors ${!routeFocused ? 'bg-ice/[0.18] font-semibold text-ice' : 'bg-white/[0.06] hover:bg-white/[0.12]'}`}
        >
          Ver estación
        </button>
        <button
          type="button"
          onClick={onFocusRoute}
          disabled={!location.position}
          aria-pressed={routeFocused}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-colors disabled:opacity-40 ${routeFocused ? 'bg-ice/[0.18] font-semibold text-ice' : 'bg-white/[0.06] hover:bg-white/[0.12]'}`}
        >
          <RouteIcon className="size-3.5" aria-hidden="true" /> Ver ruta completa
        </button>
        <button
          type="button"
          onClick={onOpenPisteMap}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 py-1.5 text-xs transition-colors hover:bg-white/[0.12]"
        >
          <MapIcon className="size-3.5" aria-hidden="true" /> Mapa de pistas
        </button>
      </div>

      <p className="rounded-xl bg-white/[0.06] px-3 py-2 text-sm">
        {straight !== undefined ? (
          <>
            Distancia en línea recta: <strong>{formatDistanceKm(straight)}</strong>
          </>
        ) : (
          <span className="text-muted">Activa tu ubicación para ver la distancia.</span>
        )}
      </p>

      {!hasKey ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-xs">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <div className="flex flex-col gap-2">
            <p>
              Para ver el tiempo en coche con tráfico, el precio de los peajes y el autobús, añade
              tu clave de Google Maps en Ajustes.
            </p>
            <button
              type="button"
              onClick={() => setView('ajustes')}
              className="self-start rounded-lg bg-ice/[0.16] px-2.5 py-1 text-ice transition-colors hover:bg-ice/25"
            >
              Ir a Ajustes
            </button>
          </div>
        </div>
      ) : !location.position ? (
        <p className="text-xs text-muted">Falta tu ubicación para calcular las rutas.</p>
      ) : (
        enabled && (
          <>
            <DriveCard state={drive} />
            <BusCard state={bus} />
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] leading-snug text-muted">
                Estimación de Google Maps saliendo ahora. El tráfico recoge las obras e incidencias
                que Google conoce; los peajes son un precio estimado para un turismo.
              </p>
              <button
                type="button"
                onClick={() => void queryClient.invalidateQueries({ queryKey: ['route'] })}
                aria-label="Actualizar las rutas"
                title="Actualizar las rutas"
                className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/[0.08] transition-colors hover:bg-white/[0.14]"
              >
                <RotateCw className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </>
        )
      )}
    </motion.section>
  );
}
