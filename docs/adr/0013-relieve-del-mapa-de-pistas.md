# ADR 0013 — Relieve en el mapa de pistas

- Estado: aceptada
- Fecha: 2026-11-12

## Contexto

El mapa de pistas (ADR 0012) solo dibujaba líneas sobre un fondo liso. El usuario quiere ver la
forma de la montaña, con las pistas en su sitio, como en los planos oficiales.

## Decisiones

1. **Altitudes de Terrain Tiles** (Mapzen en AWS, formato «terrarium»: SRTM y otros modelos, ~30 m
   por píxel). `scripts/build-terrain.mjs` descarga las teselas de zoom 12 que cubren las pistas,
   decodifica el PNG (sin dependencias) y guarda una malla de unos 9.000 puntos por estación
   (25 a 45 KB) en `apps/web/src/ui/map/data/terrain/`. Se probó antes la API de elevación de
   Open-Meteo, pero su límite horario (5.000 coordenadas) no permite cubrir las 10 estaciones.
2. **Relieve calculado en la app** (`terrain.ts`, TypeScript puro y con tests): sombreado de
   Horn con el sol al noroeste, tonos azul noche a azul hielo, y curvas de nivel por «marching
   squares» cada 100 m (cada 500 m más marcadas).
3. **Silueta de la montaña**: la opacidad del relieve cae con la distancia a las pistas y
   remontes (transformada de distancia, 1,5 km de alcance), así que queda la forma de la montaña y
   no un rectángulo. Las curvas de nivel se recortan igual.
4. **Capas opcionales**: relieve y curvas se ocultan desde la leyenda. Si una estación no tuviera
   malla, el mapa sigue funcionando solo con las pistas.
5. **Cotas al pasar por una pista**: se interpola la malla en sus extremos y se muestra salida,
   llegada y desnivel (aproximados: modelo de terreno, no medida de la pista).
6. La carga de pistas y terreno es diferida (`import.meta.glob`), solo al abrir el cuadro.
