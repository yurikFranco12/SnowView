import { useCallback, useEffect, useRef, useState } from 'react';
import { effectiveRefreshMs, withCacheBust } from '../data/webcamUrl';

export type ImageStatus = 'loading' | 'ready' | 'error';

export interface RefreshingImage {
  /** Última imagen cargada con éxito (se conserva mientras llega la siguiente). */
  src: string | undefined;
  status: ImageStatus;
  /** Cuándo se cargó `src`, en ms. */
  loadedAt: number | undefined;
  /** Carga otra copia ahora. */
  reload: () => void;
}

/**
 * Imagen que se vuelve a pedir cada `refreshSeconds` mientras `active` sea true y la ventana esté
 * visible. La nueva copia se carga aparte y solo se cambia cuando está lista, así no hay parpadeos
 * ni se pierde la última imagen buena si falla un refresco.
 */
export function useRefreshingImage(
  url: string,
  refreshSeconds: number,
  active: boolean,
): RefreshingImage {
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [loadedAt, setLoadedAt] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<ImageStatus>('loading');
  const [tick, setTick] = useState(0);
  const hasImage = useRef(false);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  // Cada `tick` baja una copia nueva.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const requestedAt = Date.now();
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      if (cancelled) return;
      hasImage.current = true;
      setSrc(img.src);
      setLoadedAt(requestedAt);
      setStatus('ready');
    };
    img.onerror = () => {
      if (cancelled) return;
      // Si ya había una imagen buena se conserva; solo se marca el error si no hay ninguna.
      if (!hasImage.current) setStatus('error');
    };
    img.src = withCacheBust(url, requestedAt);
    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [url, tick, active]);

  // Temporizador de refresco, parado con la ventana oculta o la tarjeta fuera de pantalla.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      if (!document.hidden) setTick((t) => t + 1);
    }, effectiveRefreshMs(refreshSeconds));
    const onVisible = () => {
      if (!document.hidden) setTick((t) => t + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshSeconds, active]);

  return { src, status, loadedAt, reload };
}
