/**
 * Datos simulados para el prototipo visual (Fase 1a). En la Fase 1b se sustituyen por la previsión
 * real de Open-Meteo a través de @snowview/data. Los valores son inventados.
 */

export type Period = 3 | 7 | 14;
export const PERIODS: readonly Period[] = [3, 7, 14];

export interface MockStation {
  id: string;
  name: string;
  region: string;
  baseElevationM: number;
  favorite: boolean;
  /** Nieve prevista por día, en cm, empezando hoy. 14 valores. */
  dailySnowCm: readonly number[];
  temperatureC: number;
  windKmh: number;
  condition: string;
}

export const MOCK_TODAY = new Date(2026, 10, 12); // 12 de noviembre de 2026 (jueves)

export const MOCK_STATIONS: readonly MockStation[] = [
  {
    id: 'baqueira-beret',
    name: 'Baqueira-Beret',
    region: 'Lleida · Pirineo',
    baseElevationM: 1850,
    favorite: true,
    dailySnowCm: [9, 12, 17, 0, 6, 3, 1, 0, 0, 4, 8, 11, 2, 0],
    temperatureC: -4,
    windKmh: 18,
    condition: 'Nevada moderada',
  },
  {
    id: 'formigal',
    name: 'Formigal',
    region: 'Huesca · Pirineo',
    baseElevationM: 1500,
    favorite: true,
    dailySnowCm: [2, 4, 7, 3, 5, 1, 0, 0, 2, 6, 3, 0, 0, 1],
    temperatureC: -2,
    windKmh: 27,
    condition: 'Nevadas débiles',
  },
  {
    id: 'sierra-nevada',
    name: 'Sierra Nevada',
    region: 'Granada · Andalucía',
    baseElevationM: 2100,
    favorite: true,
    dailySnowCm: [0, 1, 4, 5, 3, 1, 0, 0, 0, 0, 2, 5, 7, 3],
    temperatureC: -1,
    windKmh: 12,
    condition: 'Intervalos nubosos',
  },
  {
    id: 'grandvalira',
    name: 'Grandvalira',
    region: 'Andorra',
    baseElevationM: 2050,
    favorite: false,
    dailySnowCm: [1, 2, 3, 1, 1, 1, 0, 0, 3, 5, 2, 0, 0, 0],
    temperatureC: -5,
    windKmh: 22,
    condition: 'Poco nuboso',
  },
];

export interface MockRule {
  id: string;
  label: string;
  stationName: string;
  /** Avance hacia el umbral, de 0 a 1. */
  progress: number;
  status: 'cumplida' | 'en-curso' | 'pendiente';
}

export const MOCK_RULES: readonly MockRule[] = [
  {
    id: 'r1',
    label: 'Más de 15 cm en 48 h',
    stationName: 'Baqueira-Beret',
    progress: 1,
    status: 'cumplida',
  },
  {
    id: 'r2',
    label: 'Viento máx. 40 km/h',
    stationName: 'Formigal',
    progress: 0.6,
    status: 'en-curso',
  },
  {
    id: 'r3',
    label: 'Temperatura bajo −2 °C',
    stationName: 'Sierra Nevada',
    progress: 0.35,
    status: 'pendiente',
  },
];

/** Suma de nieve de los primeros `days` días. Provisional: en la Fase 1b lo calcula core/. */
export function totalSnow(station: MockStation, days: Period): number {
  return station.dailySnowCm.slice(0, days).reduce((sum, cm) => sum + cm, 0);
}

const WEEKDAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'] as const;

/** Etiqueta corta del día `offset` contando desde hoy (Ju, Vi, Sá…). */
export function dayLabel(offset: number): string {
  const date = new Date(MOCK_TODAY);
  date.setDate(date.getDate() + offset);
  return WEEKDAYS[date.getDay()] ?? '';
}
