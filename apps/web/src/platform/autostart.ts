import { isTauri } from './window';

/**
 * Arranque con Windows detrás de una interfaz. Solo existe en la app de escritorio: en el navegador
 * `available` es false y la interfaz oculta el interruptor.
 */
export const autostartAvailable = isTauri;

export async function isAutostartEnabled(): Promise<boolean> {
  if (!isTauri) return false;
  const { isEnabled } = await import('@tauri-apps/plugin-autostart');
  return isEnabled();
}

export async function setAutostart(enabled: boolean): Promise<void> {
  if (!isTauri) return;
  const { enable, disable } = await import('@tauri-apps/plugin-autostart');
  await (enabled ? enable() : disable());
}
