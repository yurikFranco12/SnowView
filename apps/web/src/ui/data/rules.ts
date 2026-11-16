import {
  evaluateRule,
  notificationId,
  pickNewAlerts,
  planUpcomingAlert,
  type AlertRule,
  type RuleEvaluation,
  type StationForecast,
} from '@snowview/core';
import { getStation } from '@snowview/data';
import { useQueries } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import {
  canScheduleNotifications,
  cancelScheduledNotifications,
  scheduleNotification,
  showNotification,
} from '../../platform/notifications';
import { useNow } from '../hooks/useNow';
import { useRules, type ScheduledAlert } from '../state/rulesStore';
import { fetchStationForecast } from './forecast';
import { alertBody, alertTitle, scheduledAlertBody } from './ruleText';

export interface RuleResult {
  rule: AlertRule;
  /** Evaluación; undefined mientras carga o si falló la previsión. */
  evaluation: RuleEvaluation | undefined;
  /** Previsión de la estación de la regla, si ya se tiene. */
  forecast: StationForecast | undefined;
  loading: boolean;
  error: unknown;
}

/**
 * Evalúa todas las reglas con la previsión de sus estaciones. Comparte caché con
 * `useStationForecast` (misma clave), así que no repite peticiones.
 */
export function useRuleResults(): RuleResult[] {
  const rules = useRules((s) => s.rules);
  const now = useNow();
  const stationIds = useMemo(
    () => [...new Set(rules.map((r) => r.stationId))].filter((id) => getStation(id) !== undefined),
    [rules],
  );
  const queries = useQueries({
    queries: stationIds.map((id) => ({
      queryKey: ['forecast', id],
      queryFn: ({ signal }: { signal: AbortSignal }) => {
        const station = getStation(id);
        if (!station) throw new Error('Estación desconocida');
        return fetchStationForecast(station, signal);
      },
    })),
  });

  // Se reduce a un valor estable por estación para que el useMemo no se repita en cada render.
  const forecasts = queries.map((q) => q.data);
  const states = queries.map((q) => `${q.dataUpdatedAt}|${q.status}`).join(',');

  return useMemo(() => {
    const byStation = new Map<
      string,
      { data: StationForecast | undefined; loading: boolean; error: unknown }
    >();
    stationIds.forEach((id, i) => {
      const q = queries[i];
      byStation.set(id, { data: forecasts[i], loading: q?.isPending ?? true, error: q?.error });
    });
    return rules.map((rule) => {
      const entry = byStation.get(rule.stationId);
      return {
        rule,
        evaluation: entry?.data ? evaluateRule(rule, entry.data, now) : undefined,
        forecast: entry?.data,
        loading: entry?.loading ?? false,
        error: entry?.error ?? null,
      };
    });
    // `states` resume los cambios de `queries`/`forecasts`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules, stationIds, states, now]);
}

/**
 * Vigila las reglas mientras la app está abierta (también en la bandeja) y lanza una notificación
 * por cada evento nuevo. El registro de avisos evita repetirlos entre consultas y reinicios.
 * En Android, además, deja programados en el sistema los avisos que la previsión ya anuncia.
 */
export function useRuleMonitor(): void {
  const results = useRuleResults();
  const now = useNow();
  const notified = useRules((s) => s.notified);
  const scheduled = useRules((s) => s.scheduled);
  const loaded = useRules((s) => s.loaded);
  const recordNotified = useRules((s) => s.recordNotified);
  const settleScheduled = useRules((s) => s.settleScheduled);
  const setScheduled = useRules((s) => s.setScheduled);
  // Evita que dos pasadas reprogramen a la vez (cancelar y programar son asíncronos).
  const scheduling = useRef(false);

  // Los avisos programados cuya hora ya pasó los mostró el sistema: se anotan antes de evaluar, para
  // que el aviso inmediato no los repita. Al anotarlos cambia `notified` y se vuelve a evaluar.
  const hasDue = scheduled.some((s) => s.atMs <= now);
  useEffect(() => {
    if (loaded && hasDue) settleScheduled(now);
  }, [loaded, hasDue, now, settleScheduled]);

  useEffect(() => {
    if (!loaded || hasDue) return;
    const evaluations = results.flatMap((r) => (r.evaluation ? [r.evaluation] : []));
    const fresh = pickNewAlerts(evaluations, notified);
    if (fresh.length === 0) return;
    let cancelled = false;
    void (async () => {
      const sent: RuleEvaluation[] = [];
      for (const e of fresh) {
        if (e.eventKey === null) continue;
        const name = getStation(e.rule.stationId)?.name ?? e.rule.stationId;
        const shown = await showNotification({
          title: alertTitle(name),
          body: alertBody(e),
          id: notificationId(e.eventKey),
          tag: e.eventKey,
        });
        if (shown) sent.push(e);
      }
      if (!cancelled && sent.length > 0) recordNotified(sent, Date.now());
    })();
    return () => {
      cancelled = true;
    };
  }, [results, notified, loaded, hasDue, recordNotified]);

  // Android: la app no vigila en segundo plano, así que los avisos que la previsión ya anuncia para
  // los próximos días se dejan programados en el sistema y llegan con la app cerrada. Cada vez que
  // cambia la previsión o las reglas se rehace el plan.
  useEffect(() => {
    if (!canScheduleNotifications || !loaded || hasDue || scheduling.current) return;
    const plan = results.flatMap((r) => {
      if (!r.forecast) return [];
      const planned = planUpcomingAlert(r.rule, r.forecast, now, notified);
      if (!planned || planned.evaluation.eventKey === null) return [];
      const name = getStation(r.rule.stationId)?.name ?? r.rule.stationId;
      return [
        {
          eventKey: planned.evaluation.eventKey,
          atMs: planned.atMs,
          id: notificationId(planned.evaluation.eventKey),
          title: alertTitle(name),
          body: scheduledAlertBody(planned.evaluation, r.forecast.fetchedAt),
        },
      ];
    });
    // Mientras alguna previsión sigue cargando no se toca lo programado: se cancelarían avisos
    // válidos solo por no tener aún los datos.
    if (results.some((r) => r.loading)) return;
    const signature = (list: readonly { eventKey: string; atMs: number }[]) =>
      list
        .map((s) => `${s.eventKey}@${s.atMs}`)
        .sort()
        .join(',');
    if (signature(plan) === signature(scheduled)) return;

    scheduling.current = true;
    void (async () => {
      try {
        await cancelScheduledNotifications(scheduled.map((s) => s.id));
        const done: ScheduledAlert[] = [];
        for (const p of plan) {
          if (await scheduleNotification(p)) {
            done.push({ eventKey: p.eventKey, atMs: p.atMs, id: p.id });
          }
        }
        // Sin permiso no se programa nada; si lo guardado ya está vacío, no se reescribe.
        if (done.length > 0 || scheduled.length > 0) setScheduled(done);
      } finally {
        scheduling.current = false;
      }
    })();
  }, [results, notified, scheduled, loaded, hasDue, now, setScheduled]);
}
