import type { LatLng } from '@snowview/core';
import { useCallback, useEffect, useRef, useState } from 'react';

export type LocationStatus =
  /** Aún no se ha comprobado. */
  | 'checking'
  /** El permiso no está decidido: hay que pedirlo. */
  | 'prompt'
  /** Pidiendo la posición. */
  | 'locating'
  | 'granted'
  /** El usuario o Windows lo han denegado. */
  | 'denied'
  /** Este equipo no tiene servicio de ubicación o el WebView no lo ofrece. */
  | 'unavailable'
  /** Falló la lectura (sin señal, tiempo agotado…). */
  | 'error';

export interface UserLocation {
  status: LocationStatus;
  position: LatLng | undefined;
  /** Pide la posición: si el permiso estaba sin decidir, Windows lo preguntará. */
  request: () => void;
}

const supported = () => typeof navigator !== 'undefined' && 'geolocation' in navigator;
const hasPermissionsApi = () => typeof navigator !== 'undefined' && !!navigator.permissions?.query;

function initialStatus(): LocationStatus {
  if (!supported()) return 'unavailable';
  // Sin API de permisos no se puede consultar: se ofrece pedirla directamente.
  return hasPermissionsApi() ? 'checking' : 'prompt';
}

/**
 * Ubicación del usuario. Al montarse solo CONSULTA el permiso (no lo pide): si ya está concedido
 * lee la posición; si no, deja el estado para que la interfaz muestre un aviso discreto.
 * Se queda observando el permiso, para reaccionar si el usuario lo cambia en Windows.
 */
export function useUserLocation(): UserLocation {
  const [status, setStatus] = useState<LocationStatus>(initialStatus);
  const [position, setPosition] = useState<LatLng | undefined>(undefined);
  const alive = useRef(true);

  const read = useCallback(() => {
    if (!supported()) return;
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!alive.current) return;
        setPosition({ latitude: p.coords.latitude, longitude: p.coords.longitude });
        setStatus('granted');
      },
      (e) => {
        if (!alive.current) return;
        setStatus(e.code === e.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  useEffect(() => {
    alive.current = true;
    if (!supported()) return;
    let permission: PermissionStatus | undefined;
    const apply = (state: PermissionState) => {
      if (state === 'granted') read();
      else if (state === 'denied') setStatus('denied');
      else setStatus('prompt');
    };
    const query = navigator.permissions?.query({ name: 'geolocation' });
    if (query) {
      void query
        .then((p) => {
          if (!alive.current) return;
          permission = p;
          apply(p.state);
          p.onchange = () => apply(p.state);
        })
        .catch(() => alive.current && setStatus('prompt'));
    }
    return () => {
      alive.current = false;
      if (permission) permission.onchange = null;
    };
  }, [read]);

  return { status, position, request: read };
}
