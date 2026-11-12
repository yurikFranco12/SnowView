# Progreso de SnowView

Fuente de verdad del avance. Se actualiza al cerrar cada tarea; el documento de claude.ai
(https://claude.ai/artifact/BMqKoCbNUZxdVQAeYFY14L) se sincroniza desde aquí al cerrar cada fase.

## Estado

- **Fase actual:** 1a, prototipo visual (sin empezar).
- **Fase 0:** completada el 2026-11-12. Commit `b89ef2d`. Detalle en `docs/fase-0/README.md`.
- `pnpm check` en verde (tipos, ESLint, Prettier, 3 tests).

## Fase 1a — tareas

- [ ] App Tauri 2 en `src-tauri/` con ventana sin marco y barra de título propia
- [ ] App React + Vite + Tailwind v4 en `apps/web`, conectada a los tokens
- [ ] Fuentes Space Grotesk e Inter en local
- [ ] Pantalla de inicio según la maqueta, con datos simulados
- [ ] Fondo de nieve en canvas 2D (reduced-motion, pausa con la ventana oculta)
- [ ] Navegación entre Inicio, Estaciones, Alertas y Ajustes
- [ ] Medir contraste del texto secundario sobre los resplandores
- [ ] Verificar el efecto Mica de Windows 11 en Tauri 2
- [ ] README de la Fase 1a

## Decisiones recientes

| Fecha      | Decisión                                           | Dónde     |
| ---------- | -------------------------------------------------- | --------- |
| 2026-11-12 | Monorepo pnpm con capas UI → data → core           | ADR 0001  |
| 2026-11-12 | TypeScript 6.0, no 7 (typescript-eslint)           | ADR 0001  |
| 2026-11-12 | Progreso en este archivo; claude.ai al cerrar fase | CLAUDE.md |

## Notas de entorno

- pnpm está en `%APPDATA%\npm`, añadido al PATH del usuario el 2026-11-12. Las sesiones abiertas
  antes de ese cambio no lo ven hasta reiniciar la app.

## Próximos pasos

1. Empezar la Fase 1a.
2. Elegir las estaciones de ejemplo (por defecto, Pirineos y Sierra Nevada).
