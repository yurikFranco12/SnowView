import { formatDistanceKm, haversineKm, type LatLng } from '@snowview/core';
import { searchStations } from '@snowview/data';
import { ArrowLeft, Crosshair, LocateFixed } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LocationAlert } from '../map/LocationAlert';
import { LocationPanel } from '../map/LocationPanel';
import { MapLegend } from '../map/MapLegend';
import { useStationRoutes } from '../data/routes';
import { MapView, type HoverInfo } from '../map/MapView';
import { PinIcon } from '../map/PinIcon';
import { PisteMapDialog } from '../map/PisteMap';
import { SPAIN_VIEW, fitView, stationView, type View } from '../map/projection';
import { StationDetail } from '../map/StationDetail';
import { StationHoverCard } from '../map/StationHoverCard';
import { useUserLocation } from '../map/useUserLocation';
import { revealItem } from '../motion/reveal';
import { useManualLocation } from '../state/manualLocationStore';

const STATIONS = searchStations('');

export function MapScreen() {
  const location = useUserLocation();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [routeFocus, setRouteFocus] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const [focusToken, setFocusToken] = useState(0);
  const [hover, setHover] = useState<HoverInfo | undefined>(undefined);
  const [pisteMapId, setPisteMapId] = useState<string | undefined>(undefined);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const setManual = useManualLocation((s) => s.set);
  const selected = STATIONS.find((s) => s.id === selectedId);
  const { drive, bus } = useStationRoutes(selected, location.position);

  const target: View = useMemo(() => {
    if (!selected) return SPAIN_VIEW;
    if (routeFocus && location.position) {
      const pts: LatLng[] = [location.position, selected];
      return fitView(pts, 0.55);
    }
    return stationView(selected.longitude, selected.latitude);
  }, [selected, routeFocus, location.position]);

  const select = (id: string) => {
    setSelectedId(id);
    setRouteFocus(false);
  };
  // La ficha del pin sigue abierta un instante al salir, para poder llegar a ella con el ratón.
  const cancelHoverClose = () => clearTimeout(hoverTimer.current);
  const scheduleHoverClose = () => {
    cancelHoverClose();
    hoverTimer.current = setTimeout(() => setHover(undefined), 250);
  };
  useEffect(() => () => clearTimeout(hoverTimer.current), []);
  const onHover = (info: HoverInfo | undefined, immediate?: boolean) => {
    if (info) {
      cancelHoverClose();
      setHover(info);
    } else if (immediate) {
      cancelHoverClose();
      setHover(undefined);
    } else {
      scheduleHoverClose();
    }
  };
  const pisteStation = pisteMapId ? STATIONS.find((st) => st.id === pisteMapId) : undefined;
  const hoveredStation = hover ? STATIONS.find((st) => st.id === hover.id) : undefined;

  const back = () => {
    setSelectedId(undefined);
    setRouteFocus(false);
    setFocusToken((t) => t + 1);
  };

  const paths = useMemo(
    () => ({
      ...(drive.route?.path.length ? { drive: drive.route.path } : {}),
      ...(bus.route?.path.length ? { bus: bus.route.path } : {}),
    }),
    [drive.route, bus.route],
  );

  return (
    <div className="flex h-full flex-col gap-4 px-8 py-[26px]">
      <motion.header variants={revealItem} className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.14em] text-muted uppercase">
            {STATIONS.length} estaciones · España, sur de Francia y Andorra
          </p>
          <h1 className="mt-1.5 font-display text-4xl font-semibold tracking-tight">Mapa</h1>
        </div>
        {location.status !== 'granted' && location.status !== 'checking' && (
          <button
            type="button"
            onClick={location.request}
            className="inline-flex items-center gap-2 rounded-xl bg-white/[0.08] px-3.5 py-2 text-xs transition-colors hover:bg-white/[0.14]"
          >
            <LocateFixed className="size-4" aria-hidden="true" />
            {location.status === 'locating' ? 'Buscando tu ubicación…' : 'Activar mi ubicación'}
          </button>
        )}
      </motion.header>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_340px] gap-4">
        <motion.div
          variants={revealItem}
          className="glass relative min-h-[360px] overflow-hidden !p-0"
        >
          <MapView
            stations={STATIONS}
            selectedId={selectedId}
            onSelect={select}
            target={target}
            user={location.position}
            userAccuracyM={location.accuracyM}
            pickMode={pickMode}
            onPick={(point) => {
              setManual(point);
              setPickMode(false);
            }}
            focusToken={focusToken}
            onHover={onHover}
            routes={paths}
          />
          {hover && hoveredStation && !pickMode && (
            <StationHoverCard
              station={hoveredStation}
              info={hover}
              distanceKm={
                location.position ? haversineKm(location.position, hoveredStation) : undefined
              }
              onOpen={() => {
                setHover(undefined);
                select(hoveredStation.id);
                setPisteMapId(hoveredStation.id);
              }}
              onEnter={cancelHoverClose}
              onLeave={scheduleHoverClose}
            />
          )}
          {pickMode && (
            <div
              role="status"
              className="absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-ice/40 bg-[#0d1340]/95 px-4 py-2 text-xs backdrop-blur-md"
            >
              <Crosshair className="size-4 text-ice" aria-hidden="true" />
              Pulsa en el mapa donde estás. Puedes acercar con la rueda y arrastrar.
              <button
                type="button"
                onClick={() => setPickMode(false)}
                className="rounded-lg bg-white/[0.1] px-2 py-0.5 transition-colors hover:bg-white/[0.18]"
              >
                Cancelar
              </button>
            </div>
          )}
          {selected && (
            <button
              type="button"
              onClick={back}
              className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0d1340]/90 px-3 py-1.5 text-xs backdrop-blur-md transition-colors hover:bg-[#161e5a]"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" /> Volver al mapa de España
            </button>
          )}
          <div className="absolute bottom-3 left-3 flex flex-col items-start gap-2">
            <MapLegend />
            <LocationAlert location={location} />
          </div>
        </motion.div>

        <motion.aside
          variants={revealItem}
          aria-label="Estaciones"
          className="glass flex min-h-0 flex-col gap-4 overflow-y-auto p-4"
        >
          <LocationPanel
            location={location}
            pickMode={pickMode}
            onTogglePick={() => setPickMode((v) => !v)}
          />
          <section aria-labelledby="legend-title">
            <h2 id="legend-title" className="mb-2 text-sm font-semibold">
              Estaciones
            </h2>
            <ul className="flex flex-col gap-1">
              {STATIONS.map((s) => {
                const on = s.id === selectedId;
                const d = location.position ? haversineKm(location.position, s) : undefined;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => select(s.id)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${on ? 'bg-ice/[0.14]' : 'hover:bg-white/[0.07]'}`}
                    >
                      <PinIcon />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold">{s.name}</span>
                        <span className="block truncate text-[11px] text-muted">{s.region}</span>
                      </span>
                      {d !== undefined && (
                        <span className="shrink-0 text-[11px] text-muted tabular-nums">
                          {formatDistanceKm(d)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {selected ? (
            <StationDetail
              station={selected}
              location={location}
              routeFocused={routeFocus}
              onFocusRoute={() => setRouteFocus(true)}
              onFocusStation={() => {
                setRouteFocus(false);
                setFocusToken((t) => t + 1);
              }}
              onOpenPisteMap={() => setPisteMapId(selected.id)}
            />
          ) : (
            <p className="text-xs text-muted">
              Pulsa un pin o una estación de la lista para ver su zona, la distancia y las rutas.
            </p>
          )}
        </motion.aside>
      </div>
      {pisteStation && (
        <PisteMapDialog station={pisteStation} onClose={() => setPisteMapId(undefined)} />
      )}
    </div>
  );
}
