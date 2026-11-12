# ADR 0011 — Mapa acotado y buscador de lugares

- Estado: aceptada
- Fecha: 2026-11-12

## Contexto

Tras la fase 6 (ADR 0010) el usuario pidió quitar el relieve y dejar solo las líneas de provincias.
Además, al alejar el mapa se veía cortado, se podía arrastrar sin límite hacia los lados y fijar la
ubicación pedía escribir coordenadas.

## Decisiones

1. **Se quita el relieve sombreado y las curvas de nivel** (ADR 0010). Se conservan las provincias,
   departamentos y parroquias. Se borran las imágenes, las curvas y el script que las generaba, y se
   quitan las herramientas `pngjs` y `d3-contour`. El instalador vuelve a pesar lo que pesaba.
2. **Mapa acotado.** El mapa detallado cubre de 17° O a 17° E y de 28° N a 53° N (España, Portugal,
   Francia, Italia, Reino Unido, el norte de África y parte de Europa central). El usuario no puede
   alejar más de zoom 12 (con él la pantalla cabe dentro de esa zona) ni arrastrar el mapa fuera de
   ella, por ningún lado: `clampView` ajusta el zoom y el centro en la rueda, el arrastre y los
   botones +/−. La animación de entrada sigue partiendo del mundo entero: el mundo se desvanece
   entre zoom 8 y 12, cuando el mapa detallado ya cubre toda la pantalla, y así no se ve ningún borde
   durante el zoom.
3. **Buscador de pueblos con autocompletado** en lugar de coordenadas. Photon (buscador de
   OpenStreetMap, sin clave) con `layer=city`/`locality`, `lang=default` y un recuadro sobre España,
   el sur de Francia y Andorra. Se espera 300 ms tras escribir, a partir de 3 letras, se cancela la
   búsqueda anterior y hay un límite de 30 búsquedas por minuto. La lista sigue el patrón ARIA
   «combobox» (flechas, Enter y Escape). El lugar elegido se guarda con su nombre («Guriezo,
   Cantabria»). Datos © colaboradores de OpenStreetMap, citados en el panel.
4. **Por qué Photon y no Open-Meteo Geocoding**: Open-Meteo no encuentra Guriezo (solo trae
   poblaciones con cierto tamaño). Nominatim se descartó porque su política prohíbe el autocompletado.
5. Se quita la lectura de coordenadas escritas a mano (`parseLatLng`). Quedan las otras dos formas
   de fijar la ubicación: marcarla en el mapa y la del equipo.

## Consecuencias

- La búsqueda necesita conexión y depende de un servicio público gratuito de uso razonable.
- La CSP de Tauri añade `https://photon.komoot.io` a `connect-src`; un test lo comprueba.
- Un pueblo muy pequeño puede no estar o salir tras homónimos: se puede marcar en el mapa.
