import {
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from 'react';
import {
  buildRidgeMesh,
  fitCamera,
  project,
  visibleRuns,
  worldPoint,
  type Camera,
  type RidgeMesh,
} from './ridgeScene';
import type { Difficulty, PisteData } from './pisteScene';
import type { TerrainGrid } from './terrain';

const BG = '#0b1138';
const FILL = BG;
const LOW = [58, 96, 230];
const HIGH = [176, 238, 255];
const LIFT = '#7de3ff';
/** Hasta dónde llega la montaña alrededor de las pistas (en celdas se calcula con esto). */
const REACH_KM = 2.2;

interface Segment {
  a: [number, number, number];
  b: [number, number, number];
  d: Difficulty | 'lift';
}

const mix = (t: number) =>
  `rgb(${LOW.map((c, n) => Math.round(c + ((HIGH[n] ?? c) - c) * t)).join(',')})`;

/** Segmentos de pistas y remontes agrupados por la fila de la malla sobre la que están. */
function bucketSegments(
  mesh: RidgeMesh,
  grid: TerrainGrid,
  data: PisteData,
): Map<number, Segment[]> {
  const buckets = new Map<number, Segment[]>();
  const add = (pts: PisteData['pistes'][number]['c'], d: Segment['d'], lift: number) => {
    let prev: [number, number, number] | undefined;
    let prevLat = 0;
    for (const [lon, lat] of pts) {
      const w = worldPoint(mesh, grid, lon, lat, lift);
      if (w && prev) {
        const row = Math.min(
          grid.ny - 1,
          Math.max(0, Math.round((grid.lat0 - (lat + prevLat) / 2) / grid.dLat)),
        );
        const list = buckets.get(row) ?? [];
        list.push({ a: prev, b: w, d });
        buckets.set(row, list);
      }
      prev = w;
      prevLat = lat;
    }
  };
  for (const p of data.pistes) add(p.c, p.d, 10);
  for (const l of data.lifts) add(l.c, 'lift', 14);
  return buckets;
}

/**
 * La montaña en 3D como líneas de nivel apiladas (estilo neofuturista): cada fila de la malla es una
 * cresta de neón que tapa a las de detrás, con las pistas apoyadas encima. Se mece despacio; con
 * «reducir movimiento» queda quieta. Arrastrando se gira, con la rueda se acerca.
 */
export function RidgeView({
  stationName,
  latitude,
  data,
  terrain,
  hidden,
  colors,
}: {
  stationName: string;
  latitude: number;
  data: PisteData;
  terrain: TerrainGrid;
  hidden: ReadonlySet<string>;
  colors: Record<Difficulty, string>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenRef = useRef(hidden);
  const input = useRef({ yaw: 0, zoom: 1, dragging: false, lastX: 0, manual: false });
  const drawRef = useRef<(t: number) => void>(() => undefined);

  useEffect(() => {
    hiddenRef.current = hidden;
    drawRef.current(performance.now());
  });

  const model = useMemo(() => {
    const cellKm = terrain.dLat * 111.32;
    const reach = Math.max(2, REACH_KM / cellKm) * 0.9;
    const mesh = buildRidgeMesh(
      terrain,
      latitude,
      [...data.pistes, ...data.lifts].map((i) => i.c),
      reach,
    );
    const runs = Array.from({ length: mesh.ny }, (_, j) => visibleRuns(mesh, j));
    return { mesh, runs, buckets: bucketSegments(mesh, terrain, data) };
  }, [terrain, latitude, data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const { mesh, runs, buckets } = model;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let fitted: Camera | undefined;
    let raf = 0;

    const base: Camera = { yaw: 0.32, pitch: 0.4, scale: 1, cx: 0, cy: 0, persp: 0.00004 };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = Math.max(1, Math.round(r.width));
      height = Math.max(1, Math.round(r.height));
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      fitted = fitCamera(base, mesh, width, height);
      draw(performance.now());
    };

    function draw(t: number) {
      if (!fitted || !ctx) return;
      const sway = reduce || input.current.manual ? 0 : Math.sin(t / 6500) * 0.3;
      const cam: Camera = {
        ...fitted,
        yaw: input.current.yaw + sway,
        pitch: fitted.pitch + (reduce ? 0 : Math.sin(t / 9000) * 0.04),
        scale: fitted.scale * input.current.zoom,
        cx: width / 2 + (fitted.cx - width / 2) * input.current.zoom,
        cy: height / 2 + (fitted.cy - height / 2) * input.current.zoom,
      };
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, width, height);

      const hiddenNow = hiddenRef.current;
      const scanPhase = reduce ? -1 : (t / 9000) % 1; // barrido de luz de lejos a cerca
      const span = Math.max(1, mesh.zMax - mesh.zMin);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      for (let j = 0; j < mesh.ny; j++) {
        const scan = scanPhase < 0 ? 0 : Math.max(0, 1 - Math.abs(j / mesh.ny - scanPhase) * 14);
        for (const [from, to] of runs[j] ?? []) {
          const pts: [number, number][] = [];
          for (let i = from; i <= to; i++) {
            const k = j * mesh.nx + i;
            const [sx, sy] = project(cam, mesh.x[k] ?? 0, mesh.y[k] ?? 0, mesh.z[k] ?? 0);
            pts.push([sx, sy]);
          }
          const first = pts[0];
          const last = pts[pts.length - 1];
          if (!first || !last) continue;
          // Relleno hacia abajo: cada cresta tapa a las de detrás.
          ctx.beginPath();
          ctx.moveTo(first[0], height + 40);
          for (const [sx, sy] of pts) ctx.lineTo(sx, sy);
          ctx.lineTo(last[0], height + 40);
          ctx.closePath();
          ctx.fillStyle = FILL;
          ctx.fill();
          // Cresta: el color sube con la altitud media del tramo.
          let hSum = 0;
          for (let i = from; i <= to; i++) hSum += mesh.h[j * mesh.nx + i] ?? mesh.zMin;
          const tone = Math.min(1, Math.max(0, (hSum / (to - from + 1) - mesh.zMin) / span));
          ctx.beginPath();
          pts.forEach(([sx, sy], n) => (n ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy)));
          ctx.strokeStyle = mix(Math.min(1, tone * 0.9 + scan * 0.6));
          ctx.globalAlpha = 0.55 + tone * 0.35 + scan * 0.1;
          ctx.lineWidth = 1 + scan * 1.4;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        for (const s of buckets.get(j) ?? []) {
          if (hiddenNow.has(s.d === 'lift' ? 'lifts' : s.d)) continue;
          const [ax, ay] = project(cam, ...s.a);
          const [bx, by] = project(cam, ...s.b);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          if (s.d === 'lift') {
            ctx.strokeStyle = LIFT;
            ctx.lineWidth = 1.4;
            ctx.setLineDash([5, 4]);
            ctx.shadowBlur = 0;
          } else {
            ctx.strokeStyle = s.d === 'black' ? '#e8edff' : colors[s.d];
            ctx.lineWidth = 2.2;
            ctx.setLineDash([]);
            ctx.shadowColor = colors[s.d];
            ctx.shadowBlur = 8;
          }
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.shadowBlur = 0;
        }
      }
    }
    drawRef.current = draw;

    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    if (!reduce) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      drawRef.current = () => undefined;
    };
  }, [model, colors]);

  const redraw = () => drawRef.current(performance.now());
  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    input.current.dragging = true;
    input.current.lastX = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!input.current.dragging) return;
    input.current.yaw += (e.clientX - input.current.lastX) * 0.006;
    input.current.yaw = Math.max(-1.3, Math.min(1.3, input.current.yaw));
    input.current.lastX = e.clientX;
    input.current.manual = true;
    redraw();
  };
  const onPointerUp = () => {
    input.current.dragging = false;
  };
  const zoomBy = (f: number) => {
    input.current.zoom = Math.max(0.6, Math.min(4, input.current.zoom * f));
    redraw();
  };
  const onWheel = (e: WheelEvent<HTMLCanvasElement>) => zoomBy(e.deltaY < 0 ? 1.15 : 0.87);
  const onKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === '+' || e.key === '=') zoomBy(1.15);
    else if (e.key === '-') zoomBy(0.87);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      input.current.yaw += e.key === 'ArrowLeft' ? -0.1 : 0.1;
      input.current.manual = true;
      redraw();
    } else if (e.key === '0') {
      input.current = { ...input.current, yaw: 0, zoom: 1, manual: false };
      redraw();
    } else return;
    e.preventDefault();
  };

  return (
    <canvas
      ref={canvasRef}
      tabIndex={0}
      role="img"
      aria-label={`Vista 3D de la montaña de ${stationName} con sus pistas. Flechas izquierda y derecha para girar, más y menos para acercar, 0 para restablecer.`}
      className="size-full cursor-grab touch-none select-none active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
    />
  );
}
