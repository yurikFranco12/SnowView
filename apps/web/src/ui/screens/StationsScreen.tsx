import { searchStations, type CuratedStation } from '@snowview/data';
import { Crown, Search, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useId, useMemo, useState } from 'react';
import { revealItem } from '../motion/reveal';
import { useFavorites } from '../state/favoritesStore';

function StationRow({ station }: { station: CuratedStation }) {
  const ids = useFavorites((s) => s.ids);
  const toggle = useFavorites((s) => s.toggle);
  const makeMain = useFavorites((s) => s.makeMain);
  const favorite = ids.includes(station.id);
  const isMain = ids[0] === station.id;

  return (
    <li className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-3.5 transition-colors hover:bg-white/[0.07]">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[15px] font-semibold">
          {station.name}
          {isMain && (
            <span className="rounded-full bg-ice/[0.14] px-2 py-0.5 text-[11px] font-medium text-ice">
              Principal
            </span>
          )}
        </p>
        <p className="text-xs text-muted">
          {station.region} · base {station.baseElevationM.toLocaleString('es-ES')} m · cima{' '}
          {station.topElevationM.toLocaleString('es-ES')} m
          {!station.elevationsVerified && ' · cotas por verificar'}
        </p>
      </div>
      {favorite && !isMain && (
        <button
          type="button"
          onClick={() => makeMain(station.id)}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-muted transition-colors hover:bg-white/[0.08] hover:text-text"
        >
          <Crown className="size-3.5" aria-hidden="true" />
          Hacer principal
        </button>
      )}
      <button
        type="button"
        onClick={() => toggle(station.id)}
        aria-pressed={favorite}
        aria-label={`${favorite ? 'Quitar' : 'Añadir'} ${station.name} ${favorite ? 'de' : 'a'} favoritas`}
        className="grid size-10 place-items-center rounded-xl transition-colors hover:bg-white/[0.08]"
      >
        <Star
          className={`size-5 ${favorite ? 'fill-ice text-ice' : 'text-muted'}`}
          aria-hidden="true"
          strokeWidth={1.6}
        />
      </button>
    </li>
  );
}

export function StationsScreen() {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchStations(query), [query]);
  const inputId = useId();
  const count = useFavorites((s) => s.ids.length);

  return (
    <div className="flex h-full flex-col gap-5 px-8 py-[26px]">
      <motion.header variants={revealItem} className="flex items-end justify-between gap-6">
        <div>
          <p className="text-xs tracking-[0.14em] text-muted uppercase">
            {count} {count === 1 ? 'favorita' : 'favoritas'}
          </p>
          <h1 className="mt-1.5 font-display text-4xl font-semibold tracking-tight">Estaciones</h1>
        </div>
        <div className="relative w-80">
          <label htmlFor={inputId} className="sr-only">
            Buscar estación por nombre o región
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar estación o región"
            autoComplete="off"
            className="w-full rounded-[14px] border border-white/10 bg-white/[0.06] py-2.5 pr-3 pl-10 text-sm text-text placeholder:text-muted focus:border-ice/50 focus:outline-none"
          />
        </div>
      </motion.header>

      <motion.section
        variants={revealItem}
        aria-label="Resultados"
        className="glass flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5"
      >
        <p className="text-xs text-muted" aria-live="polite">
          {results.length === 0
            ? 'Ninguna estación coincide con la búsqueda.'
            : `${results.length} ${results.length === 1 ? 'estación' : 'estaciones'}. La primera favorita es la principal.`}
        </p>
        <ul className="flex flex-col gap-2">
          {results.map((s) => (
            <StationRow key={s.id} station={s} />
          ))}
        </ul>
      </motion.section>
    </div>
  );
}
