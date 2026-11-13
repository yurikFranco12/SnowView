# ADR 0006 — Historial de nevadas por temporada

- Estado: aceptada
- Fecha: 2026-11-12

## Datos verificados en la documentación de Open-Meteo (2026-11-12)

- API histórica: `https://archive-api.open-meteo.com/v1/archive` con `start_date` y `end_date`.
- `daily=snowfall_sum` llega en **cm**. Con variables diarias, `timezone` es obligatorio.
- Datos desde 1940 (ERA5, unos 25 km) con **5 días de retraso**. Admite `elevation`.

## Decisiones

1. **Temporada = del 1 de octubre al 31 de mayo**, identificada por el año en que empieza
   (2025/26 es 2025). De junio a septiembre se muestra la que acaba de terminar.
2. **Una consulta por temporada y estación**, a la cota de la cima, con la zona horaria de la
   estación para que el día sea el día local. Las temporadas cerradas no se vuelven a pedir mientras
   la app esté abierta; la actual se refresca cada 6 h.
3. **La temporada en curso se pide hasta "hoy menos 5 días"** y se marca "en curso"; los días que
   faltan por el retraso no la hacen aparecer incompleta.
4. **Un día de nieve es uno con 1 cm o más**, para no contar el goteo de décimas.
5. **Es un reanálisis de rejilla gruesa**: sirve para comparar temporadas entre sí, no como la
   medición de la estación. La pantalla lo dice.
6. `fetchJson` se extrajo de `openMeteo.ts` a `http.ts` para que previsión e historial compartan el
   límite de peticiones, el tiempo máximo y los errores tipados.

## Consecuencias

- El historial necesita conexión: no se guarda en disco (a diferencia de la previsión).
- La CSP de Tauri añade `https://archive-api.open-meteo.com`.

## Actualización (2026-11-13, fase 14)

La decisión 2 («una consulta por temporada y estación») se cambia por **una sola consulta por
estación que cubre las cinco temporadas**; el resumen de cada una se saca en cliente (`summarizeSeason`
ya descarta los días de fuera). Motivo: con cinco llamadas por estación y un tope propio de 10 por
minuto, al cambiar de estación dos veces seguidas el tope se agotaba y las demás se quedaban
cargando durante el minuto de espera. Ahora son una llamada por estación y el tope propio sube a 30
por minuto (el de Open-Meteo es 600).
