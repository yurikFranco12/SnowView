# ADR 0001 — Monorepo con pnpm workspaces y separación en capas

- Estado: aceptada
- Fecha: 2026-11-12

## Contexto

SnowView empieza como app de escritorio para Windows 11 (Tauri 2 + React), pero puede tener una
versión para iOS y un servidor de avisos en la Fase 2. La lógica de nieve (acumulados, reglas, avisos
sin repetir) tiene que ser la misma en la app y en el servidor, y la fuente de datos (Open-Meteo)
tiene que poder cambiarse sin tocar las pantallas.

## Decisión

1. **Un solo repositorio con pnpm workspaces**: `packages/core`, `packages/data`, `apps/web` y, más
   adelante, `src-tauri` y `apps/server`.
2. **Capas con dependencias hacia dentro**: UI → data → core, nunca al revés.
   - `core/`: TypeScript puro. Su `tsconfig` no incluye `DOM` ni tipos de Node, así que el compilador
     rechaza cualquier API del navegador o de la plataforma.
   - Una regla de ESLint (`no-restricted-imports`) impide que `core/` importe React, Tauri, `data/` o
     la UI, y que `data/` importe React, Tauri o la UI.
3. **Paquetes internos sin compilar**: cada paquete exporta su `src/index.ts` directamente. Vite y
   Vitest leen TypeScript, así que no hace falta un paso de build por paquete.
4. **TypeScript estricto** compartido en `tsconfig.base.json`, con `noUncheckedIndexedAccess` y
   `exactOptionalPropertyTypes` además de `strict`.
5. **TypeScript 6.0**, no 7. TypeScript 7 (el compilador reescrito en Go) ya está publicado, pero
   typescript-eslint 8 solo admite TypeScript `<6.1`. Se fija `~6.0.0` hasta que typescript-eslint
   soporte la 7.

## Por qué pnpm

- Instala cada paquete una vez en un almacén global y lo enlaza: rápido y con poco disco.
- Es estricto: un paquete solo puede importar lo que declara en su `package.json`. Eso refuerza la
  separación en capas.
- Los workspaces enlazan `@snowview/core` dentro de `@snowview/data` con `workspace:*`, sin publicar
  nada.

## Alternativas descartadas

- **Un solo paquete con carpetas**: más simple, pero nada impide que la lógica importe React o Tauri,
  y el servidor de la Fase 2 no podría reutilizar `core/` limpiamente.
- **npm o Yarn workspaces**: funcionan, pero npm instala más lento y permite importar dependencias no
  declaradas; Yarn añade otra herramienta sin ventaja clara aquí.
- **Turborepo o Nx**: útiles con muchos paquetes y cachés de build. Con tres paquetes no compensan;
  se pueden añadir más adelante sin cambiar la estructura.

## Consecuencias

- Los tests de `core/` corren sin navegador ni Tauri.
- Cambiar de proveedor de previsión afecta solo a `data/`.
- Cuando se añada React en la Fase 1a, `apps/web` dependerá de `@snowview/data` y `@snowview/core`
  con `workspace:*`.
