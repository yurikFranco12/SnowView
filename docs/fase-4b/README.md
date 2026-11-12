# Fase 4b — Condiciones para esquiar y snowboard

Estado: **completada** el 2026-11-12. Etiqueta `fase-4b`, app 0.5.0. Decisiones en
[ADR 0007](../adr/0007-valoracion-de-condiciones.md).

## Qué incluye

- **`packages/core`**: `dayConditions` resume la previsión por día local y `rateDay` da la nota de
  0 a 100 y la valoración, para esquí o snowboard (21 tests).
- **Inicio**: la estación principal muestra la valoración de hoy para esquí y snowboard con el
  motivo principal; cada favorita muestra la de la disciplina elegida.
- **Calendario**: nueva pantalla con los próximos 3, 7 o 14 días. Muestra las 3 mejores opciones
  para ir (estación y día), una cuadrícula estación por día (con la mejor estación de cada día
  marcada con estrella) y el detalle del día elegido con los datos en los que se basa la nota.
  Se puede valorar todas las estaciones o solo las favoritas.
- **Disciplina** (esquí o snowboard) elegible en el calendario; se guarda en los ajustes.

## Cómo probar

```bash
pnpm check
```

## Instaladores (app 0.5.0)

Generados con `pnpm.cmd build` en el terminal del usuario, en `src-tauri/target/release/bundle/`:

| Archivo                             | Tamaño   |
| ----------------------------------- | -------- |
| `msi/SnowView_0.5.0_x64_en-US.msi`  | 4,25 MiB |
| `nsis/SnowView_0.5.0_x64-setup.exe` | 3,12 MiB |

Incluyen también las estaciones de la fase 4a.
