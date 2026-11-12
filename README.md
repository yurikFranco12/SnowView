# SnowView

Monitor de nieve para estaciones de esquí. Muestra la nieve prevista y acumulada de tus estaciones
favoritas y avisa cuando se cumple una regla, por ejemplo "más de 15 cm en las próximas 48 h".

App de escritorio para Windows 11 hecha con Tauri 2, React y TypeScript.

## Estado

- Fase 0 completada: entorno y monorepo. Ver [docs/fase-0/README.md](docs/fase-0/README.md).
- Fase 1a completada: prototipo visual con datos simulados. Ver
  [docs/fase-1a/README.md](docs/fase-1a/README.md).
- Fase 1b completada: datos reales de Open-Meteo, buscador y favoritas. Ver
  [docs/fase-1b/README.md](docs/fase-1b/README.md).
- Fase 1c completada: reglas, avisos de Windows, bandeja y arranque con el sistema. Ver
  [docs/fase-1c/README.md](docs/fase-1c/README.md).
- Fase 5b completada: mapa de las estaciones con zoom, ubicación y rutas en coche y autobús con
  Google Maps (clave de cada usuario). Ver [docs/fase-5b/README.md](docs/fase-5b/README.md).
- Fase 5a completada: webcams de las 10 estaciones dentro de la app (imágenes que se renuevan y
  vídeo en directo). Ver [docs/fase-5a/README.md](docs/fase-5a/README.md).
- Fase 4 completada: estaciones Alto Campoo y Cauterets, y valoración de las condiciones para esquiar
  y hacer snowboard con un calendario de los próximos días.
- Fase 3 completada: ajustes y modo sin conexión (3a), comparador (3b) e historial (3c). Progreso en
  [docs/PROGRESO.md](docs/PROGRESO.md).

## Versiones

Cambios por versión en [CHANGELOG.md](CHANGELOG.md). Ramas, etiquetas y cómo se publica en
[docs/VERSIONES.md](docs/VERSIONES.md).

## Estructura

```
packages/core   Lógica pura: modelos, acumulados y reglas (sin UI ni plataforma)
packages/data   Clientes de API, caché y normalización
apps/web        Interfaz: React, Vite, Tailwind y Motion
src-tauri       App de escritorio (Tauri 2, Rust)
docs/           Decisiones técnicas (ADR) y un README por fase
```

## Uso rápido

```bash
pnpm install
```

```bash
pnpm dev
```

```bash
pnpm check
```

`pnpm dev` abre la app de escritorio; `pnpm build` genera los instaladores. Ramas y versiones en
[docs/VERSIONES.md](docs/VERSIONES.md).

## Datos meteorológicos y licencia

SnowView usa la API de [Open-Meteo](https://open-meteo.com), que no necesita clave. Su uso gratuito
es **solo para fines no comerciales**, y los datos se publican bajo licencia CC BY 4.0, que obliga a
citar la fuente. Si SnowView llega a distribuirse con fines comerciales, habrá que contratar un plan
de Open-Meteo o cambiar de proveedor. La capa `packages/data` está pensada para poder hacerlo sin
tocar la interfaz.
