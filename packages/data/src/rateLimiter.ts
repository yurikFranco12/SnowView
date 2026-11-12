import { ForecastError } from './errors';

/**
 * Límite propio de peticiones (ventana deslizante), muy por debajo del de Open-Meteo
 * (600/minuto, 5.000/hora, 10.000/día en el uso gratuito). Protege de bucles y de reintentos en
 * cadena. Si el proveedor responde 429, `pause()` bloquea todas las peticiones hasta que pase el
 * tiempo indicado.
 */
export class RateLimiter {
  private readonly stamps: number[] = [];
  private pausedUntil = 0;

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Reserva una petición o lanza `rate-limited` con el tiempo de espera. */
  acquire(): void {
    const t = this.now();
    if (t < this.pausedUntil) {
      throw new ForecastError('rate-limited', 'El proveedor pidió esperar antes de reintentar.', {
        retryAfterMs: this.pausedUntil - t,
      });
    }
    while (this.stamps.length && (this.stamps[0] ?? 0) <= t - this.windowMs) this.stamps.shift();
    if (this.stamps.length >= this.maxRequests) {
      const oldest = this.stamps[0] ?? t;
      throw new ForecastError('rate-limited', 'Demasiadas peticiones seguidas.', {
        retryAfterMs: oldest + this.windowMs - t,
      });
    }
    this.stamps.push(t);
  }

  /** Bloquea las peticiones durante `ms` (por ejemplo, tras un 429). */
  pause(ms: number): void {
    this.pausedUntil = Math.max(this.pausedUntil, this.now() + ms);
  }
}
