/**
 * Errores de la capa de datos. La UI decide qué mostrar según `kind`, sin conocer el proveedor.
 */
export type ForecastErrorKind =
  /** Sin conexión o el servidor no responde (fallo de red). */
  | 'offline'
  /** La petición tardó más que el tiempo máximo. */
  | 'timeout'
  /** Demasiadas peticiones: límite propio o del proveedor (HTTP 429). */
  | 'rate-limited'
  /** El proveedor respondió con un error (HTTP 4xx/5xx o `error: true`). */
  | 'provider'
  /** La respuesta no tiene el formato esperado o le faltan datos imprescindibles. */
  | 'invalid-data'
  /** El servicio rechazó la clave de acceso (HTTP 401 o 403). */
  | 'auth'
  /** La petición se canceló (por ejemplo, el usuario cambió de pantalla). */
  | 'aborted';

export class ForecastError extends Error {
  readonly kind: ForecastErrorKind;
  /** Código HTTP, si lo hay. */
  readonly status: number | undefined;
  /** Cuánto esperar antes de reintentar, si se sabe (límite de peticiones). */
  readonly retryAfterMs: number | undefined;

  constructor(
    kind: ForecastErrorKind,
    message: string,
    options: { status?: number; retryAfterMs?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'ForecastError';
    this.kind = kind;
    this.status = options.status;
    this.retryAfterMs = options.retryAfterMs;
  }

  /** ¿Tiene sentido reintentar automáticamente? */
  get retryable(): boolean {
    return (
      this.kind === 'offline' ||
      this.kind === 'timeout' ||
      this.kind === 'rate-limited' ||
      (this.kind === 'provider' && (this.status ?? 0) >= 500)
    );
  }
}

export function isForecastError(error: unknown): error is ForecastError {
  return error instanceof ForecastError;
}
