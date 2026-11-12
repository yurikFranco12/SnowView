# ADR 0003 — Decisiones de la interfaz en la Fase 1a

- Estado: aceptada
- Fecha: 2026-11-12

## Decisiones

1. **Paquete `motion` en lugar de `framer-motion`.** Es la misma librería: Framer Motion pasó a
   llamarse Motion y el paquete nuevo es `motion`, que se importa desde `motion/react`. Se usa
   `<MotionConfig reducedMotion="user">` en la raíz para que todas las animaciones respeten
   `prefers-reduced-motion`.
2. **Fuentes con `@fontsource`.** Space Grotesk e Inter se instalan como paquetes npm y Vite las
   empaqueta con la app. Funcionan sin internet y no se pide nada a Google Fonts.
3. **Tokens a Tailwind con `@theme inline`.** Los valores viven en `tokens.css` como variables
   `--sv-*` y `index.css` los expone a Tailwind (`text-ice`, `text-muted`, `font-display`…). Un solo
   sitio para cambiar un color.
4. **Gráficas hechas a mano en la Fase 1a.** Las barras y las mini gráficas de la maqueta son simples.
   La librería (Recharts o Visx) se decide en la Fase 1b, cuando haya ejes, tooltips y datos reales.
5. **Navegación con Zustand, sin router.** Cuatro pantallas en una ventana de escritorio no necesitan
   URLs. Si más adelante hacen falta (enlaces profundos, historial), se añade TanStack Router.
6. **shadcn/ui todavía no.** La Fase 1a no tiene componentes complejos (diálogos, menús, formularios).
   Se incorpora en la Fase 1b o 1c con el primer componente que lo justifique.
7. **Motor de nieve separado del canvas.** `snowEngine.ts` es pura simulación (números, sin DOM) y
   tiene tests; `SnowCanvas.tsx` solo dibuja.
8. **La UI no usa Tauri directamente.** Todo pasa por `apps/web/src/platform/` (ahora,
   `window.ts`). ESLint lo impone en `src/ui/`. En el navegador, los botones de ventana se ocultan.
9. **Ventana sin marco** (`decorations: false`) con barra de título propia y `shadow: true`, que en
   Windows 11 da borde fino y esquinas redondeadas. Permisos mínimos en `capabilities/default.json`:
   minimizar, maximizar, cerrar y arrastrar.
10. **Transiciones que no rompen el cristal.** Nunca se anima `opacity` (ni `filter`, `mask`,
    `clip-path` o `will-change` de esas propiedades) en un elemento que contenga paneles con
    `backdrop-filter`: en Chromium/WebView2 ese contenedor pasa a ser "backdrop root" y el cristal
    pierde el desenfoque durante la animación. Cada panel anima su propia opacidad
    (`ui/motion/reveal.ts`) y el contenedor de la pantalla solo escalona. La entrada se desplaza
    hacia arriba (y negativo) para no desbordar el área con scroll. Medido: 0 frames con el cristal
    roto (antes 418 de 578) y 0 con barra de desplazamiento (antes 129).
11. **CSP estricta** en `tauri.conf.json`: solo recursos propios. `style-src 'unsafe-inline'` es
    necesario porque Motion anima con estilos en línea. La conexión a `api.open-meteo.com` se añade
    en la Fase 1b.
