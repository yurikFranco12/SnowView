# Fase 16 — Ficha de estación, clasificación y buscador rápido (versión 1.0)

Estado: **completada** el 2026-11-13. Etiquetas `fase-16` y `v1.0.0`. Decisiones en el
[ADR 0017](../adr/0017-ficha-de-estacion-y-buscador.md).

## Qué cambia

- **Ficha de estación**: temperatura y sensación térmica, viento y rachas, espesor en cima y base,
  nieve a 24/48/72 h, isoterma de 0 °C, gráfica hora a hora de 72 h (nieve, temperatura, viento) y
  los 14 días con cielo, nieve, temperaturas, rachas y nota. Se abre desde el inicio, las
  favoritas, Estaciones, el Mapa y el buscador.
- **Estaciones** pasa a ser una clasificación en vivo, ordenable por nieve prevista, espesor, nota
  de hoy o nombre.
- **Buscador rápido** con Ctrl+K (o desde la barra de título) y **Ctrl+1…9** para las pantallas.
- **Inicio**: icono del cielo, espesor en cima, isoterma de 0 °C y botón «Ver ficha completa».
- **Mapa de pistas**: el desnivel de una pista usa la cota más alta y más baja de todo el trazado, y
  la montaña 3D arranca más cerca.
- Iconos del tiempo en toda la app (`WeatherIcon`).

## Cómo probar

```bash
pnpm check
```

Pulsa Ctrl+K, escribe «grand» e Intro: se abre la ficha de Grandvalira. Pasa el puntero por la
gráfica. Abre «Mapa de pistas 3D» y pulsa Escape dos veces: primero se cierra el mapa y luego la
ficha.

## Instaladores (app 1.0.0)

Generados con `pnpm.cmd build` en el terminal del usuario, en `src-tauri/target/release/bundle/`.

| Archivo                        | Tamaño   |
| ------------------------------ | -------- |
| `SnowView_1.0.0_x64_en-US.msi` | 4,71 MiB |
| `SnowView_1.0.0_x64-setup.exe` | 3,58 MiB |
