# Registro de cambios

Cambios de SnowView por versión, de la más reciente a la más antigua. Formato inspirado en
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones según
[SemVer](https://semver.org/lang/es/) (ver `docs/VERSIONES.md`). Cada versión es una etiqueta
`v<x.y.z>` de git y su fase tiene un README en `docs/fase-<n>/`.

## [Sin publicar]

En la rama `fase-5b`. Aún no hay cambios cerrados.

## [0.6.0] - 2026-11-12 · fase 5a

### Añadido

- Webcams de las 10 estaciones dentro de la app (48 cámaras): imagen que se renueva sola cada 2 a 5
  minutos y reproductor en directo incrustado (feratel, ipcamlive y Skaping), con vista ampliada
  y botón en el inicio. Datos en `stations/webcams.json` (ADR 0008).

### Seguridad

- La política de seguridad (CSP) de Tauri permite solo los orígenes exactos de las cámaras; un
  test comprueba que cubre todas las URL.

## [0.5.0] - 2026-11-12 · fases 4a y 4b

### Añadido

- Estaciones Alto Campoo (cotas verificadas) y Cauterets (cotas sin verificar).
- Valoración de las condiciones para esquiar y hacer snowboard: nota de 0 a 100 por estación y día,
  visible en el inicio (ADR 0007).
- Pantalla Calendario de 3, 7 y 14 días con las mejores estaciones y días para ir.

## [0.4.0] - 2026-11-12 · fases 3a, 3b y 3c

### Añadido

- Ajustes: frecuencia de consulta de la previsión e intensidad de la nevada de fondo.
- Modo sin conexión: la última previsión de cada estación se guarda en disco y se usa si falla la
  consulta, con aviso de su edad.
- Comparador de hasta 4 estaciones con el mejor valor de cada fila marcado.
- Historial de nevadas por temporada con la API histórica de Open-Meteo (ADR 0006).

### Cambiado

- La capa de datos comparte `fetchJson` (límite de peticiones, tiempo máximo y errores) entre la
  previsión y el historial.

## [0.3.0] - 2026-11-12 · fase 1c

### Añadido

- Reglas de aviso («más de 15 cm en 48 h», con viento y temperatura opcionales) y pantalla de
  Alertas para crearlas, editarlas y borrarlas.
- Notificaciones nativas de Windows sin repetir el mismo aviso por la misma nevada (ADR 0005).
- Bandeja del sistema (cerrar la ventana la oculta) y arranque con Windows.

## [0.2.0] - 2026-11-12 · fase 1b

### Añadido

- Previsión real de Open-Meteo a la cota de base y de cima, con errores, falta de conexión y
  límite de peticiones controlados (ADR 0004).
- 8 estaciones del Pirineo, Andorra y Sierra Nevada con cotas verificadas una a una.
- Buscador de estaciones y favoritas guardadas.

### Corregido

- Cotas de Formigal (base 1510 m) y La Molina (base 1667 m).

## [0.1.0] - 2026-11-12 · fase 1a

### Añadido

- Prototipo visual con Tauri 2, React y Tailwind: pantallas con datos simulados, fondo de nieve en
  canvas y navegación (ADR 0003). Primer instalador `.msi` y `.exe`.

## Fase 0 - 2026-11-12 (sin versión)

- Entorno, monorepo pnpm con capas UI → data → core, TypeScript estricto, ESLint, Prettier,
  Vitest, tokens de diseño y ADR 0001.
