/**
 * Notificaciones del sistema detrás de una interfaz, para que la UI no dependa de Tauri.
 * Ahora usa la API Notification del WebView (WebView2 en Windows); si se instala el plugin de
 * notificaciones de Tauri, solo cambia este archivo.
 */
export type NotificationAccess = 'granted' | 'denied' | 'default' | 'unsupported';

export function notificationAccess(): NotificationAccess {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/** Pide permiso si aún no se decidió. Devuelve el estado final. */
export async function requestNotificationAccess(): Promise<NotificationAccess> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'default') {
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }
  return Notification.permission;
}

/** Muestra una notificación. Devuelve false si no hay permiso o no se pudo mostrar. */
export function showNotification(title: string, body: string, tag?: string): boolean {
  if (notificationAccess() !== 'granted') return false;
  try {
    const options: NotificationOptions = { body };
    if (tag) options.tag = tag;
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}
