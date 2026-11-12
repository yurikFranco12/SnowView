import type { AlertRule, RuleEvaluation } from '@snowview/core';

function windowLabel(hours: number): string {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return days === 1 ? '24 h' : `${hours} h`;
  }
  return `${hours} h`;
}

const num = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });

/** "Más de 15 cm en 48 h", con las condiciones opcionales detrás. */
export function describeRule(rule: AlertRule): string {
  const parts = [`Más de ${num(rule.thresholdCm)} cm en ${windowLabel(rule.windowHours)}`];
  if (rule.maxWindKmh !== undefined) parts.push(`viento máx. ${num(rule.maxWindKmh)} km/h`);
  if (rule.maxTemperatureC !== undefined)
    parts.push(`temperatura máx. ${num(rule.maxTemperatureC)} °C`);
  return parts.join(' · ');
}

export function alertTitle(stationName: string): string {
  return `Nieve en ${stationName}`;
}

/** Texto de la notificación: lo previsto frente al umbral de la regla. */
export function alertBody(evaluation: RuleEvaluation): string {
  const { rule, totalCm } = evaluation;
  const cota = rule.elevation === 'base' ? 'en la base' : 'en la cima';
  return `Se prevén ${num(totalCm)} cm ${cota} en las próximas ${windowLabel(rule.windowHours)}. Tu regla pedía más de ${num(rule.thresholdCm)} cm.`;
}
