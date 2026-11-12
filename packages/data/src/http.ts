import { ForecastError } from './errors';
import type { RateLimiter } from './rateLimiter';

/** Si el proveedor responde 429 sin decir cuánto esperar. */
const DEFAULT_RATE_LIMIT_PAUSE_MS = 60_000;

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

export interface FetchContext {
  doFetch: typeof fetch;
  limiter: RateLimiter;
  timeoutMs: number;
}

/**
 * Pide una URL y devuelve el JSON, con el límite de peticiones, el tiempo máximo, la cancelación y
 * los errores tipados (`ForecastError`) comunes a todas las llamadas a Open-Meteo.
 */
export async function fetchJson(
  url: string,
  { doFetch, limiter, timeoutMs }: FetchContext,
  signal?: AbortSignal,
): Promise<unknown> {
  limiter.acquire();

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  let response: Response;
  try {
    response = await doFetch(url, { signal: controller.signal });
  } catch (cause) {
    if (timedOut)
      throw new ForecastError('timeout', 'Open-Meteo no respondió a tiempo.', { cause });
    if (signal?.aborted) throw new ForecastError('aborted', 'Petición cancelada.', { cause });
    throw new ForecastError('offline', 'Sin conexión con Open-Meteo.', { cause });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }

  if (response.status === 429) {
    const retryAfterMs =
      parseRetryAfter(response.headers.get('Retry-After')) ?? DEFAULT_RATE_LIMIT_PAUSE_MS;
    limiter.pause(retryAfterMs);
    throw new ForecastError(
      'rate-limited',
      'Open-Meteo pide esperar antes de volver a consultar.',
      {
        status: 429,
        retryAfterMs,
      },
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (cause) {
    throw new ForecastError(
      response.ok ? 'invalid-data' : 'provider',
      response.ok ? 'La respuesta no es JSON válido.' : `Open-Meteo respondió ${response.status}.`,
      { status: response.status, cause },
    );
  }

  if (!response.ok) {
    const reason = (json as { reason?: unknown } | null)?.reason;
    throw new ForecastError(
      'provider',
      typeof reason === 'string' ? reason : `Open-Meteo respondió ${response.status}.`,
      { status: response.status },
    );
  }
  return json;
}
