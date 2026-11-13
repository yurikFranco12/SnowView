import { Minus, Pause, Play, Plus, RotateCcw, type LucideIcon } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from 'react';
import {
  buildRidgeMesh,
  drawOrder,
  fitCamera,
  meshIndex,
  project,
  projectMesh,
  visibleRuns,
  worldPoint,
  type Camera,
  type RidgeMesh,
} from './ridgeScene';
import type { Difficulty, PisteData } from './pisteScene';
import { resampleGrid, smoothGrid, type TerrainGrid } from './terrain';

const BG = '#0b1138';
const LOW = [58, 96, 230];
const HIGH = [176, 238, 255];
const LIFT = '#7de3ff';
/** Hasta dónde llega la montaña alrededor de las pistas. */
const REACH_KM = 2.2;
/** Líneas de la malla a lo largo del lado mayor: más = crestas más juntas y uniformes. */
const TARGET_LINES = 120;
/** Cada cuántos puntos se dibuja una arista transversal (malla de alambre). */
const CROSS_STEP = 6;
/** Radianes por milisegundo del giro automático (una vuelta cada ~55 s). */
const AUTO_SPEED = 0.000115;
const PITCH_MIN = 0.2;
const PITCH_MAX = 1.0;

interface Segment {
  a: [number, number, number];
  b: [number, number, number];
  d: Difficulty | 'lift';
}

type Buckets = Record<'row' | 'col', Map<number, Segment[]>>;

const mix = (t: number) =>
  `rgb(${LOW.map((c, n) => Math.round(c + ((HIGH[n] ?? c) - c) * t)).join(',')})`;

/** Segmentos de pistas y remontes agrupados por la fila y la columna de la malla sobre las que están. */
function bucketSegments(mesh: RidgeMesh, grid: TerrainGrid, data: PisteData): Buckets {
  const buckets: Buckets = { row: new Map(), col: new Map() };
  const push = (map: Map<number, Segment[]>, line: number, s: Segment) => {
    const list = map.get(line) ?? [];
    list.push(s);
    map.set(line, list);
  };
  const add = (pts: PisteData['pistes'][number]['c'], d: Segment['d'], lift: number) => {
    let prev: [number, number, number] | undefined;
    let prevLon = 0;
    let prevLat = 0;
    for (const [lon, lat] of pts) {
      const w = worldPoint(mesh, grid, lon, lat, lift);
      if (w && prev) {
        const fi = ((lon + prevLon) / 2 - grid.lon0) / grid.dLon;
        const fj = (grid.lat0 - (lat + prevLat) / 2) / grid.dLat;
        const seg: Segment = { a: prev, b: w, d };
        push(buckets.row, Math.min(grid.ny - 1, Math.max(0, Math.round(fj))), seg);
        push(buckets.col, Math.min(grid.nx - 1, Math.max(0, Math.round(fi))), seg);
      }
      prev = w;
      prevLon = lon;
      prevLat = lat;
    }
  };
  for (const p of data.pistes) add(p.c, p.d, 10);
  for (const l of data.lifts) add(l.c, 'lift', 14);
  return buckets;
}

function CtrlButton({
  label,
  icon: Icon,
  onClick,
  pressed,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className="grid size-8 place-items-center rounded-xl border border-white/10 bg-[#0d1340]/90 backdrop-blur-md transition-colors hover:bg-[#161e5a]"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

/**
 * La montaña en 3D como una malla de líneas de neón (estilo neofuturista): cada línea de la malla es
 * una cresta que tapa a las de detrás, con las pistas apoyadas encima. Gira 360° (despacio por sí
 * sola, o arrastrando), se inclina arrastrando en vertical y se acerca con la rueda. Con «reducir
 * movimiento» no se anima sola.
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
  const reduce = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const input = useRef({
    yaw: 0.35,
    pitch: 0.5,
    zoom: 1,
    dragging: false,
    lastX: 0,
    lastY: 0,
    auto: !reduce,
  });
  const [auto, setAuto] = useState(!reduce);
  const drawRef = useRef<(t: number) => void>(() => undefined);

  useEffect(() => {
    hiddenRef.current = hidden;
    drawRef.current(performance.now());
  });

  const model = useMemo(() => {
    // Suavizado y malla más fina: crestas más juntas y uniformes.
    const smooth = smoothGrid(terrain, 2);
    const factor = Math.max(
      1,
      Math.min(3, Math.round(TARGET_LINES / Math.max(terrain.nx, terrain.ny))),
    );
    const dense = resampleGrid(smooth, factor);
    const reach = Math.max(2, REACH_KM / (dense.dLat * 111.32)) * 0.9;
    const mesh = buildRidgeMesh(
      dense,
      latitude,
      [...data.pistes, ...data.lifts].map((i) => i.c),
      reach,
    );
    const runs = {
      row: Array.from({ length: mesh.ny }, (_, j) => visibleRuns(mesh, j, 'row')),
      col: Array.from({ length: mesh.nx }, (_, i) => visibleRuns(mesh, i, 'col')),
    };
    return { mesh, runs, buckets: bucketSegments(mesh, dense, data) };
  }, [terrain, latitude, data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { mesh, runs, buckets } = model;
    const sx = new Float32Array(mesh.x.length);
    const sy = new Float32Array(mesh.x.length);
    const span = Math.max(1, mesh.zMax - mesh.zMin);
    let width = 0;
    let height = 0;
    let dpr = 1;
    let fitted: Camera | undefined;
    let raf = 0;
    let last = performance.now();

    const base: Camera = {
      yaw: 0,
      pitch: 0.5,
      scale: 1,
      cx: 0,
      cy: 0,
      persp: 0.00004,
      ox: 0,
      oy: 0,
      oz: 0,
    };

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
      const st = input.current;
      const dt = Math.min(100, t - last);
      last = t;
      if (st.auto && !st.dragging && !reduce) st.yaw += dt * AUTO_SPEED;
      const cam: Camera = {
        ...fitted,
        yaw: st.yaw,
        pitch: st.pitch,
        scale: fitted.scale * st.zoom,
      };
      projectMesh(cam, mesh, sx, sy);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, width, height);

      const hiddenNow = hiddenRef.current;
      const { axis, lines } = drawOrder(st.yaw, mesh.nx, mesh.ny);
      const scanPhase = reduce ? -1 : (t / 9000) % 1; // barrido de luz de lejos a cerca
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      for (let n = 0; n < lines.length; n++) {
        const line = lines[n] ?? 0;
        const prevLine = n > 0 ? lines[n - 1] : undefined;
        const scan =
          scanPhase < 0 ? 0 : Math.max(0, 1 - Math.abs(n / lines.length - scanPhase) * 22);
        for (const [from, to] of runs[axis][line] ?? []) {
          const first = meshIndex(mesh, axis, line, from);
          const lastK = meshIndex(mesh, axis, line, to);
          // Relleno hacia abajo: cada cresta tapa a las de detrás.
          ctx.beginPath();
          ctx.moveTo(sx[first] ?? 0, height + 40);
          for (let p = from; p <= to; p++) {
            const k = meshIndex(mesh, axis, line, p);
            ctx.lineTo(sx[k] ?? 0, sy[k] ?? 0);
          }
          ctx.lineTo(sx[lastK] ?? 0, height + 40);
          ctx.closePath();
          ctx.fillStyle = BG;
          ctx.fill();

          // Aristas transversales con la línea anterior (malla de alambre, muy tenue).
          if (prevLine !== undefined) {
            ctx.beginPath();
            for (let p = from; p <= to; p += CROSS_STEP) {
              const k = meshIndex(mesh, axis, line, p);
              const q = meshIndex(mesh, axis, prevLine, p);
              if (!mesh.visible[q]) continue;
              ctx.moveTo(sx[q] ?? 0, sy[q] ?? 0);
              ctx.lineTo(sx[k] ?? 0, sy[k] ?? 0);
            }
            ctx.strokeStyle = 'rgba(110,150,255,0.16)';
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }

          // Cresta: el color sube con la altitud media del tramo.
          let hSum = 0;
          for (let p = from; p <= to; p++) {
            hSum += mesh.h[meshIndex(mesh, axis, line, p)] ?? mesh.zMin;
          }
          const tone = Math.min(1, Math.max(0, (hSum / (to - from + 1) - mesh.zMin) / span));
          ctx.beginPath();
          for (let p = from; p <= to; p++) {
            const k = meshIndex(mesh, axis, line, p);
            if (p === from) ctx.moveTo(sx[k] ?? 0, sy[k] ?? 0);
            else ctx.lineTo(sx[k] ?? 0, sy[k] ?? 0);
          }
          ctx.strokeStyle = mix(Math.min(1, tone * 0.9 + scan * 0.6));
          ctx.globalAlpha = 0.6 + tone * 0.3 + scan * 0.1;
          ctx.lineWidth = 0.85 + scan * 1.2;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        for (const s of buckets[axis].get(line) ?? []) {
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

      // Brújula: hacia dónde queda el norte.
      const r = 15;
      const bx = width - 34;
      const by = 78;
      const nxs = -Math.sin(st.yaw);
      const nys = -Math.cos(st.yaw) * Math.sin(st.pitch);
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(190,215,255,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + nxs * r, by + nys * r);
      ctx.strokeStyle = '#7de3ff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(190,215,255,0.85)';
      ctx.font = '600 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('N', bx + nxs * (r + 8), by + nys * (r + 8));
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
  }, [model, colors, reduce]);

  const redraw = () => drawRef.current(performance.now());
  const stopAuto = () => {
    input.current.auto = false;
    setAuto(false);
  };
  const toggleAuto = () => {
    input.current.auto = !input.current.auto;
    setAuto(input.current.auto);
    redraw();
  };
  const rotate = (dYaw: number, dPitch: number) => {
    const st = input.current;
    st.yaw += dYaw;
    st.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, st.pitch + dPitch));
    redraw();
  };
  const zoomBy = (f: number) => {
    input.current.zoom = Math.max(0.6, Math.min(4, input.current.zoom * f));
    redraw();
  };
  const reset = () => {
    Object.assign(input.current, { yaw: 0.35, pitch: 0.5, zoom: 1 });
    redraw();
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const st = input.current;
    stopAuto();
    st.dragging = true;
    st.lastX = e.clientX;
    st.lastY = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const st = input.current;
    if (!st.dragging) return;
    // Arrastrar a la derecha gira la montaña hacia la derecha; arriba y abajo la inclina.
    rotate((e.clientX - st.lastX) * 0.007, (e.clientY - st.lastY) * 0.004);
    st.lastX = e.clientX;
    st.lastY = e.clientY;
  };
  const onPointerUp = () => {
    input.current.dragging = false;
  };
  const onWheel = (e: WheelEvent<HTMLCanvasElement>) => zoomBy(e.deltaY < 0 ? 1.15 : 0.87);
  const onKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === '+' || e.key === '=') zoomBy(1.15);
    else if (e.key === '-') zoomBy(0.87);
    else if (e.key === 'ArrowLeft') rotate(-0.12, 0);
    else if (e.key === 'ArrowRight') rotate(0.12, 0);
    else if (e.key === 'ArrowUp') rotate(0, -0.06);
    else if (e.key === 'ArrowDown') rotate(0, 0.06);
    else if (e.key === '0') reset();
    else if (e.key === ' ') toggleAuto();
    else return;
    if (e.key.startsWith('Arrow')) stopAuto();
    e.preventDefault();
  };

  return (
    <div className="relative size-full">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label={`Vista 3D de la montaña de ${stationName} con sus pistas. Flechas para girar e inclinar, más y menos para acercar, espacio para activar o parar el giro automático, 0 para restablecer.`}
        className="size-full cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
      />
      <div className="absolute right-14 bottom-3 flex gap-1.5">
        <CtrlButton
          label={auto ? 'Parar el giro automático' : 'Girar automáticamente'}
          icon={auto ? Pause : Play}
          onClick={toggleAuto}
          pressed={auto}
        />
        <CtrlButton label="Acercar" icon={Plus} onClick={() => zoomBy(1.3)} />
        <CtrlButton label="Alejar" icon={Minus} onClick={() => zoomBy(0.77)} />
        <CtrlButton label="Restablecer la vista" icon={RotateCcw} onClick={reset} />
      </div>
    </div>
  );
}
