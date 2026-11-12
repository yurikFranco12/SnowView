# ADR 0004 — Capa de datos con Open-Meteo

- Estado: aceptada
- Fecha: 2026-11-12

## Datos verificados en la documentación de Open-Meteo (2026-11-12)

- `snowfall` llega en **cm** (nieve de la hora anterior). `snow_depth` llega en **metros**.
- `elevation` aplica downscaling estadístico a la cota indicada y admite una lista.
- `timeformat=unixtime` da instantes UTC en segundos.
- Uso gratuito no comercial: 600 llamadas/minuto, 5.000/hora y 10.000/día; datos CC BY 4.0.
- Errores: HTTP 400 con `{"error": true, "reason": "..."}`. No se documenta el código al superar el
  límite; se trata el 429 con `Retry-After` por si llega.

## Decisiones

1. **Una sola llamada por estación con base y cima.** `latitude`, `longitude` y `elevation` van en
   lista de dos valores; la respuesta es una lista de dos ubicaciones. La cifra grande es la de la
   cima, que es donde suele importar la nieve; la base se muestra al lado.
2. **Horas en UTC y días locales en `core/`.** El acumulado de N horas trabaja con instantes UTC,
   así que 48 h son 48 horas reales también con cambio de hora. Los totales diarios se agrupan por
   el día local de la estación (`Intl` con su zona IANA): el día del cambio de hora tiene 23 o 25
   horas y se respeta.
3. **Normalización por la unidad declarada.** `data/` lee `hourly_units` de cada respuesta y
   convierte a cm (`mm`, `cm` o `m`). Una unidad desconocida es un error, no un valor dudoso.
4. **Nulos ≠ 0.** Un dato que falta queda como `null` y marca la ventana como incompleta; la UI lo
   avisa. Series de distinta longitud o sin horas son `invalid-data`.
5. **Errores tipados** (`ForecastError.kind`): `offline`, `timeout`, `rate-limited`, `provider`,
   `invalid-data`, `aborted`. La UI muestra un mensaje por tipo y solo se reintenta lo reintentable.
6. **Límite de peticiones propio**: 30 por minuto (20 veces por debajo del de Open-Meteo), y pausa
   global tras un 429. Más TanStack Query: 30 min de frescura, refresco cada hora y caché en memoria.
7. **Interfaz de proveedor** (`ForecastProvider`). La UI solo la conoce a través de
   `ui/data/forecast.ts`; cambiar de proveedor es una línea.
8. **Lista curada en `stations/stations.json`**, validada al cargar (coordenadas en rango, cima por
   encima de la base, ids únicos, zona horaria válida). Coordenadas de la API de geocodificación de
   Open-Meteo (GeoNames, CC BY 4.0); cotas de las estaciones, marcadas como pendientes de verificar.
9. **Favoritas con el plugin de almacenamiento de Tauri** detrás de `platform/storage.ts`
   (localStorage en el navegador). La primera favorita es la estación principal.
10. **Gráficas: se siguen haciendo a mano.** Con los datos reales, las gráficas siguen siendo barras
    por día y una línea pequeña: no hacen falta ejes, zoom ni tooltips complejos. Recharts añadiría
    unos 100 KB y Visx más código propio. Se revisa si llega una gráfica horaria detallada.

## Tests

- `core/`: 21 tests (ventana vacía, nulos, NaN, duplicados, cambio de hora, fin de año, unidades,
  códigos de tiempo).
- `data/`: 26 tests de integración con una respuesta real guardada en `__fixtures__/` (base y cima,
  m → cm, mm, datos incompletos, longitudes distintas, 400, 429 con Retry-After, 503, sin conexión,
  tiempo agotado, cancelación) y 1 test en vivo que se activa con `SNOWVIEW_LIVE=1`.
