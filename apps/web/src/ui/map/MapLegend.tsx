import { Layers } from 'lucide-react';
import { useState } from 'react';
import { PinIcon } from './PinIcon';

/** Leyenda sobre el mapa: la misma, con el mismo formato, en el mapa de España y en el de cada estación. */
export function MapLegend() {
  const [open, setOpen] = useState(true);
  return (
    <div className="w-[210px] rounded-2xl border border-white/10 bg-[#0d1340]/90 text-[11px] backdrop-blur-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold"
      >
        <Layers className="size-3.5 text-ice" aria-hidden="true" /> Leyenda
      </button>
      {open && (
        <div className="border-t border-white/[0.08] px-3 pt-2 pb-2.5">
          <ul className="flex flex-col gap-1.5 text-muted" aria-label="Leyenda del mapa">
            <li className="flex items-center gap-2">
              <PinIcon className="size-4" /> Estación
            </li>
            <li className="flex items-center gap-2">
              <span className="grid size-4 place-items-center" aria-hidden="true">
                <span className="size-2.5 rounded-full border-2 border-white bg-[#4aa8ff]" />
              </span>
              Tu ubicación
            </li>
            <li className="flex items-center gap-2">
              <span className="h-px w-4 bg-[rgba(125,227,255,0.8)]" aria-hidden="true" /> Fronteras
              de país
            </li>
            <li className="flex items-center gap-2">
              <span
                className="w-4 border-t border-dashed border-[rgba(190,210,245,0.8)]"
                aria-hidden="true"
              />{' '}
              Provincias
            </li>
          </ul>
          <p className="mt-2 text-[10px] leading-snug text-muted">
            Fronteras y provincias: Natural Earth.
          </p>
        </div>
      )}
    </div>
  );
}
