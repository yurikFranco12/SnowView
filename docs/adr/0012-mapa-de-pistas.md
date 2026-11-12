# ADR 0012 — Mapa de pistas de cada estación

- Estado: aceptada
- Fecha: 2026-11-12

## Contexto

El usuario quiere, para cada estación, un mapa de pistas como los planos oficiales (por ejemplo el
de Grandvalira) pero con el estilo de la app, en un cuadro que se abra desde el pin del mapa.

## Decisiones

1. **Datos de OpenStreetMap** (Overpass API): `piste:type=downhill` con su `piste:difficulty` y
   `aerialway=*` en un radio de 12 km. Licencia ODbL: la atribución va en el cuadro. Se descartaron
   dibujar un esquema a mano (impreciso y mucho trabajo) y enlazar el plano oficial (no sigue el
   estilo de la app).
2. **Datos dentro de la app**, no consultados en vivo: un script (`scripts/build-pistes.mjs`) los
   descarga a mano una vez y guarda un JSON por estación (7 a 64 KB) en `apps/web/src/ui/map/data/pistes/`.
   Funciona sin conexión y no depende de Overpass. Se simplifican las líneas (~4 m) y se cargan solo
   al abrir el cuadro (`import.meta.glob` diferido).
3. **Solo la zona de la estación**: se agrupan pistas y remontes que se tocan (a menos de 300 m) y se
   conservan los grupos que llegan a 5 km de la estación, para no mostrar otras estaciones.
4. **Dibujo en SVG propio** con proyección local, zoom con rueda y botones, arrastre, teclado y capas
   que se ocultan. Las pistas negras llevan un halo claro para verse sobre el fondo oscuro.
5. Limitaciones: la calidad depende de OpenStreetMap; no hay sectores con nombre, cotas ni estado de
   pistas abiertas. Alto Campoo tiene pocos datos (35 pistas).
