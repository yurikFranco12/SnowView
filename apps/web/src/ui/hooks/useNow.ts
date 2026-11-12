import { useEffect, useState } from 'react';

/**
 * Hora actual que se actualiza cada `intervalMs`. Evita leer Date.now() durante el render (lo
 * haría impuro) y hace que "hoy" y "las próximas 48 h" avancen solos si la app sigue abierta.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
