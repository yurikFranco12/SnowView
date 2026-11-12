# Fase 3b — Comparador de estaciones

Estado: en curso en la rama `fase-3b` (2026-11-12).

## Qué incluye

- **Pantalla Comparar** en la barra lateral: eliges hasta 4 estaciones (por defecto, las primeras
  favoritas) y el periodo (3, 7 o 14 días).
- Gráfica de barras con la nieve prevista en la cima y tabla con nieve en cima y base, próximas
  48 h, temperatura, viento y tiempo.
- Se marca el mejor valor de cada fila con estrella y texto para lectores de pantalla (no solo
  color): más nieve en el periodo, más nieve en 48 h y menos viento.
- Comparte la caché de previsión y el modo sin conexión con el resto de pantallas.

## Cómo probar

```bash
pnpm check
```
