import type { LatLng } from '@snowview/core';
import type { CuratedStation } from '@snowview/data';
import { geoPath } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import { Minus, Plus } from 'lucide-react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import southwest from './data/southwest-europe.json';
import { PLACES } from './places';
import {
  MAP_H,
  MAP_W,
  MAX_ZOOM,
  MIN_ZOOM,
  WORLD_VIEW,
  layerOpacity,
  metersToUnits,
  project,
  screenToBase,
  unproject,
  type View,
} from './projection';

/** Países que se destacan: donde están las estaciones. */
const FOCUS_COUNTRIES = new Set(['Spain', 'France', 'Andorra']);

// geoPath trabaja con la proyección ya aplicada: se proyectan las coordenadas a mano para usar el
// mismo lienzo base que los pines y las rutas.
const projected = geoPath({
  stream: (sink) => ({
    point: (lon: number, lat: number) => {
      const [x, y] = project(lon, lat);
      sink.point(x, y);
    },
    lineStart: () => sink.lineStart(),
    lineEnd: () => sink.lineEnd(),
    polygonStart: () => sink.polygonStart(),
    polygonEnd: () => sink.polygonEnd(),
    sphere: () => sink.sphere?.(),
  }),
}).digits(5);

function toPath(features: FeatureCollection<Geometry>['features']): string {
  return features.map((f) => projected(f) ?? '').join('');
}

const worldTopology = world as unknown as Topology;
const countriesObject = worldTopology.objects['countries'];
if (!countriesObject) throw new Error('world-atlas no trae el objeto "countries"');
const worldFeatures = (
  feature(worldTopology, countriesObject) as unknown as FeatureCollection<Geometry>
).features.filter((f) => f.properties?.['name'] !== 'Antarctica');
const detailFeatures = (southwest as unknown as FeatureCollection<Geometry>).features;

/** Trazados SVG de las capas, calculados una sola vez al cargar el módulo. */
const PATHS = {
  world: toPath(worldFeatures),
  land: toPath(detailFeatures),
  focus: toPath(detailFeatures.filter((f) => FOCUS_COUNTRIES.has(String(f.properties?.['name'])))),
};

const PIN_PATH = 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z';
const PIN_RED = '#ff4d5e';

function routePath(points: readonly LatLng[]): string {
  return points
    .map((p, i) => {
      const [x, y] = project(p.longitude, p.latitude);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(4)} ${y.toFixed(4)}`;
    })
    .join('');
}

/** Pin de una estación, siempre con el mismo dibujo y tamaño en pantalla. */
function StationPin({ label, selected }: { label: string; selected: boolean }) {
  return (
    <g>
      {selected && (
        <circle
          cx="0"
          cy="-10"
          r="20"
          fill={PIN_RED}
          opacity="0.22"
          className="motion-safe:animate-pulse"
        />
      )}
      <g transform="translate(-12 -22)">
        <path d={PIN_PATH} fill={PIN_RED} stroke="#ffffff" strokeWidth="1.6" />
        <circle cx="12" cy="10" r="3" fill="#ffffff" />
      </g>
      <title>{label}</title>
    </g>
  );
}

interface MapViewProps {
  stations: readonly CuratedStation[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  /** Encuadre al que animar. Al montarse, el mapa parte del mundo entero. */
  target: View;
  user: LatLng | undefined;
  /** Precisión de la ubicación en metros (si es grande, se dibuja un círculo). */
  userAccuracyM?: number | undefined;
  /** Con true, un clic en el mapa elige la ubicación del usuario en vez de seleccionar nada. */
  pickMode?: boolean;
  onPick?: (point: LatLng) => void;
  /** Cambia para volver a centrar el mapa en `target` aunque el encuadre no haya cambiado. */
  focusToken?: number;
  routes: { drive?: readonly LatLng[]; bus?: readonly LatLng[] } | undefined;
}

export function MapView({
  stations,
  selectedId,
  onSelect,
  target,
  user,
  userAccuracyM,
  pickMode = false,
  onPick,
  focusToken = 0,
  routes,
}: MapViewProps) {
  const reduced = usePrefersReducedMotion();
  const lnZoom = useMotionValue(Math.log(WORLD_VIEW.zoom));
  const cx = useMotionValue(WORLD_VIEW.x);
  const cy = useMotionValue(WORLD_VIEW.y);
  const sceneRef = useRef<SVGGElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const controlsRef = useRef<{ stop: () => void }[]>([]);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(
    null,
  );
  const dragged = useRef(false);
  const [zoom, setZoom] = useState(WORLD_VIEW.zoom);
  const [hovered, setHovered] = useState<string | undefined>(undefined);

  const worldOpacity = useTransform(lnZoom, (l) => 1 - layerOpacity(Math.exp(l), 5, 14));

  // La escena se mueve con el atributo `transform` del SVG (origen en 0,0 del lienzo). Los grupos
  // marcados con data-inv se encogen 1/k para que pines y etiquetas midan siempre lo mismo en pantalla.
  const applyTransform = () => {
    const scene = sceneRef.current;
    if (!scene) return;
    const k = Math.exp(lnZoom.get());
    const tx = MAP_W / 2 - k * cx.get();
    const ty = MAP_H / 2 - k * cy.get();
    scene.setAttribute('transform', `translate(${tx} ${ty}) scale(${k})`);
    const inv = `scale(${1 / k})`;
    scene.querySelectorAll('[data-inv]').forEach((el) => el.setAttribute('transform', inv));
  };
  useLayoutEffect(applyTransform);
  useEffect(() => {
    const stops = [
      lnZoom.on('change', applyTransform),
      cx.on('change', applyTransform),
      cy.on('change', applyTransform),
    ];
    return () => stops.forEach((stop) => stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lnZoom, cx, cy]);

  // Anima hasta el encuadre pedido. Con "reducir movimiento" salta directamente.
  useEffect(() => {
    const options = reduced
      ? { duration: 0 }
      : { duration: target.zoom > 100 ? 1.7 : 2.4, ease: [0.22, 1, 0.36, 1] as const };
    const controls = [
      animate(lnZoom, Math.log(target.zoom), options),
      animate(cx, target.x, options),
      animate(cy, target.y, options),
    ];
    controlsRef.current = controls;
    return () => controls.forEach((c) => c.stop());
  }, [target.x, target.y, target.zoom, focusToken, reduced, lnZoom, cx, cy]);

  // El zoom se copia a un estado solo cuando cambia lo bastante: decide qué etiquetas se dibujan.
  useEffect(() => {
    return lnZoom.on('change', (l) => {
      const k = Math.exp(l);
      setZoom((prev) => (Math.abs(Math.log(k / prev)) > 0.08 ? k : prev));
    });
  }, [lnZoom]);

  const stationPoints = useMemo(
    () => stations.map((s) => ({ station: s, point: project(s.longitude, s.latitude) })),
    [stations],
  );
  const visiblePlaces = PLACES.filter((p) => zoom >= p.minZoom);
  const showAllLabels = zoom >= 40;

  const onKey = (e: KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(id);
    }
  };

  const stopAnimations = () => controlsRef.current.forEach((c) => c.stop());
  const currentView = (): View => ({ x: cx.get(), y: cy.get(), zoom: Math.exp(lnZoom.get()) });

  /** Punto de la pantalla (cliente) a punto del lienzo de 1000x600, o null si el SVG no está listo. */
  const clientToCanvas = (clientX: number, clientY: number): [number, number] | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return [p.x, p.y];
  };

  // Zoom con la rueda, centrado en el puntero. Escucha nativa: React no permite cancelar la rueda.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = clientToCanvas(e.clientX, e.clientY);
      if (!p) return;
      stopAnimations();
      const base = screenToBase(p, currentView());
      const nextLn = Math.min(
        Math.log(MAX_ZOOM),
        Math.max(Math.log(MIN_ZOOM), lnZoom.get() - e.deltaY * 0.0015),
      );
      const k = Math.exp(nextLn);
      lnZoom.set(nextLn);
      cx.set(base[0] - (p[0] - MAP_W / 2) / k);
      cy.set(base[1] - (p[1] - MAP_H / 2) / k);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomBy = (factor: number) => {
    stopAnimations();
    const next = Math.min(
      Math.log(MAX_ZOOM),
      Math.max(Math.log(MIN_ZOOM), lnZoom.get() + Math.log(factor)),
    );
    controlsRef.current = [animate(lnZoom, next, { duration: reduced ? 0 : 0.25 })];
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    dragged.current = false;
    drag.current = { x: e.clientX, y: e.clientY, cx: cx.get(), cy: cy.get(), moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!d || !svg || !ctm || e.buttons === 0) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    if (!d.moved) {
      d.moved = true;
      dragged.current = true;
      stopAnimations();
      // El puntero se captura solo al arrastrar, para que los clics en los pines sigan funcionando.
      svg.setPointerCapture(e.pointerId);
    }
    const k = Math.exp(lnZoom.get());
    cx.set(d.cx - dx / ctm.a / k);
    cy.set(d.cy - dy / ctm.d / k);
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onBackgroundClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!pickMode || dragged.current || !onPick) return;
    const p = clientToCanvas(e.clientX, e.clientY);
    if (!p) return;
    const base = screenToBase(p, currentView());
    const ll = unproject(base[0], base[1]);
    if (ll) onPick({ latitude: ll.latitude, longitude: ll.longitude });
  };

  return (
    <div className="relative size-full">
      <svg
        ref={svgRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onBackgroundClick}
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        role="group"
        aria-label="Mapa de las estaciones. Cada pin rojo es una estación; la lista de la derecha tiene las mismas."
        className={`size-full touch-none select-none ${pickMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <g ref={sceneRef}>
          <motion.path
            d={PATHS.world}
            fill="rgba(159,179,217,0.16)"
            stroke="rgba(159,179,217,0.35)"
            strokeWidth="0.6"
            vectorEffect="non-scaling-stroke"
            style={{ opacity: worldOpacity }}
          />
          <path
            d={PATHS.land}
            fill="rgba(159,179,217,0.14)"
            stroke="rgba(159,179,217,0.4)"
            strokeWidth="0.7"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
          <path
            d={PATHS.focus}
            fill="rgba(125,227,255,0.1)"
            stroke="rgba(125,227,255,0.55)"
            strokeWidth="0.9"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />

          {routes?.bus && routes.bus.length > 1 && (
            <path
              d={routePath(routes.bus)}
              fill="none"
              stroke="#A5B4FF"
              strokeWidth="3"
              strokeDasharray="7 6"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {routes?.drive && routes.drive.length > 1 && (
            <path
              d={routePath(routes.drive)}
              fill="none"
              stroke="#7DE3FF"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {visiblePlaces.map((p) => {
            const [x, y] = project(p.longitude, p.latitude);
            return (
              <g key={p.name} transform={`translate(${x} ${y})`} aria-hidden="true">
                <g data-inv="">
                  <circle r="2.2" fill="rgba(234,242,255,0.55)" />
                  <text
                    x="5"
                    y="3.5"
                    fontSize="10"
                    fill="rgba(234,242,255,0.7)"
                    stroke="rgba(10,14,42,0.8)"
                    strokeWidth="2.5"
                    paintOrder="stroke"
                  >
                    {p.name}
                  </text>
                </g>
              </g>
            );
          })}

          {stationPoints.map(({ station, point }) => {
            const selected = station.id === selectedId;
            const showLabel = selected || hovered === station.id || showAllLabels;
            return (
              <g
                key={station.id}
                transform={`translate(${point[0]} ${point[1]})`}
                role="button"
                tabIndex={0}
                aria-label={`${station.name}, ${station.region}`}
                aria-pressed={selected}
                onClick={() => {
                  if (!pickMode && !dragged.current) onSelect(station.id);
                }}
                onKeyDown={(e) => onKey(e, station.id)}
                onPointerEnter={() => setHovered(station.id)}
                onPointerLeave={() => setHovered(undefined)}
                onFocus={() => setHovered(station.id)}
                onBlur={() => setHovered(undefined)}
                style={{ pointerEvents: pickMode ? 'none' : 'auto' }}
                className="cursor-pointer outline-none focus-visible:[&_path]:stroke-ice"
              >
                <g data-inv="">
                  <StationPin label={`${station.name} · ${station.region}`} selected={selected} />
                  {showLabel && (
                    <text
                      x="0"
                      y="-30"
                      textAnchor="middle"
                      fontSize="11.5"
                      fontWeight="600"
                      fill="#eaf2ff"
                      stroke="rgba(10,14,42,0.9)"
                      strokeWidth="3"
                      paintOrder="stroke"
                    >
                      {station.name}
                    </text>
                  )}
                </g>
              </g>
            );
          })}

          {user && userAccuracyM !== undefined && userAccuracyM >= 300 && (
            <circle
              cx={project(user.longitude, user.latitude)[0]}
              cy={project(user.longitude, user.latitude)[1]}
              r={metersToUnits(userAccuracyM, user.latitude)}
              fill="rgba(74,168,255,0.12)"
              stroke="rgba(74,168,255,0.55)"
              strokeWidth="1"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {user && (
            <g
              transform={`translate(${project(user.longitude, user.latitude)[0]} ${project(user.longitude, user.latitude)[1]})`}
            >
              <g data-inv="">
                <circle
                  r="16"
                  fill="#4aa8ff"
                  opacity="0.25"
                  className="motion-safe:animate-pulse"
                />
                <circle r="7" fill="#4aa8ff" stroke="#ffffff" strokeWidth="2.2" />
                <text
                  x="0"
                  y="-14"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="#cfe6ff"
                  stroke="rgba(10,14,42,0.9)"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  Tú
                </text>
                <title>Tu ubicación</title>
              </g>
            </g>
          )}
        </g>
      </svg>
      <div className="absolute right-3 bottom-3 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => zoomBy(1.8)}
          aria-label="Acercar el mapa"
          className="grid size-9 place-items-center rounded-xl border border-white/10 bg-[#0d1340]/90 backdrop-blur-md transition-colors hover:bg-[#161e5a]"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.8)}
          aria-label="Alejar el mapa"
          className="grid size-9 place-items-center rounded-xl border border-white/10 bg-[#0d1340]/90 backdrop-blur-md transition-colors hover:bg-[#161e5a]"
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
