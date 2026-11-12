# Registro de cambios

Cambios de SnowView por versión, de la más reciente a la más antigua. Formato inspirado en
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones según
[SemVer](https://semver.org/lang/es/) (ver `docs/VERSIONES.md`). Cada versión es una etiqueta
`v<x.y.z>` de git y su fase tiene un README en `docs/fase-<n>/`.

## [Sin publicar]

## [0.11.0] - 2026-11-12 · fase 9

### Añadido

- Mapa de pistas de cada estación en un cuadro con el estilo de la app: pistas por dificultad
  (verde, azul, roja, negra, fuera de pista), remontes, zoom, arrastre, teclado y capas que se
  pueden ocultar. Se abre desde «Ver mapa de la estación» (al pasar por un pin) y desde «Mapa de
  pistas» en el detalle de la estación (ADR 0012).
- Datos de pistas y remontes de las 10 estaciones, de OpenStreetMap (ODbL), dentro de la app y sin
  conexión; se regeneran con `scripts/build-pistes.mjs`.

### Cambiado

- «Ver mapa de la estación» ahora abre el mapa de pistas además de acercar el mapa de España.

## [0.10.0] - 2026-11-12 · fase 8

### Añadido

- Al pasar el ratón (o el foco del teclado) por un pin del mapa sale una ficha con el nombre, la
  región, las cotas, la distancia y el botón «Ver mapa de la estación».
- Leyenda plegable sobre el mapa, la misma en el mapa de España y en el de cada estación.

### Cambiado

- El pin señalado se dibuja encima de los demás (hay estaciones del Pirineo muy juntas).
- La leyenda sale del panel lateral y pasa al mapa, abajo a la izquierda, con el estilo de las
  fichas de la app.
- El ejemplo del buscador de pueblos ahora es «Madrid, España».

## [0.9.0] - 2026-11-12 · fase 7

### Añadido

- Buscador de pueblos con autocompletado para fijar tu ubicación («Guriezo, Cantabria»), con
  Photon y datos de OpenStreetMap (ADR 0011).
- Mapa acotado: zoom mínimo y límites por los cuatro lados; el mapa base cubre de 17° O a 17° E y
  de 28° N a 53° N.

### Cambiado

- El mapa base es más ancho para que nunca se vea cortado al alejar.
- Fijar la ubicación ya no pide escribir coordenadas.

### Eliminado

- Relieve sombreado y curvas de nivel del mapa (ADR 0010); se conservan las provincias.
- Lectura de coordenadas escritas a mano.

## [0.8.0] - 2026-11-12 · fase 6

### Añadido

- Mapa: líneas de provincias (España), departamentos (sur de Francia) y parroquias (Andorra).
- Mapa: relieve sombreado en tonos fríos del estilo de la app, con más detalle donde hay
  estaciones, y curvas de nivel cada 500 m al acercar. Todo dentro de la app, sin conexión
  (ADR 0010).
- Leyenda del mapa con las nuevas capas y la atribución de los datos (Terrain Tiles y Natural Earth).

### Cambiado

- El instalador crece unos 1,5 MB por las imágenes de relieve.

## Fase 5d - 2026-11-12 (sin versión)

- Repositorio publicado en GitHub (`main` y todas las etiquetas). No cambia el código.

## [0.7.1] - 2026-11-12 · fase 5c

### Añadido

- Ubicación fijada a mano en el mapa: pulsando en él o escribiendo coordenadas; manda sobre la del
  equipo y se guarda en él.
- Precisión de la ubicación del equipo visible (±X km), con aviso si pasa de 5 km y círculo en el
  mapa si pasa de 300 m.
- Mapa interactivo: rueda para acercar, arrastrar para mover y botones + y −.

### Corregido

- La ubicación del equipo podía quedar a decenas de kilómetros de donde estás (Windows la calcula por
  la red): ahora se pide con alta precisión y se puede corregir.

## [0.7.0] - 2026-11-12 · fase 5b

### Añadido

- Pantalla Mapa: mapa propio en SVG con zoom animado del mundo a España, pin rojo en cada estación
  (mismo formato en el mapa y en la leyenda), zoom sobre la zona de la estación elegida, ciudades de
  referencia y tu ubicación con un aviso discreto si no está activada (ADR 0009).
- Distancia en línea recta a cada estación y rutas en coche (tiempo con tráfico, retraso, peajes) y
  en autobús (tiempo, tarifa, líneas) con Google Routes API.
- Ajustes: clave de Google Maps de cada usuario, guardada solo en su equipo.
- Control de versiones documentado: etiquetas `v0.1.0` a `v0.6.0`, `docs/VERSIONES.md` y este
  registro de cambios.

### Cambiado

- `fetchJson` admite POST y cabeceras y distingue el error de clave rechazada.
- Las ramas de fases cerradas se borran al fusionarlas, para que no choquen con sus etiquetas.

### Seguridad

- La clave de Google no va en el código ni en el instalador: cada persona usa la suya.
- La CSP de Tauri permite conectar con `routes.googleapis.com`.

### Sin verificar

- Las rutas no se probaron con una clave real de Google.

## [0.6.0] - 2026-11-12 · fase 5a

### Añadido

- Webcams de las 10 estaciones dentro de la app (48 cámaras): imagen que se renueva sola cada 2 a 5
  minutos y reproductor en directo incrustado (feratel, ipcamlive y Skaping), con vista ampliada
  y botón en el inicio. Datos en `stations/webcams.json` (ADR 0008).

### Seguridad

- La política de seguridad (CSP) de Tauri permite solo los orígenes exactos de las cámaras; un
  test comprueba que cubre todas las URL.

## [0.5.0] - 2026-11-12 · fases 4a y 4b

### Añadido

- Estaciones Alto Campoo (cotas verificadas) y Cauterets (cotas sin verificar).
- Valoración de las condiciones para esquiar y hacer snowboard: nota de 0 a 100 por estación y día,
  visible en el inicio (ADR 0007).
- Pantalla Calendario de 3, 7 y 14 días con las mejores estaciones y días para ir.

## [0.4.0] - 2026-11-12 · fases 3a, 3b y 3c

### Añadido

- Ajustes: frecuencia de consulta de la previsión e intensidad de la nevada de fondo.
- Modo sin conexión: la última previsión de cada estación se guarda en disco y se usa si falla la
  consulta, con aviso de su edad.
- Comparador de hasta 4 estaciones con el mejor valor de cada fila marcado.
- Historial de nevadas por temporada con la API histórica de Open-Meteo (ADR 0006).

### Cambiado

- La capa de datos comparte `fetchJson` (límite de peticiones, tiempo máximo y errores) entre la
  previsión y el historial.

## [0.3.0] - 2026-11-12 · fase 1c

### Añadido

- Reglas de aviso («más de 15 cm en 48 h», con viento y temperatura opcionales) y pantalla de
  Alertas para crearlas, editarlas y borrarlas.
- Notificaciones nativas de Windows sin repetir el mismo aviso por la misma nevada (ADR 0005).
- Bandeja del sistema (cerrar la ventana la oculta) y arranque con Windows.

## [0.2.0] - 2026-11-12 · fase 1b

### Añadido

- Previsión real de Open-Meteo a la cota de base y de cima, con errores, falta de conexión y
  límite de peticiones controlados (ADR 0004).
- 8 estaciones del Pirineo, Andorra y Sierra Nevada con cotas verificadas una a una.
- Buscador de estaciones y favoritas guardadas.

### Corregido

- Cotas de Formigal (base 1510 m) y La Molina (base 1667 m).

## [0.1.0] - 2026-11-12 · fase 1a

### Añadido

- Prototipo visual con Tauri 2, React y Tailwind: pantallas con datos simulados, fondo de nieve en
  canvas y navegación (ADR 0003). Primer instalador `.msi` y `.exe`.

## Fase 0 - 2026-11-12 (sin versión)

- Entorno, monorepo pnpm con capas UI → data → core, TypeScript estricto, ESLint, Prettier,
  Vitest, tokens de diseño y ADR 0001.
