/**
 * Control de la ventana (minimizar, maximizar, cerrar) detrás de una interfaz, para que la UI no
 * dependa de Tauri. En el navegador (desarrollo con `pnpm dev` sin Tauri) los botones no hacen nada.
 */
export interface WindowControls {
  readonly available: boolean;
  minimize(): Promise<void>;
  toggleMaximize(): Promise<void>;
  close(): Promise<void>;
}

/** Tauri 2 inyecta este objeto en el WebView; si no existe, estamos en un navegador normal. */
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const noop = async (): Promise<void> => {};

const browserControls: WindowControls = {
  available: false,
  minimize: noop,
  toggleMaximize: noop,
  close: noop,
};

async function current() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow();
}

const tauriControls: WindowControls = {
  available: true,
  minimize: async () => (await current()).minimize(),
  toggleMaximize: async () => (await current()).toggleMaximize(),
  close: async () => (await current()).close(),
};

export const windowControls: WindowControls = isTauri ? tauriControls : browserControls;
