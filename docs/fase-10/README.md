# Fase 10 — Relieve en el mapa de pistas y depuración

Estado: **completada** el 2026-11-12. Etiquetas `fase-10` y `v0.12.0`. Decisiones en el
[ADR 0013](../adr/0013-relieve-del-mapa-de-pistas.md).

## Qué cambia

- **La forma de la montaña**: bajo las pistas, relieve sombreado en los tonos de la app, con la
  silueta recortada alrededor de las pistas, y curvas de nivel cada 100 m. Relieve y curvas se
  ocultan desde la leyenda.
- **Cotas**: al pasar por una pista o un remonte se ve de qué cota a qué cota va y su desnivel.
- **Depuración**:
  - `MapScreen.tsx` pasa de 770 a unas 240 líneas; sus piezas viven en `ui/map/`
    (`StationDetail`, `RouteCards`, `LocationPanel`, `LocationAlert`, `MapLegend`,
    `StationHoverCard`, `PinIcon`).
  - La geometría (`pisteScene.ts`) y el relieve (`terrain.ts`) son TypeScript puro con tests.
  - Las pantallas se cargan al abrirlas: el paquete inicial baja de 1,26 MB a unos 260 KB.
  - El cuadro del mapa de pistas atrapa el foco y lo devuelve al cerrarse.
  - Se quitan exportaciones sin uso.

## Cómo probar

```bash
pnpm check
```

Abre Mapa, elige una estación, «Mapa de pistas». Para regenerar los datos:
`node scripts/build-pistes.mjs` y `node scripts/build-terrain.mjs`.

## Instaladores (app 0.12.0)

Generados con `pnpm.cmd build` en el terminal del usuario, en `src-tauri/target/release/bundle/`.

| Archivo                         | Tamaño   |
| ------------------------------- | -------- |
| `SnowView_0.12.0_x64_en-US.msi` | 4,70 MiB |
| `SnowView_0.12.0_x64-setup.exe` | 3,57 MiB |
