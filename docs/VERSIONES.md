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

| Etiqueta  | Versión de la app | Fecha      | Contenido                                          |
| --------- | ----------------- | ---------- | -------------------------------------------------- |
| `fase-0`  | —                 | 2026-11-12 | Entorno, monorepo, tokens de diseño y ADR 0001     |
| `fase-1a` | 0.1.0             | 2026-11-12 | Prototipo visual con Tauri 2 y datos simulados     |
| `fase-1b` | 0.2.0             | 2026-11-12 | Open-Meteo real, estaciones verificadas, favoritas |
