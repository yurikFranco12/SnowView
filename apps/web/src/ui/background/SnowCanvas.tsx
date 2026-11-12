import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { createSnowField, stepSnowField, type SnowField } from './snowEngine';

interface SnowCanvasProps {
  /** Densidad relativa de la nevada (1 = la de la maqueta). En el futuro, según la previsión. */
  intensity?: number;
}

/** Copo prerenderizado una sola vez: después, un único drawImage por copo y frame. */
function createSprite(): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 32;
  const ctx = sprite.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(220,240,255,0.8)');
    g.addColorStop(1, 'rgba(220,240,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  }
  return sprite;
}

/**
 * Fondo de nieve en canvas 2D, a pantalla completa y detrás del contenido.
 * - Bucle con requestAnimationFrame: va a la frecuencia de refresco de la pantalla (60, 120 Hz…).
 * - Se pausa con la ventana oculta o minimizada (visibilitychange).
 * - Con prefers-reduced-motion dibuja una escena estática, sin bucle.
 */
export function SnowCanvas({ intensity = 1 }: SnowCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const sprite = createSprite();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let field: SnowField = createSnowField(1, 1, 0);
    let rafId = 0;
    let last = 0;

    const draw = () => {
      ctx.clearRect(0, 0, field.width, field.height);
      for (const f of field.flakes) {
        ctx.globalAlpha = f.a;
        const size = f.r * 8;
        ctx.drawImage(sprite, f.x - size / 2, f.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      field = createSnowField(width, height, intensity);
      if (reducedMotion) draw();
    };

    const frame = (now: number) => {
      const dt = last ? (now - last) / 1000 : 1 / 60;
      last = now;
      stepSnowField(field, dt);
      draw();
      rafId = requestAnimationFrame(frame);
    };

    const start = () => {
      if (reducedMotion || rafId) return;
      last = 0;
      rafId = requestAnimationFrame(frame);
    };

    const stop = () => {
      cancelAnimationFrame(rafId);
      rafId = 0;
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    if (reducedMotion) draw();
    else start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intensity, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
    />
  );
}
