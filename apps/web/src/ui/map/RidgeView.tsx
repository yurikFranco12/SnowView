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
  makeProjector,
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
    // Resolución adaptativa: si el equipo no llega a ~50 fps, se baja la resolución del dibujo (solo
    // baja, nunca sube, para que no oscile).
    let quality = 1;
    let ema = 0;
    let sinceAdjust = 0;
    const tmp: [number, number, number] = [0, 0, 0];
    const tmp2: [number, number, number] = [0, 0, 0];

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

    const applySize = () => {
      canvas.width = Math.max(1, Math.round(width * dpr * quality));
      canvas.height = Math.max(1, Math.round(height * dpr * quality));
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = Math.max(1, Math.round(r.width));
      height = Math.max(1, Math.round(r.height));
      applySize();
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
      const proj = makeProjector(cam);

      const k = dpr * quality;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, width, height);

      const hiddenNow = hiddenRef.current;
      const { axis, lines } = drawOrder(st.yaw, mesh.nx, mesh.ny);
      const stride = axis === 'row' ? 1 : mesh.nx;
      const origin = (line: number) => (axis === 'row' ? line * mesh.nx : line);
      // El barrido de luz solo corre con el giro automático: parada, la imagen es estática.
      const scanPhase = reduce || !st.auto ? -1 : (t / 9000) % 1;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // Cinta de superficie entre dos líneas contiguas: tapa lo que queda detrás sin rellenar hasta
      // el borde de la pantalla (poco sobredibujo).
      const ribbon = (prevLine: number, line: number) => {
        const o = origin(line);
        const q = origin(prevLine);
        ctx.beginPath();
        let any = false;
        for (const [from, to] of runs[axis][line] ?? []) {
          let p = from;
          while (p <= to) {
            if (!mesh.visible[q + p * stride]) {
              p++;
              continue;
            }
            let end = p;
            while (end + 1 <= to && mesh.visible[q + (end + 1) * stride]) end++;
            if (end > p) {
              ctx.moveTo(sx[o + p * stride] ?? 0, sy[o + p * stride] ?? 0);
              for (let i = p + 1; i <= end; i++) {
                ctx.lineTo(sx[o + i * stride] ?? 0, sy[o + i * stride] ?? 0);
              }
              for (let i = end; i >= p; i--) {
                ctx.lineTo(sx[q + i * stride] ?? 0, sy[q + i * stride] ?? 0);
              }
              ctx.closePath();
              any = true;
            }
            p = end + 1;
          }
        }
        if (!any) return;
        ctx.fillStyle = BG;
        ctx.fill();
        ctx.strokeStyle = BG; // tapa las costuras entre cintas
        ctx.lineWidth = 1;
        ctx.stroke();
        // Aristas transversales muy tenues (malla de alambre); se omiten si el equipo va justo.
        if (quality < 0.75) return;
        ctx.beginPath();
        for (const [from, to] of runs[axis][line] ?? []) {
          for (let p = from; p <= to; p += CROSS_STEP) {
            if (!mesh.visible[q + p * stride]) continue;
            ctx.moveTo(sx[q + p * stride] ?? 0, sy[q + p * stride] ?? 0);
            ctx.lineTo(sx[o + p * stride] ?? 0, sy[o + p * stride] ?? 0);
          }
        }
        ctx.strokeStyle = 'rgba(110,150,255,0.16)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      };

      // Cresta: el color sube con la altitud media del tramo.
      const crest = (n: number) => {
        const line = lines[n] ?? 0;
        const o = origin(line);
        const scan =
          scanPhase < 0 ? 0 : Math.max(0, 1 - Math.abs(n / lines.length - scanPhase) * 22);
        for (const [from, to] of runs[axis][line] ?? []) {
          let hSum = 0;
          ctx.beginPath();
          for (let p = from; p <= to; p++) {
            const i = o + p * stride;
            hSum += mesh.h[i] ?? mesh.zMin;
            if (p === from) ctx.moveTo(sx[i] ?? 0, sy[i] ?? 0);
            else ctx.lineTo(sx[i] ?? 0, sy[i] ?? 0);
          }
          const tone = Math.min(1, Math.max(0, (hSum / (to - from + 1) - mesh.zMin) / span));
          ctx.strokeStyle = mix(Math.min(1, tone * 0.9 + scan * 0.6));
          ctx.globalAlpha = 0.6 + tone * 0.3 + scan * 0.1;
          ctx.lineWidth = 0.85 + scan * 1.2;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      };

      // Pistas y remontes de una línea, por lotes (un trazo por tipo, sin desenfoque por segmento).
      const pistes = (n: number) => {
        const list = buckets[axis].get(lines[n] ?? 0);
        if (!list) return;
        const groups = new Map<string, Segment[]>();
        for (const s of list) {
          if (hiddenNow.has(s.d === 'lift' ? 'lifts' : s.d)) continue;
          const g = groups.get(s.d);
          if (g) g.push(s);
          else groups.set(s.d, [s]);
        }
        for (const [d, segs] of groups) {
          ctx.beginPath();
          for (const s of segs) {
            proj(...s.a, tmp);
            proj(...s.b, tmp2);
            ctx.moveTo(tmp[0], tmp[1]);
            ctx.lineTo(tmp2[0], tmp2[1]);
          }
          if (d === 'lift') {
            ctx.strokeStyle = LIFT;
            ctx.lineWidth = 1.4;
            ctx.setLineDash([5, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          } else {
            const color = colors[d as Difficulty];
            // Brillo de neón: un trazo ancho y tenue debajo (mucho más barato que shadowBlur).
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.22;
            ctx.lineWidth = 5.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = d === 'black' ? '#e8edff' : color;
            ctx.lineWidth = 2.2;
            ctx.stroke();
          }
        }
      };

      for (let n = 1; n < lines.length; n++) {
        ribbon(lines[n - 1] ?? 0, lines[n] ?? 0);
        crest(n - 1);
        pistes(n - 1);
      }
      if (lines.length > 0) {
        crest(lines.length - 1);
        pistes(lines.length - 1);
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

    let prevT = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      // Parado (sin giro automático) no hay nada que animar: se dibuja solo al interactuar.
      if (!input.current.auto) {
        prevT = 0;
        return;
      }
      if (prevT) {
        ema = ema ? ema * 0.9 + (t - prevT) * 0.1 : t - prevT;
        if (++sinceAdjust >= 30 && ema > 20 && quality > 0.5) {
          quality = Math.max(0.5, quality - 0.125);
          sinceAdjust = 0;
          ema = 0;
          applySize();
        }
      }
      prevT = t;
      draw(t);
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
