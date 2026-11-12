import { MAX_WINDOW_HOURS, validateRule, type AlertRule } from '@snowview/core';
import { searchStations } from '@snowview/data';
import { Bell, BellOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import {
  getNotificationAccess,
  requestNotificationAccess,
  type NotificationAccess,
} from '../../platform/notifications';
import { RuleItem } from '../components/RuleItem';
import { useRuleResults } from '../data/rules';
import { describeRule } from '../data/ruleText';
import { revealItem } from '../motion/reveal';
import { useFavorites } from '../state/favoritesStore';
import { useRules } from '../state/rulesStore';

const STATIONS = searchStations('');
const WINDOWS = [
  { hours: 24, label: '24 horas' },
  { hours: 48, label: '48 horas' },
  { hours: 72, label: '3 días' },
  { hours: 168, label: '7 días' },
  { hours: MAX_WINDOW_HOURS, label: '14 días' },
] as const;

interface FormValues {
  stationId: string;
  thresholdCm: string;
  windowHours: number;
  elevation: 'top' | 'base';
  maxWindKmh: string;
  maxTemperatureC: string;
}

function toForm(rule: AlertRule | undefined, defaultStation: string): FormValues {
  return {
    stationId: rule?.stationId ?? defaultStation,
    thresholdCm: String(rule?.thresholdCm ?? 15),
    windowHours: rule?.windowHours ?? 48,
    elevation: rule?.elevation ?? 'top',
    maxWindKmh: rule?.maxWindKmh === undefined ? '' : String(rule.maxWindKmh),
    maxTemperatureC: rule?.maxTemperatureC === undefined ? '' : String(rule.maxTemperatureC),
  };
}

const parseNum = (s: string) => Number(s.replace(',', '.'));

function toRule(v: FormValues, base: Pick<AlertRule, 'id' | 'enabled'> | undefined) {
  const rule: Omit<AlertRule, 'id'> = {
    stationId: v.stationId,
    thresholdCm: parseNum(v.thresholdCm),
    windowHours: v.windowHours,
    elevation: v.elevation,
    enabled: base?.enabled ?? true,
  };
  if (v.maxWindKmh.trim() !== '') rule.maxWindKmh = parseNum(v.maxWindKmh);
  if (v.maxTemperatureC.trim() !== '') rule.maxTemperatureC = parseNum(v.maxTemperatureC);
  return rule;
}

const fieldClass =
  'w-full rounded-[12px] border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-text placeholder:text-muted focus:border-ice/50 focus:outline-none';

function RuleForm({ rule, onClose }: { rule: AlertRule | undefined; onClose: () => void }) {
  const add = useRules((s) => s.add);
  const update = useRules((s) => s.update);
  const favorites = useFavorites((s) => s.ids);
  const uid = useId();
  const [values, setValues] = useState(() => toForm(rule, favorites[0] ?? STATIONS[0]?.id ?? ''));
  const [errors, setErrors] = useState<string[]>([]);
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = toRule(values, rule);
    const problems = validateRule({ ...next, id: rule?.id ?? 'nueva' });
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    if (rule) update({ ...next, id: rule.id });
    else add(next);
    onClose();
  }

  return (
    <form
      onSubmit={submit}
      aria-label={rule ? 'Editar regla' : 'Nueva regla'}
      className="grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5"
    >
      <div className="col-span-2">
        <label htmlFor={`${uid}-station`} className="mb-1 block text-xs text-muted">
          Estación
        </label>
        <select
          id={`${uid}-station`}
          value={values.stationId}
          onChange={(e) => set('stationId', e.target.value)}
          className={fieldClass}
        >
          {STATIONS.map((s) => (
            <option key={s.id} value={s.id} className="bg-bg-start">
              {s.name} · {s.region}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${uid}-cm`} className="mb-1 block text-xs text-muted">
          Más de (cm de nieve)
        </label>
        <input
          id={`${uid}-cm`}
          inputMode="decimal"
          value={values.thresholdCm}
          onChange={(e) => set('thresholdCm', e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor={`${uid}-window`} className="mb-1 block text-xs text-muted">
          En las próximas
        </label>
        <select
          id={`${uid}-window`}
          value={values.windowHours}
          onChange={(e) => set('windowHours', Number(e.target.value))}
          className={fieldClass}
        >
          {WINDOWS.map((w) => (
            <option key={w.hours} value={w.hours} className="bg-bg-start">
              {w.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${uid}-elev`} className="mb-1 block text-xs text-muted">
          Cota
        </label>
        <select
          id={`${uid}-elev`}
          value={values.elevation}
          onChange={(e) => set('elevation', e.target.value === 'base' ? 'base' : 'top')}
          className={fieldClass}
        >
          <option value="top" className="bg-bg-start">
            Cima
          </option>
          <option value="base" className="bg-bg-start">
            Base
          </option>
        </select>
      </div>
      <div />
      <div>
        <label htmlFor={`${uid}-wind`} className="mb-1 block text-xs text-muted">
          Viento máximo (km/h, opcional)
        </label>
        <input
          id={`${uid}-wind`}
          inputMode="decimal"
          value={values.maxWindKmh}
          onChange={(e) => set('maxWindKmh', e.target.value)}
          placeholder="Sin límite"
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor={`${uid}-temp`} className="mb-1 block text-xs text-muted">
          Temperatura máxima (°C, opcional)
        </label>
        <input
          id={`${uid}-temp`}
          inputMode="decimal"
          value={values.maxTemperatureC}
          onChange={(e) => set('maxTemperatureC', e.target.value)}
          placeholder="Sin límite"
          className={fieldClass}
        />
      </div>
      {errors.length > 0 && (
        <ul role="alert" className="col-span-2 text-sm text-[#FFB4A8]">
          {errors.map((er) => (
            <li key={er}>{er}</li>
          ))}
        </ul>
      )}
      <div className="col-span-2 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-4 py-2 text-sm text-muted transition-colors hover:bg-white/[0.08] hover:text-text"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-br from-ice to-indigo px-4 py-2 text-sm font-semibold text-bg-start"
        >
          {rule ? 'Guardar cambios' : 'Crear regla'}
        </button>
      </div>
    </form>
  );
}

function NotificationBanner() {
  const [access, setAccess] = useState<NotificationAccess>('granted');
  useEffect(() => {
    void getNotificationAccess().then(setAccess);
  }, []);
  if (access === 'granted') return null;
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm"
    >
      <p className="flex items-center gap-2.5">
        <BellOff className="size-4 shrink-0 text-muted" aria-hidden="true" />
        {access === 'denied'
          ? 'Las notificaciones están bloqueadas: las reglas se evalúan, pero no recibirás avisos.'
          : access === 'unsupported'
            ? 'Este entorno no admite notificaciones.'
            : 'Activa las notificaciones para recibir un aviso de Windows cuando se cumpla una regla.'}
      </p>
      {access === 'default' && (
        <button
          type="button"
          onClick={() => void requestNotificationAccess().then(setAccess)}
          className="shrink-0 rounded-xl bg-ice/[0.14] px-3.5 py-2 text-ice transition-colors hover:bg-ice/25"
        >
          Activar
        </button>
      )}
    </div>
  );
}

export function AlertsScreen() {
  const results = useRuleResults();
  const loaded = useRules((s) => s.loaded);
  const toggle = useRules((s) => s.toggle);
  const remove = useRules((s) => s.remove);
  const [editing, setEditing] = useState<AlertRule | 'new' | null>(null);

  return (
    <div className="flex h-full flex-col gap-5 px-8 py-[26px]">
      <motion.header variants={revealItem} className="flex items-end justify-between gap-6">
        <div>
          <p className="text-xs tracking-[0.14em] text-muted uppercase">
            {results.length} {results.length === 1 ? 'regla' : 'reglas'}
          </p>
          <h1 className="mt-1.5 font-display text-4xl font-semibold tracking-tight">Alertas</h1>
        </div>
        {editing === null && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-ice to-indigo px-4 py-2.5 text-sm font-semibold text-bg-start"
          >
            <Plus className="size-4" aria-hidden="true" strokeWidth={2} />
            Nueva regla
          </button>
        )}
      </motion.header>

      <motion.div variants={revealItem}>
        <NotificationBanner />
      </motion.div>

      <motion.section
        variants={revealItem}
        aria-label="Reglas"
        className="glass flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5"
      >
        {editing !== null && (
          <RuleForm
            key={editing === 'new' ? 'new' : editing.id}
            rule={editing === 'new' ? undefined : editing}
            onClose={() => setEditing(null)}
          />
        )}
        {loaded && results.length === 0 && editing === null && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="grid size-16 place-items-center rounded-2xl bg-ice/[0.12]">
              <Bell className="size-8 text-ice" aria-hidden="true" strokeWidth={1.6} />
            </div>
            <p className="max-w-md text-base">
              Crea una regla como «más de 15 cm en 48 h» y recibirás un aviso cuando se cumpla.
            </p>
          </div>
        )}
        <ul className="flex flex-col gap-3">
          {results.map((r) => (
            <li
              key={r.rule.id}
              className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <RuleItem result={r} />
              </div>
              <label className="flex shrink-0 items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={r.rule.enabled}
                  onChange={() => toggle(r.rule.id)}
                  className="size-4 accent-[#7DE3FF]"
                />
                Activa
              </label>
              <button
                type="button"
                onClick={() => setEditing(r.rule)}
                aria-label={`Editar regla ${describeRule(r.rule)}`}
                className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-white/[0.08] hover:text-text"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => remove(r.rule.id)}
                aria-label={`Eliminar regla ${describeRule(r.rule)}`}
                className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-white/[0.08] hover:text-text"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </motion.section>
    </div>
  );
}
