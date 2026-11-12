# Progreso de SnowView

Fuente de verdad del avance. Se actualiza al cerrar cada tarea; el documento de claude.ai
(https://claude.ai/artifact/BMqKoCbNUZxdVQAeYFY14L) se sincroniza desde aquí al cerrar cada fase.
Ramas y etiquetas: `docs/VERSIONES.md`.

## Estado

- **Fase actual:** ninguna en curso. Hecha la 10 (relieve en el mapa de pistas y depuración); app 0.12.0.
- **Fase 1c:** completada el 2026-11-12. Etiqueta `fase-1c`, app 0.3.0. Detalle en
  `docs/fase-1c/README.md`.
- **Fase 1b:** completada el 2026-11-12. Etiqueta `fase-1b`, app 0.2.0. Detalle en
  `docs/fase-1b/README.md`.
- **Fase 0:** completada el 2026-11-12. Etiqueta `fase-0`.
- **Fase 1a:** completada el 2026-11-12. Etiqueta `fase-1a`, app 0.1.0, instaladores `.msi` y `.exe`.
- `pnpm check` en verde (tipos, ESLint, Prettier, 52 tests + 1 en vivo opcional).

## Fase 10 — tareas

- [x] Mallas de altitud de las 10 estaciones (`scripts/build-terrain.mjs`, Terrain Tiles)
- [x] Relieve sombreado con la silueta de la montaña y curvas de nivel en el mapa de pistas; cotas y
      desnivel al pasar por una pista (ADR 0013)
- [x] Depuración: `MapScreen` partido en componentes, pantallas con carga diferida, geometría y
      relieve con tests, foco del cuadro, exportaciones sobrantes
- [x] Instalador 0.12.0, fusión en `main`, etiquetas `fase-10` y `v0.12.0`, push y claude.ai

## Fase 9 — tareas

- [x] Descargar pistas y remontes de las 10 estaciones de OpenStreetMap (`scripts/build-pistes.mjs`)
- [x] Cuadro con el mapa de pistas con el estilo de la app (dificultades, remontes, zoom, capas)
- [x] Abrirlo desde la ficha del pin y desde el detalle de la estación; test de los datos
- [x] Instalador 0.11.0, fusión en `main`, etiquetas `fase-9` y `v0.11.0`, push y claude.ai

## Fase 8 — tareas

- [x] Ficha al pasar el ratón por un pin con el botón «Ver mapa de la estación»
- [x] Leyenda plegable sobre el mapa, con el estilo de las fichas, en todos los mapas
- [x] Instalador 0.10.0, fusión en `main`, etiquetas `fase-8` y `v0.10.0`, push y claude.ai

## Fase 7 — tareas

- [x] Quitar el relieve y las curvas de nivel; dejar solo las provincias
- [x] Mapa acotado: zoom mínimo y límites por los cuatro lados; mapa base más ancho (sin cortes)
- [x] Buscador de pueblos con autocompletado (Photon) en lugar de coordenadas (ADR 0011)
- [x] Instalador 0.9.0, fusión en `main`, etiquetas `fase-7` y `v0.9.0`, push y claude.ai

## Fase 6 — tareas

- [x] Provincias, departamentos y parroquias en el mapa (Natural Earth, malla interior)
- [x] Relieve sombreado en tonos de la app con más detalle donde hay estaciones y curvas de nivel
      cada 500 m (Terrain Tiles; ADR 0010)
- [x] Leyenda y atribución; capas generadas por `scripts/build-map-relief.mjs`
- [x] Instalador 0.8.0, fusión en `main`, etiquetas `fase-6` y `v0.8.0`, push y claude.ai

## Fase 5d — tareas

- [x] Conectar `origin` (<https://github.com/yurikFranco12/SnowView>) y publicar `main` y todas las
      etiquetas; `docs/VERSIONES.md` explica cómo publicar a partir de ahora

## Fase 5c — tareas

- [x] Ubicación a mano: pulsar en el mapa o escribir coordenadas; manda sobre la del equipo
- [x] Precisión de la ubicación del equipo visible, con aviso y círculo en el mapa
- [x] Mapa interactivo: rueda, arrastrar y botones + y −
- [x] Instalador 0.7.1, fusión en `main`, etiquetas `fase-5c` y `v0.7.1`, claude.ai sincronizado

## Fase 5b — tareas

- [x] Ramas de fases cerradas borradas (estaban fusionadas) para evitar nombres ambiguos con las
      etiquetas
- [x] Etiquetas de versión `v0.1.0` a `v0.6.0` sobre los commits de `main`
- [x] `docs/VERSIONES.md` reescrito: ramas, etiquetas, SemVer, mensajes de commit, ciclo de fase y
      publicación en GitHub; `CHANGELOG.md` con todas las versiones
- [x] Mapa de estaciones en SVG con zoom del mundo a España, pines, detalle por estación y leyenda
- [x] Ubicación del usuario con aviso discreto; distancia en línea recta (`core/`, 10 tests)
- [x] Rutas en coche (tráfico, peajes) y autobús con Google Routes (`data/`, 22 tests); clave de
      cada usuario en Ajustes, nunca en el código (ADR 0009)
- [x] Instalador 0.7.0, fusión en `main`, etiquetas `fase-5b` y `v0.7.0`, claude.ai sincronizado
- [ ] Probar las rutas con una clave real de Google (Madrid a Baqueira-Beret, coche y autobús)
- [x] Repositorio de GitHub conectado (`origin`): `main` y las 20 etiquetas publicados el 2026-11-12

## Fase 5a — tareas

- [x] Buscar y comprobar las webcams oficiales de las 10 estaciones (ADR 0008)
- [x] `stations/webcams.json`: 48 cámaras con crédito y página oficial; parser y tests (9 tests)
- [x] Pantalla Webcams: imagen que se renueva, reproductor en directo incrustado y vista ampliada
- [x] CSP de Tauri con los orígenes de imágenes y reproductores; un test comprueba que cubre todas
- [x] Botón Webcams en la estación principal del inicio
- [ ] Probar las cámaras en la app de escritorio instalada (la CSP real solo se ve ahí)

## Fase 4 — tareas

- [x] 4a: estaciones Alto Campoo (cotas verificadas) y Cauterets (cotas sin verificar)
- [x] 4b: nota de condiciones de 0 a 100 para esquí y snowboard en `core/` (ADR 0007, 21 tests)
- [x] 4b: valoración de hoy en el inicio (principal y favoritas)
- [x] 4b: pantalla Calendario de 3, 7 y 14 días con las mejores estaciones y días para ir
- [x] Cerrar: instalador 0.5.0, fusión en `main`, etiquetas `fase-4a` y `fase-4b`, claude.ai
- [ ] Pendiente: verificar las cotas de Cauterets con una fuente oficial

## Fase 3c — tareas

- [x] Verificar la API histórica de Open-Meteo (ADR 0006)
- [x] `core/`: temporadas y resumen por temporada (14 tests)
- [x] `data/`: cliente del historial; `fetchJson` común con la previsión (11 tests)
- [x] Pantalla Historial: últimas 5 temporadas, nieve por mes y mayor nevada; CSP actualizada
- [x] Cerrar la fase: instalador 0.4.0, fusión en `main`, etiqueta `fase-3c` y sincronizar claude.ai

## Fase 3b — tareas

- [x] Pantalla Comparar: hasta 4 estaciones, nieve en cima y base, próximas 48 h, temperatura, viento
      y tiempo, con el mejor valor de cada fila marcado (estrella y texto, no solo color)
- [x] Gráfica de barras de nieve en la cima y tabla accesible (`caption`, `scope`)
- [x] Lógica de destacados y de selección con tests (7 tests)
- [x] Cerrar la fase: fusión en `main` y etiqueta `fase-3b`

## Fase 3a — tareas

- [x] Ajuste: frecuencia de consulta de la previsión (15 min, 30 min, 1 h, 3 h)
- [x] Ajuste: intensidad de la nevada de fondo (sin nieve, suave, normal, intensa)
- [x] Modo sin conexión: la última previsión de cada estación se guarda en disco y se usa si falla
      la consulta, con aviso de su edad (tests de caché)
- [x] Cerrar la fase: fusión en `main` y etiqueta `fase-3a`

## Fase 1c — tareas (cerrada)

- [x] `core/`: reglas del usuario (más de 15 cm en las próximas 48 h, viento y temperatura
      opcionales), episodios de nieve y registro de avisos sin repetir (23 tests)
- [x] Notificaciones sin repetir (plugin de notificaciones de Tauri), con registro en disco
- [x] Bandeja del sistema (Rust): cerrar oculta la ventana; «Salir» en el menú
- [x] Arranque con Windows (plugin autostart) con interruptor en Ajustes
- [x] Probado en el equipo real: notificación nativa, bandeja y arranque con Windows
- [x] Pantalla de Alertas (crear, editar, activar, borrar) y panel del inicio con datos reales
- [x] Animaciones y `prefers-reduced-motion`: las nuevas pantallas usan Motion bajo `MotionConfig`
      (reducedMotion=user) y `motion-safe:`
- [x] Accesibilidad de las pantallas nuevas: etiquetas en formularios, ARIA en barras de progreso y
      botones por regla, foco visible global, colores de los tokens ya medidos con AA
- [x] README de la Fase 1c y ADR 0005
- [x] Cerrar la fase: instalador 0.3.0, fusión en `main`, etiqueta `fase-1c` y sincronizar claude.ai

## Fase 1b — cerrada

Todas las tareas hechas, incluida la verificación de cotas de las 8 estaciones y el instalador 0.2.0.

## Pendiente de fases anteriores

- Medir en el equipo real la frecuencia del fondo de nieve y el coste del desenfoque.

## Decisiones recientes

| Fecha      | Decisión                                                   | Dónde          |
| ---------- | ---------------------------------------------------------- | -------------- |
| 2026-11-12 | Monorepo pnpm con capas UI → data → core                   | ADR 0001       |
| 2026-11-12 | TypeScript 6.0, no 7 (typescript-eslint)                   | ADR 0001       |
| 2026-11-12 | Progreso en este archivo; claude.ai al cerrar fase         | CLAUDE.md      |
| 2026-11-12 | Mica verificado pero no se usa en el MVP                   | ADR 0002       |
| 2026-11-12 | Motion, @fontsource, gráficas a mano, Zustand sin router   | ADR 0003       |
| 2026-11-12 | Una rama por fase; `main` solo con fases terminadas        | VERSIONES.md   |
| 2026-11-12 | Identificador de la app `com.snowview.desktop`             | fase-1a/README |
| 2026-11-12 | Open-Meteo: base y cima en una llamada, UTC y días locales | ADR 0004       |
| 2026-11-12 | Gráficas hechas a mano, sin Recharts ni Visx               | ADR 0004       |
| 2026-11-12 | Aviso por episodio de nieve; cerrar oculta en bandeja      | ADR 0005       |
| 2026-11-12 | Cotas verificadas; Formigal base 1510, La Molina base 1667 | stations.json  |

## Notas de entorno

- pnpm 12.18.0 está en `C:\Users\Usuario\AppData\Roaming\npm`, en el PATH del usuario. La primera
  instalación quedó dentro del sandbox de Claude y no llegó al equipo; se repitió desde el terminal
  del usuario el 2026-11-12.
- PowerShell del usuario con la ejecución de scripts deshabilitada: usar `pnpm.cmd dev` en
  PowerShell, o `pnpm dev` en cmd.
- Compilación de Rust: la primera de desarrollo tardó 1 min 33 s; la de producción, 1 min 49 s.
- `pnpm build` descargó WiX 3.14 y NSIS 3.13 la primera vez (los guarda Tauri en caché).

## Próximos pasos

1. Probar las rutas con una clave real de Google y las webcams en la app instalada.
2. Añadir más estaciones de España, sur de Francia y Andorra: el mapa dibuja las que estén en `stations/stations.json`.
3. Verificar las cotas de Cauterets con una fuente oficial.
4. Tus ajustes y añadidos: se irán pidiendo uno a uno, cada uno en su rama.
