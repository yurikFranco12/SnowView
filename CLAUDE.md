# SnowView — Instrucciones del proyecto

Este archivo es la especificación permanente del proyecto. Léelo al empezar cada sesión. El progreso del día a día vive en el documento de progreso (ver sección "Documentación"), no aquí.

## Propósito

Monitor de nieve para estaciones de esquí. Muestra la nieve prevista y acumulada de las estaciones favoritas y avisa cuando se cumple una regla que define el usuario, por ejemplo "más de 15 cm en las próximas 48 h".

## Preferencias del usuario

- Equipo principal: Windows 11 (x64), nombre del equipo "lacompu".
- Prioridad 1: que funcione en Windows 11 y que se vea moderna y futurista.
- Uso personal primero. Una versión para iOS / App Store solo si la app merece la pena, y se decide más adelante (Fase 2).
- Quiere entender cada decisión técnica importante. Explica el porqué de cada elección.
- Confirma antes de instalar software, crear carpetas, borrar o modificar archivos fuera del proyecto, o ejecutar cualquier cosa que cambie el equipo.
- Trabaja de forma incremental: una fase cada vez, completa y lista para probar.
- Preguntas abiertas: no suponer el Mac ni la cuenta de Apple Developer; se preguntan en la Fase 2.

## Stack

- Tauri 2 (empaqueta la app de escritorio; iOS en la Fase 2).
- React + TypeScript (estricto) + Vite.
- Tailwind CSS v4 + shadcn/ui personalizado con el sistema de diseño propio.
- Framer Motion para transiciones, gestos y animaciones compartidas (layoutId). GSAP queda fuera del MVP.
- Recharts o Visx para las gráficas de previsión y acumulados.
- Iconos: Lucide.
- TanStack Query para datos y caché; Zustand para estado local.
- Persistencia: plugin de almacenamiento de Tauri para favoritos y reglas.
- Notificaciones: plugin de notificaciones de Tauri en escritorio.
- Fondo animado: canvas 2D. No usar react-three-fiber en el MVP.
- Fuente de datos: Open-Meteo, sin clave de API. Uso gratuito solo no comercial: dejar constancia en el código y en el README. La capa de datos debe poder cambiar de proveedor sin tocar la UI.
- Servidor (Fase 2): función serverless (Cloudflare Workers o Vercel) con cron horario, APNs para iOS y, opcionalmente, WNS para Windows.

## Arquitectura

Monorepo con pnpm workspaces. La lógica se separa en capas:

```
snowview/
├─ packages/
│  ├─ core/        # TS puro: modelos, acumulados, evaluación de reglas. Sin UI ni plataforma. Tests con Vitest.
│  └─ data/        # Clientes de API, caché, normalización, errores, límites de peticiones. Tests de integración.
├─ apps/
│  ├─ web/         # React + Vite + Tailwind + Framer Motion. Pantallas, componentes, tokens.
│  │  └─ src/
│  │     ├─ platform/   # Interfaces y adaptadores: notificaciones, almacenamiento, ventana (desktop/ e ios/)
│  │     └─ ui/         # Pantallas, componentes, animaciones, tokens de diseño
│  └─ server/      # Fase 2: cron, reglas y push. Reutiliza packages/core.
├─ src-tauri/      # Rust: bandeja, arranque con Windows, plugins de Tauri
├─ stations/       # JSON curado de estaciones (coordenadas, cota de base y cima, fuente y licencia)
├─ docs/           # ADR (decisiones técnicas) y README por fase
└─ .env.example    # Variables de entorno sin valores reales
```

Reglas de capas:

- `core/` no importa nada de React, Tauri ni del navegador.
- Las dependencias van hacia dentro: UI → data → core. Nunca al revés.
- Solo se usan condicionales de plataforma cuando sea imprescindible.

## Diseño visual (dirección A: Aurora nocturna)

Modo oscuro por defecto. Modo claro fuera del MVP.

Paleta (valores de la maqueta aprobada):

- Fondo: degradado de `#0a0e2a` a `#111847` a `#0b1032`, con resplandores `#2b3aa0` (arriba derecha) y `#0e6486` (abajo izquierda).
- Acento hielo: `#7DE3FF`. Acento índigo: `#A5B4FF`.
- Texto principal: `#EAF2FF`. Texto secundario: `#9FB3D9` (verificar contraste AA sobre el cristal).
- Cristal: fondo `rgba(255,255,255,0.06)`, borde `rgba(255,255,255,0.12)`, desenfoque 18 px, radio 20 px, sombra `0 10px 40px rgba(0,0,0,0.35)`.

Tipografía:

- Titulares y cifras grandes: Space Grotesk (500, 600, 700).
- Texto: Inter (400, 500, 600).
- Cargar las fuentes en local para la app de escritorio.

Componentes clave ya diseñados: barra de título propia, barra lateral de iconos, selector de periodo (3/7/14 días), tarjeta de estación principal con cifra grande y gráfica de barras, lista de reglas con progreso, tarjetas de favoritas con mini gráfica.

Pendiente: verificar en la documentación de Tauri 2 cómo activar el efecto Mica o Acrylic de Windows 11. Si existe, sustituye en lo posible al desenfoque CSS para ahorrar GPU.

## Fondo animado de nieve

- Canvas 2D a pantalla completa, detrás del contenido.
- Tres capas de profundidad: las lejanas son pequeñas y lentas; las cercanas, grandes y rápidas.
- Copo prerenderizado en un canvas auxiliar; un `drawImage` por copo y frame.
- Movimiento con delta-time y tope de 50 ms. Bucle continuo: los copos que salen por abajo reaparecen por arriba.
- Densidad controlada por intensidad. En el futuro, la intensidad puede depender de la previsión.
- Objetivo: la frecuencia de refresco de la pantalla (120 Hz si está disponible). No está garantizado; medir en el equipo real.
- Con `prefers-reduced-motion`: una escena estática y sin bucle.
- Pausar o reducir si la ventana está oculta o minimizada.

## Datos y lógica

- Previsión con Open-Meteo: nevadas, grosor de nieve, temperatura, viento y estado del tiempo, a 3, 7 y 14 días. Verificar los nombres exactos de los parámetros en su documentación antes de codificar.
- Pedir la previsión a la altitud de la estación (cota de base y de cima), no solo a las coordenadas. Open-Meteo admite un parámetro de elevación.
- Unidades: verificar si la nieve llega en cm o mm y normalizarlas a cm en `data/`.
- Acumulado: suma de nieve en una ventana de N horas, con tests para ventana vacía, valores nulos, cambio de hora y unidades.
- Reglas: estación, umbral de nieve, periodo, condiciones opcionales (viento máximo, temperatura mínima).
- Evitar avisos repetidos: cada regla dispara una vez por evento. La clave del evento es estación + regla + inicio de la ventana. Tests de re-disparo.
- Estaciones: lista curada en `stations/` con fuente y licencia de cada dato.

## Notificaciones

- Fase 1 (Windows): la propia app evalúa las reglas mientras está abierta o en la bandeja, consultando la previsión cada cierto intervalo. Notificación nativa de Windows al cumplirse una regla.
- Fase 2 (iOS): el servidor evalúa cada hora y envía push con APNs. En iPhone, una app no corre en segundo plano de forma fiable; por eso el servidor es necesario.
- Tauri: verificar qué cubre el plugin de notificaciones para push en iOS antes de la Fase 2. Puede requerir código nativo.

## Plataforma (Windows 11)

- Instalador: `.msi` (WiX) y `.exe` (NSIS) con `tauri build`. Solo se generan en Windows.
- Firma de código: sin firma, SmartScreen avisará al instalar. Decidir más adelante.
- Arranque con Windows: plugin de autostart de Tauri (opcional, con interruptor en ajustes).
- Bandeja del sistema: minimizar a bandeja al cerrar la ventana.
- WebView2 viene incluido en Windows 11.

## Requisitos de entorno (Windows)

Verificar antes de instalar nada:

- Node.js LTS: `node -v`
- pnpm: `pnpm -v` (instalar con `npm install -g pnpm`)
- Rust: `rustc -V` y `cargo -V` (instalar con Rustup)
- Visual Studio Build Tools con la carga de trabajo de C++ de escritorio: necesarios para compilar Tauri en Windows
- winget disponible: `winget -v`

Comandos de instalación, solo tras confirmar con el usuario:

```
winget install OpenJS.NodeJS.LTS
winget install Rustlang.Rustup
winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
npm install -g pnpm
```

Ubicación del proyecto: `Desarrollo\SnowView` (crear si no existe).

## Fases

- **Fase 0, entorno:** herramientas verificadas, carpeta creada, monorepo con pnpm workspaces, TypeScript estricto, ESLint, Prettier, Vitest, primer test de humo en `core/`, tokens de diseño y primer ADR.
- **Fase 1a, prototipo visual:** pantallas con datos simulados (maqueta aprobada + fondo de nieve + navegación).
- **Fase 1b, datos reales:** `core/` y `data/` con tests, Open-Meteo, buscador de estaciones, favoritas.
- **Fase 1c, alertas y sistema:** reglas, notificaciones sin repetir, bandeja, arranque con Windows, pulido de animaciones y accesibilidad.
- **Fase 2, iOS y servidor (condicional):** Tauri iOS, push, sincronización de reglas. Solo si la versión de Windows se usa y merece la pena.
- **Fase 3 (opcional):** modo offline, comparador de estaciones, historial de nevadas por temporada.

Criterio de salida de cada fase: tests en verde, build compilando, README de la fase actualizado y documento de progreso al día.

## Calidad y accesibilidad (obligatorio)

- TypeScript estricto, ESLint y Prettier sin errores.
- Ninguna clave o secreto en el código. Usar variables de entorno y `.env.example`.
- Todas las llamadas a la API con estados de error, sin conexión, datos incompletos y límite de peticiones.
- Estados vacíos y skeletons durante la carga.
- Contraste AA en todo el texto, incluido el que va sobre cristal.
- Etiquetas ARIA y navegación completa por teclado.
- Respetar `prefers-reduced-motion` en todas las animaciones, no solo en el fondo.
- Tests unitarios para `core/` e integración para `data/`.

## Documentación

- Documento de progreso (fuente de verdad del avance, en claude.ai): https://claude.ai/artifact/BMqKoCbNUZxdVQAeYFY14L
  Actualizarlo al cerrar cada tarea relevante: estado, tareas, decisiones, entorno y próximos pasos.
- Mockup de la pantalla de inicio: https://claude.ai/artifact/HNWPRP3ENBs9sL5xKvKnX4
- En el repositorio: `docs/` con un ADR por decisión técnica importante y un README por fase (cómo ejecutar, compilar y probar).

## Preguntas abiertas

- Estaciones de ejemplo para las primeras pruebas: si el usuario no responde, usar algunas de Pirineos y Sierra Nevada.
- Monetización y distribución: pendiente. Afecta a la licencia de Open-Meteo y a la firma de código.
- Mac y cuenta de Apple Developer: solo al llegar a la Fase 2.
- Verificación del efecto Mica en Tauri 2.
- Verificación del plugin de notificaciones para push en iOS.
