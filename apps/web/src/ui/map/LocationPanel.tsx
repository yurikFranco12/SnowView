import { Crosshair, Search } from 'lucide-react';
import { useState } from 'react';
import { useManualLocation } from '../state/manualLocationStore';
import { PlaceSearch } from './PlaceSearch';
import type { UserLocation } from './useUserLocation';

function formatAccuracy(meters: number): string {
  return meters >= 1000 ? `±${Math.round(meters / 1000)} km` : `±${Math.round(meters)} m`;
}

/** Dónde estás: la del equipo con su precisión, o la que fijas a mano si Windows se equivoca. */
export function LocationPanel({
  location,
  pickMode,
  onTogglePick,
}: {
  location: UserLocation;
  pickMode: boolean;
  onTogglePick: () => void;
}) {
  const setManual = useManualLocation((s) => s.set);
  const clearManual = useManualLocation((s) => s.clear);
  const [searching, setSearching] = useState(false);
  const { position, source, accuracyM, label } = location;
  const imprecise = source === 'device' && accuracyM !== undefined && accuracyM > 5000;

  return (
    <section
      aria-labelledby="mylocation-title"
      className="flex flex-col gap-2 border-b border-white/[0.08] pb-4"
    >
      <h2 id="mylocation-title" className="text-sm font-semibold">
        Tu ubicación
      </h2>
      <p className="text-xs" aria-live="polite">
        {!position
          ? 'Sin ubicación todavía.'
          : source === 'manual'
            ? `Fijada a mano${label ? `: ${label}` : ''}.`
            : `La del equipo${accuracyM !== undefined ? `, ${formatAccuracy(accuracyM)}` : ''}.`}
      </p>
      {imprecise && (
        <p className="text-[11px] leading-snug text-amber-200">
          El sistema la calcula por la red y puede errar varios kilómetros. Si no es donde estás,
          busca tu pueblo o márcalo en el mapa.
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSearching((v) => !v)}
          aria-expanded={searching}
          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs transition-colors ${searching ? 'bg-ice/[0.18] font-semibold text-ice' : 'bg-white/[0.06] hover:bg-white/[0.12]'}`}
        >
          <Search className="size-3.5" aria-hidden="true" /> Buscar mi pueblo
        </button>
        <button
          type="button"
          onClick={onTogglePick}
          aria-pressed={pickMode}
          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs transition-colors ${pickMode ? 'bg-ice/[0.18] font-semibold text-ice' : 'bg-white/[0.06] hover:bg-white/[0.12]'}`}
        >
          <Crosshair className="size-3.5" aria-hidden="true" /> Fijar en el mapa
        </button>
        {source === 'manual' && (
          <button
            type="button"
            onClick={() => {
              clearManual();
              location.request();
            }}
            className="rounded-xl bg-white/[0.06] px-2.5 py-1.5 text-xs transition-colors hover:bg-white/[0.12]"
          >
            Usar la del equipo
          </button>
        )}
      </div>
      {searching && (
        <PlaceSearch
          onClose={() => setSearching(false)}
          onPick={(place) => {
            setManual({ latitude: place.latitude, longitude: place.longitude }, place.label);
            setSearching(false);
          }}
        />
      )}
    </section>
  );
}
