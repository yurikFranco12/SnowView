import { seasonLabel } from '@snowview/core';
import { searchStations } from '@snowview/data';
import { motion } from 'motion/react';
import { useId, useState } from 'react';
import { ErrorView, Skeleton } from '../components/StatusViews';
import { formatCm } from '../data/forecast';
import { historyProvider, useSeasonHistory, type SeasonResult } from '../data/history';
import { revealItem } from '../motion/reveal';
import { useFavorites } from '../state/favoritesStore';

const ALL_STATIONS = searchStations('');
const monthName = new Intl.DateTimeFormat('es-ES', { month: 'short' });
const dateName = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' });

/** "oct", "nov"… a partir del número de mes (1 a 12). */
function shortMonth(month: number): string {
  return monthName.format(new Date(2000, month - 1, 15)).replace('.', '');
}

function longDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return dateName.format(new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1));
}

function SeasonDetail({ result }: { result: SeasonResult }) {
  const s = result.summary;
  if (result.loading) return <Skeleton className="h-64" />;
  if (!s) {
    return (
      <p role="alert" className="text-sm text-muted">
        No se pudo cargar esta temporada.
      </p>
    );
  }
  const maxMonth = Math.max(...s.months.map((m) => m.totalCm), 1);
  const description = s.months
    .map((m) => `${shortMonth(m.month)} ${formatCm(m.totalCm)} cm`)
    .join(', ');

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-baseline gap-2.5">
        <span className="bg-gradient-to-b from-white from-20% to-ice bg-clip-text font-display text-[64px] leading-none font-bold text-transparent">
          {formatCm(s.totalCm)}
        </span>
        <span className="font-display text-2xl text-muted">cm en la temporada {s.label}</span>
      </p>
      <ul className="flex flex-wrap gap-2.5 text-[13px]" aria-label="Datos de la temporada">
        <li className="rounded-xl bg-white/[0.06] px-3 py-1.5">
          {s.snowyDays} días de nieve (1 cm o más)
        </li>
        {s.maxDay && (
          <li className="rounded-xl bg-white/[0.06] px-3 py-1.5">
            Mayor nevada: {formatCm(s.maxDay.cm)} cm el {longDate(s.maxDay.date)}
          </li>
        )}
        {result.inProgress && (
          <li className="rounded-xl bg-white/[0.06] px-3 py-1.5">Temporada en curso</li>
        )}
        {!s.complete && (
          <li className="rounded-xl bg-white/[0.06] px-3 py-1.5">
            Faltan datos de {s.daysExpected - s.daysWithData} días
          </li>
        )}
      </ul>
      <figure>
        <div
          role="img"
          aria-label={`Nieve por mes en la temporada ${s.label}: ${description}`}
          className="flex h-40 items-end gap-2"
        >
          {s.months.map((m) => (
            <motion.div
              key={m.month}
              title={`${shortMonth(m.month)}: ${formatCm(m.totalCm)} cm`}
              className="flex-1 rounded-lg bg-gradient-to-b from-ice to-[#4c5bd4]/35"
              initial={false}
              animate={{
                height: `${Math.max((m.totalCm / maxMonth) * 100, 3)}%`,
                opacity: m.totalCm === 0 ? 0.35 : 1,
              }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            />
          ))}
        </div>
        <figcaption aria-hidden="true" className="mt-1.5 flex gap-2 text-center text-xs text-muted">
          {s.months.map((m) => (
            <span key={m.month} className="flex-1">
              {shortMonth(m.month)}
            </span>
          ))}
        </figcaption>
      </figure>
    </div>
  );
}

export function HistoryScreen() {
  const favorites = useFavorites((s) => s.ids);
  const selectId = useId();
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const stationId = picked ?? favorites[0] ?? ALL_STATIONS[0]?.id;
  const results = useSeasonHistory(stationId);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const selected = results.find((r) => r.startYear === selectedYear) ?? results[0];
  const maxTotal = Math.max(...results.map((r) => r.summary?.totalCm ?? 0), 1);
  const allFailed = results.length > 0 && results.every((r) => !r.loading && !r.summary);
  const firstError = results.find((r) => r.error)?.error;

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-8 py-[26px]">
      <motion.header variants={revealItem} className="flex items-end justify-between gap-6">
        <div>
          <p className="text-xs tracking-[0.14em] text-muted uppercase">Nieve en la cima</p>
          <h1 className="mt-1.5 font-display text-4xl font-semibold tracking-tight">Historial</h1>
        </div>
        <div className="w-72">
          <label htmlFor={selectId} className="mb-1 block text-xs text-muted">
            Estación
          </label>
          <select
            id={selectId}
            value={stationId}
            onChange={(e) => {
              setPicked(e.target.value);
              setSelectedYear(undefined);
            }}
            className="w-full rounded-[12px] border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-text focus:border-ice/50 focus:outline-none"
          >
            {ALL_STATIONS.map((s) => (
              <option key={s.id} value={s.id} className="bg-bg-start">
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </motion.header>

      {allFailed ? (
        <motion.div variants={revealItem} className="glass flex min-h-64 p-8">
          <ErrorView error={firstError} onRetry={() => window.location.reload()} retrying={false} />
        </motion.div>
      ) : (
        <div className="grid grid-cols-[1.5fr_1fr] gap-5">
          <motion.section
            variants={revealItem}
            aria-label="Detalle de la temporada"
            className="glass p-6"
          >
            {selected && <SeasonDetail result={selected} />}
          </motion.section>

          <motion.section
            variants={revealItem}
            aria-labelledby="seasons-title"
            className="glass p-6"
          >
            <h2 id="seasons-title" className="mb-3 text-sm font-semibold">
              Últimas temporadas
            </h2>
            <ul className="flex flex-col gap-2">
              {results.map((r) => {
                const on = r.startYear === selected?.startYear;
                return (
                  <li key={r.startYear}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSelectedYear(r.startYear)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                        on
                          ? 'border-ice/40 bg-ice/[0.1]'
                          : 'border-white/[0.08] hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="w-16 shrink-0 font-semibold">
                        {seasonLabel(r.startYear)}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className="h-full origin-left rounded-full bg-gradient-to-r from-ice to-indigo transition-transform duration-500 motion-reduce:transition-none"
                          style={{ transform: `scaleX(${(r.summary?.totalCm ?? 0) / maxTotal})` }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right tabular-nums">
                        {r.loading ? '…' : r.summary ? `${formatCm(r.summary.totalCm)} cm` : '—'}
                        {r.inProgress && !r.loading && r.summary && (
                          <span className="sr-only"> (en curso)</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.section>
        </div>
      )}

      <motion.p variants={revealItem} className="text-xs text-muted">
        {historyProvider.attribution}. Reanálisis de rejilla gruesa (unos 25 km): sirve para
        comparar temporadas entre sí, no como la medición exacta de la estación.
      </motion.p>
    </div>
  );
}
