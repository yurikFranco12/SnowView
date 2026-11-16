# ADR 0019 — Catálogo completo de estaciones y resumen ligero

- Estado: aceptada
- Fecha: 2026-11-15

## Contexto

La app tenía 10 estaciones elegidas y verificadas a mano. Se piden todas las de España, Francia y
Portugal, tanto en la app de escritorio como en la de Android. Son cientos, y eso rompe tres cosas
que con 10 no importaban:

- **De dónde salen.** Verificar a mano cientos de estaciones (coordenadas, cotas, provincia) no es
  viable ni se puede repetir cuando abra o cierre alguna.
- **El límite gratuito de Open-Meteo** (600 llamadas por minuto, 5.000 por hora, 10.000 por día, y
  cada ubicación de una llamada cuenta como una). La clasificación y el calendario pedían la
  previsión completa de todas las estaciones: con cientos, una sola visita gastaría buena parte del
  día.
- **La interfaz.** Desplegables, botones y pines pensados para 10 elementos.

## Decisiones

1. **El catálogo se genera con un script, no a mano** (`scripts/build-stations-download.mjs` y
   `scripts/build-stations.mjs`). Una estación es un dominio de OpenStreetMap
   (`landuse=winter_sports` o relación `site=piste`) que tiene remontes en servicio y al menos 20 km
   de pistas de esquí alpino. Con ese mínimo, pedido por el usuario tras ver las 297 que salían sin
   él (40 km en Francia), quedan 74; las pequeñas y los centros de esquí de fondo quedan fuera. Los remontes abandonados llevan otra etiqueta en
   OpenStreetMap, así que las estaciones cerradas quedan fuera solas.
   - Por qué OpenStreetMap: es la misma fuente de los mapas de pistas (ADR 0012), su licencia (ODbL)
     permite usarla citándola y da la geometría de los remontes, que es lo que permite calcular las
     cotas. Wikidata se descartó: le faltan muchas estaciones pequeñas y casi todas las cotas.
2. **Cotas estimadas, y dicho en la app.** La base y la cima son la altitud más baja y más alta de
   las estaciones de los remontes según Terrain Tiles, el relieve de los mapas de pistas (ADR 0013).
   Se guardan con `elevationsVerified: false` y la app las rotula «cotas estimadas». Las 10
   estaciones verificadas a mano se conservan tal cual y mandan sobre su equivalente generado.
   - Límite conocido: un telecabina que sube desde el pueblo del valle baja la cota de base respecto
     a la que publica la estación; y la cima es la del remonte más alto, no la del pico.
3. **Resumen ligero para ordenar todas las estaciones** (`packages/data/src/snapshots.ts`). En vez
   de la previsión completa, se pide solo la cima de cada estación con la nieve de cada día y el
   tiempo actual, 100 estaciones por llamada. Se guarda en disco para el modo sin conexión y no se
   vuelve a pedir hasta pasadas 3 horas: ver todo el catálogo cuesta una ubicación por estación,
   como mucho 8 veces al día.
   - La previsión completa (base y cima, hora a hora) se pide solo para las favoritas, la ficha que
     se abre, las estaciones con reglas de aviso y las que se comparan.
   - Consecuencia: la nota del día, que necesita la previsión hora a hora, solo aparece en las
     favoritas. El calendario valora las favoritas o las 10 estaciones con más nieve prevista.
4. **Interfaz para cientos de estaciones.** Clasificación con filtro por país y por favoritas y
   paginada; desplegables agrupados por país con las favoritas primero; en el mapa, puntos en lugar
   de pines con el mapa alejado y lista lateral con buscador; el buscador rápido lista como mucho 12
   coincidencias.
5. **Mapas de pistas y webcams, solo donde ya había.** Los botones se ocultan en las estaciones que
   no los tienen. Generar pistas y relieve para todo el catálogo son decenas de megas dentro del
   instalador y se deja para una fase propia.

## Consecuencias

- Añadir o quitar estaciones es volver a ejecutar los dos scripts; el resultado se revisa en el
  diff de `stations/stations.json`.
- Los nombres vienen de OpenStreetMap, limpiados de prefijos («Estación de esquí de…»). Puede haber
  dominios grandes junto a sus sectores (por ejemplo, un dominio y cada una de sus estaciones).
- El catálogo completo no cambia el compromiso con Open-Meteo: uso gratuito solo no comercial.
