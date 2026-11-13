# Fase 11 — Montaña 3D de líneas animada

Estado: **completada** el 2026-11-13. Etiquetas `fase-11` y `v0.13.0`. Decisiones en el
[ADR 0014](../adr/0014-montana-3d-de-lineas.md).

## Qué cambia

- El mapa de pistas se abre con la montaña en 3D: crestas de neón apiladas, con las pistas y los
  remontes apoyados encima. Se mece despacio y un barrido de luz recorre las crestas.
- Arrastrar gira la montaña, la rueda acerca; con teclado: flechas, + / − y 0 (restablecer).
- La leyenda sigue ocultando tipos de pista y remontes. Un botón alterna con el plano 2D (relieve y
  curvas de nivel).
- Con «reducir movimiento» la vista queda quieta.

## Cómo probar

```bash
pnpm check
```

Abre Mapa, pasa el cursor por un pin, «Ver mapa de la estación».

## Instaladores (app 0.13.0)

Generados con `pnpm.cmd build` en el terminal del usuario, en `src-tauri/target/release/bundle/`.

| Archivo                         | Tamaño   |
| ------------------------------- | -------- |
| `SnowView_0.13.0_x64_en-US.msi` | 4,70 MiB |
| `SnowView_0.13.0_x64-setup.exe` | 3,57 MiB |
