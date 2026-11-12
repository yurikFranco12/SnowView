import type { CuratedStation } from '@snowview/data';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { Minus, Plus, RotateCcw, X } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from 'react';

type Difficulty = 'green' | 'blue' | 'red' | 'black' | 'freeride' | 'unknown';
interface RawPiste {
  d: Difficulty;
  n?: string;
  c: [number, number][];
}
interface RawLift {
  k: string;
  n?: string;
  c: [number, number][];
}
interface PisteData {
  pistes: RawPiste[];
  lifts: RawLift[];
}

const loaders = import.meta.glob<PisteData>('./data/pistes/*.json', {
  import: 'default',
});

/** Pistas y remontes de una estación (están dentro de la app: no hace falta conexión). */
function usePisteData(stationId: string) {
  return useQuery({
    queryKey: ['pistes', stationId],
    queryFn: async () => {
      const load = loaders[`./data/pistes/${stationId}.json`];
      if (!load) return undefined;
      return load();
    },
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

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const toPath = (pts: [number, number][], lon0: number, lat0: number, kx: number) =>
  pts
    .map(
      ([lon, lat], i) =>
        `${i ? 'L' : 'M'}${((lon - lon0) * kx).toFixed(1)} ${((lat0 - lat) * 1000).toFixed(1)}`,
    )
    .join('');

function PisteCanvas({ station, data }: { station: CuratedStation; data: PisteData }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [hover, setHover] = useState<string | undefined>(undefined);
  const drag = useRef<{ x: number; y: number; box: Box } | undefined>(undefined);

  // Proyección local: 1° de latitud = 1000 unidades; la longitud se corrige con el coseno.
  const scene = useMemo(() => {
    const lat0 = station.latitude;
    const lon0 = station.longitude;
    const kx = Math.cos((lat0 * Math.PI) / 180) * 1000;
    // El encuadre se ajusta a la zona donde se concentran las pistas (sin contar las que quedan
    // sueltas lejos, que pueden ser de otra estación).
    const xs: number[] = [];
    const ys: number[] = [];
    for (const piste of data.pistes) {
      for (const [lon, lat] of piste.c) {
        xs.push((lon - lon0) * kx);
        ys.push((lat0 - lat) * 1000);
      }
    }
    const pct = (arr: number[], f: number) => {
      const sorted = [...arr].sort((u, v) => u - v);
      return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(f * sorted.length)))] ?? 0;
    };
    let minX = pct(xs, 0.02);
    let maxX = pct(xs, 0.98);
    let minY = pct(ys, 0.02);
    let maxY = pct(ys, 0.98);
    if (xs.length === 0) {
      minX = minY = -10;
      maxX = maxY = 10;
    }
    const m = Math.max(maxX - minX, maxY - minY) * 0.08;
    const home: Box = { x: minX - m, y: minY - m, w: maxX - minX + 2 * m, h: maxY - minY + 2 * m };
    return {
      home,
      pistes: data.pistes.map((p, i) => ({ ...p, id: `p${i}`, path: toPath(p.c, lon0, lat0, kx) })),
      lifts: data.lifts.map((l, i) => ({ ...l, id: `l${i}`, path: toPath(l.c, lon0, lat0, kx) })),
    };
  }, [station, data]);

  // undefined = vista completa de la estación
  const [custom, setBox] = useState<Box | undefined>(undefined);
  const box = custom ?? scene.home;

  // Ajusta la caja a la proporción del lienzo para que el mapa no se deforme.
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
  const view = useMemo(() => {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    let w = box.w;
    let h = box.h;
    if (w / h < ratio) w = h * ratio;
    else h = w / ratio;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }, [box, ratio]);

  const zoomAt = (factor: number, fx = 0.5, fy = 0.5) => {
    setBox(() => {
      const w = Math.min(Math.max(view.w * factor, scene.home.w / 40), scene.home.w * 3);
      const h = (w / view.w) * view.h;
      return {
        x: view.x + view.w * fx - w * fx,
        y: view.y + view.h * fy - h * fy,
        w,
        h,
      };
    });
  };
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
  const hoveredName = useMemo(() => {
    if (!hover) return undefined;
    const p = scene.pistes.find((x) => x.id === hover);
    if (p) return `Pista ${DIFFICULTY[p.d].label.toLowerCase()}${p.n ? `: ${p.n}` : ''}`;
    const l = scene.lifts.find((x) => x.id === hover);
    return l ? `Remonte${l.n ? `: ${l.n}` : ''}` : undefined;
  }, [hover, scene]);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_30%_20%,#1a2468_0%,#0b1138_70%)]">
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

      <div className="absolute top-3 left-3 flex max-w-[calc(100%-24px)] flex-col gap-2 rounded-2xl border border-white/10 bg-[#0d1340]/90 p-3 text-[11px] backdrop-blur-md">
        <p className="text-xs font-semibold">Leyenda</p>
        <ul className="flex flex-col gap-1" aria-label="Capas del mapa de pistas">
          {DIFFICULTY_ORDER.filter((d) => counts.has(d)).map((d) => (
            <li key={d}>
              <button
                type="button"
                aria-pressed={!hidden.has(d)}
                onClick={() => toggle(d)}
                className={`flex w-full items-center gap-2 text-left transition-opacity ${hidden.has(d) ? 'opacity-40' : ''}`}
              >
                <span
                  className="h-1 w-5 rounded"
                  style={{
                    background: DIFFICULTY[d].color,
                    boxShadow: DIFFICULTY[d].halo ? `0 0 0 1px ${DIFFICULTY[d].halo}` : undefined,
                  }}
                  aria-hidden="true"
                />
                {DIFFICULTY[d].label}
                <span className="ml-auto pl-2 text-muted">{counts.get(d)}</span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              aria-pressed={!hidden.has('lifts')}
              onClick={() => toggle('lifts')}
              className={`flex w-full items-center gap-2 text-left transition-opacity ${hidden.has('lifts') ? 'opacity-40' : ''}`}
            >
              <span
                className="w-5 border-t-2 border-dashed"
                style={{ borderColor: LIFT_COLOR }}
                aria-hidden="true"
              />
              Remontes
              <span className="ml-auto pl-2 text-muted">{scene.lifts.length}</span>
            </button>
          </li>
        </ul>
        <p className="text-[10px] leading-snug text-muted">Pulsa un tipo para ocultarlo.</p>
      </div>

      <div className="absolute right-3 bottom-3 flex flex-col gap-1.5">
        {(
          [
            { label: 'Acercar', icon: Plus, run: () => zoomAt(0.7) },
            { label: 'Alejar', icon: Minus, run: () => zoomAt(1.4) },
            { label: 'Ver toda la estación', icon: RotateCcw, run: () => setBox(undefined) },
          ] as const
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
        className="pointer-events-none absolute bottom-3 left-3 rounded-xl bg-[#0d1340]/90 px-3 py-1.5 text-xs backdrop-blur-md empty:hidden"
      >
        {hoveredName}
      </p>
    </div>
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
  const query = usePisteData(station.id);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const empty = query.data && query.data.pistes.length + query.data.lifts.length === 0;

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm sm:p-8"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
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

        {query.isPending ? (
          <div
            role="status"
            className="grid min-h-0 flex-1 place-items-center rounded-2xl border border-white/10 text-sm text-muted"
          >
            Cargando el mapa…
          </div>
        ) : query.isError || !query.data || empty ? (
          <div
            role="status"
            className="grid min-h-0 flex-1 place-items-center rounded-2xl border border-white/10 p-6 text-center text-sm text-muted"
          >
            No hay datos de pistas de esta estación todavía.
          </div>
        ) : (
          <PisteCanvas station={station} data={query.data} />
        )}

        <p className="text-[10px] leading-snug text-muted">
          Pistas y remontes: © colaboradores de OpenStreetMap (licencia ODbL). Pueden no estar al
          día ni reflejar las pistas abiertas.
        </p>
      </div>
    </div>,
    document.body,
  );
}
