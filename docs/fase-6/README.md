# Fase 6 — Relieve y provincias en el mapa

Estado: **completada** el 2026-11-12. Etiquetas `fase-6` y `v0.8.0`. Decisiones en el
[ADR 0010](../adr/0010-relieve-y-provincias.md).

> **Nota:** el relieve sombreado y las curvas de nivel se quitaron en la fase 7 (ADR 0011). Las
> provincias se conservan; este documento queda como historia de lo que se hizo.

## Qué incluye

- **Provincias**: líneas finas discontinuas entre las provincias de España, los departamentos del
  sur de Francia y las parroquias de Andorra. Aparecen al acercarse a España.
- **Relieve sombreado** en tonos fríos del estilo de la app, muy sutil: se ve el Pirineo, la cornisa
  cantábrica, el Sistema Central y Sierra Nevada. Al acercarte a una estación, se hace más nítido
  (imágenes de detalle donde hay estaciones).
- **Curvas de nivel** cada 500 m, tenues, al acercar.
- **Leyenda** con las líneas de provincias y de curvas, y la atribución de los datos.
- Todo funciona sin conexión: los datos van dentro de la app.

## Cómo probar

```bash
pnpm check
```

Abre Mapa: se ven las provincias y el relieve. Pulsa una estación para acercarte y ver el relieve
nítido y las curvas.

## Regenerar las capas (solo si hace falta cambiar la zona)

El script no descarga nada: necesita las teselas Terrarium z8 y el archivo de Natural Earth
`ne_10m_admin_1_states_provinces.geojson` ya descargados.

```bash
node scripts/build-map-data.mjs
```

```bash
node scripts/build-map-relief.mjs <carpeta-con-las-teselas> <archivo-admin1.geojson>
```

## Instaladores (app 0.8.0)

Generados con `pnpm.cmd build` en el terminal del usuario, en `src-tauri/target/release/bundle/`:

| Archivo                             | Tamaño   |
| ----------------------------------- | -------- |
| `msi/SnowView_0.8.0_x64_en-US.msi`  | 5,76 MiB |
| `nsis/SnowView_0.8.0_x64-setup.exe` | 4,65 MiB |

El relieve añade unos 1,4 MiB respecto a la 0.7.1.
