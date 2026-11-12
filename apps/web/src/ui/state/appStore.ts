import { create } from 'zustand';
import type { Period } from '../mock/stations';

export type View = 'inicio' | 'estaciones' | 'alertas' | 'ajustes';

interface AppState {
  view: View;
  period: Period;
  setView: (view: View) => void;
  setPeriod: (period: Period) => void;
}

/** Estado local de la interfaz (Zustand). Los datos remotos irán en TanStack Query (Fase 1b). */
export const useAppStore = create<AppState>((set) => ({
  view: 'inicio',
  period: 7,
  setView: (view) => set({ view }),
  setPeriod: (period) => set({ period }),
}));
