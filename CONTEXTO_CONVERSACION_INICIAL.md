Vengo de una conversación de chat del proyecto SnowView (monitor de nieve para estaciones de esquí). Continúa desde aquí.

OBJETIVO
App de escritorio para Windows 11 con Tauri 2 + React + TypeScript + Vite. Uso personal primero. Si queda muy bien, se valorará después una versión para iOS  App Store (Fase 2, no ahora).

PREFERENCIAS DEL USUARIO
- Prioridad 1 que funcione en Windows 11 y que se vea moderna y futurista.
- Estética elegida dirección A Aurora nocturna fondo azul-índigo con destellos de hielo, paneles de cristal, Space Grotesk para titulares e Inter para texto, modo oscuro por defecto.
- Fondo animado nevada en canvas 2D, bucle con requestAnimationFrame y delta-time. Apunta a la frecuencia del monitor (objetivo 120 Hz), sin garantía.
- Quiere que le expliquemos cada decisión técnica importante y que confirmemos antes de tocar archivos o instalar nada.

ARQUITECTURA ACORDADA
- Monorepo con pnpm workspaces packagescore (TS puro, tests Vitest), packagesdata (Open-Meteo, caché), appsweb (React + Vite + Tailwind v4 + shadcnui + Framer Motion; sin GSAP en el MVP), src-tauri (bandeja, autostart), appsserver (solo Fase 2).
- Fondo de nieve en canvas 2D, no react-three-fiber.
- Open-Meteo como fuente de datos (uso gratuito solo no comercial; dejar la capa de datos preparada para cambiar de proveedor).
- Las notificaciones de escritorio se generan en la propia app mientras esté abierta o en bandeja. El servidor es solo para iOS.
- Pendiente de verificar efecto Mica de Windows 11 en Tauri 2 y si el plugin de notificaciones cubre lo necesario.

FASES
- Fase 0 entorno y monorepo (TypeScript estricto, ESLint, Prettier, Vitest, Design System, primer ADR).
- Fase 1a prototipo visual con datos simulados.
- Fase 1b core y data con tests, Open-Meteo real, buscador y favoritas.
- Fase 1c reglas de alerta, notificaciones sin repetir, bandeja, arranque con Windows, pulido.
- Fase 2 iOS, servidor y push (solo si la versión de Windows merece la pena).
- Fase 3 (opcional) offline, comparador, historial.

ESTADO ACTUAL
- Mockup de la pantalla de inicio (Aurora nocturna, sin funcionalidad) en Claude Artifacts httpsclaude.aiartifactHNWPRP3ENBs9sL5xKvKnX4 — incluye la nevada animada.
- Documento de progreso (fuente de verdad, actualizar aquí al avanzar) httpsclaude.aiartifactBMqKoCbNUZxdVQAeYFY14L
- El equipo lacompu (Windows 11, x64) está conectado.
- NO hecho todavía comprobación e instalación de herramientas, carpeta del proyecto, monorepo.
- Bloqueos en el chat anterior sin terminal en esa sesión, y el acceso a ~Desarrollo fue denegado por el sistema de permisos. En Code, el directorio de trabajo debería resolverlo.

PRÓXIMOS PASOS (en Code, con confirmación antes de cada instalación)
1. Crear la carpeta DesarrolloSnowView si no existe.
2. Comprobar versiones node -v, pnpm -v, rustc -V, cargo -V, y si Visual Studio Build Tools con la carga de C++ está instalado.
3. Instalar lo que falte (confirmar la lista antes)
   winget install OpenJS.NodeJS.LTS
   winget install Rustlang.Rustup
   winget install Microsoft.VisualStudio.2022.BuildTools --override --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended
   npm install -g pnpm
4. Crear el monorepo con pnpm workspaces, TypeScript estricto, ESLint, Prettier y Vitest, con un test de humo en packagescore.
5. Actualizar el documento de progreso con cada avance.

PREGUNTAS ABIERTAS
- Estaciones de ejemplo si no responde, usar algunas de Pirineos y Sierra Nevada.
- Modo claro fuera del MVP.
- Mac y cuenta de Apple Developer se preguntan solo al llegar a la Fase 2.
- Monetización y distribución pendiente, afecta a la licencia de Open-Meteo.

Antes de empezar, lee el documento de progreso del enlace y confirma qué has encontrado en el equipo.