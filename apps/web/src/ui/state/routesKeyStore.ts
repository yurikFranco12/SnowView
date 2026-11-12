import { create } from 'zustand';
import { storage } from '../../platform/storage';

const KEY = 'googleMapsKey';

interface RoutesKeyState {
  /** Clave de Google Maps Platform del propio usuario. undefined = sin clave. */
  apiKey: string | undefined;
  loaded: boolean;
  load: () => Promise<void>;
  save: (key: string) => void;
  clear: () => void;
}

/** Una clave de Google es texto sin espacios de 30 a 60 caracteres (letras, números, _ y -). */
export function isPlausibleApiKey(key: string): boolean {
  return /^[A-Za-z0-9_-]{30,60}$/.test(key.trim());
}

/**
 * La clave se guarda solo en el equipo del usuario (almacenamiento de la app), aparte de los demás
 * ajustes. Nunca va en el código, en git ni en el instalador: cada persona usa la suya.
 */
export const useRoutesKey = create<RoutesKeyState>((set) => ({
  apiKey: undefined,
  loaded: false,
  async load() {
    const saved = await storage.get<unknown>(KEY);
    set({
      apiKey: typeof saved === 'string' && isPlausibleApiKey(saved) ? saved : undefined,
      loaded: true,
    });
  },
  save(key) {
    const clean = key.trim();
    if (!isPlausibleApiKey(clean)) return;
    set({ apiKey: clean });
    void storage.set(KEY, clean);
  },
  clear() {
    set({ apiKey: undefined });
    void storage.set(KEY, null);
  },
}));
