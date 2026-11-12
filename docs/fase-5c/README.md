# Fase 5c — Ubicación a mano y mapa interactivo

Estado: **completada** el 2026-11-12. Etiquetas `fase-5c` y `v0.7.1`. Decisiones en la
actualización del [ADR 0009](../adr/0009-mapa-y-rutas.md).

## Por qué

La ubicación del equipo salía mal (el usuario está en Guriezo, Cantabria). Windows la calcula por
Wi-Fi o por la IP del operador, y puede errar mucho. Sin buena ubicación, la distancia y las rutas
de cada estación no sirven.

## Qué incluye

- **Panel «Tu ubicación»** en el mapa: dice de dónde viene la ubicación (equipo o a mano) y, si es la
  del equipo, su precisión; avisa si pasa de 5 km.
- **Fijarla a mano**: pulsando en el mapa («Fijar en el mapa») o escribiendo las coordenadas («Escribir
  coordenadas», acepta `43.3167, -3.3667` y variantes); «Usar la del equipo» vuelve a la de Windows. Se
  guarda en el equipo.
- **Precisión en el mapa**: círculo de incertidumbre alrededor del punto azul si pasa de 300 m.
- **Ubicación del equipo con alta precisión** (Wi-Fi o GPS si el equipo los tiene).
- **Mapa interactivo**: rueda para acercar, arrastrar para mover, botones + y −, y los botones
  «Ver estación» y «Volver» vuelven a centrar el mapa aunque lo hayas movido.
- **`core/`**: lectura de coordenadas escritas a mano (`parseLatLng`, 2 tests).

## Cómo probar

```bash
pnpm check
```

Abre Mapa → Tu ubicación → «Escribir coordenadas» → pon las tuyas → «Usar». O «Fijar en el mapa»,
acerca con la rueda y pulsa donde estás.

## Instaladores (app 0.7.1)

Generados con `pnpm.cmd build` en el terminal del usuario, en `src-tauri/target/release/bundle/`:

| Archivo                             | Tamaño   |
| ----------------------------------- | -------- |
| `msi/SnowView_0.7.1_x64_en-US.msi`  | 4,37 MiB |
| `nsis/SnowView_0.7.1_x64-setup.exe` | 3,24 MiB |
