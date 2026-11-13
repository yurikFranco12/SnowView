import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { lockOverlay } from '../hooks/overlayLock';

/** Cuadros abiertos, del más antiguo al más reciente: solo el de arriba atiende al teclado. */
const stack: symbol[] = [];

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]';

/**
 * Cuadro modal accesible: portal, foco atrapado, Escape y clic fuera para cerrar, y devuelve el foco
 * al cerrarse. `suspended` lo deja inerte mientras hay otro cuadro abierto encima.
 */
export function Modal({
  label,
  onClose,
  children,
  className = '',
  suspended = false,
  align = 'center',
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  suspended?: boolean;
  align?: 'center' | 'top';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const suspendedRef = useRef(suspended);
  useEffect(() => {
    onCloseRef.current = onClose;
    suspendedRef.current = suspended;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const release = lockOverlay();
    const token = Symbol('modal');
    stack.push(token);
    const first = ref.current?.querySelector<HTMLElement>('[data-autofocus]');
    (first ?? ref.current?.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (suspendedRef.current || stack[stack.length - 1] !== token) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      const head = items?.[0];
      const tail = items?.[items.length - 1];
      if (!head || !tail) return;
      const active = document.activeElement;
      const outside = !ref.current?.contains(active);
      if (e.shiftKey && (active === head || outside)) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && (active === tail || outside)) {
        e.preventDefault();
        head.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(token), 1);
      release();
      previous?.focus();
    };
  }, []);

  return createPortal(
    <div
      className={`fixed inset-0 z-40 grid bg-black/60 p-4 backdrop-blur-sm sm:p-8 ${
        align === 'top' ? 'place-items-start justify-items-center pt-[12vh]' : 'place-items-center'
      }`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`sv-pop ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
