/**
 * Reglas de ejemplo para la pantalla de inicio. Las reglas reales (crear, evaluar y avisar sin
 * repetir) llegan en la Fase 1c.
 */
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
