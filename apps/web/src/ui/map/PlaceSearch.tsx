import {
  MIN_QUERY_LENGTH,
  PLACE_SEARCH_ATTRIBUTION,
  createPlaceSearch,
  isForecastError,
  type PlaceResult,
} from '@snowview/data';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

const placeSearch = createPlaceSearch();
/** Espera, tras la última tecla, antes de buscar: no se pide una búsqueda por cada letra. */
const DEBOUNCE_MS = 300;

function errorText(error: unknown): string {
  if (isForecastError(error)) {
    if (error.kind === 'offline') return 'Sin conexión con el buscador de lugares.';
    if (error.kind === 'rate-limited') return 'Demasiadas búsquedas seguidas. Espera un momento.';
  }
  return 'No se pudo buscar. Inténtalo de nuevo.';
}

/**
 * Buscador de pueblos con autocompletado (patrón ARIA «combobox» con lista): se escribe, aparecen
 * sugerencias como «Guriezo, Cantabria» y se elige con el ratón o con las flechas y Enter.
 */
export function PlaceSearch({
  onPick,
  onClose,
}: {
  onPick: (place: PlaceResult) => void;
  onClose: () => void;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // El texto que se busca va con retraso respecto al que se escribe.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(text.trim());
      setActive(0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const enabled = query.length >= MIN_QUERY_LENGTH;
  const search = useQuery({
    queryKey: ['places', query],
    enabled,
    queryFn: ({ signal }) => placeSearch.search(query, { signal }),
    staleTime: 10 * 60_000,
    retry: false,
    placeholderData: keepPreviousData,
  });
  const results = enabled ? (search.data ?? []) : [];
  const typing = text.trim() !== query; // todavía esperando a que pare de escribir
  const busy = enabled && (search.isFetching || typing);

  const choose = (place: PlaceResult | undefined) => {
    if (place) onPick(place);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown' && results.length > 0) {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp' && results.length > 0) {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[11px] text-muted">
        Busca tu pueblo o ciudad
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={results.length > 0 ? `${id}-opt-${active}` : undefined}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Madrid, España"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-[10px] border border-white/10 bg-white/[0.06] py-1.5 pr-2.5 pl-8 text-xs text-text placeholder:text-muted focus:border-ice/50 focus:outline-none"
        />
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label="Lugares encontrados"
        hidden={results.length === 0}
        className="flex max-h-56 flex-col gap-0.5 overflow-y-auto rounded-xl border border-white/10 bg-[#0d1340]/95 p-1"
      >
        {results.map((place, i) => (
          <li
            key={place.id}
            id={`${id}-opt-${i}`}
            role="option"
            aria-selected={i === active}
            // mousedown, no click: elige antes de que el campo pierda el foco
            onMouseDown={(e) => {
              e.preventDefault();
              choose(place);
            }}
            onMouseEnter={() => setActive(i)}
            className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs ${i === active ? 'bg-ice/[0.16]' : ''}`}
          >
            <span className="block font-semibold">{place.name}</span>
            <span className="block text-[11px] text-muted">
              {[place.county, place.state, place.country].filter(Boolean).join(' · ')}
            </span>
          </li>
        ))}
      </ul>

      <p className="min-h-4 text-[11px]" role="status" aria-live="polite">
        {!enabled
          ? text.trim().length > 0
            ? `Escribe al menos ${MIN_QUERY_LENGTH} letras.`
            : ''
          : search.isError
            ? errorText(search.error)
            : busy && results.length === 0
              ? 'Buscando…'
              : !busy && results.length === 0
                ? 'No encuentro ese lugar. Prueba con otro nombre.'
                : ''}
      </p>
      <p className="text-[10px] leading-snug text-muted">{PLACE_SEARCH_ATTRIBUTION}</p>
    </div>
  );
}
