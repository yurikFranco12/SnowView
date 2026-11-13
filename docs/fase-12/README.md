# Fase 12 — Giro de 360° y malla uniforme en la montaña 3D

Estado: **completada** el 2026-11-13. Etiquetas `fase-12` y `v0.14.0`. Decisiones en el
[ADR 0015](../adr/0015-giro-360-y-malla-uniforme.md).

## Qué cambia

- La montaña 3D se puede girar los 360° para ver la estación desde todos los lados: arrastrar gira
  (horizontal) e inclina (vertical), la rueda acerca. Giro automático lento con botón de pausa;
  brújula con el norte. Teclado: flechas, + / −, espacio (giro automático) y 0 (restablecer).
- Malla más fina y uniforme: terreno suavizado, unas 120 líneas y aristas transversales tenues.
- Una pastilla discreta con la cota de la cima, el desnivel y los km esquiables aproximados.

## Cómo probar

```bash
pnpm check
```

Abre Mapa, pasa el cursor por un pin, «Ver mapa de la estación».

## Instaladores (app 0.14.0)

Generados con `pnpm.cmd build` en el terminal del usuario, en `src-tauri/target/release/bundle/`.

| Archivo                         | Tamaño   |
| ------------------------------- | -------- |
| `SnowView_0.14.0_x64_en-US.msi` | 4,70 MiB |
| `SnowView_0.14.0_x64-setup.exe` | 3,57 MiB |
