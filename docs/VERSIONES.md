# Ramas y versiones

## Ramas

- **`main`**: solo fases terminadas. Cada commit de `main` compila, pasa `pnpm check` y genera el
  instalador.
- **`fase-<n>`** (`fase-1b`, `fase-1c`…): el trabajo de una fase. Se crea desde `main` al empezar la
  fase y se puede hacer en ella todos los commits que haga falta.

## Cerrar una fase

1. En la rama de la fase: `pnpm check` en verde, instalador generado, README de la fase,
   `docs/PROGRESO.md` y este archivo al día.
2. Fusionar en `main` sin avance rápido, para que la fase quede como un bloque en el historial:

   ```bash
   git switch main
   ```

   ```bash
   git merge --no-ff fase-1b
   ```

3. Etiquetar el commit de `main` con el nombre de la fase:

   ```bash
   git tag -a fase-1b -m "Fase 1b: datos reales"
   ```

4. Crear la rama de la fase siguiente desde `main`:

   ```bash
   git switch -c fase-1c
   ```

## Historial

| Etiqueta  | Versión de la app      | Fecha      | Contenido                                              |
| --------- | ---------------------- | ---------- | ------------------------------------------------------ |
| `fase-0`  | —                      | 2026-11-12 | Entorno, monorepo, tokens de diseño y ADR 0001         |
| `fase-1a` | 0.1.0                  | 2026-11-12 | Prototipo visual con Tauri 2 y datos simulados         |
| `fase-1b` | 0.2.0                  | 2026-11-12 | Open-Meteo real, estaciones verificadas, favoritas     |
| `fase-1c` | 0.3.0                  | 2026-11-12 | Reglas, avisos nativos, bandeja y arranque con Windows |
| `fase-3a` | 0.3.0 (sin instalador) | 2026-11-12 | Ajustes de consulta y nevada, modo sin conexión        |
| `fase-3b` | 0.3.0 (sin instalador) | 2026-11-12 | Comparador de estaciones                               |
| `fase-3c` | 0.4.0                  | 2026-11-12 | Historial de nevadas por temporada                     |
| `fase-4a` | 0.5.0                  | 2026-11-12 | Estaciones Alto Campoo y Cauterets                     |
| `fase-4b` | 0.5.0                  | 2026-11-12 | Condiciones para esquiar y snowboard, calendario       |
| `fase-5a` | 0.6.0                  | 2026-11-12 | Webcams de las estaciones dentro de la app             |
