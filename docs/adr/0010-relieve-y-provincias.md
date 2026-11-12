# ADR 0010 — Relieve y provincias en el mapa

- Estado: aceptada
- Fecha: 2026-11-12

## Contexto

Se pidió que el mapa separara las provincias con líneas y mostrara, con un detalle ligero y sutil en
el estilo de la app, el relieve del terreno. El mapa es un SVG propio (ADR 0009), sin teselas.

## Decisiones

1. **Provincias**: Natural Earth admin-1 (dominio público) da las 52 provincias de España, los 101
   departamentos de Francia y las 7 parroquias de Andorra. Se dibuja solo la «malla» interior (las
   líneas compartidas entre dos divisiones del mismo país, sin repetir las fronteras de país), en
   trazo fino discontinuo, y aparecen al acercarse a España.
2. **Relieve sombreado**: a partir de las teselas de elevación Terrain Tiles (formato Terrarium, z8,
   unos 470 m por celda; mezcla de SRTM, EU-DEM de Copernicus y otras fuentes). Se calcula un
   sombreado de ladera con luz desde el noroeste y se pinta en tonos fríos de la app (claro azulado en
   las laderas iluminadas, azul noche en las de sombra, y un tinte algo más claro con la altitud). Es
   un PNG con transparencia: el mar queda sin pintar y el fondo de la app se ve a través.
3. **Dos resoluciones**: una imagen general de toda la zona a unos 1,8 km por celda (680 KB) y dos
   de detalle a resolución completa solo donde hay estaciones: Pirineos y cornisa cantábrica
   (790 KB) y Sierra Nevada (47 KB). Al acercarse, el detalle aparece y la general se atenúa. Así el
   relieve nítido no pesa lo que pesaría cubrir todo con esa resolución.
4. **Curvas de nivel cada 500 m** (de 500 a 3500 m, las de 1000 m algo más marcadas), vectoriales y
   muy tenues, que aparecen al acercarse. Se cargan solo al abrir el mapa (un archivo de ~0,5 MB).
5. **Todo se genera una vez, no al usar la app**: `scripts/build-map-relief.mjs` descarga nada; lee
   las teselas y el archivo de Natural Earth que se le indican y escribe los archivos de
   `apps/web/src/ui/map/data/`. Los datos de origen no van en el repositorio. Los archivos
   generados se excluyen de Prettier (`.prettierignore`).
6. **Atribución** en la leyenda del mapa: Terrain Tiles (SRTM, EU-DEM de Copernicus y otras
   fuentes) y Natural Earth.

## Consecuencias

- El relieve añade unos 1,5 MB al instalador.
- Con celdas de 470 m el detalle es el de una carta general, no el de un mapa topográfico de
  senderismo; es un adorno que ayuda a ver dónde están las montañas.
- Para regenerar o ampliar la zona hay que volver a descargar las teselas (≈ 25 MB) y Natural Earth
  (≈ 40 MB) y ejecutar el script.
- Las parroquias de Andorra se dibujan con el mismo trazo que las provincias.
