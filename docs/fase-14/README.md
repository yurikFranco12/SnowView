# Fase 14 — Arreglo del historial de nevadas

Estado: **completada** el 2026-11-13. Etiquetas `fase-14` y `v0.15.1`. Decisión en la
[actualización del ADR 0006](../adr/0006-historial-de-nevadas.md).

## Qué cambia

- El Historial cargaba bien una estación (Alto Campoo en la captura del usuario) y dejaba las demás
  cargando («…»). Causa: cinco llamadas por estación contra un tope propio de 10 por minuto, con
  reintentos que esperan lo que pide el limitador.
- Ahora una sola consulta por estación trae las cinco temporadas, y el tope propio sube a 30 por
  minuto. Las 10 estaciones cargan en menos de 2 s cada una.

## Cómo probar

```bash
pnpm check
```

Abre Historial y recorre el selector de estaciones.

## Instaladores (app 0.15.1)

Generados con `pnpm.cmd build` en el terminal del usuario, en `src-tauri/target/release/bundle/`.

| Archivo                         | Tamaño   |
| ------------------------------- | -------- |
| `SnowView_0.15.1_x64_en-US.msi` | 4,70 MiB |
| `SnowView_0.15.1_x64-setup.exe` | 3,57 MiB |
