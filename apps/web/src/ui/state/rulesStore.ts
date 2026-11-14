import {
  markKeysNotified,
  markNotified,
  parseRules,
  pruneLog,
  type AlertRule,
  type NotifiedLog,
} from '@snowview/core';
import { create } from 'zustand';
import { storage } from '../../platform/storage';

const RULES_KEY = 'rules';
const LOG_KEY = 'notified';
const SCHEDULED_KEY = 'scheduled';

/** Aviso programado en el sistema (Android) que aún no ha saltado. */
export interface ScheduledAlert {
  /** Evento de nieve que avisa. */
  eventKey: string;
  /** Momento de entrega, en ms UTC. */
  atMs: number;
  /** Identificador de la notificación, para cancelarla. */
  id: number;
}

function parseScheduled(raw: unknown): ScheduledAlert[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const { eventKey, atMs, id } = item as Record<string, unknown>;
    return typeof eventKey === 'string' && typeof atMs === 'number' && typeof id === 'number'
      ? [{ eventKey, atMs, id }]
      : [];
  });
}

interface RulesState {
  rules: AlertRule[];
  /** Avisos ya enviados, para no repetirlos (clave de evento → ms UTC). */
  notified: NotifiedLog;
  /** Avisos que el sistema tiene programados (solo Android). */
  scheduled: ScheduledAlert[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (rule: Omit<AlertRule, 'id'>) => void;
  update: (rule: AlertRule) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  /** Anota los avisos enviados y limpia los antiguos. */
  recordNotified: (alerts: Parameters<typeof markNotified>[1], nowMs: number) => void;
  /** Sustituye la lista de avisos programados. */
  setScheduled: (scheduled: ScheduledAlert[]) => void;
  /**
   * Pasa al registro de avisados los programados cuya hora ya llegó: el sistema los mostró (con la
   * app abierta o cerrada), así que no deben repetirse.
   */
  settleScheduled: (nowMs: number) => void;
}

function newId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
  );
}

function persistRules(rules: AlertRule[]) {
  void storage.set(RULES_KEY, rules);
}

/** Reglas de aviso y registro de avisos enviados, guardados con el almacenamiento de la app. */
export const useRules = create<RulesState>((set, get) => ({
  rules: [],
  notified: {},
  scheduled: [],
  loaded: false,
  async load() {
    const [rules, log, scheduled] = await Promise.all([
      storage.get<unknown>(RULES_KEY),
      storage.get<Record<string, number>>(LOG_KEY),
      storage.get<unknown>(SCHEDULED_KEY),
    ]);
    const notified: NotifiedLog =
      log && typeof log === 'object' && !Array.isArray(log) ? pruneLog(log, Date.now()) : {};
    set({ rules: parseRules(rules), notified, scheduled: parseScheduled(scheduled), loaded: true });
  },
  add(rule) {
    const next = [...get().rules, { ...rule, id: newId() }];
    set({ rules: next });
    persistRules(next);
  },
  update(rule) {
    const next = get().rules.map((r) => (r.id === rule.id ? rule : r));
    set({ rules: next });
    persistRules(next);
  },
  remove(id) {
    const next = get().rules.filter((r) => r.id !== id);
    set({ rules: next });
    persistRules(next);
  },
  toggle(id) {
    const next = get().rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    set({ rules: next });
    persistRules(next);
  },
  recordNotified(alerts, nowMs) {
    const notified = pruneLog(markNotified(get().notified, alerts, nowMs), nowMs);
    set({ notified });
    void storage.set(LOG_KEY, notified);
  },
  setScheduled(scheduled) {
    set({ scheduled });
    void storage.set(SCHEDULED_KEY, scheduled);
  },
  settleScheduled(nowMs) {
    const due = get().scheduled.filter((s) => s.atMs <= nowMs);
    if (due.length === 0) return;
    const scheduled = get().scheduled.filter((s) => s.atMs > nowMs);
    const notified = pruneLog(markKeysNotified(get().notified, due), nowMs);
    set({ notified, scheduled });
    void storage.set(LOG_KEY, notified);
    void storage.set(SCHEDULED_KEY, scheduled);
  },
}));
