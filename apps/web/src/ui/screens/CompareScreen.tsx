import { getStation } from '@snowview/data';
import { useQueries } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useId, useMemo, useState } from 'react';
import { PeriodSelector } from '../components/PeriodSelector';
import { StationOptions } from '../components/StationOptions';
import { Skeleton } from '../components/StatusViews';
import { MAX_COMPARED, highlightBest, toggleCompared } from '../data/compare';
import { fetchStationForecast, formatCm, summarize, type StationSummary } from '../data/forecast';
import { useNow } from '../hooks/useNow';
import { revealItem } from '../motion/reveal';
import { useAppStore } from '../state/appStore';
import { useFavorites } from '../state/favoritesStore';

interface Column {
  id: string;
  name: string;
  summary: StationSummary | undefined;
  loading: boolean;
  failed: boolean;
}

function useColumns(ids: readonly string[]): Column[] {
  const period = useAppStore((s) => s.period);
  const now = useNow();
  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['forecast', id],
      queryFn: ({ signal }: { signal: AbortSignal }) => {
        const station = getStation(id);
        if (!station) throw new Error('Estación desconocida');
        return fetchStationForecast(station, signal);
      },
    })),
  });
  return ids.map((id, i) => {
    const station = getStation(id);
    const q = queries[i];
    return {
      id,
      name: station?.name ?? id,
      summary: q?.data && station ? summarize(q.data, station, period, now) : undefined,
      loading: q?.isPending ?? true,
      failed: q?.isError ?? false,
    };
  });
}

/** Marca de "mejor valor": icono y texto para lectores de pantalla, no solo color. */
function Best() {
  return (
    <>
      <Star className="size-3.5 fill-ice text-ice" aria-hidden="true" strokeWidth={1.6} />
      <span className="sr-only"> (el mejor)</span>
    </>
  );
}

function Cell({
  column,
  highlighted,
  children,
}: {
  column: Column;
  highlighted?: boolean;
  children: (s: StationSummary) => string;
}) {
  if (column.loading) return <Skeleton className="h-5 w-16" />;
  if (!column.summary) return <span className="text-muted">—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${highlighted ? 'font-semibold text-ice' : ''}`}
    >
      {children(column.summary)}
      {highlighted && <Best />}
    </span>
  );
}

export function CompareScreen() {
  const period = useAppStore((s) => s.period);
  const favorites = useFavorites((s) => s.ids);
  const [picked, setPicked] = useState<string[] | undefined>(undefined);
  // Mientras el usuario no elija, se comparan las primeras favoritas.
  const ids = picked ?? favorites.slice(0, MAX_COMPARED);
  const columns = useColumns(ids);
  const addId = useId();
  // Con cientos de estaciones no caben todas como botones: se ofrecen las favoritas y las que ya
  // se comparan, y el desplegable añade cualquier otra del catálogo.
  const chips = [...new Set([...ids, ...favorites])].flatMap((id) => getStation(id) ?? []);
  const highlights = useMemo(
    () => highlightBest(columns.flatMap((c) => (c.summary ? [c.summary] : []))),
    [columns],
  );
  const maxTop = Math.max(...columns.map((c) => c.summary?.topTotalCm ?? 0), 1);

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-4 py-5 md:px-8 md:py-[26px] [&>*]:shrink-0">
      <motion.header variants={revealItem} className="flex items-end justify-between gap-6">
        <div>
          <p className="text-xs tracking-[0.14em] text-muted uppercase">
            {ids.length} de {MAX_COMPARED} estaciones
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold md:text-4xl tracking-tight">
            Comparar
          </h1>
        </div>
        <PeriodSelector />
      </motion.header>

      <motion.section variants={revealItem} aria-labelledby="pick-title" className="glass p-5">
        <h2 id="pick-title" className="mb-3 text-sm font-semibold">
          Estaciones a comparar
        </h2>
        <ul className="flex flex-wrap gap-2">
          {chips.map((s) => {
            const on = ids.includes(s.id);
            const full = !on && ids.length >= MAX_COMPARED;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  disabled={full}
                  onClick={() => setPicked(toggleCompared(ids, s.id))}
                  className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors disabled:opacity-40 ${
                    on
                      ? 'border-ice/50 bg-ice/[0.16] font-semibold text-ice'
                      : 'border-white/10 text-muted hover:bg-white/[0.08] hover:text-text'
                  }`}
                >
                  {s.name}
                </button>
              </li>
            );
          })}
        </ul>
        {ids.length >= MAX_COMPARED ? (
          <p className="mt-3 text-xs text-muted">
            Máximo {MAX_COMPARED} a la vez. Quita una para añadir otra.
          </p>
        ) : (
          <div className="mt-3 max-w-sm">
            <label htmlFor={addId} className="mb-1 block text-xs text-muted">
              Añadir otra estación
            </label>
            <select
              id={addId}
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id && !ids.includes(id)) setPicked(toggleCompared(ids, id));
              }}
              className="w-full rounded-[12px] border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-text focus:border-ice/50 focus:outline-none"
            >
              <option value="" className="bg-bg-start">
                Elige una estación…
              </option>
              <StationOptions />
            </select>
          </div>
        )}
      </motion.section>

      {columns.length === 0 ? (
        <motion.p variants={revealItem} className="glass p-8 text-center text-sm text-muted">
          Elige al menos una estación para compararla.
        </motion.p>
      ) : (
        <>
          <motion.section variants={revealItem} aria-labelledby="bars-title" className="glass p-5">
            <h2 id="bars-title" className="mb-3 text-sm font-semibold">
              Nieve prevista en la cima, {period} días
            </h2>
            <ul className="flex flex-col gap-2.5">
              {columns.map((c) => (
                <li key={c.id} className="flex items-center gap-3 text-sm">
                  <span className="w-36 shrink-0 truncate">{c.name}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                    <motion.div
                      className="h-full origin-left rounded-full bg-gradient-to-r from-ice to-indigo"
                      initial={false}
                      animate={{ scaleX: (c.summary?.topTotalCm ?? 0) / maxTop }}
                      transition={{ type: 'spring', stiffness: 220, damping: 30 }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right tabular-nums">
                    {c.summary ? `${formatCm(c.summary.topTotalCm)} cm` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </motion.section>

          <motion.section variants={revealItem} className="glass overflow-x-auto p-5">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <caption className="sr-only">
                Comparación de estaciones. La estrella marca el mejor valor de cada fila.
              </caption>
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th scope="col" className="pb-3 font-normal">
                    Medida
                  </th>
                  {columns.map((c) => (
                    <th key={c.id} scope="col" className="pb-3 font-semibold text-text">
                      {c.name}
                      {c.failed && !c.summary && (
                        <span className="block text-xs font-normal text-muted">Sin previsión</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[&_td]:border-t [&_td]:border-white/[0.08] [&_td]:py-3 [&_th]:border-t [&_th]:border-white/[0.08] [&_th]:py-3">
                <tr>
                  <th scope="row" className="text-left font-normal text-muted">
                    Nieve en la cima ({period} días)
                  </th>
                  {columns.map((c) => (
                    <td key={c.id}>
                      <Cell column={c} highlighted={highlights.topSnow.has(c.id)}>
                        {(s) => `${formatCm(s.topTotalCm)} cm`}
                      </Cell>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="text-left font-normal text-muted">
                    Nieve en la base ({period} días)
                  </th>
                  {columns.map((c) => (
                    <td key={c.id}>
                      <Cell column={c}>{(s) => `${formatCm(s.baseTotalCm)} cm`}</Cell>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="text-left font-normal text-muted">
                    Próximas 48 h (cima)
                  </th>
                  {columns.map((c) => (
                    <td key={c.id}>
                      <Cell column={c} highlighted={highlights.next48h.has(c.id)}>
                        {(s) => `${formatCm(s.next48hCm)} cm`}
                      </Cell>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="text-left font-normal text-muted">
                    Temperatura ahora
                  </th>
                  {columns.map((c) => (
                    <td key={c.id}>
                      <Cell column={c}>
                        {(s) =>
                          s.current?.temperatureC != null
                            ? `${Math.round(s.current.temperatureC)} °C`
                            : '—'
                        }
                      </Cell>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="text-left font-normal text-muted">
                    Viento ahora
                  </th>
                  {columns.map((c) => (
                    <td key={c.id}>
                      <Cell column={c} highlighted={highlights.calmestWind.has(c.id)}>
                        {(s) =>
                          s.current?.windKmh != null ? `${Math.round(s.current.windKmh)} km/h` : '—'
                        }
                      </Cell>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="text-left font-normal text-muted">
                    Tiempo
                  </th>
                  {columns.map((c) => (
                    <td key={c.id}>
                      <Cell column={c}>{(s) => s.condition}</Cell>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </motion.section>
        </>
      )}
    </div>
  );
}
