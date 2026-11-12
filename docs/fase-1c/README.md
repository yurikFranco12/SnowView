# Fase 1c — Alertas y sistema

Estado: en curso en la rama `fase-1c` (2026-11-12). Decisiones en
[ADR 0005](../adr/0005-reglas-avisos-y-bandeja.md).

## Qué incluye

- **`packages/core`**: reglas (`AlertRule`), evaluación contra la previsión, episodios de nieve y
  registro de avisos sin repetir. 23 tests, incluidos los de re-disparo.
- **Alertas**: crear, editar, activar/desactivar y borrar reglas; estado y avance de cada una con
  datos reales. El panel del inicio muestra las reglas reales.
- **Avisos**: la app evalúa las reglas cada hora mientras está abierta o en la bandeja y lanza una
  notificación nativa de Windows por cada evento nuevo.
- **Bandeja del sistema**: cerrar la ventana la oculta; clic en el icono la abre; «Salir» cierra.
- **Ajustes**: estado de las notificaciones con botón de prueba, e interruptor de arranque con
  Windows (arranca oculta en la bandeja).

## Cómo probar

```bash
pnpm check
```

Las notificaciones, la bandeja y el arranque con Windows solo funcionan en la app de escritorio:

```bash
pnpm dev
```

En PowerShell: `pnpm.cmd dev`.

## Pendiente

- Probar en el equipo real: notificación nativa, bandeja y arranque con Windows.
- Pulido de animaciones, `prefers-reduced-motion` y accesibilidad (contraste AA, ARIA, teclado).
- Instalador 0.3.0, fusión en `main` y etiqueta `fase-1c`.
