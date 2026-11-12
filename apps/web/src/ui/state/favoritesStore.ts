import { getStation } from '@snowview/data';
import { create } from 'zustand';
import { storage } from '../../platform/storage';

const KEY = 'favorites';
/** Favoritas del primer arranque: Pirineo y Sierra Nevada. */
const DEFAULT_FAVORITES = ['baqueira-beret', 'formigal', 'sierra-nevada'] as const;

interface FavoritesState {
  /** Ids en orden; la primera es la estación principal. */
  ids: string[];
  loaded: boolean;
  load: () => Promise<void>;
  toggle: (id: string) => void;
  makeMain: (id: string) => void;
}

function persist(ids: string[]) {
  void storage.set(KEY, ids);
}

/** Favoritas guardadas con el plugin de almacenamiento de Tauri (o localStorage en el navegador). */
export const useFavorites = create<FavoritesState>((set, get) => ({
  ids: [],
  loaded: false,
  async load() {
    const saved = await storage.get<unknown>(KEY);
    const ids = Array.isArray(saved)
      ? saved.filter((id): id is string => typeof id === 'string' && getStation(id) !== undefined)
      : [...DEFAULT_FAVORITES];
    set({ ids, loaded: true });
  },
  toggle(id) {
    const { ids } = get();
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    set({ ids: next });
    persist(next);
  },
  makeMain(id) {
    const next = [id, ...get().ids.filter((x) => x !== id)];
    set({ ids: next });
    persist(next);
  },
}));
