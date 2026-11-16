import { Minus, Search, Snowflake, Square, X } from 'lucide-react';
import { useAppStore } from '../state/appStore';
import { windowControls } from '../../platform/window';

/**
 * Barra de título propia (la ventana de Tauri no tiene marco). `data-tauri-drag-region` permite
 * arrastrar la ventana desde la barra; doble clic la maximiza.
 */
export function TitleBar() {
  const setPaletteOpen = useAppStore((s) => s.setPaletteOpen);
  const buttonClass =
    'grid h-11 w-12 place-items-center text-text/80 transition-colors hover:bg-white/10 hover:text-text';

  return (
    <header
      data-tauri-drag-region
      className="relative z-20 box-content flex h-11 shrink-0 items-center justify-between border-b border-white/[0.07] bg-bg-start/40 pt-[env(safe-area-inset-top)] pl-4"
    >
      <div
        data-tauri-drag-region
        className="pointer-events-none flex items-center gap-2.5 text-[13px] font-semibold tracking-wide"
      >
        <Snowflake className="size-[18px] text-ice" aria-hidden="true" strokeWidth={1.8} />
        SnowView
      </div>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        aria-label="Buscar estación o pantalla (Ctrl+K)"
        className="mr-3 flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 text-xs text-muted transition-colors hover:bg-white/[0.1] hover:text-text max-md:ml-4 md:absolute md:left-1/2 md:mr-0 md:h-7 md:w-[min(340px,40vw)] md:flex-none md:-translate-x-1/2"
      >
        <Search className="size-3.5" aria-hidden="true" />
        <span className="flex-1 truncate text-left">Buscar estación o pantalla</span>
        <kbd className="hidden rounded border border-white/15 px-1 text-[10px] md:inline">
          Ctrl K
        </kbd>
      </button>

      {windowControls.available ? (
        <div className="flex">
          <button
            type="button"
            aria-label="Minimizar"
            className={buttonClass}
            onClick={() => void windowControls.minimize()}
          >
            <Minus className="size-4" aria-hidden="true" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label="Maximizar o restaurar"
            className={buttonClass}
            onClick={() => void windowControls.toggleMaximize()}
          >
            <Square className="size-3.5" aria-hidden="true" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label="Cerrar"
            className={`${buttonClass} hover:bg-[#c42b1c]`}
            onClick={() => void windowControls.close()}
          >
            <X className="size-4" aria-hidden="true" strokeWidth={1.5} />
          </button>
        </div>
      ) : (
        <span className="max-md:hidden" />
      )}
    </header>
  );
}
