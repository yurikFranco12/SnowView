# Fase 13 — Rendimiento de los mapas

Estado: **completada** el 2026-11-13. Etiquetas `fase-13` y `v0.15.0`. Decisiones y medidas en el
[ADR 0016](../adr/0016-rendimiento-de-los-mapas.md).

## Qué cambia

- La montaña 3D pasa de ~32 a 120 fps en una pantalla de 120 Hz (86 fps en la estación más pesada).
- Mientras hay un cuadro de mapa abierto, la nieve de fondo se queda quieta.
- Con el giro automático parado, la montaña no se redibuja: consumo casi nulo.
- Si el equipo va justo, la montaña baja sola la resolución para mantener la fluidez.
- Mismo aspecto: crestas, pistas y brillo de neón; solo cambia cómo se dibujan.

## Cómo probar

```bash
pnpm check
```

Abre Mapa, pasa el cursor por un pin, «Ver mapa de la estación».

## Instaladores (app 0.15.0)

Generados con `pnpm.cmd build` en el terminal del usuario, en `src-tauri/target/release/bundle/`.

| Archivo                         | Tamaño   |
| ------------------------------- | -------- |
| `SnowView_0.15.0_x64_en-US.msi` | 4,70 MiB |
| `SnowView_0.15.0_x64-setup.exe` | 3,57 MiB |
