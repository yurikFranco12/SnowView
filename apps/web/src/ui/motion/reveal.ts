import type { Transition, Variants } from 'motion/react';

/**
 * Transición entre pantallas.
 *
 * Regla importante: NUNCA animar la opacidad (ni filter, mask o clip-path) de un elemento que
 * CONTENGA paneles de cristal. En Chromium/WebView2 eso convierte al contenedor en "backdrop root"
 * y el backdrop-filter de los hijos deja de ver el fondo: el cristal pierde el desenfoque durante la
 * animación y "salta" al terminar. Por eso el contenedor de la pantalla solo orquesta (stagger) y
 * cada panel anima su propia opacidad con `revealItem`.
 *
 * Además, el desplazamiento de entrada va hacia arriba (y negativo): un desplazamiento hacia abajo
 * desborda el área con scroll y hace aparecer la barra de desplazamiento un instante.
 */

const spring: Transition = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 };

export const screenVariants: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
  exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
};

export const revealItem: Variants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0, transition: spring },
  exit: { opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } },
};
