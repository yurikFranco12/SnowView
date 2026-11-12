# Fase 0 — Entorno y monorepo

Estado: completada el 2026-11-12.

## Entorno verificado (equipo "lacompu", Windows 11 x64)

| Herramienta                    | Versión                                  |
| ------------------------------ | ---------------------------------------- |
| Node.js                        | 22.23.3                                  |
| pnpm                           | 12.18.0 (en `%APPDATA%\npm`, en el PATH) |
| Rust (rustc, cargo)            | 1.99.1, toolchain `stable-msvc`          |
| rustup                         | 1.29.3                                   |
| Visual Studio Build Tools 2022 | Con la carga de trabajo de C++           |
| WebView2                       | 157.0.4341.46                            |
| winget                         | 1.29.380                                 |
| Git                            | 2.56.0                                   |

## Qué incluye

- Monorepo con pnpm workspaces: `packages/core`, `packages/data`, `apps/web`.
- TypeScript 6.0 estricto (`tsconfig.base.json`). Ver [ADR 0001](../adr/0001-monorepo-pnpm-y-capas.md).
- ESLint 10 con typescript-eslint y la regla de capas (UI → data → core).
- Prettier 3.
- Vitest 5 con un test de humo en `core/` y otro en `data/`.
- Tokens de diseño "Aurora nocturna" en `apps/web/src/ui/tokens/` (`tokens.ts` y `tokens.css`).

## Cómo ejecutar

Desde `C:\Desarrollo\SnowView`:

```bash
pnpm install
```

```bash
pnpm check
```

`pnpm check` ejecuta, en orden: comprobación de tipos, ESLint, comprobación de formato y tests.
También se pueden lanzar por separado: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`,
`pnpm test`. `pnpm format` corrige el formato.

## Contraste de la paleta (WCAG AA)

Contraste del texto sobre el cristal (`rgba(255,255,255,0.06)`) según el fondo que tenga debajo.
AA exige 4.5 : 1 para texto normal y 3 : 1 para texto grande (24 px, o 18,5 px en negrita).

| Fondo bajo el cristal        | `#EAF2FF` | `#9FB3D9` | `#7DE3FF` | `#A5B4FF` |
| ---------------------------- | --------- | --------- | --------- | --------- |
| `#0a0e2a`                    | 14.73     | 7.84      | 11.30     | 8.35      |
| `#111847`                    | 12.80     | 6.81      | 9.82      | 7.26      |
| `#0b1032`                    | 14.31     | 7.62      | 10.98     | 8.12      |
| `#2b3aa0` (resplandor pleno) | 7.21      | **3.84**  | 5.53      | **4.09**  |
| `#0e6486` (resplandor pleno) | 5.13      | **2.73**  | **3.93**  | **2.91**  |

Sobre el fondo base todo cumple AA. Donde un resplandor llega a su color pleno, el texto secundario y
los acentos usados como texto pequeño no cumplen. En la maqueta los resplandores se desvanecen hacia
el centro y apenas quedan bajo las tarjetas, pero hay que medirlo en la Fase 1a. Opciones si falla:
oscurecer el cristal en esas zonas, bajar la intensidad del resplandor bajo el contenido o aclarar el
texto secundario.

## Pendiente para fases siguientes

- `src-tauri/` y la app React con Vite y Tailwind: Fase 1a.
- `stations/` con la lista curada de estaciones: Fase 1b.
- Verificar el efecto Mica de Windows 11 en Tauri 2.
