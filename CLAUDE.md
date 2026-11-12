# SnowView — Instrucciones del proyecto

Monitor de nieve para estaciones de esquí (Windows 11, Tauri 2 + React). Muestra la nieve prevista y
acumulada de las estaciones favoritas y avisa cuando se cumple una regla del usuario, por ejemplo
"más de 15 cm en las próximas 48 h".

## Dónde está cada cosa

- **Progreso y fase actual:** `docs/PROGRESO.md`. Léelo al empezar la sesión.
- **Detalle de diseño, fondo de nieve, datos, notificaciones, plataforma y fases:**
  `docs/ESPECIFICACION.md`. Lee solo la sección de lo que vayas a tocar.
- **Maqueta aprobada:** `docs/diseno/mockup-inicio.html`. **Tokens:** `apps/web/src/ui/tokens/`.
- **Decisiones técnicas:** `docs/adr/`. **Cómo ejecutar cada fase:** `docs/fase-N/README.md`.

## Preferencias del usuario

- Equipo: Windows 11 x64 ("lacompu"). Prioridad 1: que funcione en Windows 11 y se vea moderna y
  futurista.
- Uso personal primero. iOS / App Store solo en la Fase 2, si la app merece la pena.
- Explica el porqué de cada decisión técnica importante.
- Confirma antes de instalar software, borrar o modificar archivos fuera del proyecto, o ejecutar
  cualquier cosa que cambie el equipo.
- Trabaja de forma incremental: una fase cada vez, completa y lista para probar.
- No suponer el Mac ni la cuenta de Apple Developer; se preguntan en la Fase 2.

## Stack

Tauri 2 · React + TypeScript estricto + Vite · Tailwind CSS v4 + shadcn/ui personalizado · Framer
Motion (sin GSAP en el MVP) · Recharts o Visx · Lucide · TanStack Query + Zustand · plugins de Tauri
de almacenamiento, notificaciones y autostart · fondo en canvas 2D (sin react-three-fiber) ·
Open-Meteo sin clave (uso gratuito solo no comercial: constancia en código y README).

## Arquitectura y capas

Monorepo pnpm: `packages/core` (TS puro: modelos, acumulados, reglas), `packages/data` (API, caché,
normalización, errores), `apps/web` (`src/platform/` adaptadores, `src/ui/` pantallas y tokens),
`src-tauri/` (Rust: bandeja, autostart), `stations/` (JSON curado con fuente y licencia),
`apps/server` (Fase 2).

- Dependencias hacia dentro: UI → data → core. Nunca al revés (ESLint lo impone).
- `core/` no importa React, Tauri ni el navegador.
- La UI no conoce el proveedor de previsión: cambiar de proveedor solo toca `data/`.
- Condicionales de plataforma solo cuando sea imprescindible.

## Calidad (obligatorio)

- `pnpm check` en verde: tipos, ESLint, Prettier y tests.
- Ningún secreto en el código; variables en `.env.example` sin valores.
- Estados de error, sin conexión, datos incompletos y límite de peticiones en toda llamada a la API.
- Estados vacíos y skeletons durante la carga.
- Contraste AA en todo el texto, incluido el que va sobre cristal.
- ARIA y navegación completa por teclado.
- `prefers-reduced-motion` en todas las animaciones.
- Tests unitarios en `core/` e integración en `data/`.

## Flujo de trabajo

- Al cerrar cada tarea relevante, actualiza `docs/PROGRESO.md` (una edición pequeña).
- El documento de progreso de claude.ai (https://claude.ai/artifact/BMqKoCbNUZxdVQAeYFY14L) se
  sincroniza solo al cerrar cada fase, desde `docs/PROGRESO.md`.
- Criterio de salida de cada fase: `pnpm check` en verde, build compilando, README de la fase y
  `docs/PROGRESO.md` al día, y documento de claude.ai sincronizado.
- Un ADR en `docs/adr/` por cada decisión técnica importante.
- Ramas y versiones: `main` solo tiene fases terminadas. Cada fase se trabaja en su rama
  (`fase-5b`…); al cerrarla se fusiona en `main` con `--no-ff`, se etiqueta (`fase-5b` y, si hay
  instalador, `v0.7.0`), se borra la rama y se actualiza `CHANGELOG.md`. Solo se hace push si el
  usuario lo pide y nunca se reescribe el historial publicado. Ver `docs/VERSIONES.md`.
- PowerShell 5.1: no pases textos con comillas a programas nativos en línea (git, por ejemplo); usa un
  archivo temporal (`git commit -F`).
- El shell de Claude es un sandbox: lo que escribe fuera del proyecto (`npm -g`, `%APPDATA%`) no
  llega al equipo real. Instalaciones globales y lanzar la app para el usuario: en su terminal. Su
  PowerShell bloquea los scripts `.ps1`: usar `pnpm.cmd` (o `pnpm` en cmd).

## Preguntas abiertas

- Estaciones de ejemplo: si el usuario no responde, algunas de Pirineos y Sierra Nevada.
- Monetización y distribución: pendiente (afecta a la licencia de Open-Meteo y a la firma de código).
- Mac y cuenta de Apple Developer: en la Fase 2.
- Efecto Mica de Windows 11 en Tauri 2: por verificar.
- Plugin de notificaciones de Tauri para push en iOS: por verificar antes de la Fase 2.
