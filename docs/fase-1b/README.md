# Fase 1b — Datos reales

Estado: **completada** el 2026-11-12. Etiqueta `fase-1b`, app 0.2.0. Decisiones en
[ADR 0004](../adr/0004-capa-de-datos-open-meteo.md).

## Qué incluye

- **`packages/core`**: modelos (`Station`, `HourlyPoint`, `StationForecast`), conversión de
  unidades a cm, acumulado en ventana de N horas, nieve por día local y textos de los códigos de
  tiempo WMO.
- **`packages/data`**: cliente de Open-Meteo (base y cima en una llamada, normalización a cm,
  errores tipados, tiempo máximo, cancelación, límite de peticiones) y lista curada de estaciones con
  buscador sin tildes.
- **`stations/stations.json`**: 8 estaciones del Pirineo, Andorra y Sierra Nevada, con cotas de base y
  cima verificadas una a una (fuente de cada una en `sources.elevationSources`). Correcciones:
  Formigal base 1500 → 1510 m y La Molina base 1700 → 1667 m.
- **Interfaz**:
  - Inicio con datos reales: nieve prevista en la cima en 3/7/14 días, base, próximas 48 h,
    temperatura, viento y estado del tiempo de la hora en curso.
  - Skeletons durante la carga, error con su causa y botón de reintentar, aviso de datos
    incompletos, y estado vacío sin favoritas.
  - Estaciones: buscador, añadir y quitar favoritas, y elegir la principal.
  - Favoritas guardadas en `%APPDATA%\com.snowview.desktop\settings.json`.
  - Atribución de Open-Meteo (CC BY 4.0) y hora de la última actualización.

## Cómo probar

```bash
pnpm dev
```

```bash
pnpm check
```

Para lanzar además el test contra la API real de Open-Meteo:

```bash
SNOWVIEW_LIVE=1 pnpm --filter @snowview/data test
```

En PowerShell: `$env:SNOWVIEW_LIVE='1'; pnpm --filter @snowview/data test`.

## Instaladores (app 0.2.0)

Generados con `pnpm.cmd build` en el terminal del usuario, en `src-tauri/target/release/bundle/`:

| Archivo                             | Tamaño   |
| ----------------------------------- | -------- |
| `msi/SnowView_0.2.0_x64_en-US.msi`  | 3,91 MiB |
| `nsis/SnowView_0.2.0_x64-setup.exe` | 2,90 MiB |

## Pendiente

- Las reglas de la pantalla de inicio siguen siendo de ejemplo: llegan en la Fase 1c.
- Mantener las cotas al día: si una estación cambia, actualizar `stations.json` con su fuente.
