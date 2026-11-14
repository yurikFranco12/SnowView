import type { DayRating } from '@snowview/core';
import { searchStations, type CuratedStation } from '@snowview/data';
import { ChevronRight, Search, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useId, useMemo, useState } from 'react';
import { PeriodSelector } from '../components/PeriodSelector';
import { RatingBadge } from '../components/RatingBadge';
import { Skeleton } from '../components/StatusViews';
import { WeatherIcon } from '../components/WeatherIcon';
import { rateStationDays } from '../data/conditions';
import { formatCm, summarize, useForecasts, type StationSummary } from '../data/forecast';
import { sortStations, type RankRow, type StationSort } from '../data/ranking';
import { useNow } from '../hooks/useNow';
import { revealItem } from '../motion/reveal';
import { useAppStore } from '../state/appStore';
import { useFavorites } from '../state/favoritesStore';
import { useSettings } from '../state/settingsStore';

const ALL = searchStations('');
const ALL_IDS = ALL.map((s) => s.id);

const SORTS: readonly { key: StationSort; label: string }[] = [
  { key: 'snow', label: 'Más nieve prevista' },
  { key: 'depth', label: 'Más espesor' },
  { key: 'score', label: 'Mejor nota hoy' },
  { key: 'name', label: 'Nombre' },
];

interface Row extends RankRow {
  station: CuratedStation;
  summary: StationSummary | undefined;
  rating: DayRating | undefined;
  loading: boolean;
  failed: boolean;
}

function StationRow({ row, position, maxSnow }: { row: Row; position: number; maxSnow: number }) {
  const ids = useFavorites((s) => s.ids);
  const toggle = useFavorites((s) => s.toggle);
  const openStation = useAppStore((s) => s.openStation);
  const { station, summary } = row;
  const favorite = ids.includes(station.id);
  const isMain = ids[0] === station.id;

  return (
    <li className="group relative flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 md:gap-4 md:px-4 transition-colors hover:bg-white/[0.07]">
      <span className="w-6 shrink-0 text-center font-display text-lg font-semibold text-muted tabular-nums">
        {position}
      </span>
      <button
        type="button"
        onClick={() => openStation(station.id)}
        aria-label={`Abrir la ficha de ${station.name}`}
        className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2 text-left after:absolute after:inset-0 after:rounded-2xl md:flex-nowrap md:gap-4"
      >
        <span className="min-w-0 max-md:basis-full md:flex-[1.3]">
          <span className="flex items-center gap-2 text-[15px] font-semibold">
            <span className="truncate">{station.name}</span>
            {isMain && (
              <span className="shrink-0 rounded-full bg-ice/[0.14] px-2 py-0.5 text-[11px] font-medium text-ice">
                Principal
              </span>
            )}
          </span>
          <span className="block truncate text-xs text-muted">
            {station.region} · {station.baseElevationM.toLocaleString('es-ES')}–
            {station.topElevationM.toLocaleString('es-ES')} m
            {!station.elevationsVerified && ' · cotas por verificar'}
          </span>
        </span>

        {row.loading ? (
          <Skeleton className="h-9 flex-[2]" />
        ) : row.failed || !summary ? (
          <span className="flex-[2] text-xs text-muted">No se pudo cargar la previsión.</span>
        ) : (
          <>
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted md:w-24">
              <WeatherIcon code={summary.current?.weatherCode ?? null} className="size-5" />
              <span className="tabular-nums">
                {summary.current?.temperatureC != null
                  ? `${Math.round(summary.current.temperatureC)} °C`
                  : '—'}
              </span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-sm font-semibold tabular-nums">
                {formatCm(summary.topTotalCm)} cm
                <span className="text-xs font-normal text-muted"> previstos</span>
              </span>
              <span
                className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]"
                aria-hidden="true"
              >
                <span
                  className="block h-full origin-left rounded-full bg-gradient-to-r from-ice to-indigo transition-transform duration-500 motion-reduce:transition-none"
                  style={{ transform: `scaleX(${summary.topTotalCm / maxSnow})` }}
                />
              </span>
            </span>
            <span className="w-24 shrink-0 text-sm tabular-nums max-md:hidden">
              {row.depthCm !== null ? `${formatCm(row.depthCm)} cm` : '—'}
              <span className="block text-[11px] text-muted">espesor en cima</span>
            </span>
            <span className="shrink-0 md:w-32">
              <RatingBadge rating={row.rating} />
            </span>
          </>
        )}
        <ChevronRight
          className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 max-md:hidden"
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        onClick={() => toggle(station.id)}
        aria-pressed={favorite}
        aria-label={`${favorite ? 'Quitar' : 'Añadir'} ${station.name} ${favorite ? 'de' : 'a'} favoritas`}
        className="relative z-10 grid size-10 shrink-0 place-items-center rounded-xl transition-colors hover:bg-white/[0.1]"
      >
        <Star
          className={`size-5 ${favorite ? 'fill-ice text-ice' : 'text-muted'}`}
          aria-hidden="true"
          strokeWidth={1.6}
        />
      </button>
    </li>
  );
}

export function StationsScreen() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<StationSort>('snow');
  const inputId = useId();
  const sortId = useId();
  const now = useNow();
  const period = useAppStore((s) => s.period);
  const discipline = useSettings((s) => s.discipline);
  const count = useFavorites((s) => s.ids.length);
  const forecasts = useForecasts(ALL_IDS);

  const rows: Row[] = ALL.map((station, i) => {
    const q = forecasts[i];
    const data = q?.data;
    const summary = data ? summarize(data, station, period, now) : undefined;
    const rating = data ? rateStationDays(data, station, now, 1, discipline)[0]?.rating : undefined;
    return {
      id: station.id,
      name: station.name,
      station,
      summary,
      rating,
      snowCm: summary?.topTotalCm ?? null,
      depthCm: summary?.current?.snowDepthCm ?? null,
      score: rating?.score ?? null,
      loading: q?.isPending ?? true,
      failed: q?.isError ?? false,
    };
  });

  const wanted = useMemo(() => new Set(searchStations(query).map((s) => s.id)), [query]);
  const visible = sortStations(
    rows.filter((r) => wanted.has(r.id)),
    sort,
  );
  const maxSnow = Math.max(1, ...rows.map((r) => r.snowCm ?? 0));

  return (
    <div className="flex min-h-full flex-col gap-5 md:h-full px-4 py-5 md:px-8 md:py-[26px]">
      <motion.header
        variants={revealItem}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="text-xs tracking-[0.14em] text-muted uppercase">
            {ALL.length} estaciones · {count} {count === 1 ? 'favorita' : 'favoritas'}
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold md:text-4xl tracking-tight">
            Estaciones
          </h1>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={sortId} className="mb-1 block text-xs text-muted">
              Ordenar por
            </label>
            <select
              id={sortId}
              value={sort}
              onChange={(e) => setSort(e.target.value as StationSort)}
              className="rounded-[12px] border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-text focus:border-ice/50 focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key} className="bg-bg-start">
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <PeriodSelector />
          <div className="relative w-full md:w-64">
            <label htmlFor={inputId} className="sr-only">
              Buscar estación por nombre o región
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              id={inputId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar estación o región"
              autoComplete="off"
              className="w-full rounded-[14px] border border-white/10 bg-white/[0.06] py-2.5 pr-3 pl-10 text-sm text-text placeholder:text-muted focus:border-ice/50 focus:outline-none"
            />
          </div>
        </div>
      </motion.header>

      <motion.section
        variants={revealItem}
        aria-label="Clasificación de estaciones"
        className="glass flex min-h-0 flex-1 flex-col gap-3 p-3 md:overflow-y-auto md:p-5"
      >
        <p className="text-xs text-muted" aria-live="polite">
          {visible.length === 0
            ? 'Ninguna estación coincide con la búsqueda.'
            : `Nieve prevista en la cima en ${period} días, espesor actual y nota de hoy. Pulsa una estación para ver su ficha; la estrella la añade a favoritas.`}
        </p>
        <ol className="flex flex-col gap-2">
          {visible.map((row, i) => (
            <StationRow key={row.id} row={row} position={i + 1} maxSnow={maxSnow} />
          ))}
        </ol>
      </motion.section>
    </div>
  );
}
