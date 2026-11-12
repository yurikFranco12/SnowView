# SnowView — Especificación detallada

Detalle de diseño, datos y plataforma. Las reglas que siempre aplican están en `CLAUDE.md`; este
archivo se lee cuando se trabaja en la sección correspondiente.

## Diseño visual (dirección A: Aurora nocturna)

Modo oscuro por defecto. Modo claro fuera del MVP.

- Valores exactos de color, cristal y tipografía: `apps/web/src/ui/tokens/tokens.ts` (fuente de
  verdad) y `tokens.css`.
- Maqueta aprobada de la pantalla de inicio: `docs/diseno/mockup-inicio.html` (copia local del
  artifact https://claude.ai/artifact/HNWPRP3ENBs9sL5xKvKnX4).
- Fuentes: Space Grotesk (500, 600, 700) para titulares y cifras grandes; Inter (400, 500, 600) para
  texto. En la app de escritorio se cargan en local, no desde Google Fonts.
- Contraste: el texto secundario `#9FB3D9` no cumple AA donde un resplandor llega a su color pleno.
  Ver la tabla en `docs/fase-0/README.md` y medirlo en la Fase 1a.
- Componentes ya diseñados: barra de título propia, barra lateral de iconos, selector de periodo
  (3/7/14 días), tarjeta de estación principal con cifra grande y gráfica de barras, lista de reglas
  con progreso, tarjetas de favoritas con mini gráfica.
- Pendiente: verificar en la documentación de Tauri 2 cómo activar el efecto Mica o Acrylic de
  Windows 11. Si existe, sustituye en lo posible al desenfoque CSS para ahorrar GPU.

## Fondo animado de nieve

- Canvas 2D a pantalla completa, detrás del contenido.
- Tres capas de profundidad: las lejanas son pequeñas y lentas; las cercanas, grandes y rápidas.
- Copo prerenderizado en un canvas auxiliar; un `drawImage` por copo y frame.
- Movimiento con delta-time y tope de 50 ms. Bucle continuo: los copos que salen por abajo
  reaparecen por arriba.
- Densidad controlada por intensidad. En el futuro, la intensidad puede depender de la previsión.
- Objetivo: la frecuencia de refresco de la pantalla (120 Hz si está disponible). No está
  garantizado; medir en el equipo real.
- Con `prefers-reduced-motion`: una escena estática y sin bucle.
- Pausar o reducir si la ventana está oculta o minimizada.
- La maqueta (`docs/diseno/mockup-inicio.html`) tiene una primera implementación de referencia.

## Datos y lógica

- Previsión con Open-Meteo: nevadas, grosor de nieve, temperatura, viento y estado del tiempo, a 3,
  7 y 14 días. Verificar los nombres exactos de los parámetros en su documentación antes de codificar.
- Pedir la previsión a la altitud de la estación (cota de base y de cima), no solo a las coordenadas.
  Open-Meteo admite un parámetro de elevación.
- Unidades: verificar si la nieve llega en cm o mm y normalizarlas a cm en `data/`.
- Acumulado: suma de nieve en una ventana de N horas, con tests para ventana vacía, valores nulos,
  cambio de hora y unidades.
- Reglas: estación, umbral de nieve, periodo, condiciones opcionales (viento máximo, temperatura
  mínima).
- Evitar avisos repetidos: cada regla dispara una vez por evento. La clave del evento es estación +
  regla + inicio de la ventana. Tests de re-disparo.
- Estaciones: lista curada en `stations/` con coordenadas, cota de base y cima, fuente y licencia de
  cada dato.
- Todas las llamadas a la API con estados de error, sin conexión, datos incompletos y límite de
  peticiones.

## Notificaciones

- Fase 1 (Windows): la propia app evalúa las reglas mientras está abierta o en la bandeja,
  consultando la previsión cada cierto intervalo. Notificación nativa de Windows al cumplirse una
  regla.
- Fase 2 (iOS): el servidor evalúa cada hora y envía push con APNs. En iPhone, una app no corre en
  segundo plano de forma fiable; por eso el servidor es necesario.
- Tauri: verificar qué cubre el plugin de notificaciones para push en iOS antes de la Fase 2. Puede
  requerir código nativo.

## Plataforma (Windows 11)

- Instalador: `.msi` (WiX) y `.exe` (NSIS) con `tauri build`. Solo se generan en Windows.
- Firma de código: sin firma, SmartScreen avisará al instalar. Decidir más adelante.
- Arranque con Windows: plugin de autostart de Tauri (opcional, con interruptor en ajustes).
- Bandeja del sistema: minimizar a bandeja al cerrar la ventana.
- WebView2 viene incluido en Windows 11.
- Servidor (Fase 2): función serverless (Cloudflare Workers o Vercel) con cron horario, APNs para
  iOS y, opcionalmente, WNS para Windows.

## Fases

- **Fase 0, entorno** (completada): herramientas, monorepo, TypeScript estricto, ESLint, Prettier,
  Vitest, tokens de diseño y primer ADR. Ver `docs/fase-0/README.md`.
- **Fase 1a, prototipo visual:** Tauri 2 + React + Vite + Tailwind, pantallas con datos simulados
  (maqueta aprobada + fondo de nieve + navegación).
- **Fase 1b, datos reales:** `core/` y `data/` con tests, Open-Meteo, buscador de estaciones,
  favoritas.
- **Fase 1c, alertas y sistema:** reglas, notificaciones sin repetir, bandeja, arranque con Windows,
  pulido de animaciones y accesibilidad.
- **Fase 2, iOS y servidor (condicional):** Tauri iOS, push, sincronización de reglas. Solo si la
  versión de Windows se usa y merece la pena.
- **Fase 3 (opcional):** modo offline, comparador de estaciones, historial de nevadas por temporada.
