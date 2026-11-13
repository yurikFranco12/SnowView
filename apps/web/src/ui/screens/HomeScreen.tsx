import { getStation } from '@snowview/data';
import { ArrowUpRight, Mountain, Plus, Star, Video } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { PeriodSelector } from '../components/PeriodSelector';
import { RatingBadge } from '../components/RatingBadge';
import { RuleItem } from '../components/RuleItem';
import { SnowBars } from '../components/SnowBars';
import { WeatherIcon } from '../components/WeatherIcon';
import { Sparkline } from '../components/Sparkline';
import { ErrorView, Skeleton } from '../components/StatusViews';
import { formatCm, provider, summarize, useStationForecast } from '../data/forecast';
import { rateStationDays } from '../data/conditions';
import { useRuleResults } from '../data/rules';
import { revealItem } from '../motion/reveal';
import { useNow } from '../hooks/useNow';
import { useAppStore } from '../state/appStore';
import { useFavorites } from '../state/favoritesStore';
import { useSettings } from '../state/settingsStore';
import { ageMinutes, formatAge, isOutdated } from '../data/offlineCache';
import { WifiOff } from 'lucide-react';
import { useRules } from '../state/rulesStore';

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const timeFormatter = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

/** Valoración de hoy para esquí y snowboard, con el motivo principal. */
function TodayRatings({
  forecast,
  stationId,
}: {
  forecast: Parameters<typeof rateStationDays>[0] | undefined;
  stationId: string;
}) {
  const now = useNow();
  const station = getStation(stationId);
  if (!forecast || !station) return null;
  const ski = rateStationDays(forecast, station, now, 1, 'ski')[0]?.rating;
  const board = rateStationDays(forecast, station, now, 1, 'snowboard')[0]?.rating;
  const reason = ski?.reasons[0] ?? board?.reasons[0];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2.5" aria-label="Condiciones de hoy">
      <span className="text-xs text-muted">Hoy:</span>
      <RatingBadge rating={ski} prefix="Esquí" />
      <RatingBadge rating={board} prefix="Snowboard" />
      {reason && <span className="text-xs text-muted">{reason}</span>}
    </div>
  );
}

function MainStationCard({ stationId }: { stationId: string }) {
  const period = useAppStore((s) => s.period);
  const setView = useAppStore((s) => s.setView);
  const setWebcamStation = useAppStore((s) => s.setWebcamStation);
  const openStation = useAppStore((s) => s.openStation);
  const now = useNow();
  const station = getStation(stationId);
  const query = useStationForecast(stationId);
  const summary = query.data && station ? summarize(query.data, station, period, now) : undefined;

  return (
    <motion.article
      variants={revealItem}
      aria-labelledby="main-station-name"
      aria-busy={query.isPending}
      className="glass relative flex min-h-0 flex-col overflow-hidden px-[26px] py-6"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-[0.14em] text-muted uppercase">Estación principal · cima</p>
        {summary && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ice/[0.14] px-2.5 py-1 text-xs text-ice">
            <WeatherIcon code={summary.current?.weatherCode ?? null} className="size-3.5" />
            {summary.condition}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <h2 id="main-station-name" className="font-display text-[30px] font-semibold">
          {station?.name ?? stationId}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setWebcamStation(stationId);
              setView('webcams');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.08] px-3 py-1.5 text-xs transition-colors hover:bg-white/[0.14]"
          >
            <Video className="size-3.5" aria-hidden="true" />
            Webcams
          </button>
          <button
            type="button"
            onClick={() => openStation(stationId)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-ice to-indigo px-3 py-1.5 text-xs font-semibold text-bg-start transition-opacity hover:opacity-90"
          >
            Ver ficha completa
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {query.isPending && (
        <>
          <Skeleton className="mt-2 h-[104px] w-64" />
          <div className="mt-2 flex gap-2.5">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="mt-4 flex-1" />
        </>
      )}

      {query.isError && (
        <ErrorView
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      )}

      {summary && station && (
        <>
          <p className="mt-1 flex items-baseline gap-2.5" aria-live="polite">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={summary.topTotalCm}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="bg-gradient-to-b from-white from-20% to-ice bg-clip-text font-display text-[104px] leading-none font-bold text-transparent"
              >
                {formatCm(summary.topTotalCm)}
              </motion.span>
            </AnimatePresence>
            <span className="font-display text-[32px] text-muted">cm</span>
            <span className="ml-2 text-sm text-muted">
              previstos en {period} días a {station.topElevationM.toLocaleString('es-ES')} m
            </span>
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-2.5 text-[13px]" aria-label="Condiciones">
            <li className="rounded-xl bg-white/[0.06] px-3 py-1.5">
              {summary.current?.temperatureC !== null && summary.current?.temperatureC !== undefined
                ? `${Math.round(summary.current.temperatureC)} °C`
                : '— °C'}
            </li>
            <li className="rounded-xl bg-white/[0.06] px-3 py-1.5">
              {summary.current?.windKmh != null
                ? `${Math.round(summary.current.windKmh)} km/h viento`
                : '— km/h'}
            </li>
            <li className="rounded-xl bg-white/[0.06] px-3 py-1.5">
              Base {station.baseElevationM.toLocaleString('es-ES')} m:{' '}
              {formatCm(summary.baseTotalCm)} cm
            </li>
            <li className="rounded-xl bg-white/[0.06] px-3 py-1.5">
              Próximas 48 h: {formatCm(summary.next48hCm)} cm
            </li>
            {summary.current?.snowDepthCm != null && (
              <li className="rounded-xl bg-white/[0.06] px-3 py-1.5">
                Espesor en cima: {formatCm(summary.current.snowDepthCm)} cm
              </li>
            )}
            {summary.current?.freezingLevelM != null && (
              <li className="rounded-xl bg-white/[0.06] px-3 py-1.5">
                Isoterma 0 °C:{' '}
                {(Math.round(summary.current.freezingLevelM / 10) * 10).toLocaleString('es-ES')} m
              </li>
            )}
          </ul>
          <TodayRatings forecast={query.data} stationId={station.id} />
          {summary.incomplete && (
            <p className="mt-2 text-xs text-muted">
              Faltan datos de algunas horas en este periodo.
            </p>
          )}
          <SnowBars days={summary.days} />
        </>
      )}
    </motion.article>
  );
}

function RulesPanel() {
  const results = useRuleResults();
  const loaded = useRules((s) => s.loaded);
  const setView = useAppStore((s) => s.setView);
  return (
    <motion.aside
      variants={revealItem}
      aria-labelledby="rules-title"
      className="glass flex min-h-0 flex-col gap-4 p-[22px]"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 id="rules-title" className="font-display text-xl font-semibold">
            Reglas activas
          </h2>
          <p className="text-xs text-muted">
            {results.filter((r) => r.rule.enabled).length} de {results.length}
          </p>
        </div>
        <button
          type="button"
          aria-label="Gestionar reglas"
          title="Gestionar reglas"
          onClick={() => setView('alertas')}
          className="grid size-[34px] place-items-center rounded-[10px] bg-ice/[0.14] text-ice transition-colors hover:bg-ice/25"
        >
          <Plus className="size-4" aria-hidden="true" strokeWidth={1.8} />
        </button>
      </div>
      {loaded && results.length === 0 ? (
        <p className="text-sm text-muted">
          Aún no tienes reglas. Crea una desde Alertas para recibir avisos de nieve.
        </p>
      ) : (
        <ul className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          {results.slice(0, 4).map((r) => (
            <li key={r.rule.id}>
              <RuleItem result={r} />
            </li>
          ))}
        </ul>
      )}
    </motion.aside>
  );
}

const SPARK_COLORS = ['#7DE3FF', '#A5B4FF', '#9FB3D9'] as const;

function FavoriteRating({
  forecast,
  stationId,
}: {
  forecast: Parameters<typeof rateStationDays>[0] | undefined;
  stationId: string;
}) {
  const now = useNow();
  const discipline = useSettings((s) => s.discipline);
  const station = getStation(stationId);
  if (!forecast || !station) return null;
  const rating = rateStationDays(forecast, station, now, 1, discipline)[0]?.rating;
  return <RatingBadge rating={rating} prefix={discipline === 'ski' ? 'Esquí' : 'Snowboard'} />;
}

function FavoriteCard({ stationId, index }: { stationId: string; index: number }) {
  const period = useAppStore((s) => s.period);
  const now = useNow();
  const openStation = useAppStore((s) => s.openStation);
  const station = getStation(stationId);
  const query = useStationForecast(stationId);
  const summary = query.data && station ? summarize(query.data, station, period, now) : undefined;
  const color = SPARK_COLORS[index % SPARK_COLORS.length] ?? '#7DE3FF';

  if (!station) return null;
  return (
    <li className="flex">
      <motion.button
        variants={revealItem}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.985 }}
        type="button"
        onClick={() => openStation(stationId)}
        title="Ver la ficha de la estación"
        aria-label={
          summary
            ? `${station.name}, ${formatCm(summary.topTotalCm)} cm en ${period} días. Ver la ficha`
            : `${station.name}. Ver la ficha`
        }
        className="relative flex flex-1 flex-col gap-1.5 rounded-[18px] border border-white/10 bg-white/[0.05] px-5 py-[18px] text-left backdrop-blur-[14px] transition-colors hover:border-white/20 hover:bg-white/[0.08]"
      >
        <Star
          className="absolute top-4 right-4 size-4 fill-ice text-ice"
          aria-hidden="true"
          strokeWidth={1.6}
        />
        <span className="text-[15px] font-semibold">{station.name}</span>
        <span className="text-xs text-muted">{station.region}</span>
        {query.isPending && (
          <>
            <Skeleton className="mt-1.5 h-10 w-36" />
            <Skeleton className="mt-auto h-11 w-full" />
          </>
        )}
        {query.isError && (
          <p className="mt-auto text-sm text-muted">No se pudo cargar. Se reintentará.</p>
        )}
        {summary && (
          <>
            <span className="mt-1.5 font-display text-[40px] font-bold">
              {formatCm(summary.topTotalCm)}
              <span className="text-base font-medium text-muted"> cm / {period} días</span>
            </span>
            <span className="mt-1">
              <FavoriteRating forecast={query.data} stationId={stationId} />
            </span>
            <Sparkline values={summary.days.map((d) => d.totalCm)} color={color} />
          </>
        )}
      </motion.button>
    </li>
  );
}

function EmptyFavorites() {
  const setView = useAppStore((s) => s.setView);
  return (
    <motion.div
      variants={revealItem}
      className="glass col-span-2 flex flex-col items-center justify-center gap-4 p-10 text-center"
    >
      <div className="grid size-16 place-items-center rounded-2xl bg-ice/[0.12]">
        <Mountain className="size-8 text-ice" aria-hidden="true" strokeWidth={1.6} />
      </div>
      <p className="text-base">Todavía no tienes estaciones favoritas.</p>
      <button
        type="button"
        onClick={() => setView('estaciones')}
        className="rounded-xl bg-gradient-to-br from-ice to-indigo px-4 py-2 text-sm font-semibold text-bg-start"
      >
        Elegir estaciones
      </button>
    </motion.div>
  );
}

export function HomeScreen() {
  const now = useNow();
  const ids = useFavorites((s) => s.ids);
  const loaded = useFavorites((s) => s.loaded);
  const [mainId, ...rest] = ids;
  const mainQuery = useStationForecast(mainId);
  const refreshMinutes = useSettings((s) => s.refreshMinutes);
  // Hora real de la previsión: si hubo que usar datos guardados, es anterior a la última consulta.
  const fetchedAt = mainQuery.data?.fetchedAt;
  const age = mainQuery.data ? ageMinutes(mainQuery.data, now) : 0;
  const outdated = mainQuery.data !== undefined && isOutdated(age, refreshMinutes);

  return (
    <div className="flex h-full flex-col gap-5 px-8 py-[26px]">
      {outdated && (
        <p
          role="status"
          className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm"
        >
          <WifiOff className="size-4 shrink-0 text-muted" aria-hidden="true" />
          Sin conexión con Open-Meteo: se muestran datos guardados {formatAge(age)}.
        </p>
      )}
      <motion.header variants={revealItem} className="flex items-end justify-between">
        <div>
          <p className="text-xs tracking-[0.14em] text-muted uppercase">
            {dateFormatter.format(now)}
          </p>
          <h1 className="mt-1.5 font-display text-4xl font-semibold tracking-tight">
            Mis estaciones
          </h1>
        </div>
        <PeriodSelector />
      </motion.header>

      <section className="grid h-[420px] shrink-0 grid-cols-[1.6fr_1fr] gap-5">
        {loaded && mainId ? (
          <MainStationCard stationId={mainId} />
        ) : loaded ? (
          <EmptyFavorites />
        ) : (
          <div />
        )}
        {(!loaded || mainId) && <RulesPanel />}
      </section>

      <section aria-labelledby="favorites-title" className="flex min-h-0 flex-1 flex-col gap-3">
        <motion.div variants={revealItem} className="flex items-baseline justify-between">
          <h2 id="favorites-title" className="font-display text-xl font-semibold">
            Favoritas
          </h2>
          <p className="text-xs text-muted">
            {provider.attribution}
            {fetchedAt !== undefined && ` · actualizado a las ${timeFormatter.format(fetchedAt)}`}
          </p>
        </motion.div>
        {rest.length > 0 ? (
          <ul className="grid flex-1 grid-cols-3 gap-4">
            {rest.slice(0, 3).map((id, i) => (
              <FavoriteCard key={id} stationId={id} index={i} />
            ))}
          </ul>
        ) : (
          loaded &&
          mainId && (
            <motion.p variants={revealItem} className="text-sm text-muted">
              Añade más favoritas desde Estaciones para compararlas aquí.
            </motion.p>
          )
        )}
      </section>
    </div>
  );
}
