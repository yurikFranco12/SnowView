import { RATING_LABEL, type DayRating, type Discipline, type Rating } from '@snowview/core';
import { Snowflake } from 'lucide-react';
import { motion } from 'motion/react';
import { useRef, type KeyboardEvent } from 'react';
import { useSettings } from '../state/settingsStore';

/**
 * Colores por valoración. El texto es siempre claro sobre un fondo oscuro teñido, y la valoración
 * va escrita (no solo en color) para que se entienda sin distinguir colores.
 */
export const RATING_STYLE: Record<Rating, string> = {
  excelente: 'bg-emerald-400/20 text-emerald-100 ring-emerald-300/40',
  buena: 'bg-lime-400/20 text-lime-100 ring-lime-300/40',
  aceptable: 'bg-amber-400/20 text-amber-100 ring-amber-300/40',
  floja: 'bg-orange-400/20 text-orange-100 ring-orange-300/40',
  mala: 'bg-rose-400/20 text-rose-100 ring-rose-300/40',
};

export const DISCIPLINE_LABEL: Record<Discipline, string> = {
  ski: 'Esquí',
  snowboard: 'Snowboard',
};

/** "Buena · 72" con su color; "Sin datos" si el día no tiene previsión. */
export function RatingBadge({
  rating,
  prefix,
}: {
  rating: DayRating | undefined;
  prefix?: string;
}) {
  if (!rating || rating.rating === null || rating.score === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-muted">
        {prefix && <span>{prefix}</span>}
        Sin datos
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${RATING_STYLE[rating.rating]}`}
    >
      {prefix && <span className="font-normal opacity-80">{prefix}</span>}
      {RATING_LABEL[rating.rating]} · {rating.score}
    </span>
  );
}

const OPTIONS: readonly Discipline[] = ['ski', 'snowboard'];

/** Elige esquí o snowboard. Grupo de radio: Tab entra y las flechas cambian de opción. */
export function DisciplineSelector() {
  const discipline = useSettings((s) => s.discipline);
  const setDiscipline = useSettings((s) => s.setDiscipline);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const next: Discipline = discipline === 'ski' ? 'snowboard' : 'ski';
    setDiscipline(next);
    refs.current[OPTIONS.indexOf(next)]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Disciplina"
      onKeyDown={onKeyDown}
      className="flex gap-1 rounded-[14px] border border-white/10 bg-white/[0.06] p-1"
    >
      {OPTIONS.map((d, i) => {
        const selected = d === discipline;
        return (
          <button
            key={d}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => setDiscipline(d)}
            className={`relative inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] transition-colors ${
              selected ? 'font-semibold text-bg-start' : 'text-muted hover:text-text'
            }`}
          >
            {selected && (
              <motion.span
                layoutId="discipline-pill"
                className="absolute inset-0 rounded-[10px] bg-gradient-to-br from-ice to-indigo"
                transition={{ type: 'spring', stiffness: 480, damping: 36 }}
              />
            )}
            <Snowflake className="relative size-3.5" aria-hidden="true" />
            <span className="relative">{DISCIPLINE_LABEL[d]}</span>
          </button>
        );
      })}
    </div>
  );
}
