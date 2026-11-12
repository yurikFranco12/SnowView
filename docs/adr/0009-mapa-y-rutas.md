# ADR 0009 — Mapa de estaciones, ubicación y rutas

- Estado: aceptada
- Fecha: 2026-11-12

## Contexto

Se quiere un mapa de España con las estaciones (Pirineos, resto de España, sur de Francia y
Andorra), con animación de zoom, la ubicación del usuario, la distancia a cada estación y la ruta en
coche (con tráfico y peajes) y en autobús. La app se va a repartir entre amigos.

## Decisiones

1. **Mapa propio en SVG, sin teselas ni red.** `d3-geo` proyecta (Mercator), `topojson-client` lee
   `world-atlas` (Natural Earth, dominio público). El mundo viene de `countries-110m` y el detalle
   del suroeste de Europa se genera con `scripts/build-map-data.mjs` desde `countries-10m`,
   recortado y simplificado (186 KB). Un solo SVG sirve para todo: el zoom del mundo a España y de
   España a una estación es una transformación animada, no un mapa nuevo. Funciona sin conexión.
   Coste: no hay carreteras ni relieve; solo costas, fronteras, ciudades de referencia y la ruta
   que dibuje Google.
2. **Mismo formato para todas las estaciones**: el mismo pin rojo y el mismo tamaño en pantalla en el
   mapa y en la leyenda, tanto en la vista de España como en la del detalle; la seleccionada solo se
   distingue por un halo y por el fondo de su fila. El tamaño en pantalla es constante porque cada pin
   se encoge 1/zoom dentro de la escena.
3. **Ubicación con la API del navegador** (`navigator.geolocation`). Al entrar solo se consulta el
   permiso; si no está concedido, un aviso discreto ofrece activarla o descartarlo (no vuelve a
   aparecer) y queda un botón en la cabecera. Si Windows la tiene desactivada, el aviso explica dónde
   activarla.
4. **Rutas con Google Routes API** (`computeRoutes`): coche con `TRAFFIC_AWARE` y `TOLLS`, y autobús
   con `TRANSIT` limitado a `BUS`. El retraso por tráfico es `duration − staticDuration`.
5. **La clave de Google NO va en la app.** Si el instalador llevara la clave del autor, cualquiera
   podría extraerla y gastar su cuenta. Cada persona pega la suya en Ajustes; se guarda en su equipo,
   aparte de los demás ajustes, y nunca en git. La API acepta otra URL (`endpoint`) con la misma
   forma, de modo que más adelante se pueda poner un servidor intermedio propio con una sola clave
   y límites, sin cambiar la app.
6. **Poco gasto**: máscara de campos mínima, límite propio de 12 peticiones por minuto, resultado
   guardado 10 minutos, ubicación redondeada a 100 m en la clave de caché, y solo se pide al elegir
   una estación (2 peticiones: coche y autobús). Sin clave o sin ubicación no se pide nada y se
   muestra la distancia en línea recta (haversine, en `core/`).
7. **Honestidad con los datos de Google**: no entrega la lista de accidentes; el tráfico llega como
   minutos de retraso sobre lo habitual y la pantalla lo llama «tráfico o incidencias». La
   documentación no dice en qué países hay datos de peajes: si faltan, se indica «Sin peajes
   previstos» solo cuando Google no devuelve peaje, y «Hay peajes, pero Google no da el precio» si
   los devuelve sin importe. El autobús suele no tener ruta en estaciones sin línea regular.

## Sin verificar

La API de Google **no se ha probado con una clave real** (el desarrollo no tiene una con
facturación). Está comprobada contra su documentación y con respuestas de ejemplo, y la interfaz
con una respuesta simulada. Lo primero que hay que hacer con una clave real es comprobar una ruta
con peajes conocidos (por ejemplo, Madrid a Baqueira-Beret) y una en autobús.

## Consecuencias

- Cada amigo que quiera rutas necesita su propia clave de Google Cloud con facturación activada.
- El mapa de detalle es esquemático: sirve para situarse, no para navegar.
- La CSP de Tauri añade `https://routes.googleapis.com` a `connect-src`; un test lo comprueba.
