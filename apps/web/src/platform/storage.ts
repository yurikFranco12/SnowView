import { isTauri } from './window';

/**
 * Almacenamiento persistente clave-valor detrás de una interfaz, para que la UI no dependa de Tauri.
 * - En la app de escritorio: plugin de almacenamiento de Tauri (un JSON en la carpeta de datos de
 *   la app, `%APPDATA%\com.snowview.desktop\settings.json`).
 * - En el navegador (`pnpm web`): localStorage, solo para desarrollo.
 */
export interface KeyValueStorage {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
}

const STORE_FILE = 'settings.json';
const PREFIX = 'snowview:';

const browserStorage: KeyValueStorage = {
  async get<T>(key: string) {
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      return raw === null ? undefined : (JSON.parse(raw) as T);
    } catch {
      return undefined;
    }
  },
  async set(key, value) {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Sin almacenamiento disponible (modo privado): se trabaja solo en memoria.
    }
  },
};

type TauriStore = Awaited<ReturnType<typeof import('@tauri-apps/plugin-store').load>>;
let storePromise: Promise<TauriStore> | undefined;

function tauriStore(): Promise<TauriStore> {
  storePromise ??= import('@tauri-apps/plugin-store').then(({ load }) =>
    load(STORE_FILE, { defaults: {}, autoSave: 200 }),
  );
  return storePromise;
}

const desktopStorage: KeyValueStorage = {
  async get<T>(key: string) {
    return (await tauriStore()).get<T>(key);
  },
  async set(key, value) {
    await (await tauriStore()).set(key, value);
  },
};

export const storage: KeyValueStorage = isTauri ? desktopStorage : browserStorage;
