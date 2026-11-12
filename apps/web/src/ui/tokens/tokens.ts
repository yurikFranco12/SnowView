/**
 * Tokens de diseño de SnowView — dirección A, "Aurora nocturna".
 *
 * Fuente de verdad en TypeScript (para el canvas de nieve y las gráficas). `tokens.css` expone los
 * mismos valores como variables CSS para Tailwind y los componentes. Si cambias uno, cambia el otro.
 * Valores tomados de la maqueta aprobada (ver CLAUDE.md).
 */
export const tokens = {
  color: {
    bg: {
      start: '#0a0e2a',
      mid: '#111847',
      end: '#0b1032',
      glowTopRight: '#2b3aa0',
      glowBottomLeft: '#0e6486',
    },
    accent: {
      ice: '#7DE3FF',
      indigo: '#A5B4FF',
    },
    text: {
      primary: '#EAF2FF',
      // Contraste AA sobre el cristal en el fondo base (6.8–7.8 : 1). NO cumple AA donde el
      // resplandor llega a su color pleno (3.8 y 2.7 : 1): ver docs/fase-0/README.md.
      secondary: '#9FB3D9',
    },
  },
  glass: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(255, 255, 255, 0.12)',
    blur: '18px',
    radius: '20px',
    shadow: '0 10px 40px rgba(0, 0, 0, 0.35)',
  },
  font: {
    display: "'Space Grotesk', system-ui, sans-serif",
    body: 'Inter, system-ui, sans-serif',
    weight: {
      display: [500, 600, 700],
      body: [400, 500, 600],
    },
  },
} as const;

export type Tokens = typeof tokens;
