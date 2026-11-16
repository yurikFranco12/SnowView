import { formatDistanceKm } from '@snowview/core';
import type { CuratedStation } from '@snowview/data';
import { Map as MapIcon } from 'lucide-react';
import type { HoverInfo } from './MapView';
import { PinIcon } from './PinIcon';
import { hasPisteMap } from './pisteData';

/**
 * Ficha que sale al pasar el ratón por un pin: resumen de la estación y el botón para abrir su mapa.
 * Se queda abierta mientras el puntero está en el pin o en la ficha, para poder pulsar el botón.
 */
export function StationHoverCard({
  station,
  info,
  distanceKm,
  onOpen,
  onEnter,
  onLeave,
}: {
  station: CuratedStation;
  info: HoverInfo;
  distanceKm: number | undefined;
  onOpen: () => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const WIDTH = 250;
  const left = Math.min(
    Math.max(info.x, WIDTH / 2 + 8),
    Math.max(WIDTH / 2 + 8, info.boxWidth - WIDTH / 2 - 8),
  );
  // Encima del pin si cabe; si no, debajo.
  const above = info.top > 200;
  return (
    <div
      role="group"
      aria-label={`Resumen de ${station.name}`}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      style={{
        width: WIDTH,
        left,
        top: above ? info.top - 10 : info.bottom + 10,
        transform: above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      }}
      className="absolute z-10 flex flex-col gap-2.5 rounded-2xl border border-white/15 bg-[#0d1340]/95 p-3.5 shadow-xl backdrop-blur-md"
    >
      <div className="flex items-start gap-2.5">
        <PinIcon className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight font-semibold">{station.name}</p>
          <p className="text-xs text-muted">{station.region}</p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-1.5 text-[11px]">
        <li className="rounded-lg bg-white/[0.07] px-2 py-1">
          Base {station.baseElevationM.toLocaleString('es-ES')} m
        </li>
        <li className="rounded-lg bg-white/[0.07] px-2 py-1">
          Cima {station.topElevationM.toLocaleString('es-ES')} m
        </li>
        {distanceKm !== undefined && (
          <li className="rounded-lg bg-white/[0.07] px-2 py-1">
            A {formatDistanceKm(distanceKm)} en línea recta
          </li>
        )}
      </ul>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-ice to-indigo px-3 py-2 text-xs font-semibold text-bg-start"
      >
        <MapIcon className="size-3.5" aria-hidden="true" />{' '}
        {hasPisteMap(station.id) ? 'Ver mapa de la estación' : 'Ver la estación'}
      </button>
    </div>
  );
}
