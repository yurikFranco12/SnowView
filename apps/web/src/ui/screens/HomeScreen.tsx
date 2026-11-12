import { Plus, Star } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { PeriodSelector } from '../components/PeriodSelector';
import { SnowBars } from '../components/SnowBars';
import { Sparkline } from '../components/Sparkline';
import {
  MOCK_RULES,
  MOCK_STATIONS,
  MOCK_TODAY,
  totalSnow,
  type MockRule,
  type MockStation,
} from '../mock/stations';
import { revealItem } from '../motion/reveal';
import { useAppStore } from '../state/appStore';

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function MainStationCard({ station }: { station: MockStation }) {
  const period = useAppStore((s) => s.period);
  const total = totalSnow(station, period);

  return (
    <motion.article
      variants={revealItem}
      aria-labelledby="main-station-name"
      className="glass relative flex min-h-0 flex-col overflow-hidden px-[26px] py-6"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-[0.14em] text-muted uppercase">Estación principal</p>
        <span className="rounded-full bg-ice/[0.14] px-2.5 py-1 text-xs text-ice">
          {station.condition}
        </span>
      </div>
      <h2 id="main-station-name" className="mt-1.5 font-display text-[30px] font-semibold">
        {station.name}
      </h2>
      <p className="mt-1 flex items-baseline gap-2.5" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={total}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="bg-gradient-to-b from-white from-20% to-ice bg-clip-text font-display text-[104px] leading-none font-bold text-transparent"
          >
            {total}
          </motion.span>
        </AnimatePresence>
        <span className="font-display text-[32px] text-muted">cm</span>
        <span className="ml-2 text-sm text-muted">previstos en {period} días</span>
      </p>
      <ul className="mt-1.5 flex gap-2.5 text-[13px]" aria-label="Condiciones actuales">
        <li className="rounded-xl bg-white/[0.06] px-3 py-1.5">{station.temperatureC} °C</li>
        <li className="rounded-xl bg-white/[0.06] px-3 py-1.5">{station.windKmh} km/h viento</li>
        <li className="rounded-xl bg-white/[0.06] px-3 py-1.5">
          Base {station.baseElevationM.toLocaleString('es-ES')} m
        </li>
      </ul>
      <SnowBars values={station.dailySnowCm.slice(0, period)} />
    </motion.article>
  );
}

const STATUS_LABEL: Record<MockRule['status'], string> = {
  cumplida: 'Cumplida',
  'en-curso': 'En curso',
  pendiente: 'Pendiente',
};

function RulesPanel() {
  return (
    <motion.aside
      variants={revealItem}
      aria-labelledby="rules-title"
      className="glass flex flex-col gap-4 p-[22px]"
    >
      <div className="flex items-center justify-between">
        <h2 id="rules-title" className="font-display text-xl font-semibold">
          Reglas activas
        </h2>
        <button
          type="button"
          aria-label="Nueva regla"
          title="Nueva regla (Fase 1c)"
          className="grid size-[34px] place-items-center rounded-[10px] bg-ice/[0.14] text-ice transition-colors hover:bg-ice/25"
        >
          <Plus className="size-4" aria-hidden="true" strokeWidth={1.8} />
        </button>
      </div>
      <ul className="flex flex-col gap-4">
        {MOCK_RULES.map((rule) => (
          <li key={rule.id} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">{rule.label}</span>
              <span className={`text-xs ${rule.status === 'cumplida' ? 'text-ice' : 'text-muted'}`}>
                {STATUS_LABEL[rule.status]}
              </span>
            </div>
            <p className="text-xs text-muted">{rule.stationName}</p>
            <div
              role="progressbar"
              aria-label={`Progreso de la regla ${rule.label}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(rule.progress * 100)}
              className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]"
            >
              {/* scaleX en lugar de width: se anima en la GPU sin recalcular el layout cada frame. */}
              <motion.div
                className="h-full origin-left rounded-full bg-gradient-to-r from-ice to-indigo"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: rule.progress }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              />
            </div>
          </li>
        ))}
      </ul>
    </motion.aside>
  );
}

const SPARK_COLORS = ['#7DE3FF', '#A5B4FF', '#9FB3D9'] as const;

function FavoriteCard({ station, index }: { station: MockStation; index: number }) {
  const period = useAppStore((s) => s.period);
  const total = totalSnow(station, period);
  const color = SPARK_COLORS[index % SPARK_COLORS.length] ?? '#7DE3FF';

  return (
    <li className="flex">
      <motion.button
        variants={revealItem}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.985 }}
        type="button"
        aria-label={`${station.name}, ${total} cm en ${period} días`}
        className="relative flex flex-1 flex-col gap-1.5 rounded-[18px] border border-white/10 bg-white/[0.05] px-5 py-[18px] text-left backdrop-blur-[14px] transition-colors hover:border-white/20 hover:bg-white/[0.08]"
      >
        <Star
          className={`absolute top-4 right-4 size-4 ${station.favorite ? 'fill-ice text-ice' : 'text-muted'}`}
          aria-hidden="true"
          strokeWidth={1.6}
        />
        <span className="text-[15px] font-semibold">{station.name}</span>
        <span className="text-xs text-muted">{station.region}</span>
        <span className="mt-1.5 font-display text-[40px] font-bold">
          {total}
          <span className="text-base font-medium text-muted"> cm / {period} días</span>
        </span>
        <Sparkline values={station.dailySnowCm.slice(0, period)} color={color} />
      </motion.button>
    </li>
  );
}

export function HomeScreen() {
  const [main, ...rest] = MOCK_STATIONS;
  const favorites = rest.filter((s) => s.favorite).concat(rest.filter((s) => !s.favorite));
  if (!main) return null;

  return (
    <div className="flex h-full flex-col gap-5 px-8 py-[26px]">
      <motion.header variants={revealItem} className="flex items-end justify-between">
        <div>
          <p className="text-xs tracking-[0.14em] text-muted uppercase">
            {dateFormatter.format(MOCK_TODAY)} · Datos de ejemplo
          </p>
          <h1 className="mt-1.5 font-display text-4xl font-semibold tracking-tight">
            Mis estaciones
          </h1>
        </div>
        <PeriodSelector />
      </motion.header>

      <section className="grid h-[380px] shrink-0 grid-cols-[1.6fr_1fr] gap-5">
        <MainStationCard station={main} />
        <RulesPanel />
      </section>

      <section aria-labelledby="favorites-title" className="flex min-h-0 flex-1 flex-col gap-3">
        <motion.h2
          variants={revealItem}
          id="favorites-title"
          className="font-display text-xl font-semibold"
        >
          Favoritas
        </motion.h2>
        <ul className="grid flex-1 grid-cols-3 gap-4">
          {favorites.slice(0, 3).map((station, i) => (
            <FavoriteCard key={station.id} station={station} index={i} />
          ))}
        </ul>
      </section>
    </div>
  );
}
