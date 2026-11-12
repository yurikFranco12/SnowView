# Fase 5b — Control de versiones y mapa de estaciones

Estado: **completada** el 2026-11-12. Etiquetas `fase-5b` y `v0.7.0`. Decisiones en
[ADR 0009](../adr/0009-mapa-y-rutas.md) y [VERSIONES](../VERSIONES.md).

## Qué incluye

- **Control de versiones documentado**: ramas, etiquetas `fase-*` y `v*`, SemVer, mensajes de commit,
  ciclo de una fase y publicación en GitHub (`docs/VERSIONES.md`), más el `CHANGELOG.md`.
- **Pantalla Mapa**:
  - Al entrar, el mapa del mundo hace zoom sobre España, el sur de Francia y Andorra.
  - Cada estación es un pin rojo (el mismo dibujo y tamaño para todas), con la misma lista de
    leyenda al lado.
  - Al pulsar un pin o una estación de la lista, zoom animado sobre su zona, con las demás
    estaciones y ciudades de referencia en el mismo formato.
  - Tu ubicación sale como un punto azul. Si no la tienes activada, un aviso discreto ofrece
    activarla o descartarlo.
  - Distancia en línea recta a cada estación en la leyenda.
  - Ficha de la estación con la ruta **en coche** (tiempo con tráfico, retraso sobre lo habitual y
    precio de los peajes) y **en autobús** (tiempo, tarifa, líneas y transbordos), y un botón para
    ver la ruta completa sobre el mapa.
- **Ajustes**: campo para la clave de Google Maps de cada usuario.
- **`core/`**: distancia en línea recta y formato de distancias y duraciones (10 tests).
- **`data/`**: cliente de Google Routes con coche, autobús, peajes, polilíneas y errores (22 tests).
  `fetchJson` admite ahora POST y cabeceras, y distingue el error de clave rechazada.

## Si compartes la app con amigos

La clave de Google **no está** en el instalador. Quien quiera rutas necesita su propia clave:

1. En Google Cloud, crear un proyecto con facturación y activar **Routes API**.
2. Crear una clave de API y restringirla a Routes API. Fijar un presupuesto o cuota diaria baja.
3. Pegarla en **Ajustes → Clave de Google Maps**.

Sin clave todo funciona salvo las rutas: el mapa, la ubicación y la distancia en línea recta se ven
igual. Las peticiones solo se hacen al elegir una estación (coche y autobús) y se guardan 10
minutos.

## Sin verificar

- Las rutas **no se probaron con una clave real**; la interfaz se probó con respuestas simuladas.
  Primera prueba pendiente: Madrid a Baqueira-Beret en coche (peajes) y en autobús.
- La ubicación se probó en el navegador; en la app instalada depende de que Windows tenga la
  ubicación activada.
- Los peajes dependen de que Google tenga datos del país: su documentación no los lista.

## Instaladores (app 0.7.0)

Generados con `pnpm.cmd build` en el terminal del usuario, en `src-tauri/target/release/bundle/`:

| Archivo                             | Tamaño   |
| ----------------------------------- | -------- |
| `msi/SnowView_0.7.0_x64_en-US.msi`  | 4,37 MiB |
| `nsis/SnowView_0.7.0_x64-setup.exe` | 3,24 MiB |
