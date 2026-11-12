import { motion } from 'motion/react';
import { dayLabel } from '../mock/stations';

interface SnowBarsProps {
  /** Nieve por día en cm. */
  values: readonly number[];
}

/**
 * Gráfica de barras de nieve diaria. Hecha a mano porque es sencilla; la librería de gráficas
 * (Recharts o Visx) se decide en la Fase 1b, cuando haya ejes, tooltips y datos reales.
 * Ocupa el alto que le quede a la tarjeta (flex-1), con un mínimo de 40 px.
 */
export function SnowBars({ values }: SnowBarsProps) {
  const max = Math.max(...values, 1);
  const total = values.reduce((a, b) => a + b, 0);
  const description = values.map((v, i) => `${dayLabel(i)} ${v} cm`).join(', ');

  return (
    <figure className="mt-4 flex min-h-0 flex-1 flex-col">
      <div
        role="img"
        aria-label={`Nieve prevista por día, ${total} cm en total: ${description}`}
        className="flex min-h-10 flex-1 items-end gap-2"
      >
        {values.map((v, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-lg bg-gradient-to-b from-ice to-[#4c5bd4]/35"
            initial={false}
            animate={{ height: `${Math.max((v / max) * 100, 4)}%`, opacity: v === 0 ? 0.35 : 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          />
        ))}
      </div>
      <figcaption aria-hidden="true" className="mt-1.5 flex gap-2 text-center text-xs text-muted">
        {values.map((_, i) => (
          <span key={i} className="flex-1">
            {dayLabel(i)}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
