// Paso 1 del catálogo de estaciones: descarga de OpenStreetMap (Overpass API) los dominios
// esquiables, los remontes y las pistas de fondo de España, Francia, Portugal y Andorra, y los deja
// en una carpeta de trabajo (fuera del repositorio). El paso 2 es `build-stations.mjs`.
//
//   node scripts/build-stations-download.mjs <carpeta-de-trabajo>
//
// Datos © colaboradores de OpenStreetMap, licencia ODbL (https://www.openstreetmap.org/copyright).
// Overpass pide un User-Agent propio; no se envía ningún dato personal.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) throw new Error('Uso: node scripts/build-stations-download.mjs <carpeta-de-trabajo>');
mkdirSync(dir, { recursive: true });

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const COUNTRIES = ['ES', 'FR', 'PT', 'AD'];
const LIFTS =
  'chair_lift|gondola|cable_car|mixed_lift|drag_lift|t-bar|j-bar|platter|rope_tow|magic_carpet';
const QUERIES = {
  // Dominios: zonas `landuse=winter_sports` y relaciones `site=piste`, con su geometría.
  areas: (c) =>
    `area["ISO3166-1"="${c}"][admin_level=2]->.a;(nwr[landuse=winter_sports][name](area.a);relation[site=piste][name](area.a););out geom;`,
  // Remontes en servicio (los abandonados llevan otra etiqueta y no salen).
  lifts: (c) =>
    `area["ISO3166-1"="${c}"][admin_level=2]->.a;way[aerialway~"^(${LIFTS})$"](area.a);out tags geom;`,
  // Pistas de esquí alpino (solo el trazado, sin las dibujadas como superficie), para medir los
  // kilómetros esquiables de cada estación.
  downhill: (c) =>
    `area["ISO3166-1"="${c}"][admin_level=2]->.a;way["piste:type"="downhill"]["area"!="yes"](area.a);out skel geom;`,
  // Pistas de esquí de fondo, para los centros nórdicos sin remontes.
  nordic: (c) =>
    `area["ISO3166-1"="${c}"][admin_level=2]->.a;way["piste:type"="nordic"](area.a);out geom;`,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpass(query) {
  let wait = 5000;
  for (let attempt = 0; attempt < 8; attempt++) {
    const url = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': 'SnowView-catalog-builder/1.0',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'data=' + encodeURIComponent(`[out:json][timeout:600];${query}`),
      });
      const text = await res.text();
      if (res.ok && text.startsWith('{')) {
        const json = JSON.parse(text);
        if (!json.remark) return json;
        console.log('  aviso de Overpass:', json.remark);
      } else console.log(`  ${url}: ${res.status}`);
    } catch (e) {
      console.log(`  ${url}: ${e.message}`);
    }
    await sleep(wait);
    wait = Math.min(wait * 2, 120_000);
  }
  throw new Error('Overpass no respondió');
}

for (const kind of Object.keys(QUERIES)) {
  for (const c of COUNTRIES) {
    const file = join(dir, `${kind}-${c}.json`);
    if (existsSync(file)) continue;
    console.log(`${kind} ${c}…`);
    const json = await overpass(QUERIES[kind](c));
    writeFileSync(file, JSON.stringify(json));
    console.log(`  ${json.elements.length} elementos`);
    await sleep(3000);
  }
}
console.log('Descarga completa.');
