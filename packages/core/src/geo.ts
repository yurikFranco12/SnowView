/** Geometría sobre la esfera terrestre. Sin dependencias: sirve en la UI y en un futuro servidor. */

export interface LatLng {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distancia en línea recta entre dos puntos (fórmula de haversine), en km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** true si es una latitud y longitud válidas. */
export function isValidLatLng(p: LatLng): boolean {
  return (
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180
  );
}

/** "850 m", "12,4 km", "312 km": metros por debajo de 1 km, un decimal hasta 100 km y luego enteros. */
export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toLocaleString('es-ES', { maximumFractionDigits: 1 })} km`;
  return `${Math.round(km).toLocaleString('es-ES')} km`;
}

/** "45 min", "3 h", "3 h 25 min". Redondea al minuto; 0 o menos da "—". */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
