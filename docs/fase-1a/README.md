# Fase 1a — Prototipo visual

Estado: completada el 2026-11-12 (etiqueta `fase-1a`, versión 0.1.0). Revisada por el usuario en la
app de escritorio. Datos simulados; la previsión real llega en la Fase 1b.

Instaladores generados (sin firma de código):

- `src-tauri/target/release/bundle/msi/SnowView_0.1.0_x64_en-US.msi` (3,75 MB)
- `src-tauri/target/release/bundle/nsis/SnowView_0.1.0_x64-setup.exe` (2,79 MB)

Identificador de la app: `com.snowview.desktop`. No cambiarlo: decide la carpeta donde Windows
guarda los datos de la app (favoritas y reglas, desde la Fase 1b).

## Qué incluye

- App de escritorio con Tauri 2 (`src-tauri/`): ventana de 1280 × 820 (mínimo 1100 × 720), sin
  marco, con barra de título propia (arrastrar, minimizar, maximizar, cerrar).
- Interfaz en `apps/web` con React 19, Vite 8, Tailwind 4 y Motion:
  - Pantalla de inicio según la maqueta: estación principal con cifra grande y barras por día,
    reglas activas con progreso y tres favoritas con mini gráfica.
  - Selector de periodo 3/7/14 días que recalcula cifras y gráficas con animación.
  - Barra lateral con Inicio, Estaciones, Alertas y Ajustes (estas tres, con estado vacío).
  - Fondo de nieve en canvas 2D con tres capas, delta-time con tope de 50 ms, pausa con la ventana
    oculta y escena estática con `prefers-reduced-motion`.
- Fuentes Space Grotesk e Inter empaquetadas en local.
- Decisiones: [ADR 0002 (Mica)](../adr/0002-mica-no-se-usa-en-el-mvp.md) y
  [ADR 0003 (interfaz)](../adr/0003-interfaz-fase-1a.md).

## Cómo ejecutar

Desde `C:\Desarrollo\SnowView`:

```bash
pnpm dev
```

Abre la app de escritorio con recarga en caliente. La primera vez compila Rust y tarda unos minutos.

```bash
pnpm web
```

Solo la interfaz en el navegador, en http://localhost:5173 (sin botones de ventana).

```bash
pnpm build
```

Genera los instaladores `.msi` y `.exe` en `src-tauri/target/release/bundle/`. Sin firma de código,
así que Windows SmartScreen avisará al instalar.

```bash
pnpm check
```

Tipos, ESLint, Prettier y tests (incluidos los del motor de nieve).

## Accesibilidad comprobada

- Contraste medido sobre la pantalla real a 1280 × 820, reproduciendo el fondo con sus resplandores:
  el peor caso del texto es 5,61 : 1 (texto secundario del selector de periodo, bajo el resplandor de
  arriba a la derecha). Todo el texto cumple AA (≥ 4,5 : 1).
- Selector de periodo como `radiogroup`: Tab entra en el grupo y las flechas cambian de opción.
- Botones de icono con `aria-label`, `aria-current` en la navegación, gráfica de barras con
  descripción textual y foco visible en todo.

## Pendiente de medir en el equipo real

- Frecuencia real del fondo de nieve (objetivo, la de la pantalla) y coste de GPU del desenfoque.
