# Fase 15 — Se quitan las rutas en coche y autobús

Estado: **completada** el 2026-11-13. Etiquetas `fase-15` y `v0.16.0`. El ADR 0009 queda como
histórico (retirada anotada al principio).

## Qué cambia

- Fuera las rutas en coche (tráfico, peajes) y en autobús con Google Routes: tarjetas de ruta, trazos
  en el mapa, entradas de la leyenda, aviso de «añade tu clave» y la fila de Ajustes de la clave.
- Se borran `packages/data/src/routes.ts` (y sus tests), `ui/data/routes.ts`, `RouteCards.tsx` y
  `routesKeyStore.ts`; `routes.googleapis.com` sale de la CSP de Tauri.
- La clave de Google que alguien tuviera guardada se borra del equipo al arrancar.
- Se conserva: ubicación (del equipo o fijada a mano), distancia en línea recta y el botón «Ver con
  mi ubicación», que encuadra tu posición y la estación.
- La app ya no necesita ninguna clave ni cuenta de terceros.

## Cómo probar

```bash
pnpm check
```

Abre Mapa, elige una estación: el detalle muestra la distancia y los botones, sin tarjetas de ruta.
Abre Ajustes: ya no hay fila de clave de Google.

## Instaladores (app 0.16.0)

Generados con `pnpm.cmd build` en el terminal del usuario, en `src-tauri/target/release/bundle/`.

| Archivo                         | Tamaño   |
| ------------------------------- | -------- |
| `SnowView_0.16.0_x64_en-US.msi` | 4,70 MiB |
| `SnowView_0.16.0_x64-setup.exe` | 3,57 MiB |
