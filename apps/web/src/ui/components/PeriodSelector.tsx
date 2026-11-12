import { motion } from 'motion/react';
import { useRef, type KeyboardEvent } from 'react';
import { PERIODS, useAppStore, type Period } from '../state/appStore';

/**
 * Selector de periodo (3/7/14 días). Es un grupo de opciones exclusivas, así que usa el patrón ARIA
 * `radiogroup`: Tab entra en el grupo y las flechas cambian de opción.
 */
export function PeriodSelector() {
  const period = useAppStore((s) => s.period);
  const setPeriod = useAppStore((s) => s.setPeriod);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const index = PERIODS.indexOf(period);
    const next = PERIODS[(index + step + PERIODS.length) % PERIODS.length] as Period;
    setPeriod(next);
    refs.current[PERIODS.indexOf(next)]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Periodo de previsión"
      onKeyDown={onKeyDown}
      className="flex gap-1 rounded-[14px] border border-white/10 bg-white/[0.06] p-1"
    >
      {PERIODS.map((p, i) => {
        const selected = p === period;
        return (
          <button
            key={p}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => setPeriod(p)}
            className={`relative rounded-[10px] px-3.5 py-2 text-[13px] transition-colors ${
              selected ? 'font-semibold text-bg-start' : 'text-muted hover:text-text'
            }`}
          >
            {selected && (
              <motion.span
                layoutId="period-pill"
                className="absolute inset-0 rounded-[10px] bg-gradient-to-br from-ice to-indigo"
                transition={{ type: 'spring', stiffness: 480, damping: 36 }}
              />
            )}
            <span className="relative">{p} días</span>
          </button>
        );
      })}
    </div>
  );
}
