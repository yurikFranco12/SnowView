import { isTauri } from './window';

/**
 * Notificaciones del sistema detrás de una interfaz, para que la UI no dependa de Tauri.
 * - App de escritorio: plugin de notificaciones de Tauri (notificación nativa de Windows).
 * - Navegador (`pnpm web`): API Notification, solo para desarrollo.
 */
export type NotificationAccess = 'granted' | 'denied' | 'default' | 'unsupported';

async function tauriPlugin() {
  return import('@tauri-apps/plugin-notification');
}

export async function getNotificationAccess(): Promise<NotificationAccess> {
  try {
    if (isTauri) {
      const { isPermissionGranted } = await tauriPlugin();
      // Windows no distingue "denegado" de "sin decidir": se trata como concedido o por pedir.
      return (await isPermissionGranted()) ? 'granted' : 'default';
    }
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  } catch {
    return 'unsupported';
  }
}

/** Pide permiso si aún no se decidió. Devuelve el estado final. */
export async function requestNotificationAccess(): Promise<NotificationAccess> {
  try {
    if (isTauri) {
      const { requestPermission } = await tauriPlugin();
      return (await requestPermission()) === 'granted' ? 'granted' : 'denied';
    }
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
  } catch {
    return 'unsupported';
  }
}

/** Muestra una notificación. Devuelve false si no hay permiso o no se pudo mostrar. */
export async function showNotification(
  title: string,
  body: string,
  tag?: string,
): Promise<boolean> {
  try {
    if ((await getNotificationAccess()) !== 'granted') return false;
    if (isTauri) {
      const { sendNotification } = await tauriPlugin();
      sendNotification({ title, body });
      return true;
    }
    const options: NotificationOptions = { body };
    if (tag) options.tag = tag;
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}
