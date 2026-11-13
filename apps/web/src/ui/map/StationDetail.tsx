import { formatDistanceKm, haversineKm } from '@snowview/core';
import type { CuratedStation } from '@snowview/data';
import { Map as MapIcon, Route as RouteIcon } from 'lucide-react';
import { motion } from 'motion/react';
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
          <RouteIcon className="size-3.5" aria-hidden="true" /> Ver con mi ubicación
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
    </motion.section>
  );
}
