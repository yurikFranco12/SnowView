# Progreso de SnowView

Fuente de verdad del avance. Se actualiza al cerrar cada tarea; el documento de claude.ai
(https://claude.ai/artifact/BMqKoCbNUZxdVQAeYFY14L) se sincroniza desde aquí al cerrar cada fase.
Ramas y etiquetas: `docs/VERSIONES.md`.

## Estado

- **Fase actual:** 1b, datos reales — funcionando, en la rama `fase-1b`. Detalle en
  `docs/fase-1b/README.md`.
- **Fase 0:** completada el 2026-11-12. Etiqueta `fase-0`.
- **Fase 1a:** completada el 2026-11-12. Etiqueta `fase-1a`, app 0.1.0, instaladores `.msi` y `.exe`.
- `pnpm check` en verde (tipos, ESLint, Prettier, 52 tests + 1 en vivo opcional).

## Fase 1b — tareas

- [x] Verificar en la documentación de Open-Meteo los parámetros y unidades (nieve en cm, grosor en
      m; ADR 0004)
- [x] `core/`: modelos, acumulado en ventana de N horas y nieve por día local (21 tests)
- [x] `data/`: cliente de Open-Meteo con base y cima, normalización a cm, errores, límite de
      peticiones (26 tests de integración + 1 en vivo)
- [x] `stations/`: 8 estaciones con coordenadas verificadas (GeoNames) y fuente
- [x] TanStack Query en la UI; inicio con datos reales, skeletons, errores y estado vacío
- [x] Buscador de estaciones y favoritas guardadas con el plugin de almacenamiento de Tauri
      (comprobado en la app de escritorio)
- [x] Librería de gráficas: se siguen haciendo a mano (ADR 0004)
- [x] Añadir `https://api.open-meteo.com` a la CSP
- [x] README de la Fase 1b
- [ ] Verificar una a una las cotas de base y cima de las estaciones
- [ ] Cerrar la fase: instalador 0.2.0, fusión en `main`, etiqueta `fase-1b` y sincronizar claude.ai

## Pendiente de fases anteriores

- Medir en el equipo real la frecuencia del fondo de nieve y el coste del desenfoque.

## Decisiones recientes

| Fecha      | Decisión                                                   | Dónde          |
| ---------- | ---------------------------------------------------------- | -------------- |
| 2026-11-12 | Monorepo pnpm con capas UI → data → core                   | ADR 0001       |
| 2026-11-12 | TypeScript 6.0, no 7 (typescript-eslint)                   | ADR 0001       |
| 2026-11-12 | Progreso en este archivo; claude.ai al cerrar fase         | CLAUDE.md      |
| 2026-11-12 | Mica verificado pero no se usa en el MVP                   | ADR 0002       |
| 2026-11-12 | Motion, @fontsource, gráficas a mano, Zustand sin router   | ADR 0003       |
| 2026-11-12 | Una rama por fase; `main` solo con fases terminadas        | VERSIONES.md   |
| 2026-11-12 | Identificador de la app `com.snowview.desktop`             | fase-1a/README |
| 2026-11-12 | Open-Meteo: base y cima en una llamada, UTC y días locales | ADR 0004       |
| 2026-11-12 | Gráficas hechas a mano, sin Recharts ni Visx               | ADR 0004       |

## Notas de entorno

- pnpm 12.18.0 está en `C:\Users\Usuario\AppData\Roaming\npm`, en el PATH del usuario. La primera
  instalación quedó dentro del sandbox de Claude y no llegó al equipo; se repitió desde el terminal
  del usuario el 2026-11-12.
- PowerShell del usuario con la ejecución de scripts deshabilitada: usar `pnpm.cmd dev` en
  PowerShell, o `pnpm dev` en cmd.
- Compilación de Rust: la primera de desarrollo tardó 1 min 33 s; la de producción, 1 min 49 s.
- `pnpm build` descargó WiX 3.14 y NSIS 3.13 la primera vez (los guarda Tauri en caché).

## Próximos pasos

1. Fase 1b: datos reales con Open-Meteo. Elegir las estaciones de ejemplo (por defecto, Pirineos y
   Sierra Nevada).
