import { isDesktopApp } from './device';

/**
 * Arranque con Windows detrás de una interfaz. Solo existe en la app de escritorio: en el navegador y en
 * Android `available` es false y la interfaz oculta el interruptor.
 */
export const autostartAvailable = isDesktopApp;

export async function isAutostartEnabled(): Promise<boolean> {
  if (!isDesktopApp) return false;
  const { isEnabled } = await import('@tauri-apps/plugin-autostart');
  return isEnabled();
}

export async function setAutostart(enabled: boolean): Promise<void> {
  if (!isDesktopApp) return;
  const { enable, disable } = await import('@tauri-apps/plugin-autostart');
  await (enabled ? enable() : disable());
}
