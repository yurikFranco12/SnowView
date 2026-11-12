/**
 * Simulación de la nevada, sin DOM: solo números. Así se puede probar con Vitest y el componente
 * de canvas se limita a dibujar.
 */

export interface Flake {
  x: number;
  y: number;
  /** Radio base en px. */
  r: number;
  /** Velocidad de caída en px/s. */
  v: number;
  /** Opacidad. */
  a: number;
  /** Fase y frecuencia del vaivén lateral. */
  phase: number;
  freq: number;
  /** Amplitud del vaivén en px/s. */
  amp: number;
  /** Capa de profundidad: 0 lejana, 1 media, 2 cercana. */
  layer: 0 | 1 | 2;
}

export interface SnowField {
  width: number;
  height: number;
  flakes: Flake[];
  /** Tiempo acumulado en segundos (para el vaivén). */
  time: number;
}

/** Tope de delta-time: si un frame se retrasa (pestaña oculta, pausa), no hay saltos bruscos. */
export const MAX_DT_SECONDS = 0.05;

/** Copos por cada 1280×820 px con intensidad 1 (densidad de la maqueta). */
const BASE_DENSITY = 180;

const LAYERS = [
  { share: 0.5, size: 1.2, speed: 28 },
  { share: 0.35, size: 2.2, speed: 55 },
  { share: 0.15, size: 3.4, speed: 90 },
] as const;

export type Random = () => number;

function pickLayer(random: Random): 0 | 1 | 2 {
  const p = random();
  if (p < LAYERS[0].share) return 0;
  if (p < LAYERS[0].share + LAYERS[1].share) return 1;
  return 2;
}

export function spawnFlake(width: number, height: number, initial: boolean, random: Random): Flake {
  const layer = pickLayer(random);
  const spec = LAYERS[layer];
  return {
    x: random() * width,
    y: initial ? random() * height : -10,
    r: spec.size * (0.7 + random() * 0.6),
    v: spec.speed * (0.7 + random() * 0.6),
    a: 0.35 + random() * 0.5,
    phase: random() * Math.PI * 2,
    freq: 0.6 + random() * 0.8,
    amp: ((10 + random() * 18) * (layer + 1)) / 2,
    layer,
  };
}

export function flakeCount(width: number, height: number, intensity: number): number {
  return Math.max(0, Math.round((BASE_DENSITY * intensity * (width * height)) / (1280 * 820)));
}

export function createSnowField(
  width: number,
  height: number,
  intensity: number,
  random: Random = Math.random,
): SnowField {
  const flakes: Flake[] = [];
  const n = flakeCount(width, height, intensity);
  for (let i = 0; i < n; i++) flakes.push(spawnFlake(width, height, true, random));
  return { width, height, flakes, time: 0 };
}

/** Avanza la simulación `dtSeconds` (con tope). Los copos que salen por abajo renacen arriba. */
export function stepSnowField(
  field: SnowField,
  dtSeconds: number,
  random: Random = Math.random,
): void {
  const dt = Math.min(Math.max(dtSeconds, 0), MAX_DT_SECONDS);
  field.time += dt;
  const { width, height, flakes } = field;
  for (let i = 0; i < flakes.length; i++) {
    const f = flakes[i] as Flake;
    f.y += f.v * dt;
    f.x += Math.sin(field.time * f.freq + f.phase) * f.amp * dt;
    if (f.y > height + 10) {
      flakes[i] = spawnFlake(width, height, false, random);
      continue;
    }
    if (f.x < -10) f.x = width + 10;
    else if (f.x > width + 10) f.x = -10;
  }
}
