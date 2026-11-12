# Fase 1b — Datos reales

Estado: en curso en la rama `fase-1b` (2026-11-12). Decisiones en
[ADR 0004](../adr/0004-capa-de-datos-open-meteo.md).

## Qué incluye

- **`packages/core`**: modelos (`Station`, `HourlyPoint`, `StationForecast`), conversión de
  unidades a cm, acumulado en ventana de N horas, nieve por día local y textos de los códigos de
  tiempo WMO.
- **`packages/data`**: cliente de Open-Meteo (base y cima en una llamada, normalización a cm,
  errores tipados, tiempo máximo, cancelación, límite de peticiones) y lista curada de estaciones con
  buscador sin tildes.
- **`stations/stations.json`**: 8 estaciones del Pirineo, Andorra y Sierra Nevada.
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

## Pendiente

- Verificar una a una las cotas de base y cima de `stations.json` (campo `elevationsVerified`).
- Las reglas de la pantalla de inicio siguen siendo de ejemplo: llegan en la Fase 1c.
