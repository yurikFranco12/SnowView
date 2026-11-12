# Progreso de SnowView

Fuente de verdad del avance. Se actualiza al cerrar cada tarea; el documento de claude.ai
(https://claude.ai/artifact/BMqKoCbNUZxdVQAeYFY14L) se sincroniza desde aquí al cerrar cada fase.
Ramas y etiquetas: `docs/VERSIONES.md`.

## Estado

- **Fase actual:** 1c, alertas y sistema, en la rama `fase-1c`.
- **Fase 1b:** completada el 2026-11-12. Etiqueta `fase-1b`, app 0.2.0. Detalle en
  `docs/fase-1b/README.md`.
- **Fase 0:** completada el 2026-11-12. Etiqueta `fase-0`.
- **Fase 1a:** completada el 2026-11-12. Etiqueta `fase-1a`, app 0.1.0, instaladores `.msi` y `.exe`.
- `pnpm check` en verde (tipos, ESLint, Prettier, 52 tests + 1 en vivo opcional).

## Fase 1c — tareas

- [x] `core/`: reglas del usuario (más de 15 cm en las próximas 48 h, viento y temperatura
      opcionales), episodios de nieve y registro de avisos sin repetir (23 tests)
- [ ] Notificaciones sin repetir (plugin de notificaciones de Tauri)
- [ ] Bandeja del sistema (Rust)
- [ ] Arranque con Windows (plugin autostart)
- [x] Pantalla de Alertas (crear, editar, activar, borrar) y panel del inicio con datos reales
- [ ] Pulido de animaciones y `prefers-reduced-motion`
- [ ] Accesibilidad: contraste AA, ARIA y teclado
- [ ] README de la Fase 1c
- [ ] Cerrar la fase: instalador 0.3.0, fusión en `main`, etiqueta `fase-1c` y sincronizar claude.ai

## Fase 1b — cerrada

Todas las tareas hechas, incluida la verificación de cotas de las 8 estaciones y el instalador 0.2.0.

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
| 2026-11-12 | Cotas verificadas; Formigal base 1510, La Molina base 1667 | stations.json  |

## Notas de entorno

- pnpm 12.18.0 está en `C:\Users\Usuario\AppData\Roaming\npm`, en el PATH del usuario. La primera
  instalación quedó dentro del sandbox de Claude y no llegó al equipo; se repitió desde el terminal
  del usuario el 2026-11-12.
- PowerShell del usuario con la ejecución de scripts deshabilitada: usar `pnpm.cmd dev` en
  PowerShell, o `pnpm dev` en cmd.
- Compilación de Rust: la primera de desarrollo tardó 1 min 33 s; la de producción, 1 min 49 s.
- `pnpm build` descargó WiX 3.14 y NSIS 3.13 la primera vez (los guarda Tauri en caché).

## Próximos pasos

1. Fase 1c: empezar por las reglas en `core/` con tests; después notificaciones, bandeja y autostart.
