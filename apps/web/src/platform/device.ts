/**
 * Dónde se está ejecutando la app. Es el único sitio que mira la plataforma: el resto de la app
 * pregunta aquí (o a los adaptadores de `platform/`) en vez de leer el agente de usuario.
 */

/** Tauri 2 inyecta este objeto en el WebView; si no existe, estamos en un navegador normal. */
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/** Android (app de Google Play o navegador del teléfono). El WebView de Android lo declara así. */
export const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

/** App de escritorio: con ventana propia, bandeja del sistema y arranque con Windows. */
export const isDesktopApp = isTauri && !isAndroid;

/** App instalada en Android. */
export const isAndroidApp = isTauri && isAndroid;

/** Nombre del sistema para los textos ("Bloqueadas en Android"). */
export const systemName = isAndroid ? 'Android' : isTauri ? 'Windows' : 'el navegador';
