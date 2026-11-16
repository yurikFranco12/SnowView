import { isAndroidApp, isTauri } from './device';

/**
 * Notificaciones del sistema detrás de una interfaz, para que la UI no dependa de Tauri.
 * - App de escritorio: plugin de notificaciones de Tauri (notificación nativa de Windows).
 * - App de Android: el mismo plugin, con canal propio, permiso en tiempo de ejecución (Android 13+)
 *   y avisos programados que el sistema entrega aunque la app esté cerrada.
 * - Navegador (`pnpm web`): API Notification, solo para desarrollo.
 */
export type NotificationAccess = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * true si el sistema puede guardar un aviso y mostrarlo más tarde sin la app abierta. Solo Android:
 * en el escritorio el plugin lo mostraría al momento, y allí la app ya vigila desde la bandeja.
 */
export const canScheduleNotifications = isAndroidApp;

/** Canal de Android de los avisos de nieve. El usuario lo ve y lo ajusta en los ajustes del sistema. */
const CHANNEL_ID = 'avisos-nieve';

async function tauriPlugin() {
  return import('@tauri-apps/plugin-notification');
}

let channelReady: Promise<void> | undefined;

/**
 * Crea el canal una sola vez. Android 8+ no muestra notificaciones sin canal; con importancia alta
 * el aviso aparece en pantalla y suena. Si falla, se usa el canal por defecto del plugin.
 */
function ensureChannel(): Promise<void> {
  channelReady ??= (async () => {
    const { createChannel, Importance, Visibility } = await tauriPlugin();
    await createChannel({
      id: CHANNEL_ID,
      name: 'Avisos de nieve',
      description: 'Cuando se cumple una de tus reglas de nieve.',
      importance: Importance.High,
      visibility: Visibility.Public,
      vibration: true,
    });
  })();
  return channelReady;
}

/** Canal a usar en Android; undefined en el resto o si no se pudo crear. */
async function channelId(): Promise<string | undefined> {
  if (!isAndroidApp) return undefined;
  try {
    await ensureChannel();
    return CHANNEL_ID;
  } catch {
    channelReady = undefined;
    return undefined;
  }
}

export async function getNotificationAccess(): Promise<NotificationAccess> {
  try {
    if (isTauri) {
      const { isPermissionGranted } = await tauriPlugin();
      // El sistema no distingue aquí "denegado" de "sin decidir": concedido o por pedir.
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
      const { isPermissionGranted, requestPermission } = await tauriPlugin();
      if (await isPermissionGranted()) return 'granted';
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

export interface NotificationContent {
  title: string;
  body: string;
  /**
   * Identificador numérico estable del aviso (entero positivo de 31 bits). Dos avisos con el mismo
   * identificador no se acumulan: el segundo sustituye al primero.
   */
  id?: number;
  /** Etiqueta para agrupar en el navegador. */
  tag?: string;
}

/** Muestra una notificación. Devuelve false si no hay permiso o no se pudo mostrar. */
export async function showNotification(content: NotificationContent): Promise<boolean> {
  const { title, body, id, tag } = content;
  try {
    if ((await getNotificationAccess()) !== 'granted') return false;
    if (isTauri) {
      const { sendNotification } = await tauriPlugin();
      const channel = await channelId();
      sendNotification({
        title,
        body,
        ...(id !== undefined && { id }),
        ...(channel && { channelId: channel }),
      });
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

export interface ScheduledNotification {
  /** Identificador con el que luego se puede cancelar. */
  id: number;
  title: string;
  body: string;
  /** Momento de entrega, en ms UTC. Debe ser futuro. */
  atMs: number;
}

/**
 * Deja un aviso programado en el sistema (solo Android). Se entrega con la app cerrada y sobrevive
 * a un reinicio del teléfono. No pide el permiso de alarmas exactas: Android puede retrasarlo unos
 * minutos para ahorrar batería, que para un aviso de nieve da igual.
 */
export async function scheduleNotification(n: ScheduledNotification): Promise<boolean> {
  if (!canScheduleNotifications || n.atMs <= Date.now()) return false;
  try {
    if ((await getNotificationAccess()) !== 'granted') return false;
    const { sendNotification, Schedule } = await tauriPlugin();
    const channel = await channelId();
    sendNotification({
      id: n.id,
      title: n.title,
      body: n.body,
      // allowWhileIdle: que salte también con el teléfono en reposo (Doze).
      schedule: Schedule.at(new Date(n.atMs), false, true),
      ...(channel && { channelId: channel }),
    });
    return true;
  } catch {
    return false;
  }
}

/** Cancela avisos programados que aún no se han entregado. */
export async function cancelScheduledNotifications(ids: readonly number[]): Promise<void> {
  if (!canScheduleNotifications || ids.length === 0) return;
  try {
    const { cancel } = await tauriPlugin();
    await cancel([...ids]);
  } catch {
    // Si no se puede cancelar, el aviso antiguo saltará con la previsión con la que se programó.
  }
}
