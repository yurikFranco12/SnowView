import { isValidLatLng, type LatLng } from '@snowview/core';
import { create } from 'zustand';
import { storage } from '../../platform/storage';

const KEY = 'manualLocation';

interface ManualLocationState {
  /** Ubicación fijada a mano. Si existe, manda sobre la del equipo. */
  manual: LatLng | undefined;
  loaded: boolean;
  load: () => Promise<void>;
  set: (point: LatLng) => void;
  clear: () => void;
}

/** Recupera lo guardado descartando lo que no sean coordenadas válidas. */
export function parseManualLocation(raw: unknown): LatLng | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r['latitude'] !== 'number' || typeof r['longitude'] !== 'number') return undefined;
  const point = { latitude: r['latitude'], longitude: r['longitude'] };
  return isValidLatLng(point) ? point : undefined;
}

/**
 * Ubicación que el usuario fija a mano, por si la del equipo no es buena: Windows la calcula por
 * Wi-Fi o por la dirección IP y puede errar varios kilómetros. Se guarda en el equipo.
 */
export const useManualLocation = create<ManualLocationState>((set) => ({
  manual: undefined,
  loaded: false,
  async load() {
    set({ manual: parseManualLocation(await storage.get<unknown>(KEY)), loaded: true });
  },
  set(point) {
    if (!isValidLatLng(point)) return;
    const clean = {
      latitude: Math.round(point.latitude * 1e5) / 1e5,
      longitude: Math.round(point.longitude * 1e5) / 1e5,
    };
    set({ manual: clean });
    void storage.set(KEY, clean);
  },
  clear() {
    set({ manual: undefined });
    void storage.set(KEY, null);
  },
}));
