# Fase 1c — Alertas y sistema

Estado: **completada** el 2026-11-12. Etiqueta `fase-1c`, app 0.3.0. Decisiones en
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

## Probado en el equipo real

Notificación nativa de prueba, aviso de una regla real, bandeja (cerrar oculta, clic abre, «Salir»
cierra) e interruptor de arranque con Windows. En `pnpm dev` la notificación no se ve si Windows
tiene activado «No molestar» (la app aparece como «Windows PowerShell»); una app instalada tiene
identidad propia.

## Instaladores (app 0.3.0)

Generados con `pnpm.cmd build` en el terminal del usuario, en `src-tauri/target/release/bundle/`:

| Archivo                             | Tamaño   |
| ----------------------------------- | -------- |
| `msi/SnowView_0.3.0_x64_en-US.msi`  | 4,24 MiB |
| `nsis/SnowView_0.3.0_x64-setup.exe` | 3,11 MiB |

## Pendiente

- Ajustes pendientes de la especificación: frecuencia de consulta e intensidad de la nevada de
  fondo (hoy la previsión se refresca cada hora).
- Medir en el equipo real la fluidez del fondo de nieve y el coste del desenfoque.
