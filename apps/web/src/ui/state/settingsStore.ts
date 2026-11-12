import type { Discipline } from '@snowview/core';
import { create } from 'zustand';
import { storage } from '../../platform/storage';

const KEY = 'settings';

/** Cada cuánto se consulta la previsión, en minutos. */
export const REFRESH_OPTIONS = [
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hora' },
  { minutes: 180, label: '3 horas' },
] as const;

export type SnowLevel = 'off' | 'low' | 'normal' | 'high';

/** Densidad de la nevada de fondo (1 = la de la maqueta). */
export const SNOW_LEVELS: readonly { level: SnowLevel; label: string; intensity: number }[] = [
  { level: 'off', label: 'Sin nieve', intensity: 0 },
  { level: 'low', label: 'Suave', intensity: 0.5 },
  { level: 'normal', label: 'Normal', intensity: 1 },
  { level: 'high', label: 'Intensa', intensity: 1.8 },
];

export interface Settings {
  refreshMinutes: number;
  snowLevel: SnowLevel;
  /** Con qué disciplina se valoran las condiciones: esquí o snowboard. */
  discipline: Discipline;
}

export const DEFAULT_SETTINGS: Settings = {
  refreshMinutes: 60,
  snowLevel: 'normal',
  discipline: 'ski',
};

/** Recupera los ajustes guardados descartando valores que ya no existen. */
export function parseSettings(raw: unknown): Settings {
  const r = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const refresh = REFRESH_OPTIONS.find((o) => o.minutes === r['refreshMinutes']);
  const snow = SNOW_LEVELS.find((l) => l.level === r['snowLevel']);
  return {
    refreshMinutes: refresh?.minutes ?? DEFAULT_SETTINGS.refreshMinutes,
    snowLevel: snow?.level ?? DEFAULT_SETTINGS.snowLevel,
    discipline:
      r['discipline'] === 'snowboard' || r['discipline'] === 'ski'
        ? r['discipline']
        : DEFAULT_SETTINGS.discipline,
  };
}

export function snowIntensity(level: SnowLevel): number {
  return SNOW_LEVELS.find((l) => l.level === level)?.intensity ?? 1;
}

interface SettingsState extends Settings {
  loaded: boolean;
  load: () => Promise<void>;
  setRefreshMinutes: (minutes: number) => void;
  setSnowLevel: (level: SnowLevel) => void;
  setDiscipline: (discipline: Discipline) => void;
}

export const useSettings = create<SettingsState>((set, get) => {
  const save = () => {
    const { refreshMinutes, snowLevel, discipline } = get();
    void storage.set(KEY, { refreshMinutes, snowLevel, discipline });
  };
  return {
    ...DEFAULT_SETTINGS,
    loaded: false,
    async load() {
      set({ ...parseSettings(await storage.get<unknown>(KEY)), loaded: true });
    },
    setRefreshMinutes(refreshMinutes) {
      set({ refreshMinutes });
      save();
    },
    setSnowLevel(snowLevel) {
      set({ snowLevel });
      save();
    },
    setDiscipline(discipline) {
      set({ discipline });
      save();
    },
  };
});
