import {
  HOUR_MS,
  accumulateSnow,
  dailyOverview,
  describeWeatherCode,
  windChillC,
  type HourlyPoint,
} from '@snowview/core';
import { getStation, getWebcams, type CuratedStation } from '@snowview/data';
import {
  Crown,
  Map as MapIcon,
  Mountain,
  Snowflake,
  Star,
  Thermometer,
  Video,
  Wind,
  X,
} from 'lucide-react';
import { Suspense, lazy, useState, type ReactNode } from 'react';
import { rateStationDays } from '../data/conditions';
import { dayLabel, formatCm, provider, useStationForecast } from '../data/forecast';
import { ageMinutes, formatAge } from '../data/offlineCache';
import { useNow } from '../hooks/useNow';
import { useAppStore } from '../state/appStore';
import { useFavorites } from '../state/favoritesStore';
import { useSettings } from '../state/settingsStore';
import { HourlyChart } from './HourlyChart';
import { Modal } from './Modal';
import { RATING_STYLE, RatingBadge } from './RatingBadge';
import { ErrorView, Skeleton } from './StatusViews';
import { WeatherIcon } from './WeatherIcon';

// El mapa de pistas (con sus datos y la vista 3D) se descarga solo si se abre.
import { hasPisteMap } from '../map/pisteData';

const PisteMapDialog = lazy(() =>
  import('../map/PisteMap').then((m) => ({ default: m.PisteMapDialog })),
);

const finite = (v: number | null | undefined): v is number =>
  v !== null && v !== undefined && Number.isFinite(v);
const metres = (v: number) => `${v.toLocaleString('es-ES')} m`;

function currentHour(hours: readonly HourlyPoint[], now: number): HourlyPoint | undefined {
  let found: HourlyPoint | undefined;
  for (const h of hours) {
    if (h.time <= now) found = h;
    else break;
  }
  return found ?? hours[0];
}

function Tile({
  icon,
  title,
  value,
  detail,
}: {
  icon: ReactNode;
  title: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <li className="flex min-w-0 flex-col gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3">
      <span className="flex items-center gap-1.5 text-[11px] tracking-wide text-muted uppercase">
        {icon}
        {title}
      </span>
      <span className="font-display text-[26px] leading-tight font-semibold tabular-nums">
        {value}
      </span>
      {detail && <span className="text-xs text-muted">{detail}</span>}
    </li>
  );
}

function SheetBody({ station }: { station: CuratedStation }) {
  const now = useNow();
  const discipline = useSettings((s) => s.discipline);
  const query = useStationForecast(station.id);
  const [level, setLevel] = useState<'top' | 'base'>('top');

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="flex min-h-64">
        <ErrorView
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      </div>
    );
  }

  const forecast = query.data;
  const top = forecast.top.hours;
  const base = forecast.base.hours;
  const cur = currentHour(top, now);
  const curBase = currentHour(base, now);
  const startOfHour = Math.floor(now / HOUR_MS) * HOUR_MS;
  const snow = (h: number) => accumulateSnow(top, startOfHour, h).totalCm;
  const days = dailyOverview(top, station.timeZone, now, 14);
  const baseDays = dailyOverview(base, station.timeZone, now, 14);
  const rated = rateStationDays(forecast, station, now, 14, discipline);
  const ski = rateStationDays(forecast, station, now, 1, 'ski')[0]?.rating;
  const board = rateStationDays(forecast, station, now, 1, 'snowboard')[0]?.rating;
  const maxDaySnow = Math.max(1, ...days.map((d) => d.snowCm));
  const freezing = cur?.freezingLevelM;
  const age = ageMinutes(forecast, now);

  return (
    <div className="flex flex-col gap-5">
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-5" aria-label="Ahora en la estación">
        <Tile
          icon={<WeatherIcon code={cur?.weatherCode ?? null} className="size-3.5" />}
          title="Ahora en la cima"
          value={finite(cur?.temperatureC) ? `${Math.round(cur.temperatureC)} °C` : '—'}
          detail={
            <>
              {describeWeatherCode(cur?.weatherCode ?? null)}
              {finite(cur?.temperatureC) && finite(cur?.windKmh) && (
                <> · sensación {Math.round(windChillC(cur.temperatureC, cur.windKmh))} °C</>
              )}
            </>
          }
        />
        <Tile
          icon={<Wind className="size-3.5" aria-hidden="true" />}
          title="Viento"
          value={finite(cur?.windKmh) ? `${Math.round(cur.windKmh)} km/h` : '—'}
          detail={finite(cur?.gustKmh) ? `Rachas de ${Math.round(cur.gustKmh)} km/h` : undefined}
        />
        <Tile
          icon={<Mountain className="size-3.5" aria-hidden="true" />}
          title="Espesor de nieve"
          value={finite(cur?.snowDepthCm) ? `${formatCm(cur.snowDepthCm)} cm` : '—'}
          detail={
            <>
              Cima · base{' '}
              {finite(curBase?.snowDepthCm) ? `${formatCm(curBase.snowDepthCm)} cm` : 'sin dato'}
            </>
          }
        />
        <Tile
          icon={<Snowflake className="size-3.5" aria-hidden="true" />}
          title="Nieve prevista"
          value={`${formatCm(snow(72))} cm`}
          detail={`En 72 h · 24 h: ${formatCm(snow(24))} · 48 h: ${formatCm(snow(48))}`}
        />
        <Tile
          icon={<Thermometer className="size-3.5" aria-hidden="true" />}
          title="Isoterma 0 °C"
          value={finite(freezing) ? metres(Math.round(freezing / 10) * 10) : '—'}
          detail={
            finite(freezing)
              ? freezing <= station.baseElevationM
                ? 'Por debajo de la base: nieva en toda la estación'
                : freezing >= station.topElevationM
                  ? 'Por encima de la cima: riesgo de lluvia'
                  : 'Entre la base y la cima'
              : 'Sin dato'
          }
        />
      </ul>

      <div className="flex flex-wrap items-center gap-2.5" aria-label="Condiciones de hoy">
        <span className="text-xs text-muted">Hoy:</span>
        <RatingBadge rating={ski} prefix="Esquí" />
        <RatingBadge rating={board} prefix="Snowboard" />
        {(ski?.reasons[0] ?? board?.reasons[0]) && (
          <span className="text-xs text-muted">{ski?.reasons[0] ?? board?.reasons[0]}</span>
        )}
      </div>

      <section
        aria-labelledby="sheet-hourly"
        className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 id="sheet-hourly" className="text-sm font-semibold">
            Próximas 72 horas
          </h3>
          <div
            role="radiogroup"
            aria-label="Cota"
            className="flex gap-1 rounded-xl bg-white/[0.06] p-1 text-xs"
          >
            {(
              [
                ['top', `Cima ${metres(station.topElevationM)}`],
                ['base', `Base ${metres(station.baseElevationM)}`],
              ] as const
            ).map(([key, text]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={level === key}
                onClick={() => setLevel(key)}
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  level === key ? 'bg-ice/20 font-semibold text-ice' : 'text-muted hover:text-text'
                }`}
              >
                {text}
              </button>
            ))}
          </div>
        </div>
        <HourlyChart
          hours={level === 'top' ? top : base}
          timeZone={station.timeZone}
          now={now}
          label={`Previsión hora a hora de ${station.name}, ${level === 'top' ? 'cima' : 'base'}`}
        />
      </section>

      <section aria-labelledby="sheet-days">
        <h3 id="sheet-days" className="mb-2 text-sm font-semibold">
          Próximos 14 días en la cima
        </h3>
        <div className="overflow-x-auto pb-1">
          <ol className="grid min-w-[980px] grid-cols-[repeat(14,minmax(0,1fr))] gap-1.5">
            {days.map((d, i) => {
              const r = rated[i]?.rating;
              const b = baseDays[i];
              const empty = d.hoursWithData === 0;
              return (
                <li
                  key={d.date}
                  aria-label={`${d.date}: ${describeWeatherCode(d.weatherCode)}, ${formatCm(d.snowCm)} centímetros de nieve`}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center ${
                    i === 0 ? 'border-ice/40 bg-ice/[0.08]' : 'border-white/[0.07] bg-white/[0.03]'
                  } ${empty ? 'opacity-50' : ''}`}
                >
                  <span className="text-[11px] font-semibold">
                    {i === 0 ? 'Hoy' : dayLabel(d.date)}
                  </span>
                  <span className="text-[10px] text-muted">{Number(d.date.slice(8))}</span>
                  <span title={describeWeatherCode(d.weatherCode)}>
                    <WeatherIcon code={d.weatherCode} className="size-5" />
                  </span>
                  <div className="flex h-12 w-full items-end justify-center" aria-hidden="true">
                    <div
                      className="w-4 rounded-t bg-gradient-to-b from-ice to-[#4c5bd4]/40"
                      style={{
                        height: `${Math.max(d.snowCm > 0 ? 8 : 2, (d.snowCm / maxDaySnow) * 100)}%`,
                        opacity: d.snowCm > 0 ? 1 : 0.3,
                      }}
                    />
                  </div>
                  <span className="text-[13px] font-semibold tabular-nums">
                    {formatCm(d.snowCm)}
                    <span className="text-[10px] font-normal text-muted"> cm</span>
                  </span>
                  <span className="text-[10px] text-muted tabular-nums" title="Nieve en la base">
                    base {b ? formatCm(b.snowCm) : '—'}
                  </span>
                  <span className="text-[11px] tabular-nums" title="Temperatura máxima y mínima">
                    {finite(d.tMaxC) ? Math.round(d.tMaxC) : '—'}°{' '}
                    <span className="text-muted">
                      {finite(d.tMinC) ? Math.round(d.tMinC) : '—'}°
                    </span>
                  </span>
                  <span className="text-[10px] text-muted tabular-nums" title="Racha máxima">
                    {finite(d.maxGustKmh) ? `${Math.round(d.maxGustKmh)} km/h` : '—'}
                  </span>
                  <span
                    title={r?.reasons.join(' · ') ?? 'Sin datos'}
                    className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 tabular-nums ${
                      r?.rating
                        ? RATING_STYLE[r.rating]
                        : 'bg-white/[0.06] text-muted ring-white/10'
                    }`}
                  >
                    {r?.score ?? '—'}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-muted">
          Cada día: cielo, nieve en la cima y en la base, temperatura máxima y mínima, racha máxima
          y nota de 0 a 100 para {discipline === 'ski' ? 'esquí' : 'snowboard'} (estimación propia).{' '}
          {provider.attribution}
          {age > 0 && ` · datos ${formatAge(age)}`}.
        </p>
      </section>
    </div>
  );
}

/** Ficha completa de una estación: ahora, hora a hora, 14 días y accesos a webcams y pistas. */
export function StationSheet() {
  const stationId = useAppStore((s) => s.detailStationId);
  const close = useAppStore((s) => s.closeStation);
  const setView = useAppStore((s) => s.setView);
  const setWebcamStation = useAppStore((s) => s.setWebcamStation);
  const ids = useFavorites((s) => s.ids);
  const toggle = useFavorites((s) => s.toggle);
  const makeMain = useFavorites((s) => s.makeMain);
  const [pisteOpen, setPisteOpen] = useState(false);
  const station = stationId ? getStation(stationId) : undefined;
  if (!station) return null;

  const favorite = ids.includes(station.id);
  const isMain = ids[0] === station.id;
  const hasWebcams = getWebcams(station.id).length > 0;
  const action =
    'inline-flex items-center gap-1.5 rounded-xl bg-white/[0.08] px-3 py-1.5 text-xs transition-colors hover:bg-white/[0.14]';

  return (
    <>
      <Modal
        key={station.id}
        label={`Ficha de ${station.name}`}
        onClose={close}
        suspended={pisteOpen}
        className="glass flex max-h-full w-[min(1180px,100%)] flex-col gap-4 overflow-hidden !bg-[#0c1238]/95 p-5"
      >
        <header className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="flex flex-wrap items-center gap-2.5 font-display text-3xl leading-tight font-semibold">
              {station.name}
              {isMain && (
                <span className="rounded-full bg-ice/[0.14] px-2 py-0.5 font-body text-[11px] font-medium text-ice">
                  Principal
                </span>
              )}
            </h2>
            <p className="text-xs text-muted">
              {station.region} · base {metres(station.baseElevationM)} · cima{' '}
              {metres(station.topElevationM)} · desnivel{' '}
              {metres(station.topElevationM - station.baseElevationM)}
              {!station.elevationsVerified && ' · cotas por verificar'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {favorite && !isMain && (
              <button type="button" onClick={() => makeMain(station.id)} className={action}>
                <Crown className="size-3.5" aria-hidden="true" /> Hacer principal
              </button>
            )}
            <button
              type="button"
              onClick={() => toggle(station.id)}
              aria-pressed={favorite}
              className={action}
            >
              <Star
                className={`size-3.5 ${favorite ? 'fill-ice text-ice' : ''}`}
                aria-hidden="true"
              />
              {favorite ? 'En favoritas' : 'Añadir a favoritas'}
            </button>
            {hasWebcams && (
              <button
                type="button"
                onClick={() => {
                  setWebcamStation(station.id);
                  setView('webcams');
                }}
                className={action}
              >
                <Video className="size-3.5" aria-hidden="true" /> Webcams
              </button>
            )}
            {hasPisteMap(station.id) && (
              <button type="button" onClick={() => setPisteOpen(true)} className={action}>
                <MapIcon className="size-3.5" aria-hidden="true" /> Mapa de pistas 3D
              </button>
            )}
            <button
              type="button"
              data-autofocus
              onClick={close}
              aria-label="Cerrar la ficha"
              className="grid size-8 place-items-center rounded-xl bg-white/[0.08] transition-colors hover:bg-white/[0.16]"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <SheetBody station={station} />
        </div>
      </Modal>
      {pisteOpen && (
        <Suspense fallback={null}>
          <PisteMapDialog station={station} onClose={() => setPisteOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
