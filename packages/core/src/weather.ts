/**
 * Descripción en español de los códigos de tiempo WMO (los que usa Open-Meteo en `weather_code`).
 * Tabla: https://open-meteo.com/en/docs (sección "WMO Weather interpretation codes").
 */
const WMO: Record<number, string> = {
  0: 'Despejado',
  1: 'Poco nuboso',
  2: 'Intervalos nubosos',
  3: 'Cubierto',
  45: 'Niebla',
  48: 'Niebla con escarcha',
  51: 'Llovizna débil',
  53: 'Llovizna',
  55: 'Llovizna intensa',
  56: 'Llovizna helada',
  57: 'Llovizna helada intensa',
  61: 'Lluvia débil',
  63: 'Lluvia',
  65: 'Lluvia intensa',
  66: 'Lluvia helada',
  67: 'Lluvia helada intensa',
  71: 'Nevada débil',
  73: 'Nevada moderada',
  75: 'Nevada intensa',
  77: 'Granos de nieve',
  80: 'Chubascos débiles',
  81: 'Chubascos',
  82: 'Chubascos fuertes',
  85: 'Chubascos de nieve',
  86: 'Chubascos de nieve fuertes',
  95: 'Tormenta',
  96: 'Tormenta con granizo',
  99: 'Tormenta con granizo fuerte',
};

export function describeWeatherCode(code: number | null): string {
  if (code === null) return 'Sin datos';
  return WMO[code] ?? 'Desconocido';
}

/** ¿El código indica nieve? (71–77 nevadas, 85–86 chubascos de nieve). */
export function isSnowCode(code: number | null): boolean {
  return code !== null && ((code >= 71 && code <= 77) || code === 85 || code === 86);
}
