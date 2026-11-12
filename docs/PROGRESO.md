# Progreso de SnowView

Fuente de verdad del avance. Se actualiza al cerrar cada tarea; el documento de claude.ai
(https://claude.ai/artifact/BMqKoCbNUZxdVQAeYFY14L) se sincroniza desde aquí al cerrar cada fase.
Ramas y etiquetas: `docs/VERSIONES.md`.

## Estado

- **Fase actual:** 1b, datos reales (sin empezar), en la rama `fase-1b`.
- **Fase 0:** completada el 2026-11-12. Etiqueta `fase-0`.
- **Fase 1a:** completada el 2026-11-12. Etiqueta `fase-1a`, app 0.1.0, instaladores `.msi` y `.exe`.
- `pnpm check` en verde (tipos, ESLint, Prettier, 8 tests).

## Fase 1b — tareas

- [ ] Verificar en la documentación de Open-Meteo los parámetros de nieve, grosor, temperatura,
      viento y estado del tiempo, y la unidad de la nieve (cm o mm)
- [ ] `core/`: modelos, acumulado en ventana de N horas (ventana vacía, nulos, cambio de hora,
      unidades) con tests
- [ ] `data/`: cliente de Open-Meteo con elevación de base y cima, normalización a cm, errores, sin
      conexión, datos incompletos y límite de peticiones, con tests de integración
- [ ] `stations/`: lista curada de estaciones con coordenadas, cotas, fuente y licencia
- [ ] TanStack Query en la UI; pantalla de inicio con datos reales y skeletons
- [ ] Buscador de estaciones y favoritas guardadas con el plugin de almacenamiento de Tauri
- [ ] Elegir la librería de gráficas (Recharts o Visx)
- [ ] Añadir `https://api.open-meteo.com` a la CSP
- [ ] README de la Fase 1b

## Pendiente de fases anteriores

- Medir en el equipo real la frecuencia del fondo de nieve y el coste del desenfoque.

## Decisiones recientes

| Fecha      | Decisión                                                 | Dónde          |
| ---------- | -------------------------------------------------------- | -------------- |
| 2026-11-12 | Monorepo pnpm con capas UI → data → core                 | ADR 0001       |
| 2026-11-12 | TypeScript 6.0, no 7 (typescript-eslint)                 | ADR 0001       |
| 2026-11-12 | Progreso en este archivo; claude.ai al cerrar fase       | CLAUDE.md      |
| 2026-11-12 | Mica verificado pero no se usa en el MVP                 | ADR 0002       |
| 2026-11-12 | Motion, @fontsource, gráficas a mano, Zustand sin router | ADR 0003       |
| 2026-11-12 | Una rama por fase; `main` solo con fases terminadas      | VERSIONES.md   |
| 2026-11-12 | Identificador de la app `com.snowview.desktop`           | fase-1a/README |

## Notas de entorno

- pnpm está en `%APPDATA%\npm`, añadido al PATH del usuario el 2026-11-12. Las sesiones abiertas
  antes de ese cambio no lo ven hasta reiniciar la app.
- Compilación de Rust: la primera de desarrollo tardó 1 min 33 s; la de producción, 1 min 49 s.
- `pnpm build` descargó WiX 3.14 y NSIS 3.13 la primera vez (los guarda Tauri en caché).

## Próximos pasos

1. Fase 1b: datos reales con Open-Meteo. Elegir las estaciones de ejemplo (por defecto, Pirineos y
   Sierra Nevada).
