# Registro de cambios

Cambios de SnowView por versión, de la más reciente a la más antigua. Formato inspirado en
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones según
[SemVer](https://semver.org/lang/es/) (ver `docs/VERSIONES.md`). Cada versión es una etiqueta
`v<x.y.z>` de git y su fase tiene un README en `docs/fase-<n>/`.

## [Sin publicar]

Nada todavía.

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
