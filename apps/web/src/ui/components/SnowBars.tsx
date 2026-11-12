import type { DailySnow } from '@snowview/core';
import { motion } from 'motion/react';
import { dayLabel, formatCm } from '../data/forecast';

interface SnowBarsProps {
  days: readonly DailySnow[];
}

/**
 * Gráfica de barras de nieve diaria, hecha a mano (ver ADR 0004). Ocupa el alto que le quede a la
 * tarjeta (flex-1). Cada barra lleva su valor como título para verlo al pasar el ratón.
 */
export function SnowBars({ days }: SnowBarsProps) {
  const max = Math.max(...days.map((d) => d.totalCm), 1);
  const total = days.reduce((a, d) => a + d.totalCm, 0);
  const description = days.map((d) => `${dayLabel(d.date)} ${formatCm(d.totalCm)} cm`).join(', ');

  return (
    <figure className="mt-4 flex min-h-0 flex-1 flex-col">
      <div
        role="img"
        aria-label={`Nieve prevista por día en la cima, ${formatCm(total)} cm en total: ${description}`}
        className="flex min-h-10 flex-1 items-end gap-2"
      >
        {days.map((d) => (
          <motion.div
            key={d.date}
            title={`${dayLabel(d.date)}: ${formatCm(d.totalCm)} cm`}
            className="flex-1 rounded-lg bg-gradient-to-b from-ice to-[#4c5bd4]/35"
            initial={false}
            animate={{
              height: `${Math.max((d.totalCm / max) * 100, 4)}%`,
              opacity: d.totalCm === 0 ? 0.35 : 1,
            }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          />
        ))}
      </div>
      <figcaption aria-hidden="true" className="mt-1.5 flex gap-2 text-center text-xs text-muted">
        {days.map((d) => (
          <span key={d.date} className="flex-1">
            {dayLabel(d.date)}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
