/** Pin rojo de la leyenda: el mismo dibujo que el del mapa. */
export function PinIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"
        fill="#ff4d5e"
        stroke="#ffffff"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="10" r="3" fill="#ffffff" />
    </svg>
  );
}
