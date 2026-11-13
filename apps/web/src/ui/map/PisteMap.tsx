import type { CuratedStation } from '@snowview/data';
import { useQuery } from '@tanstack/react-query';
import {
  Box as BoxIcon,
  Map as MapIcon,
  Minus,
  Mountain,
  Plus,
  RotateCcw,
  Route,
  X,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  fitBox,
  homeBox,
  makeProjection,
  pisteLengthKm,
  toPath,
  toXY,
  zoomBox,
  type Box,
  type Difficulty,
  type PisteData,
  type SceneProjection,
} from './pisteScene';
import { RidgeView } from './RidgeView';
import { contourSegments, elevationAt, shadeImage, type TerrainGrid } from './terrain';

const pisteLoaders = import.meta.glob<PisteData>('./data/pistes/*.json', { import: 'default' });
const terrainLoaders = import.meta.glob<TerrainGrid>('./data/terrain/*.json', {
  import: 'default',
});

/** Pistas y remontes de una estación (están dentro de la app: no hace falta conexión). */
function usePisteData(stationId: string) {
  return useQuery({
    queryKey: ['pistes', stationId],
    // TanStack Query no admite undefined como resultado: null = no hay datos.
    queryFn: async () => (await pisteLoaders[`./data/pistes/${stationId}.json`]?.()) ?? null,
    staleTime: Infinity,
    retry: false,
  });
}

/** Malla de altitudes de la estación; puede no existir (entonces se dibujan solo las pistas). */
function useTerrain(stationId: string) {
  return useQuery({
    queryKey: ['terrain', stationId],
    queryFn: async () => (await terrainLoaders[`./data/terrain/${stationId}.json`]?.()) ?? null,
    staleTime: Infinity,
    retry: false,
  });
}

const DIFFICULTY: Record<Difficulty, { label: string; color: string; halo?: string }> = {
  green: { label: 'Verde', color: '#3ddc97' },
  blue: { label: 'Azul', color: '#4aa8ff' },
  red: { label: 'Roja', color: '#ff5d73' },
  black: { label: 'Negra', color: '#1b1d3a', halo: 'rgba(235,240,255,0.85)' },
  freeride: { label: 'Fuera de pista', color: '#ffb454' },
  unknown: { label: 'Sin clasificar', color: '#9aa6d6' },
};
const DIFFICULTY_ORDER: Difficulty[] = ['green', 'blue', 'red', 'black', 'freeride', 'unknown'];
const LIFT_COLOR = '#7de3ff';
const DIFFICULTY_COLORS = Object.fromEntries(
  DIFFICULTY_ORDER.map((d) => [d, DIFFICULTY[d].color]),
) as Record<Difficulty, string>;
/** Hasta dónde llega el relieve alrededor de las pistas. */
const REACH_KM = 1.5;
const CONTOUR_STEP_M = 100;

interface TerrainLayerData {
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minorPath: string;
  majorPath: string;
}

/** Imagen sombreada del relieve y curvas de nivel, en las coordenadas de la escena. */
function buildTerrainLayer(
  grid: TerrainGrid,
  proj: SceneProjection,
  lines: PisteData['pistes'][number]['c'][],
): TerrainLayerData | undefined {
  const cellKm = grid.dLat * 111.32;
  const reachCells = Math.max(2, REACH_KM / cellKm);
  const img = shadeImage(grid, proj.lat0, lines, reachCells);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;
  ctx.putImageData(new ImageData(new Uint8ClampedArray(img.rgba), img.width, img.height), 0, 0);

  const cellToXY = (ci: number, cj: number) =>
    toXY(proj, grid.lon0 + ci * grid.dLon, grid.lat0 - cj * grid.dLat);
  const [x0, y0] = cellToXY(-0.5, -0.5);
  const [x1, y1] = cellToXY(grid.nx - 0.5, grid.ny - 0.5);

  let minor = '';
  let major = '';
  for (const { level, segments } of contourSegments(grid, CONTOUR_STEP_M)) {
    for (const [ax, ay, bx, by] of segments) {
      // Solo las curvas cercanas a las pistas, igual que el relieve.
      const di = Math.round((ax + bx) / 2);
      const dj = Math.round((ay + by) / 2);
      const d = img.dist[Math.min(grid.ny - 1, dj) * grid.nx + Math.min(grid.nx - 1, di)] ?? 1e9;
      if (d > reachCells * 0.85) continue;
      const [px, py] = cellToXY(ax, ay);
      const [qx, qy] = cellToXY(bx, by);
      const seg = `M${px.toFixed(1)} ${py.toFixed(1)}L${qx.toFixed(1)} ${qy.toFixed(1)}`;
      if (level % 500 === 0) major += seg;
      else minor += seg;
    }
  }
  return {
    imageUrl: canvas.toDataURL('image/png'),
    x: x0,
    y: y0,
    width: x1 - x0,
    height: y1 - y0,
    minorPath: minor,
    majorPath: major,
  };
}

const metres = (v: number) => `${Math.round(v).toLocaleString('es-ES')} m`;

function PisteCanvas({
  station,
  data,
  terrain,
}: {
  station: CuratedStation;
  data: PisteData;
  terrain: TerrainGrid | undefined;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  // Con terreno, la vista inicial es la montaña en 3D; sin él solo existe el plano.
  const [view3d, setView3d] = useState(true);
  const show3d = view3d && terrain !== undefined;
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [hover, setHover] = useState<string | undefined>(undefined);
  const drag = useRef<{ x: number; y: number; box: Box } | undefined>(undefined);

  const scene = useMemo(() => {
    const proj = makeProjection(station);
    return {
      proj,
      home: homeBox(proj, data.pistes),
      pistes: data.pistes.map((p, i) => ({ ...p, id: `p${i}`, path: toPath(proj, p.c) })),
      lifts: data.lifts.map((l, i) => ({ ...l, id: `l${i}`, path: toPath(proj, l.c) })),
    };
  }, [station, data]);

  const layer = useMemo(
    () =>
      terrain
        ? buildTerrainLayer(
            terrain,
            scene.proj,
            [...data.pistes, ...data.lifts].map((i) => i.c),
          )
        : undefined,
    [terrain, scene.proj, data],
  );

  // undefined = vista completa de la estación
  const [custom, setBox] = useState<Box | undefined>(undefined);
  const box = custom ?? scene.home;

  const [ratio, setRatio] = useState(1.6);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setRatio(r.width / r.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const view = useMemo(() => fitBox(box, ratio), [box, ratio]);

  const zoomAt = (factor: number, fx = 0.5, fy = 0.5) =>
    setBox(zoomBox(view, scene.home, factor, fx, fy));
  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    zoomAt(
      e.deltaY < 0 ? 0.8 : 1.25,
      (e.clientX - r.left) / r.width,
      (e.clientY - r.top) / r.height,
    );
  };
  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, box: view };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const r = e.currentTarget.getBoundingClientRect();
    setBox({
      ...d.box,
      x: d.box.x - ((e.clientX - d.x) / r.width) * d.box.w,
      y: d.box.y - ((e.clientY - d.y) / r.height) * d.box.h,
    });
  };
  const onPointerUp = () => {
    drag.current = undefined;
  };
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = view.w * 0.1;
    if (e.key === '+' || e.key === '=') zoomAt(0.8);
    else if (e.key === '-') zoomAt(1.25);
    else if (e.key === 'ArrowLeft') setBox({ ...view, x: view.x - step });
    else if (e.key === 'ArrowRight') setBox({ ...view, x: view.x + step });
    else if (e.key === 'ArrowUp') setBox({ ...view, y: view.y - step });
    else if (e.key === 'ArrowDown') setBox({ ...view, y: view.y + step });
    else return;
    e.preventDefault();
  };

  const skiableKm = useMemo(
    () => Math.round(pisteLengthKm(scene.proj, data.pistes)),
    [scene.proj, data.pistes],
  );

  const counts = useMemo(() => {
    const c = new Map<Difficulty, number>();
    for (const p of scene.pistes) c.set(p.d, (c.get(p.d) ?? 0) + 1);
    return c;
  }, [scene]);
  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Texto de lo que hay bajo el puntero, con su desnivel si se conoce el terreno.
  const hoveredText = useMemo(() => {
    if (!hover) return undefined;
    const piste = scene.pistes.find((x) => x.id === hover);
    const lift = scene.lifts.find((x) => x.id === hover);
    const item = piste ?? lift;
    if (!item) return undefined;
    const title = piste ? `Pista ${DIFFICULTY[piste.d].label.toLowerCase()}` : 'Remonte';
    const name = item.n ? `: ${item.n}` : '';
    const first = item.c[0];
    const last = item.c[item.c.length - 1];
    if (!terrain || !first || !last) return title + name;
    const a = elevationAt(terrain, first[0], first[1]);
    const b = elevationAt(terrain, last[0], last[1]);
    if (a === undefined || b === undefined) return title + name;
    const drop = Math.abs(a - b);
    return `${title}${name} · ${metres(Math.max(a, b))} → ${metres(Math.min(a, b))} (desnivel ${metres(drop)})`;
  }, [hover, scene, terrain]);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_30%_20%,#1a2468_0%,#0b1138_70%)]">
      {show3d ? (
        <RidgeView
          stationName={station.name}
          latitude={station.latitude}
          data={data}
          terrain={terrain}
          hidden={hidden}
          colors={DIFFICULTY_COLORS}
        />
      ) : (
        <svg
          ref={svgRef}
          role="img"
          tabIndex={0}
          aria-label={`Mapa de pistas y remontes de ${station.name}. Flechas para mover, más y menos para acercar.`}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="size-full cursor-grab touch-none select-none active:cursor-grabbing"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={onKeyDown}
        >
          {layer && !hidden.has('relief') && (
            <image
              href={layer.imageUrl}
              x={layer.x}
              y={layer.y}
              width={layer.width}
              height={layer.height}
              preserveAspectRatio="none"
            />
          )}
          {layer && !hidden.has('contours') && (
            <g fill="none" strokeLinecap="round">
              <path
                d={layer.minorPath}
                stroke="rgba(190,215,255,0.22)"
                strokeWidth={0.6}
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={layer.majorPath}
                stroke="rgba(190,215,255,0.5)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {DIFFICULTY_ORDER.filter((d) => !hidden.has(d)).map((d) => {
              const style = DIFFICULTY[d];
              const items = scene.pistes.filter((p) => p.d === d);
              return (
                <g key={d}>
                  {style.halo &&
                    items.map((p) => (
                      <path
                        key={`${p.id}h`}
                        d={p.path}
                        stroke={style.halo}
                        strokeWidth={5}
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                  {items.map((p) => (
                    <path
                      key={p.id}
                      d={p.path}
                      stroke={style.color}
                      strokeWidth={hover === p.id ? 4 : 2.5}
                      vectorEffect="non-scaling-stroke"
                      onPointerEnter={() => setHover(p.id)}
                      onPointerLeave={() => setHover(undefined)}
                    />
                  ))}
                </g>
              );
            })}
            {!hidden.has('lifts') &&
              scene.lifts.map((l) => (
                <path
                  key={l.id}
                  d={l.path}
                  stroke={LIFT_COLOR}
                  strokeWidth={hover === l.id ? 3 : 1.6}
                  strokeDasharray="6 4"
                  strokeLinecap="butt"
                  vectorEffect="non-scaling-stroke"
                  onPointerEnter={() => setHover(l.id)}
                  onPointerLeave={() => setHover(undefined)}
                />
              ))}
          </g>
          <path
            d="M0 0h0"
            stroke="#ff5d73"
            strokeWidth={12}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M0 0h0"
            stroke="#fff"
            strokeWidth={4}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      <div className="absolute top-3 left-3 flex max-w-[calc(100%-24px)] flex-col gap-2 rounded-2xl border border-white/10 bg-[#0d1340]/90 p-3 text-[11px] backdrop-blur-md">
        <p className="text-xs font-semibold">Leyenda</p>
        <ul className="flex flex-col gap-1" aria-label="Capas del mapa de pistas">
          {DIFFICULTY_ORDER.filter((d) => counts.has(d)).map((d) => (
            <LegendToggle
              key={d}
              hidden={hidden.has(d)}
              onToggle={() => toggle(d)}
              count={counts.get(d)}
              label={DIFFICULTY[d].label}
              swatch={
                <span
                  className="h-1 w-5 rounded"
                  style={{
                    background: DIFFICULTY[d].color,
                    boxShadow: DIFFICULTY[d].halo ? `0 0 0 1px ${DIFFICULTY[d].halo}` : undefined,
                  }}
                />
              }
            />
          ))}
          <LegendToggle
            hidden={hidden.has('lifts')}
            onToggle={() => toggle('lifts')}
            count={scene.lifts.length}
            label="Remontes"
            swatch={
              <span className="w-5 border-t-2 border-dashed" style={{ borderColor: LIFT_COLOR }} />
            }
          />
          {layer && !show3d && (
            <>
              <LegendToggle
                hidden={hidden.has('relief')}
                onToggle={() => toggle('relief')}
                label="Relieve"
                swatch={
                  <span className="h-3 w-5 rounded bg-gradient-to-br from-[#121e5c] to-[#688cc8]" />
                }
              />
              <LegendToggle
                hidden={hidden.has('contours')}
                onToggle={() => toggle('contours')}
                label={`Curvas cada ${CONTOUR_STEP_M} m`}
                swatch={<span className="h-px w-5 bg-[rgba(190,215,255,0.7)]" />}
              />
            </>
          )}
        </ul>
        <p className="text-[10px] leading-snug text-muted">Pulsa un tipo para ocultarlo.</p>
      </div>

      <p
        className="pointer-events-none absolute top-3 right-3 flex items-center gap-3 rounded-full border border-white/10 bg-[#0d1340]/70 px-3 py-1 text-[11px] text-muted backdrop-blur-md"
        aria-label={`Cima a ${station.topElevationM} metros, desnivel de ${station.topElevationM - station.baseElevationM} metros y unos ${skiableKm} kilómetros de pista`}
      >
        <span className="flex items-center gap-1" aria-hidden="true">
          <Mountain className="size-3" />
          {station.topElevationM.toLocaleString('es-ES')} m
          <span className="opacity-60">
            (↕ {(station.topElevationM - station.baseElevationM).toLocaleString('es-ES')} m)
          </span>
        </span>
        <span className="flex items-center gap-1" aria-hidden="true">
          <Route className="size-3" />≈ {skiableKm.toLocaleString('es-ES')} km esquiables
        </span>
      </p>

      <div className="absolute right-3 bottom-3 flex flex-col gap-1.5">
        {terrain && (
          <button
            type="button"
            onClick={() => setView3d((v) => !v)}
            aria-pressed={show3d}
            aria-label={show3d ? 'Cambiar al plano 2D' : 'Cambiar a la montaña en 3D'}
            title={show3d ? 'Plano 2D' : 'Montaña 3D'}
            className="grid size-8 place-items-center rounded-xl border border-white/10 bg-[#0d1340]/90 backdrop-blur-md transition-colors hover:bg-[#161e5a]"
          >
            {show3d ? (
              <MapIcon className="size-4" aria-hidden="true" />
            ) : (
              <BoxIcon className="size-4" aria-hidden="true" />
            )}
          </button>
        )}
        {(show3d
          ? []
          : ([
              { label: 'Acercar', icon: Plus, run: () => zoomAt(0.7) },
              { label: 'Alejar', icon: Minus, run: () => zoomAt(1.4) },
              { label: 'Ver toda la estación', icon: RotateCcw, run: () => setBox(undefined) },
            ] as const)
        ).map(({ label, icon: Icon, run }) => (
          <button
            key={label}
            type="button"
            onClick={run}
            aria-label={label}
            title={label}
            className="grid size-8 place-items-center rounded-xl border border-white/10 bg-[#0d1340]/90 backdrop-blur-md transition-colors hover:bg-[#161e5a]"
          >
            <Icon className="size-4" aria-hidden="true" />
          </button>
        ))}
      </div>

      <p
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-72px)] rounded-xl bg-[#0d1340]/90 px-3 py-1.5 text-xs backdrop-blur-md empty:hidden"
      >
        {hoveredText}
      </p>
    </div>
  );
}

function LegendToggle({
  hidden,
  onToggle,
  label,
  count,
  swatch,
}: {
  hidden: boolean;
  onToggle: () => void;
  label: string;
  count?: number | undefined;
  swatch: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={!hidden}
        onClick={onToggle}
        className={`flex w-full items-center gap-2 text-left transition-opacity ${hidden ? 'opacity-40' : ''}`}
      >
        <span aria-hidden="true" className="grid w-5 place-items-center">
          {swatch}
        </span>
        {label}
        {count !== undefined && <span className="ml-auto pl-2 text-muted">{count}</span>}
      </button>
    </li>
  );
}

/**
 * Cuadro con el mapa de pistas y remontes de una estación, con el estilo de la app. Se cierra con
 * Escape, con la X o pulsando fuera.
 */
export function PisteMapDialog({
  station,
  onClose,
}: {
  station: CuratedStation;
  onClose: () => void;
}) {
  const pistes = usePisteData(station.id);
  const terrain = useTerrain(station.id);
  const closeRef = useRef<HTMLButtonElement>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      // Foco atrapado dentro del cuadro mientras está abierto.
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex="0"]',
      );
      const first = focusable?.[0];
      const last = focusable?.[focusable.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);

  const data = pistes.data;
  const empty = data && data.pistes.length + data.lifts.length === 0;
  // Se espera al terreno para no dibujar primero sin relieve y luego con él.
  const ready = !pistes.isPending && !terrain.isPending;

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm sm:p-8"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Mapa de pistas de ${station.name}`}
        className="glass flex h-[min(720px,100%)] w-[min(1100px,100%)] flex-col gap-3 p-4"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl leading-tight font-semibold">
              {station.name} · mapa de pistas
            </h2>
            <p className="text-xs text-muted">
              {station.region} · base {station.baseElevationM.toLocaleString('es-ES')} m · cima{' '}
              {station.topElevationM.toLocaleString('es-ES')} m
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar el mapa de pistas"
            className="grid size-8 place-items-center rounded-xl bg-white/[0.08] transition-colors hover:bg-white/[0.16]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {!ready ? (
          <div
            role="status"
            className="grid min-h-0 flex-1 place-items-center rounded-2xl border border-white/10 text-sm text-muted"
          >
            Cargando el mapa…
          </div>
        ) : pistes.isError || !data || empty ? (
          <div
            role="status"
            className="grid min-h-0 flex-1 place-items-center rounded-2xl border border-white/10 p-6 text-center text-sm text-muted"
          >
            No hay datos de pistas de esta estación todavía.
          </div>
        ) : (
          <PisteCanvas station={station} data={data} terrain={terrain.data ?? undefined} />
        )}

        <p className="text-[10px] leading-snug text-muted">
          Pistas y remontes: © colaboradores de OpenStreetMap (licencia ODbL). Relieve: Terrain
          Tiles (Mapzen, SRTM y otras fuentes). Pueden no estar al día ni reflejar las pistas
          abiertas.
        </p>
      </div>
    </div>,
    document.body,
  );
}
