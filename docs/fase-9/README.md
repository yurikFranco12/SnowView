# Fase 9 — Mapa de pistas de cada estación

Estado: **completada** el 2026-11-12. Etiquetas `fase-9` y `v0.11.0`. Decisiones en el
[ADR 0012](../adr/0012-mapa-de-pistas.md).

## Qué cambia

- **Cuadro con el mapa de pistas** de cada estación, con el estilo de la app: pistas por dificultad
  (verde, azul, roja, negra, fuera de pista), remontes discontinuos, leyenda con recuento y capas que
  se ocultan al pulsarlas. Zoom con rueda y botones, arrastre y teclado (flechas, + y −).
- Se abre desde «Ver mapa de la estación» en la ficha del pin, y desde «Mapa de pistas» en el detalle.
  Se cierra con Escape, la X o pulsando fuera.
- Datos de OpenStreetMap incluidos en la app (sin conexión). Para regenerarlos:
  `node scripts/build-pistes.mjs [id] [--refiltrar]`.

## Cómo probar

```bash
pnpm check
```

Abre Mapa, pasa el ratón por un pin y pulsa «Ver mapa de la estación».

## Instaladores (app 0.11.0)

Generados con `pnpm.cmd build` en el terminal del usuario, en `src-tauri/target/release/bundle/`.

| Archivo                         | Tamaño   |
| ------------------------------- | -------- |
| `SnowView_0.11.0_x64_en-US.msi` | 4,54 MiB |
| `SnowView_0.11.0_x64-setup.exe` | 3,42 MiB |
