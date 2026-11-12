/**
 * Añade un parámetro con la hora a la URL de una imagen para que el WebView no sirva la copia en
 * caché al refrescar. Conserva los parámetros que ya tenga la URL.
 */
export function withCacheBust(url: string, nowMs: number): string {
  const u = new URL(url);
  u.searchParams.set('_sv', String(nowMs));
  return u.toString();
}

/** "14:32" a partir de un instante, en la hora local del usuario. */
const timeFormat = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

export function formatClock(ms: number): string {
  return timeFormat.format(ms);
}

/** Cada cuánto se refresca de verdad: el valor de la webcam, con un mínimo de 60 s. */
export function effectiveRefreshMs(refreshSeconds: number): number {
  return Math.max(60, refreshSeconds) * 1000;
}
