import { create } from 'zustand';

export type View =
  | 'inicio'
  | 'estaciones'
  | 'mapa'
  | 'comparar'
  | 'calendario'
  | 'webcams'
  | 'historial'
  | 'alertas'
  | 'ajustes';
export type Period = 3 | 7 | 14;
export const PERIODS: readonly Period[] = [3, 7, 14];

interface AppState {
  view: View;
  period: Period;
  /** Estación elegida en la pantalla de webcams (undefined = la principal). */
  webcamStationId: string | undefined;
  setWebcamStation: (id: string | undefined) => void;
  /** Estación cuya ficha está abierta (undefined = ninguna). */
  detailStationId: string | undefined;
  openStation: (id: string) => void;
  closeStation: () => void;
  /** Buscador rápido (Ctrl+K). */
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  setView: (view: View) => void;
  setPeriod: (period: Period) => void;
}

/** Estado local de la interfaz (Zustand). Los datos remotos van en TanStack Query. */
export const useAppStore = create<AppState>((set) => ({
  view: 'inicio',
  period: 7,
  webcamStationId: undefined,
  setWebcamStation: (webcamStationId) => set({ webcamStationId }),
  detailStationId: undefined,
  openStation: (detailStationId) => set({ detailStationId, paletteOpen: false }),
  closeStation: () => set({ detailStationId: undefined }),
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setView: (view) => set({ view, detailStationId: undefined, paletteOpen: false }),
  setPeriod: (period) => set({ period }),
}));
