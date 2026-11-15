import { RATING_LABEL } from '@snowview/core';
import { getStation } from '@snowview/data';
import { useQueries } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { PeriodSelector } from '../components/PeriodSelector';
import { DisciplineSelector, RATING_STYLE, RatingBadge } from '../components/RatingBadge';
import { Skeleton } from '../components/StatusViews';
import {
  MIN_RECOMMENDED_SCORE,
  bestPerDay,
  rateStationDays,
  sortByAverage,
  topPicks,
  type RatedDay,
  type StationDays,
} from '../data/conditions';
import { fetchStationForecast, formatCm } from '../data/forecast';
import { snapshotSnowCm, useSnapshots } from '../data/snapshots';
import { useNow } from '../hooks/useNow';
import { revealItem } from '../motion/reveal';
import { useAppStore } from '../state/appStore';
import { useFavorites } from '../state/favoritesStore';
import { useSettings } from '../state/settingsStore';

/** Estaciones con más nieve prevista que se valoran en «Más nieve». */
const TOP_SNOW_COUNT = 10;
const weekday = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });
const longDay = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1);
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function useStationDays(ids: readonly string[], days: number) {
  const now = useNow();
  const discipline = useSettings((s) => s.discipline);
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
  const entries: StationDays[] = [];
  ids.forEach((id, i) => {
    const station = getStation(id);
    const data = queries[i]?.data;
    if (station && data) {
      entries.push({ stationId: id, days: rateStationDays(data, station, now, days, discipline) });
    }
  });
  const loading = queries.some((q) => q.isPending);
  const failed = ids.filter((_, i) => queries[i]?.isError && !queries[i]?.data);
  return { entries, loading, failed };
}

function DayDetail({ stationId, day }: { stationId: string; day: RatedDay }) {
  const { rating, conditions: c } = day;
  const name = getStation(stationId)?.name ?? stationId;
  const num = (v: number | null, unit: string) => (v === null ? '—' : `${Math.round(v)} ${unit}`);
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      aria-live="polite"
      aria-label="Detalle del día elegido"
      className="glass flex flex-col gap-3 p-5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-semibold">
          {name} · {capitalize(longDay.format(parseDate(rating.date)))}
        </h2>
        <RatingBadge rating={rating} />
      </div>
      {rating.reasons.length > 0 && (
        <p className="text-sm">Pesa más: {rating.reasons.join(' · ')}.</p>
      )}
      <ul className="flex flex-wrap gap-2.5 text-[13px]" aria-label="Datos del día">
        <li className="rounded-xl bg-white/[0.06] px-3 py-1.5">
          Nieve en la cima: {num(c.depthTopCm, 'cm')}
        </li>
        <li className="rounded-xl bg-white/[0.06] px-3 py-1.5">
          Nieve reciente: {formatCm(c.recentSnowCm)} cm
        </li>
        <li className="rounded-xl bg-white/[0.06] px-3 py-1.5">
          Temperatura: {num(c.tempC, '°C')}
        </li>
        <li className="rounded-xl bg-white/[0.06] px-3 py-1.5">Viento: {num(c.windKmh, 'km/h')}</li>
        {c.rainHours > 0 && (
          <li className="rounded-xl bg-white/[0.06] px-3 py-1.5">Lluvia: {c.rainHours} h</li>
        )}
      </ul>
      {rating.incomplete && (
        <p className="text-xs text-muted">Faltan datos de este día: la nota es aproximada.</p>
      )}
    </motion.section>
  );
}

export function CalendarScreen() {
  const period = useAppStore((s) => s.period);
  const discipline = useSettings((s) => s.discipline);
  const favorites = useFavorites((s) => s.ids);
  const [scope, setScope] = useState<'favorites' | 'snow'>('favorites');
  const [selected, setSelected] = useState<{ stationId: string; date: string } | undefined>(
    undefined,
  );
  // Valorar un día necesita la previsión hora a hora: se pide solo para las favoritas o para las
  // diez estaciones con más nieve prevista (según el resumen ligero), nunca para todo el catálogo.
  const useSnow = scope === 'snow' || favorites.length === 0;
  const snapshots = useSnapshots(useSnow);
  const snowiest = useMemo(
    () =>
      [...(snapshots.data ?? [])]
        .map((s) => ({ id: s.stationId, cm: snapshotSnowCm(s, period) ?? -1 }))
        .filter((s) => getStation(s.id) !== undefined)
        .sort((a, b) => b.cm - a.cm || a.id.localeCompare(b.id))
        .slice(0, TOP_SNOW_COUNT)
        .map((s) => s.id),
    [snapshots.data, period],
  );
  const ids = useSnow ? snowiest : favorites;
  const { entries, loading, failed } = useStationDays(ids, period);

  const sorted = sortByAverage(entries);
  const picks = topPicks(entries, 3);
  const bests = bestPerDay(entries);
  const dates = sorted[0]?.days.map((d) => d.rating.date) ?? [];
  const selectedDay = selected
    ? entries
        .find((e) => e.stationId === selected.stationId)
        ?.days.find((d) => d.rating.date === selected.date)
    : undefined;

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-4 py-5 md:px-8 md:py-[26px] [&>*]:shrink-0">
      <motion.header
        variants={revealItem}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="text-xs tracking-[0.14em] text-muted uppercase">
            Condiciones previstas · {discipline === 'ski' ? 'esquí' : 'snowboard'}
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold md:text-4xl tracking-tight">
            Calendario
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DisciplineSelector />
          <PeriodSelector />
        </div>
      </motion.header>

      <motion.section variants={revealItem} aria-labelledby="picks-title" className="glass p-5">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 id="picks-title" className="text-sm font-semibold">
            Mejores opciones para ir
          </h2>
          <div role="radiogroup" aria-label="Estaciones a valorar" className="flex gap-1">
            {(['favorites', 'snow'] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={scope === s}
                onClick={() => setScope(s)}
                className={`rounded-xl px-3 py-1.5 text-xs transition-colors ${
                  scope === s
                    ? 'bg-ice/[0.2] font-semibold text-ice'
                    : 'text-muted hover:bg-white/[0.08] hover:text-text'
                }`}
              >
                {s === 'snow' ? 'Más nieve' : 'Favoritas'}
              </button>
            ))}
          </div>
        </div>
        {(loading || (useSnow && snapshots.isPending)) && entries.length === 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : picks.length === 0 ? (
          <p className="text-sm text-muted">No hay previsión suficiente para recomendar un día.</p>
        ) : (
          <>
            {(picks[0]?.score ?? 0) < MIN_RECOMMENDED_SCORE && (
              <p className="mb-3 text-sm text-muted">
                Ninguna estación llega a condiciones aceptables en este periodo. Esto es lo menos
                malo.
              </p>
            )}
            <ol className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {picks.map((p, i) => (
                <li key={p.stationId}>
                  <button
                    type="button"
                    onClick={() => setSelected({ stationId: p.stationId, date: p.date })}
                    className="flex h-full w-full flex-col items-start gap-1.5 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-left transition-colors hover:bg-white/[0.09]"
                  >
                    <span className="text-xs text-muted">{i + 1}.º</span>
                    <span className="text-[15px] font-semibold">
                      {getStation(p.stationId)?.name}
                    </span>
                    <span className="text-sm">{capitalize(longDay.format(parseDate(p.date)))}</span>
                    <RatingBadge rating={p.day.rating} />
                    {p.day.rating.reasons[0] && (
                      <span className="text-xs text-muted">{p.day.rating.reasons[0]}</span>
                    )}
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}
      </motion.section>

      <motion.section variants={revealItem} className="glass overflow-x-auto p-5">
        {loading && entries.length === 0 ? (
          <Skeleton className="h-64" />
        ) : (
          <table className="w-full border-separate border-spacing-1 text-sm">
            <caption className="sr-only">
              Valoración de las condiciones por estación y día. La estrella marca la mejor estación
              de cada día.
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-40 text-left text-xs font-normal text-muted">
                  Estación (de mejor a peor media)
                </th>
                {dates.map((date) => (
                  <th
                    key={date}
                    scope="col"
                    className="min-w-11 text-center text-xs font-normal text-muted"
                  >
                    <span className="block">
                      {capitalize(weekday.format(parseDate(date)).replace('.', ''))}
                    </span>
                    <span className="block font-semibold text-text">
                      {parseDate(date).getDate()}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry) => (
                <tr key={entry.stationId}>
                  <th scope="row" className="pr-2 text-left text-[13px] font-semibold">
                    {getStation(entry.stationId)?.name}
                  </th>
                  {entry.days.map((d) => {
                    const r = d.rating;
                    const isBest = bests.get(r.date)?.has(entry.stationId) ?? false;
                    const isSelected =
                      selected?.stationId === entry.stationId && selected.date === r.date;
                    const name = getStation(entry.stationId)?.name ?? entry.stationId;
                    return (
                      <td key={r.date} className="p-0 text-center">
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          aria-label={`${name}, ${longDay.format(parseDate(r.date))}: ${
                            r.rating ? `${RATING_LABEL[r.rating]}, ${r.score}` : 'sin datos'
                          }${isBest ? ', la mejor estación del día' : ''}`}
                          onClick={() => setSelected({ stationId: entry.stationId, date: r.date })}
                          className={`flex h-10 w-full min-w-11 items-center justify-center gap-0.5 rounded-lg text-xs font-semibold ring-1 transition-transform hover:scale-105 ${
                            r.rating
                              ? RATING_STYLE[r.rating]
                              : 'bg-white/[0.04] text-muted ring-white/10'
                          } ${isSelected ? 'outline-2 outline-offset-1 outline-ice' : ''}`}
                        >
                          {r.score ?? '—'}
                          {isBest && <Star className="size-3 fill-current" aria-hidden="true" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {failed.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            Sin previsión de: {failed.map((id) => getStation(id)?.name ?? id).join(', ')}.
          </p>
        )}
        <ul className="mt-4 flex flex-wrap gap-2 text-xs" aria-label="Leyenda">
          {(['excelente', 'buena', 'aceptable', 'floja', 'mala'] as const).map((r) => (
            <li key={r} className={`rounded-full px-2.5 py-1 ring-1 ${RATING_STYLE[r]}`}>
              {RATING_LABEL[r]}
            </li>
          ))}
        </ul>
      </motion.section>

      {selected && selectedDay && <DayDetail stationId={selected.stationId} day={selectedDay} />}

      <motion.p variants={revealItem} className="text-xs text-muted">
        La nota (0 a 100) es una estimación propia con la previsión de Open-Meteo: combina nieve en
        la cima, nieve reciente, temperatura, viento y tiempo en horario de pistas (9:00 a 17:00).
        No sabe si hay remontes abiertos ni el estado real de las pistas: consúltalo en la estación.
      </motion.p>
    </div>
  );
}
