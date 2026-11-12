import { formatDistanceKm, formatDuration, haversineKm, type LatLng } from '@snowview/core';
import {
  isForecastError,
  searchStations,
  type CuratedStation,
  type Money,
  type RouteResult,
  type TollInfo,
} from '@snowview/data';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bus,
  Car,
  Crosshair,
  KeyRound,
  Layers,
  LocateFixed,
  Map as MapIcon,
  MapPinOff,
  Route as RouteIcon,
  RotateCw,
  Search,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { storage } from '../../platform/storage';
import { Skeleton } from '../components/StatusViews';
import { useStationRoutes, type RouteState } from '../data/routes';
import { MapView, type HoverInfo } from '../map/MapView';
import { PisteMapDialog } from '../map/PisteMap';
import { PlaceSearch } from '../map/PlaceSearch';
import { SPAIN_VIEW, fitView, stationView, type View } from '../map/projection';
import { useUserLocation, type UserLocation } from '../map/useUserLocation';
import { revealItem } from '../motion/reveal';
import { useAppStore } from '../state/appStore';
import { useManualLocation } from '../state/manualLocationStore';
import { useRoutesKey } from '../state/routesKeyStore';

const STATIONS = searchStations('');
const DISMISSED_KEY = 'mapLocationAlertDismissed';

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

/** Pin rojo de la leyenda: el mismo dibujo que el del mapa. */
function PinIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"
        fill="#ff4d5e"
        stroke="#ffffff"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="10" r="3" fill="#ffffff" />
    </svg>
  );
}

/** Aviso discreto sobre la ubicación: se puede activar o descartar, y no vuelve a molestar. */
function LocationAlert({ location }: { location: UserLocation }) {
  const [dismissed, setDismissed] = useState(true); // oculto hasta leer lo guardado
  useEffect(() => {
    void storage.get<boolean>(DISMISSED_KEY).then((v) => setDismissed(v === true));
  }, []);
  const dismiss = () => {
    setDismissed(true);
    void storage.set(DISMISSED_KEY, true);
  };

  const { status } = location;
  if (status === 'granted' || status === 'checking' || status === 'locating') return null;
  if (dismissed && status === 'prompt') return null;

  const text =
    status === 'prompt'
      ? 'Activa tu ubicación para ver tu posición en el mapa y la distancia a cada estación.'
      : status === 'denied'
        ? 'La ubicación está desactivada. Actívala en Windows (Configuración → Privacidad y seguridad → Ubicación) y vuelve aquí.'
        : status === 'unavailable'
          ? 'Este equipo no ofrece ubicación.'
          : 'No se pudo obtener tu ubicación.';

  return (
    <div
      role="status"
      className="flex max-w-[min(430px,calc(100%-24px))] items-center gap-3 rounded-2xl border border-white/10 bg-[#0d1340]/90 px-3.5 py-2.5 text-xs backdrop-blur-md"
    >
      <MapPinOff className="size-4 shrink-0 text-muted" aria-hidden="true" />
      <p className="min-w-0 flex-1">{text}</p>
      {(status === 'prompt' || status === 'error') && (
        <button
          type="button"
          onClick={location.request}
          className="shrink-0 rounded-lg bg-ice/[0.16] px-2.5 py-1 text-ice transition-colors hover:bg-ice/25"
        >
          {status === 'prompt' ? 'Activar' : 'Reintentar'}
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar el aviso de ubicación"
        className="grid size-6 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-white/[0.1] hover:text-text"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
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

function DriveCard({ state }: { state: RouteState }) {
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

function BusCard({ state }: { state: RouteState }) {
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

function StationDetail({
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

function formatAccuracy(meters: number): string {
  return meters >= 1000 ? `±${Math.round(meters / 1000)} km` : `±${Math.round(meters)} m`;
}

/** Dónde estás: la del equipo con su precisión, o la que fijas a mano si Windows se equivoca. */
function LocationPanel({
  location,
  pickMode,
  onTogglePick,
}: {
  location: UserLocation;
  pickMode: boolean;
  onTogglePick: () => void;
}) {
  const setManual = useManualLocation((s) => s.set);
  const clearManual = useManualLocation((s) => s.clear);
  const [searching, setSearching] = useState(false);
  const { position, source, accuracyM, label } = location;
  const imprecise = source === 'device' && accuracyM !== undefined && accuracyM > 5000;

  return (
    <section
      aria-labelledby="mylocation-title"
      className="flex flex-col gap-2 border-b border-white/[0.08] pb-4"
    >
      <h2 id="mylocation-title" className="text-sm font-semibold">
        Tu ubicación
      </h2>
      <p className="text-xs" aria-live="polite">
        {!position
          ? 'Sin ubicación todavía.'
          : source === 'manual'
            ? `Fijada a mano${label ? `: ${label}` : ''}.`
            : `La del equipo${accuracyM !== undefined ? `, ${formatAccuracy(accuracyM)}` : ''}.`}
      </p>
      {imprecise && (
        <p className="text-[11px] leading-snug text-amber-200">
          Windows la calcula por la red y puede errar varios kilómetros. Si no es donde estás, busca
          tu pueblo o márcalo en el mapa.
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSearching((v) => !v)}
          aria-expanded={searching}
          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs transition-colors ${searching ? 'bg-ice/[0.18] font-semibold text-ice' : 'bg-white/[0.06] hover:bg-white/[0.12]'}`}
        >
          <Search className="size-3.5" aria-hidden="true" /> Buscar mi pueblo
        </button>
        <button
          type="button"
          onClick={onTogglePick}
          aria-pressed={pickMode}
          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs transition-colors ${pickMode ? 'bg-ice/[0.18] font-semibold text-ice' : 'bg-white/[0.06] hover:bg-white/[0.12]'}`}
        >
          <Crosshair className="size-3.5" aria-hidden="true" /> Fijar en el mapa
        </button>
        {source === 'manual' && (
          <button
            type="button"
            onClick={() => {
              clearManual();
              location.request();
            }}
            className="rounded-xl bg-white/[0.06] px-2.5 py-1.5 text-xs transition-colors hover:bg-white/[0.12]"
          >
            Usar la del equipo
          </button>
        )}
      </div>
      {searching && (
        <PlaceSearch
          onClose={() => setSearching(false)}
          onPick={(place) => {
            setManual({ latitude: place.latitude, longitude: place.longitude }, place.label);
            setSearching(false);
          }}
        />
      )}
    </section>
  );
}

/** Leyenda sobre el mapa: la misma, con el mismo formato, en el mapa de España y en el de cada estación. */
function MapLegend() {
  const [open, setOpen] = useState(true);
  return (
    <div className="w-[210px] rounded-2xl border border-white/10 bg-[#0d1340]/90 text-[11px] backdrop-blur-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold"
      >
        <Layers className="size-3.5 text-ice" aria-hidden="true" /> Leyenda
      </button>
      {open && (
        <div className="border-t border-white/[0.08] px-3 pt-2 pb-2.5">
          <ul className="flex flex-col gap-1.5 text-muted" aria-label="Leyenda del mapa">
            <li className="flex items-center gap-2">
              <PinIcon className="size-4" /> Estación
            </li>
            <li className="flex items-center gap-2">
              <span className="grid size-4 place-items-center" aria-hidden="true">
                <span className="size-2.5 rounded-full border-2 border-white bg-[#4aa8ff]" />
              </span>
              Tu ubicación
            </li>
            <li className="flex items-center gap-2">
              <span className="h-0.5 w-4 rounded bg-ice" aria-hidden="true" /> Ruta en coche
            </li>
            <li className="flex items-center gap-2">
              <span className="w-4 border-t-2 border-dashed border-indigo" aria-hidden="true" />{' '}
              Ruta en autobús
            </li>
            <li className="flex items-center gap-2">
              <span className="h-px w-4 bg-[rgba(125,227,255,0.8)]" aria-hidden="true" /> Fronteras
              de país
            </li>
            <li className="flex items-center gap-2">
              <span
                className="w-4 border-t border-dashed border-[rgba(190,210,245,0.8)]"
                aria-hidden="true"
              />{' '}
              Provincias
            </li>
          </ul>
          <p className="mt-2 text-[10px] leading-snug text-muted">
            Fronteras y provincias: Natural Earth.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Ficha que sale al pasar el ratón por un pin: resumen de la estación y el botón para abrir su mapa.
 * Se queda abierta mientras el puntero está en el pin o en la ficha, para poder pulsar el botón.
 */
function StationHoverCard({
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
        <MapIcon className="size-3.5" aria-hidden="true" /> Ver mapa de la estación
      </button>
    </div>
  );
}

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
