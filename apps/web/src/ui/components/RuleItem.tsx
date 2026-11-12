import type { RuleStatus } from '@snowview/core';
import { getStation } from '@snowview/data';
import { motion } from 'motion/react';
import type { RuleResult } from '../data/rules';
import { describeRule } from '../data/ruleText';

const STATUS_LABEL: Record<RuleStatus | 'cargando' | 'error' | 'desactivada', string> = {
  cumplida: 'Cumplida',
  'en-curso': 'En curso',
  pendiente: 'Pendiente',
  cargando: 'Cargando…',
  error: 'Sin previsión',
  desactivada: 'Desactivada',
};

export function ruleStatusKey(r: RuleResult): keyof typeof STATUS_LABEL {
  if (!r.rule.enabled) return 'desactivada';
  if (r.evaluation) return r.evaluation.status;
  return r.loading ? 'cargando' : 'error';
}

/** Regla con su estado y barra de avance. Se usa en el inicio y en la pantalla de alertas. */
export function RuleItem({ result }: { result: RuleResult }) {
  const { rule, evaluation } = result;
  const label = describeRule(rule);
  const status = ruleStatusKey(result);
  const progress = rule.enabled ? (evaluation?.progress ?? 0) : 0;
  const station = getStation(rule.stationId)?.name ?? rule.stationId;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between gap-3 text-sm">
        <span className="font-semibold">{label}</span>
        <span className={`shrink-0 text-xs ${status === 'cumplida' ? 'text-ice' : 'text-muted'}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>
      <p className="text-xs text-muted">
        {station} · {rule.elevation === 'base' ? 'base' : 'cima'}
        {evaluation &&
          rule.enabled &&
          ` · previstos ${evaluation.totalCm.toLocaleString('es-ES')} cm`}
        {evaluation && !evaluation.complete && rule.enabled && ' · faltan datos'}
      </p>
      <div
        role="progressbar"
        aria-label={`Progreso de la regla ${label} en ${station}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]"
      >
        {/* scaleX en lugar de width: se anima en la GPU sin recalcular el layout cada frame. */}
        <motion.div
          className="h-full origin-left rounded-full bg-gradient-to-r from-ice to-indigo"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
      </div>
    </div>
  );
}
