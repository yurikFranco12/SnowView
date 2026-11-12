import type { Webcam } from '@snowview/data';
import { ImageOff, Maximize2, Play, RotateCw, Video, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatClock } from '../data/webcamUrl';
import { useRefreshingImage } from '../hooks/useRefreshingImage';
import { Skeleton } from './StatusViews';

/** true mientras el elemento está (casi) en pantalla: las tarjetas ocultas no piden imágenes. */
function useInView<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      {
        rootMargin: '200px',
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, inView];
}

interface MediaProps {
  cam: Webcam;
  live: boolean;
  active: boolean;
}

/** La imagen refrescante o el reproductor en directo de una webcam, a 16:9. */
function WebcamMedia({ cam, live, active }: MediaProps) {
  const image = cam.image;
  const state = useRefreshingImage(
    image?.url ?? '',
    image?.refreshSeconds ?? 300,
    active && !!image && !live,
  );

  if (live && cam.live) {
    return (
      <iframe
        title={`Directo: ${cam.name}`}
        src={cam.live.url}
        allow="fullscreen; autoplay"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        className="absolute inset-0 size-full border-0 bg-black"
      />
    );
  }
  if (!image) return null;
  if (state.status === 'error') {
    return (
      <div
        role="alert"
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center"
      >
        <ImageOff className="size-7 text-muted" aria-hidden="true" strokeWidth={1.6} />
        <p className="text-sm">No se pudo cargar la imagen</p>
        <button
          type="button"
          onClick={state.reload}
          className="inline-flex items-center gap-1.5 rounded-xl bg-ice/[0.14] px-3 py-1.5 text-xs text-ice transition-colors hover:bg-ice/25"
        >
          <RotateCw className="size-3.5" aria-hidden="true" />
          Reintentar
        </button>
      </div>
    );
  }
  if (!state.src) return <Skeleton className="absolute inset-0 rounded-none" />;
  return (
    <img
      src={state.src}
      alt={`Webcam ${cam.name}`}
      referrerPolicy="no-referrer"
      className="absolute inset-0 size-full object-cover"
    />
  );
}

/** Pie con el momento de la última carga. Se separa para no recalcular el reloj en el vídeo. */
function LastUpdate({ cam, active }: { cam: Webcam; active: boolean }) {
  const image = cam.image;
  const { loadedAt } = useRefreshingImage(
    image?.url ?? '',
    image?.refreshSeconds ?? 300,
    active && !!image,
  );
  if (!image || loadedAt === undefined) return null;
  return <span>Cargada a las {formatClock(loadedAt)}</span>;
}

function LiveButton({
  live,
  onToggle,
  hasImage,
  name,
}: {
  live: boolean;
  onToggle: () => void;
  hasImage: boolean;
  name: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={live}
      aria-label={live ? `Volver a la imagen de ${name}` : `Ver ${name} en directo`}
      className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.08] px-3 py-1.5 text-xs transition-colors hover:bg-white/[0.14]"
    >
      <Video className="size-3.5" aria-hidden="true" />
      {live ? (hasImage ? 'Imagen' : 'Parar') : 'En directo'}
    </button>
  );
}

/** Ventana ampliada de una webcam, con el elemento `dialog` nativo (Escape y foco incluidos). */
function WebcamDialog({
  cam,
  startLive,
  onClose,
}: {
  cam: Webcam;
  startLive: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [live, setLive] = useState(startLive);

  useEffect(() => {
    const dialog = ref.current;
    // No se cierra en la limpieza: el elemento desaparece al desmontarse, y close() dispararía
    // `onClose` y cerraría la ventana en el segundo montaje del modo estricto.
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // clic en el fondo
      }}
      aria-label={cam.name}
      className="m-auto w-[min(1000px,92vw)] rounded-3xl border border-white/15 bg-[#0d1340] p-5 text-text backdrop:bg-black/70"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">
          {cam.name}
          {cam.elevationM ? (
            <span className="ml-2 text-sm font-normal text-muted">
              {cam.elevationM.toLocaleString('es-ES')} m
            </span>
          ) : null}
        </h2>
        <div className="flex items-center gap-2">
          {cam.live && cam.image && (
            <LiveButton live={live} onToggle={() => setLive((v) => !v)} hasImage name={cam.name} />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-white/[0.1] hover:text-text"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-black/40">
        <WebcamMedia cam={cam} live={live} active />
      </div>
      <p className="mt-3 text-xs text-muted">
        {cam.credit}. Imagen de su propietario; se muestra tal cual la publica.
      </p>
    </dialog>
  );
}

export function WebcamCard({ cam }: { cam: Webcam }) {
  const [ref, inView] = useInView<HTMLElement>();
  // Con solo reproductor (sin imagen), el directo se carga al pulsar, no antes: 5 reproductores a
  // la vez gastarían mucha red y CPU.
  const [live, setLive] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const onlyLive = !cam.image && !!cam.live;

  return (
    <article
      ref={ref}
      aria-label={`Webcam ${cam.name}`}
      className="glass flex flex-col gap-2.5 overflow-hidden p-3"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-black/30">
        {onlyLive && !live ? (
          <button
            type="button"
            onClick={() => setLive(true)}
            aria-label={`Ver ${cam.name} en directo`}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm transition-colors hover:bg-white/[0.06]"
          >
            <span className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-ice to-indigo text-bg-start">
              <Play className="size-5 fill-current" aria-hidden="true" />
            </span>
            Ver en directo
          </button>
        ) : (
          <WebcamMedia cam={cam} live={live || onlyLive} active={inView} />
        )}
      </div>
      <div className="flex items-start justify-between gap-2 px-1">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{cam.name}</h3>
          <p className="truncate text-xs text-muted">
            {cam.elevationM ? `${cam.elevationM.toLocaleString('es-ES')} m · ` : ''}
            {cam.credit}
          </p>
          <p className="text-xs text-muted" aria-live="off">
            {!live && !onlyLive && <LastUpdate cam={cam} active={inView} />}
            {(live || onlyLive) && live && 'En directo'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {cam.live && cam.image && (
            <LiveButton live={live} onToggle={() => setLive((v) => !v)} hasImage name={cam.name} />
          )}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={`Ampliar ${cam.name}`}
            className="grid size-8 place-items-center rounded-xl bg-white/[0.08] transition-colors hover:bg-white/[0.14]"
          >
            <Maximize2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      {expanded && (
        <WebcamDialog cam={cam} startLive={live || onlyLive} onClose={() => setExpanded(false)} />
      )}
    </article>
  );
}
