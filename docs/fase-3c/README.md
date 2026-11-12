# Fase 3c — Historial de nevadas

Estado: **completada** el 2026-11-12. Etiqueta `fase-3c`, app 0.4.0. Decisiones en
[ADR 0006](../adr/0006-historial-de-nevadas.md).

## Qué incluye

- **`packages/core`**: temporadas (1 oct a 31 may), resumen por temporada (total, días de nieve,
  mayor nevada, nieve por mes, datos que faltan) con 14 tests.
- **`packages/data`**: cliente de la API histórica de Open-Meteo con los mismos límites y errores
  que la previsión (11 tests).
- **Pantalla Historial**: elige estación, ve las últimas 5 temporadas comparadas y el detalle de la
  elegida con la nieve por mes.

## Cómo probar

```bash
pnpm check
```

## Instaladores (app 0.4.0)

Generados con `pnpm.cmd build` en el terminal del usuario, en `src-tauri/target/release/bundle/`:

| Archivo                             | Tamaño   |
| ----------------------------------- | -------- |
| `msi/SnowView_0.4.0_x64_en-US.msi`  | 4,25 MiB |
| `nsis/SnowView_0.4.0_x64-setup.exe` | 3,11 MiB |

Incluyen también las fases 3a (ajustes y modo sin conexión) y 3b (comparador).
