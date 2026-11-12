import {
  evaluateRule,
  pickNewAlerts,
  type AlertRule,
  type RuleEvaluation,
  type StationForecast,
} from '@snowview/core';
import { getStation } from '@snowview/data';
import { useQueries } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { showNotification } from '../../platform/notifications';
import { useNow } from '../hooks/useNow';
import { useRules } from '../state/rulesStore';
import { provider } from './forecast';
import { alertBody, alertTitle } from './ruleText';

export interface RuleResult {
  rule: AlertRule;
  /** Evaluación; undefined mientras carga o si falló la previsión. */
  evaluation: RuleEvaluation | undefined;
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
        return provider.getForecast(station, { signal });
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
 */
export function useRuleMonitor(): void {
  const results = useRuleResults();
  const notified = useRules((s) => s.notified);
  const loaded = useRules((s) => s.loaded);
  const recordNotified = useRules((s) => s.recordNotified);

  useEffect(() => {
    if (!loaded) return;
    const evaluations = results.flatMap((r) => (r.evaluation ? [r.evaluation] : []));
    const fresh = pickNewAlerts(evaluations, notified);
    if (fresh.length === 0) return;
    let cancelled = false;
    void (async () => {
      const sent: RuleEvaluation[] = [];
      for (const e of fresh) {
        const name = getStation(e.rule.stationId)?.name ?? e.rule.stationId;
        if (await showNotification(alertTitle(name), alertBody(e), e.eventKey ?? undefined)) {
          sent.push(e);
        }
      }
      if (!cancelled && sent.length > 0) recordNotified(sent, Date.now());
    })();
    return () => {
      cancelled = true;
    };
  }, [results, notified, loaded, recordNotified]);
}
