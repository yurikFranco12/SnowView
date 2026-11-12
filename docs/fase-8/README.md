# Fase 8 — Ficha del pin y leyenda del mapa

Estado: **completada** el 2026-11-12. Etiquetas `fase-8` y `v0.10.0`.

## Qué cambia

- **Ficha al pasar por un pin**: aparece sobre (o bajo) el pin con el nombre, la región, las cotas
  de base y cima, la distancia en línea recta si hay ubicación y el botón **Ver mapa de la
  estación**, que hace el zoom a la estación. Se queda abierta mientras el puntero esté en el pin o
  en la ficha, y también funciona con el foco del teclado. Se cierra si el mapa se mueve.
- **Pines juntos**: el pin señalado o elegido se dibuja encima de los demás.
- **Leyenda sobre el mapa**: plegable, abajo a la izquierda, con el mismo estilo que las fichas. Es
  la misma en el mapa de España y en el de cada estación; ya no está en el panel lateral.

## Cómo probar

```bash
pnpm check
```

Abre Mapa, pasa el ratón por un pin y pulsa «Ver mapa de la estación». Pliega y despliega la leyenda.

## Instaladores (app 0.10.0)

Generados con `pnpm.cmd build` en el terminal del usuario, en `src-tauri/target/release/bundle/`.

| Archivo                         | Tamaño   |
| ------------------------------- | -------- |
| `SnowView_0.10.0_x64_en-US.msi` | 4,47 MiB |
| `SnowView_0.10.0_x64-setup.exe` | 3,34 MiB |
