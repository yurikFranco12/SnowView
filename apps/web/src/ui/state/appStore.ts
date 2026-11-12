import { create } from 'zustand';

export type View =
  'inicio' | 'estaciones' | 'comparar' | 'calendario' | 'historial' | 'alertas' | 'ajustes';
export type Period = 3 | 7 | 14;
export const PERIODS: readonly Period[] = [3, 7, 14];

interface AppState {
  view: View;
  period: Period;
  setView: (view: View) => void;
  setPeriod: (period: Period) => void;
}

/** Estado local de la interfaz (Zustand). Los datos remotos van en TanStack Query. */
export const useAppStore = create<AppState>((set) => ({
  view: 'inicio',
  period: 7,
  setView: (view) => set({ view }),
  setPeriod: (period) => set({ period }),
}));
