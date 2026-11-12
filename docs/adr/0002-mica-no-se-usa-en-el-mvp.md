# ADR 0002 — El efecto Mica de Windows 11 no se usa en el MVP

- Estado: aceptada
- Fecha: 2026-11-12

## Contexto

CLAUDE.md pedía verificar si Tauri 2 admite Mica o Acrylic y, si es así, usarlo en lugar del
desenfoque CSS para ahorrar GPU.

## Qué dice la documentación de Tauri 2

Fuente: https://v2.tauri.app/reference/config/ (consultada el 2026-11-12).

- La ventana acepta `windowEffects: { "effects": [...] }`, que **requiere `transparent: true`**.
- Valores para Windows 11: `mica`, `micaDark`, `micaLight`, `tabbed`, `tabbedDark`, `tabbedLight`.
  También `acrylic` y `blur`, que según la documentación rinden mal al mover o redimensionar la
  ventana en Windows 11.

## Decisión

No se activa Mica en el MVP. La ventana es opaca (`backgroundColor: #0a0e2a`) y el cristal de las
tarjetas sigue siendo `backdrop-filter: blur(18px)` en CSS.

## Por qué

1. **Mica no sustituye al desenfoque de las tarjetas.** Es un efecto de la ventana entera: tiñe el
   fondo con el color del escritorio. No se puede aplicar por tarjeta, así que no ahorra el
   `backdrop-filter` de cada panel de cristal.
2. **Choca con la dirección visual aprobada.** Para que Mica se vea, el fondo de la app tiene que ser
   transparente, y entonces desaparece el degradado "Aurora nocturna" con sus resplandores. El
   resultado sería gris azulado, según el fondo de escritorio de cada usuario.
3. **La ventana transparente tiene costes**: posible destello blanco al abrir (la documentación
   recomienda `noRedirectionBitmap` en Windows) y más trabajo de composición.

## Consecuencias

- El coste de GPU del desenfoque CSS se mide en el equipo real. Si es alto, primero se reduce el
  radio de desenfoque o se usa un fondo semiopaco sin `backdrop-filter`.
- Se puede revisar en la Fase 1c como opción en Ajustes ("fondo Mica"), si el usuario la quiere.
