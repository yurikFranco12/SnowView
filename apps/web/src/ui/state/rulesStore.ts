import {
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

interface RulesState {
  rules: AlertRule[];
  /** Avisos ya enviados, para no repetirlos (clave de evento → ms UTC). */
  notified: NotifiedLog;
  loaded: boolean;
  load: () => Promise<void>;
  add: (rule: Omit<AlertRule, 'id'>) => void;
  update: (rule: AlertRule) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  /** Anota los avisos enviados y limpia los antiguos. */
  recordNotified: (alerts: Parameters<typeof markNotified>[1], nowMs: number) => void;
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
  loaded: false,
  async load() {
    const [rules, log] = await Promise.all([
      storage.get<unknown>(RULES_KEY),
      storage.get<Record<string, number>>(LOG_KEY),
    ]);
    const notified: NotifiedLog =
      log && typeof log === 'object' && !Array.isArray(log) ? pruneLog(log, Date.now()) : {};
    set({ rules: parseRules(rules), notified, loaded: true });
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
}));
