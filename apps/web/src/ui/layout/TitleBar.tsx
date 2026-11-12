import { Minus, Snowflake, Square, X } from 'lucide-react';
import { windowControls } from '../../platform/window';

/**
 * Barra de título propia (la ventana de Tauri no tiene marco). `data-tauri-drag-region` permite
 * arrastrar la ventana desde la barra; doble clic la maximiza.
 */
export function TitleBar() {
  const buttonClass =
    'grid h-11 w-12 place-items-center text-text/80 transition-colors hover:bg-white/10 hover:text-text';

  return (
    <header
      data-tauri-drag-region
      className="relative z-20 flex h-11 shrink-0 items-center justify-between border-b border-white/[0.07] bg-bg-start/40 pl-4"
    >
      <div
        data-tauri-drag-region
        className="pointer-events-none flex items-center gap-2.5 text-[13px] font-semibold tracking-wide"
      >
        <Snowflake className="size-[18px] text-ice" aria-hidden="true" strokeWidth={1.8} />
        SnowView
      </div>

      {windowControls.available && (
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
      )}
    </header>
  );
}
