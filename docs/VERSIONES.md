# Control de versiones

Cómo se organiza el código de SnowView en git: ramas, etiquetas, versiones de la app, mensajes de
commit, cierre de fase y publicación en GitHub. El detalle de cada versión está en el
[CHANGELOG](../CHANGELOG.md).

## Ramas

| Rama       | Para qué sirve                                                                        | Vida           |
| ---------- | ------------------------------------------------------------------------------------- | -------------- |
| `main`     | Solo fases terminadas. Cada commit compila, pasa `pnpm check` y genera el instalador. | Permanente     |
| `fase-<n>` | El trabajo de una fase (`fase-5b`, `fase-6`…). Sale de `main`.                        | Hasta cerrarla |

Reglas:

- Nunca se trabaja directamente en `main`: solo recibe fusiones de fases cerradas.
- Una fase = una rama = un conjunto de commits que se pueden revisar juntos.
- **Al cerrar la fase se borra su rama** (`git branch -d`, que solo borra si ya está fusionada). El
  trabajo no se pierde: queda dentro de `main` como segundo padre de la fusión y con su etiqueta. Se
  borra para que el nombre de la rama no choque con el de su etiqueta (`fase-5a` rama y `fase-5a`
  etiqueta hacen que git avise de una referencia ambigua).

## Etiquetas

Dos juegos, ambos anotados (`git tag -a`, con mensaje) y sobre commits de `main`:

- **`fase-<n>`**: marca el commit de fusión en que se cerró cada fase.
- **`v<mayor>.<menor>.<parche>`**: marca cada versión de la app con instalador (SemVer). El mensaje
  dice qué fases incluye y el tamaño de los instaladores.

Para ver qué incluye una versión: `git show v0.6.0`. Para ver el código de una fase:
`git checkout fase-3c` (queda en «HEAD desacoplado»; no se commitea ahí).

## Versión de la app

Mientras no haya versión 1.0, la app sigue SemVer con estas reglas:

- **Menor (0.x.0)**: una fase o grupo de fases con funciones nuevas para el usuario.
- **Parche (0.x.y)**: correcciones sin funciones nuevas.
- **1.0.0**: cuando el usuario lo decida; hasta entonces todo es 0.x.

La versión se escribe en tres sitios, siempre a la vez y en el commit de cierre de la fase:
`src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` y `src-tauri/Cargo.lock` (paquete `snowview`).
Las fases que no generan instalador no suben la versión.

## Mensajes de commit

Primera línea: `Fase <n>: <qué cambia>` (o `Corregir …` / `Documentar …` fuera de una fase), en
español, sin punto final, de hasta unos 70 caracteres. Después una línea en blanco y una lista de lo
hecho (el porqué, no el cómo). Los commits que escribe Claude terminan con la línea
`Co-Authored-By`. En PowerShell 5.1 el mensaje se pasa por archivo: `git commit -F archivo.txt`.

Las fusiones se llaman `Fusionar fase-<n>: <qué trae>`.

## Ciclo de una fase

1. **Abrir**: desde `main` actualizada, `git switch -c fase-<n>`. Se apunta en `docs/PROGRESO.md`.
2. **Trabajar**: commits pequeños en la rama. Antes de cada commit, `pnpm check` en verde.
3. **Cerrar**, todo en la rama de la fase:
   - `pnpm check` en verde y, si la fase sube versión, instalador generado con `pnpm.cmd build` en el
     terminal del usuario.
   - README de la fase (`docs/fase-<n>/README.md`), ADR si hubo decisiones, `docs/PROGRESO.md`,
     esta tabla y el `CHANGELOG.md` al día.
4. **Fusionar y etiquetar**:

   ```bash
   git switch main
   ```

   ```bash
   git merge --no-ff fase-5b -m "Fusionar fase-5b: <qué trae>"
   ```

   ```bash
   git tag -a fase-5b -m "Fase 5b: <qué trae>"
   ```

   Si la fase sube versión, además `git tag -a v0.7.0 -m "SnowView 0.7.0 (fase-5b): …"`.

5. **Limpiar y seguir**:

   ```bash
   git branch -d fase-5b
   ```

   ```bash
   git switch -c fase-6
   ```

6. **Publicar** (ver más abajo) y sincronizar el documento de progreso de claude.ai.

## GitHub

El repositorio está en <https://github.com/yurikFranco12/SnowView> y el remoto local se llama
`origin`. Desde el 2026-11-12 `main` y todas las etiquetas están publicados. Para ver el estado:

```bash
git status -sb
```

Tras cerrar cada fase (fusionada, etiquetada y con la rama borrada) se publica con:

```bash
git push origin main --follow-tags
```

Una rama de fase solo se sube si hay que compartirla o respaldarla antes de cerrarla
(`git push -u origin fase-<n>`); al cerrarla se borra también del remoto con
`git push origin --delete fase-<n>`. Las ramas de fase ya cerradas no se suben.

Si la ficha del repositorio en GitHub se quiere dejar al día, los instaladores se pueden adjuntar a
una «release» de la etiqueta `v<x.y.z>` correspondiente (no van en git: `target/` está ignorado).

Nunca se reescribe el historial publicado (`push --force`, `rebase` de commits ya subidos). Si algo
se subió por error, se corrige con un commit nuevo.

## Historial

| Etiqueta  | Versión | Fecha      | Commit de fusión | Contenido                                              |
| --------- | ------- | ---------- | ---------------- | ------------------------------------------------------ |
| `fase-0`  | —       | 2026-11-12 | `9bcee9e`        | Entorno, monorepo, tokens de diseño y ADR 0001         |
| `fase-1a` | v0.1.0  | 2026-11-12 | `6c8e8d4`        | Prototipo visual con Tauri 2 y datos simulados         |
| `fase-1b` | v0.2.0  | 2026-11-12 | `bc33716`        | Open-Meteo real, estaciones verificadas, favoritas     |
| `fase-1c` | v0.3.0  | 2026-11-12 | `2a4fa7a`        | Reglas, avisos nativos, bandeja y arranque con Windows |
| `fase-3a` | —       | 2026-11-12 | `6cc2d1e`        | Ajustes de consulta y nevada, modo sin conexión        |
| `fase-3b` | —       | 2026-11-12 | `778a4a4`        | Comparador de estaciones                               |
| `fase-3c` | v0.4.0  | 2026-11-12 | `b8b82ad`        | Historial de nevadas por temporada                     |
| `fase-4a` | —       | 2026-11-12 | `2fa30b7`        | Estaciones Alto Campoo y Cauterets                     |
| `fase-4b` | v0.5.0  | 2026-11-12 | `2ae6842`        | Condiciones para esquiar y snowboard, calendario       |
| `fase-5a` | v0.6.0  | 2026-11-12 | `5667031`        | Webcams de las estaciones dentro de la app             |
| `fase-5b` | v0.7.0  | 2026-11-12 | `git show`       | Control de versiones documentado y mapa de estaciones  |
| `fase-5c` | v0.7.1  | 2026-11-12 | `git show`       | Ubicación a mano y mapa interactivo                    |
| `fase-5d` | —       | 2026-11-12 | `git show`       | Repositorio publicado en GitHub                        |
| `fase-6`  | v0.8.0  | 2026-11-12 | `git show`       | Relieve y provincias en el mapa                        |
| `fase-7`  | v0.9.0  | 2026-11-12 | `git show`       | Mapa acotado y buscador de pueblos                     |
| `fase-8`  | v0.10.0 | 2026-11-12 | `git show`       | Ficha al pasar por un pin y leyenda sobre el mapa      |
| `fase-9`  | v0.11.0 | 2026-11-12 | `git show`       | Mapa de pistas de cada estación                        |
| `fase-10` | v0.12.0 | 2026-11-12 | `git show`       | Relieve en el mapa de pistas y depuración              |
| `fase-11` | v0.13.0 | 2026-11-13 | `git show`       | Montaña 3D de líneas animada en el mapa de pistas      |
| `fase-12` | v0.14.0 | 2026-11-13 | `git show`       | Giro de 360° y malla uniforme en la montaña 3D         |
| `fase-13` | v0.15.0 | 2026-11-13 | `git show`       | Rendimiento de los mapas                               |

Las fases 3a, 3b y 4a no generaron instalador propio: sus cambios llegaron en el de la fase
siguiente (v0.4.0 y v0.5.0).
