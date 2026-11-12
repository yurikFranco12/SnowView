import { CloudOff, RotateCw } from 'lucide-react';
import { errorMessage } from '../data/forecast';

/** Bloque de carga. `motion-safe:` hace que el parpadeo se quite con prefers-reduced-motion. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-lg bg-white/[0.07] motion-safe:animate-pulse ${className}`}
    />
  );
}

interface ErrorViewProps {
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
  compact?: boolean;
}

/** Error de carga con su causa y un botón de reintentar. */
export function ErrorView({ error, onRetry, retrying, compact = false }: ErrorViewProps) {
  const { title, detail } = errorMessage(error);
  return (
    <div
      role="alert"
      className={`flex flex-1 flex-col items-center justify-center text-center ${compact ? 'gap-2' : 'gap-3'}`}
    >
      <CloudOff
        className={compact ? 'size-6 text-muted' : 'size-9 text-muted'}
        aria-hidden="true"
        strokeWidth={1.6}
      />
      <p className={compact ? 'text-sm font-semibold' : 'text-base font-semibold'}>{title}</p>
      {!compact && <p className="max-w-sm text-sm text-muted">{detail}</p>}
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="mt-1 inline-flex items-center gap-2 rounded-xl bg-ice/[0.14] px-3.5 py-2 text-sm text-ice transition-colors hover:bg-ice/25 disabled:opacity-60"
      >
        <RotateCw
          className={`size-4 ${retrying ? 'motion-safe:animate-spin' : ''}`}
          aria-hidden="true"
        />
        {retrying ? 'Reintentando…' : 'Reintentar'}
      </button>
    </div>
  );
}
