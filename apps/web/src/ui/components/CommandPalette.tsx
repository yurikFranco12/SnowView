import { searchStations } from '@snowview/data';
import {
  Bell,
  CalendarDays,
  ChartColumn,
  House,
  Map as MapIcon,
  Mountain,
  Scale,
  Search,
  Settings,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useAppStore, type View } from '../state/appStore';
import { Modal } from './Modal';

/** Pantallas en el orden de la barra lateral; Ctrl+1…9 abre cada una. */
export const SCREEN_SHORTCUTS: readonly { view: View; label: string; icon: LucideIcon }[] = [
  { view: 'inicio', label: 'Inicio', icon: House },
  { view: 'estaciones', label: 'Estaciones', icon: Mountain },
  { view: 'mapa', label: 'Mapa', icon: MapIcon },
  { view: 'comparar', label: 'Comparar', icon: Scale },
  { view: 'calendario', label: 'Calendario', icon: CalendarDays },
  { view: 'webcams', label: 'Webcams', icon: Video },
  { view: 'historial', label: 'Historial', icon: ChartColumn },
  { view: 'alertas', label: 'Alertas', icon: Bell },
  { view: 'ajustes', label: 'Ajustes', icon: Settings },
];

/** Estaciones que se listan como mucho al buscar. */
const MAX_STATION_RESULTS = 12;

interface Entry {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  run: () => void;
}

/** Quita tildes y mayúsculas para comparar textos. */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Atajos globales: Ctrl+K abre el buscador; Ctrl+1…9 cambia de pantalla. */
export function useGlobalShortcuts(): void {
  const setView = useAppStore((s) => s.setView);
  const setPaletteOpen = useAppStore((s) => s.setPaletteOpen);
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(!useAppStore.getState().paletteOpen);
        return;
      }
      const n = Number(e.key);
      const target = Number.isInteger(n) && n >= 1 ? SCREEN_SHORTCUTS[n - 1] : undefined;
      if (target) {
        e.preventDefault();
        setView(target.view);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setView, setPaletteOpen]);
}

/** Buscador rápido: escribe el nombre de una estación o de una pantalla y pulsa Intro. */
export function CommandPalette() {
  const open = useAppStore((s) => s.paletteOpen);
  if (!open) return null;
  return <PaletteDialog />;
}

function PaletteDialog() {
  const setOpen = useAppStore((s) => s.setPaletteOpen);
  const setView = useAppStore((s) => s.setView);
  const openStation = useAppStore((s) => s.openStation);
  const [text, setText] = useState('');
  const [index, setIndex] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  const entries = useMemo<Entry[]>(() => {
    const q = normalizeText(text);
    // Sin texto no se listan las estaciones (son cientos); buscando, las primeras coincidencias.
    const found = q === '' ? [] : searchStations(text).slice(0, MAX_STATION_RESULTS);
    const stations: Entry[] = found.map((s) => ({
      id: `s-${s.id}`,
      label: s.name,
      hint: `${s.region} · ficha de la estación`,
      icon: Mountain,
      run: () => openStation(s.id),
    }));
    const screens: Entry[] = SCREEN_SHORTCUTS.flatMap((s, i) =>
      q === '' || normalizeText(s.label).includes(q)
        ? [
            {
              id: `v-${s.view}`,
              label: s.label,
              hint: `Pantalla · Ctrl+${i + 1}`,
              icon: s.icon,
              run: () => setView(s.view),
            },
          ]
        : [],
    );
    // Sin texto, primero las pantallas; buscando, primero las estaciones.
    return q === '' ? [...screens, ...stations] : [...stations, ...screens];
  }, [text, openStation, setView]);

  const active = Math.min(index, Math.max(0, entries.length - 1));
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') setIndex(Math.min(entries.length - 1, active + 1));
    else if (e.key === 'ArrowUp') setIndex(Math.max(0, active - 1));
    else if (e.key === 'Enter') entries[active]?.run();
    else return;
    e.preventDefault();
  };

  return (
    <Modal
      label="Buscador rápido"
      onClose={() => setOpen(false)}
      align="top"
      className="glass flex max-h-[70vh] w-[min(560px,100%)] flex-col overflow-hidden !bg-[#0c1238]/95"
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <input
          data-autofocus
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={entries[active] ? `${listId}-${active}` : undefined}
          aria-label="Buscar estación o pantalla"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Buscar estación o pantalla…"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-text placeholder:text-muted focus:outline-none"
        />
        <kbd className="rounded-md border border-white/15 px-1.5 py-0.5 text-[10px] text-muted">
          Esc
        </kbd>
      </div>
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label="Resultados"
        className="overflow-y-auto p-2"
      >
        {entries.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted">Nada coincide con «{text}».</li>
        )}
        {entries.map((entry, i) => {
          const Icon = entry.icon;
          const on = i === active;
          return (
            <li
              key={entry.id}
              id={`${listId}-${i}`}
              data-index={i}
              role="option"
              aria-selected={on}
              onPointerMove={() => setIndex(i)}
              onClick={entry.run}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ${on ? 'bg-ice/[0.14]' : ''}`}
            >
              <Icon
                className={`size-4 shrink-0 ${on ? 'text-ice' : 'text-muted'}`}
                aria-hidden="true"
                strokeWidth={1.8}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{entry.label}</span>
              <span className="shrink-0 text-[11px] text-muted">{entry.hint}</span>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-white/10 px-4 py-2 text-[11px] text-muted">
        ↑ ↓ para moverte · Intro para abrir · Ctrl+K para volver aquí
      </p>
    </Modal>
  );
}
