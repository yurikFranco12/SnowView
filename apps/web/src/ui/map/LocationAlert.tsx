import { MapPinOff, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { isAndroid, systemName } from '../../platform/device';
import { storage } from '../../platform/storage';
import type { UserLocation } from './useUserLocation';

const DISMISSED_KEY = 'mapLocationAlertDismissed';

/** Aviso discreto sobre la ubicación: se puede activar o descartar, y no vuelve a molestar. */
export function LocationAlert({ location }: { location: UserLocation }) {
  const [dismissed, setDismissed] = useState(true); // oculto hasta leer lo guardado
  useEffect(() => {
    void storage.get<boolean>(DISMISSED_KEY).then((v) => setDismissed(v === true));
  }, []);
  const dismiss = () => {
    setDismissed(true);
    void storage.set(DISMISSED_KEY, true);
  };

  const { status } = location;
  if (status === 'granted' || status === 'checking' || status === 'locating') return null;
  if (dismissed && status === 'prompt') return null;

  const text =
    status === 'prompt'
      ? 'Activa tu ubicación para ver tu posición en el mapa y la distancia a cada estación.'
      : status === 'denied'
        ? `La ubicación está desactivada. Actívala en ${systemName} y vuelve aquí, o fíjala a mano en el mapa.`
        : status === 'unavailable'
          ? isAndroid
            ? 'Fija tu ubicación buscando tu pueblo o marcándola en el mapa para ver la distancia a cada estación.'
            : 'Este equipo no ofrece ubicación.'
          : 'No se pudo obtener tu ubicación.';

  return (
    <div
      role="status"
      className="flex max-w-[min(430px,calc(100%-24px))] items-center gap-3 rounded-2xl border border-white/10 bg-[#0d1340]/90 px-3.5 py-2.5 text-xs backdrop-blur-md"
    >
      <MapPinOff className="size-4 shrink-0 text-muted" aria-hidden="true" />
      <p className="min-w-0 flex-1">{text}</p>
      {(status === 'prompt' || status === 'error') && (
        <button
          type="button"
          onClick={location.request}
          className="shrink-0 rounded-lg bg-ice/[0.16] px-2.5 py-1 text-ice transition-colors hover:bg-ice/25"
        >
          {status === 'prompt' ? 'Activar' : 'Reintentar'}
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar el aviso de ubicación"
        className="grid size-6 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-white/[0.1] hover:text-text"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
