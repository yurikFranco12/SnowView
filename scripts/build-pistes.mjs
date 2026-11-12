// Descarga las pistas y los remontes de cada estación desde OpenStreetMap (Overpass API) y los guarda
// en el proyecto, para que la app los dibuje sin conexión. Se ejecuta a mano (solo si hay que
// actualizar los datos):
//
//   node scripts/build-pistes.mjs [id-de-estacion ...] [--refiltrar]
//
// Datos © colaboradores de OpenStreetMap, licencia ODbL (https://www.openstreetmap.org/copyright).
// Overpass pide un User-Agent propio; no se envía ningún dato personal.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const stations = JSON.parse(readFileSync(join(root, 'stations/stations.json'), 'utf8')).stations;
const outDir = join(root, 'apps/web/src/ui/map/data/pistes');
mkdirSync(outDir, { recursive: true });

const RADIUS_M = 12000; // alrededor de la estación
const ENDPOINT = 'https://overpass-api.de/api/interpreter';
const LIFT_TYPES = new Set([
  'chair_lift',
  'gondola',
  'cable_car',
  'mixed_lift',
  'drag_lift',
  't-bar',
  'j-bar',
  'platter',
  'rope_tow',
  'magic_carpet',
  'zip_line',
]);
const q = (n) => Math.round(n * 1e5) / 1e5;

const sqDistSeg = (p, a, b) => {
  let [x, y] = a;
  let dx = b[0] - x,
    dy = b[1] - y;
  if (dx || dy) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
};
function rdp(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let max = tol * tol,
      idx = -1;
    for (let i = first + 1; i < last; i++) {
      const d = sqDistSeg(pts[i], pts[first], pts[last]);
      if (d > max) {
        idx = i;
        max = d;
      }
    }
    if (idx > -1) {
      keep[idx] = 1;
      stack.push([first, idx], [idx, last]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

const DIFFICULTY = {
  novice: 'green',
  easy: 'blue',
  intermediate: 'red',
  advanced: 'black',
  expert: 'black',
  freeride: 'freeride',
};

async function overpass(query) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'User-Agent': 'SnowView-build/1.0 (proyecto personal sin ánimo de lucro)',
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: '*/*',
      },
      body: 'data=' + encodeURIComponent(query),
    });
    if (res.ok) return res.json();
    console.log(`  intento ${attempt}: HTTP ${res.status}`);
    await new Promise((r) => setTimeout(r, 5000 * attempt));
  }
  throw new Error('Overpass no responde');
}

/**
 * Se queda solo con la zona esquiable de la estación: agrupa pistas y remontes que se tocan o están a
 * menos de 300 m, y conserva los grupos que llegan a 5 km de la coordenada de la estación. Así no se
 * cuelan las pistas de otras estaciones que caen dentro del radio de la consulta.
 */
function keepNearStation(pistes, lifts, st) {
  const kx = Math.cos((st.latitude * Math.PI) / 180);
  const items = [...pistes, ...lifts];
  const parent = items.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const CELL = 0.003; // grados (~300 m)
  const grid = new Map();
  items.forEach((it, i) => {
    const seen = new Set();
    for (const [lon, lat] of it.c) {
      const gx = Math.floor((lon * kx) / CELL);
      const gy = Math.floor(lat / CELL);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const key = `${gx + dx},${gy + dy}`;
          for (const j of grid.get(key) ?? []) {
            if (!seen.has(j)) {
              seen.add(j);
              parent[find(i)] = find(j);
            }
          }
        }
      }
      const own = `${gx},${gy}`;
      if (!grid.has(own)) grid.set(own, []);
      grid.get(own).push(i);
    }
  });
  const near = new Set();
  items.forEach((it, i) => {
    for (const [lon, lat] of it.c) {
      const dx = (lon - st.longitude) * kx * 111.32;
      const dy = (lat - st.latitude) * 111.32;
      if (Math.hypot(dx, dy) <= 5) {
        near.add(find(i));
        break;
      }
    }
  });
  const keep = (it) => near.has(find(items.indexOf(it)));
  return { pistes: pistes.filter(keep), lifts: lifts.filter(keep) };
}

const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const refilter = process.argv.includes('--refiltrar');
for (const st of stations) {
  if (only.length && !only.includes(st.id)) continue;
  const around = `(around:${RADIUS_M},${st.latitude},${st.longitude})`;
  const query = `[out:json][timeout:60];(way["piste:type"="downhill"]${around};way["aerialway"]${around};);out tags geom;`;
  console.log(st.id);
  if (refilter) {
    // Vuelve a filtrar lo ya descargado, sin pedir nada a la red.
    const file = join(outDir, `${st.id}.json`);
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    const kept = keepNearStation(saved.pistes, saved.lifts, st);
    writeFileSync(file, JSON.stringify(kept));
    console.log(`  ${kept.pistes.length} pistas, ${kept.lifts.length} remontes`);
    continue;
  }
  const data = await overpass(query);
  const lat0 = st.latitude;
  const kmPerLon = 111.32 * Math.cos((lat0 * Math.PI) / 180);
  const tol = 0.00004; // grados (~4 m)
  const pistes = [];
  const lifts = [];
  for (const el of data.elements) {
    if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) continue;
    const t = el.tags ?? {};
    let pts = el.geometry.map((g) => [g.lon, g.lat]);
    pts = rdp(pts, tol).map(([x, y]) => [q(x), q(y)]);
    if (pts.length < 2) continue;
    const name = t.name ?? t['piste:name'] ?? t.ref ?? undefined;
    if (t.aerialway) {
      if (!LIFT_TYPES.has(t.aerialway)) continue;
      lifts.push({ k: t.aerialway, n: name, c: pts });
    } else if (t['piste:type'] === 'downhill') {
      if (t.area === 'yes') continue; // zonas: solo se dibujan los ejes
      pistes.push({ d: DIFFICULTY[t['piste:difficulty']] ?? 'unknown', n: name, c: pts });
    }
  }
  const file = join(outDir, `${st.id}.json`);
  writeFileSync(file, JSON.stringify(keepNearStation(pistes, lifts, st)));
  const kb = Math.round(readFileSync(file).length / 1024);
  console.log(
    `  ${pistes.length} pistas, ${lifts.length} remontes, ${kb} KB (${kmPerLon.toFixed(0)} km/°lon)`,
  );
  await new Promise((r) => setTimeout(r, 3000));
}
