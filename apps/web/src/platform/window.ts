import { isDesktopApp, isTauri } from './device';

/**
 * Control de la ventana (minimizar, maximizar, cerrar) detrás de una interfaz, para que la UI no
 * dependa de Tauri. En el navegador (desarrollo con `pnpm dev` sin Tauri) y en Android (no hay ventana
 * que mover) los botones no existen.
 */
export interface WindowControls {
  readonly available: boolean;
  minimize(): Promise<void>;
  toggleMaximize(): Promise<void>;
  close(): Promise<void>;
}

export { isTauri };

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

export const windowControls: WindowControls = isDesktopApp ? tauriControls : browserControls;
