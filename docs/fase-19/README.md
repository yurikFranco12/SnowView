# Fase 19 — Estaciones de España, Francia, Portugal y Andorra (versión 1.1.0)

Estado: **código terminado** el 2026-11-15; falta cerrar la fase (instaladores en el equipo, fusión
y etiquetas). Decisiones en el [ADR 0019](../adr/0019-catalogo-completo-y-resumen-ligero.md). Vale
para la app de escritorio y para la de Android: el catálogo y las pantallas son el mismo código.

## Qué cambia

- **74 estaciones** en lugar de 10: España (18), Francia (52), Portugal (1) y Andorra (3). Entran
  las que tienen al menos 20 km de pistas de esquí alpino (40 km en Francia, donde hay muchas más); las pequeñas y los centros de esquí de
  fondo quedan fuera. La primera versión de la fase llevaba las 297 que hay en total y se recortó a
  petición del usuario.
- **Estaciones**: clasificación de todo el catálogo por nieve prevista, espesor o nombre, con
  filtro por país y por favoritas, y de 60 en 60. La nota del día sale en las favoritas.
- **Mapa**: vista general de los cuatro países; con el mapa alejado las estaciones son puntos y al
  acercar pasan a pines con su nombre. La lista lateral tiene buscador.
- **Calendario**: valora las favoritas o, con «Más nieve», las 10 estaciones con más nieve prevista.
- **Comparar, Alertas e Historial**: desplegable por país con las favoritas primero.
- **Buscar**: también por país («francia») y por pueblo («chamonix»).

## De dónde salen las estaciones

De OpenStreetMap, con dos scripts que se ejecutan a mano cuando haya que actualizar el catálogo:

```bash
node scripts/build-stations-download.mjs <carpeta-de-trabajo>
node scripts/build-stations.mjs <carpeta-de-trabajo> <ne_10m_admin_1_states_provinces.geojson>
pnpm exec prettier --write stations/stations.json
```

El primero baja de Overpass los dominios esquiables, los remontes y las pistas de fondo (tarda
unos minutos y reintenta si el servidor está ocupado). El segundo monta `stations/stations.json`:
funde dominios duplicados, quita los dominios «paraguas» cuyas estaciones ya están una a una
(Les 3 Vallées, Paradiski, Les Portes du Soleil…), calcula las cotas con el relieve de Terrain Tiles
mide los kilómetros de pistas de cada una y descarta las de menos de 20 (`MIN_PISTE_KM`; 40 en Francia, `MIN_PISTE_KM_BY_COUNTRY`),
y asigna provincia o departamento con Natural Earth admin-1 (el mismo archivo que usa
`build-map-provinces.mjs`). Las 10 estaciones verificadas a mano no se tocan.

Lo que el script decide a mano está en listas cortas al principio del archivo: estaciones cerradas
que siguen en OpenStreetMap, nombres corregidos, estaciones sin dominio y dos excepciones al
mínimo de kilómetros: Serra da Estrela se conserva por ser la única de Portugal, y en cuatro
estaciones españolas con las pistas a medio dibujar en OpenStreetMap (Panticosa, Espot, Valdezcaray
y Valgrande-Pajares) se usa la cifra que publica la estación, apuntada de memoria y sin comprobar.

## Límites conocidos

- **Cotas estimadas** en las 64 estaciones nuevas (la app lo indica): son la altitud más baja y más
  alta de los remontes, no las cifras oficiales. Un telecabina desde el valle baja la base.
- **Mapa de pistas y webcams** solo en las 10 estaciones de antes; en el resto no aparece el botón.
- Los kilómetros son los de OpenStreetMap, no los oficiales: una estación cerca de los 20 km puede
  quedar dentro o fuera por cómo esté dibujada (La Covatilla y La Pinilla quedan fuera). Hay
  estaciones que salen por sectores (Chamonix) o dos veces con distinto alcance (Val Thorens y Orelle).
- **Open-Meteo**: ver todo el catálogo cuesta 74 ubicaciones de su límite gratuito (10.000 al
  día). La app guarda el resumen 3 horas y no lo refresca sola.

## Cómo probar

```bash
pnpm check
pnpm.cmd web
```

En Estaciones, pulsa «Francia» y ordena por «Más nieve prevista». Escribe «portugal» en el
buscador: sale Serra da Estrela. En el Mapa, aleja y acerca sobre los Alpes. En Alertas, crea una
regla para una estación francesa.

## Instaladores (app 1.1.0)

- **Windows**: `pnpm.cmd build`; salen en `src-tauri/target/release/bundle/`. Compilados el
  2026-11-15 en la carpeta de trabajo de la fase (sin probar todavía instalados):

  | Archivo                        | Tamaño   |
  | ------------------------------ | -------- |
  | `SnowView_1.1.0_x64_en-US.msi` | 3,25 MiB |
  | `SnowView_1.1.0_x64-setup.exe` | 2,69 MiB |

- **Android**: `pnpm.cmd android:build`, después de los pasos de `docs/fase-18/README.md` (Android
  Studio, SDK y firma), que siguen pendientes en el equipo.
