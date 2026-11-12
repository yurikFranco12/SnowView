// Genera las líneas que separan provincias, departamentos y parroquias. Se ejecuta a mano (solo si
// hay que cambiar la zona); la app usa el archivo que sale de aquí:
//
//   node scripts/build-map-provinces.mjs <ne_10m_admin_1_states_provinces.geojson>
//
// Dato de origen (no va en el repositorio): Natural Earth admin-1, dominio público,
// https://www.naturalearthdata.com/ . Trae las 52 provincias de España, los 101 departamentos de
// Francia y las 7 parroquias de Andorra. De cada país solo se dibuja la «malla» interior: las líneas
// compartidas por dos divisiones del mismo país, sin repetir las fronteras de país (ya dibujadas).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rootRequire = createRequire(join(root, 'package.json'));
const webRequire = createRequire(join(root, 'apps/web/package.json'));
const { topology } = rootRequire('topojson-server');
const { mesh } = webRequire('topojson-client');

const adminFile = process.argv[2];
if (!adminFile) throw new Error('Uso: node scripts/build-map-provinces.mjs <admin1.geojson>');

const BOX = { west: -17, east: 17, south: 28, north: 53 }; // cobertura del mapa
const TOLERANCE = 0.0015; // grados (~150 m)
const q = (n) => Math.round(n * 1000) / 1000;

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

const admin = JSON.parse(readFileSync(adminFile, 'utf8'));
const inBox = (f) => {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  const walk = (c) =>
    typeof c[0] === 'number'
      ? ((minX = Math.min(minX, c[0])),
        (maxX = Math.max(maxX, c[0])),
        (minY = Math.min(minY, c[1])),
        (maxY = Math.max(maxY, c[1])))
      : c.forEach(walk);
  walk(f.geometry.coordinates);
  return maxX >= BOX.west && minX <= BOX.east && maxY >= BOX.south && minY <= BOX.north;
};
const features = admin.features
  .filter((f) => ['ESP', 'FRA', 'AND'].includes(f.properties.adm0_a3) && inBox(f))
  .map((f) => ({
    type: 'Feature',
    properties: { country: f.properties.adm0_a3, name: f.properties.name },
    geometry: f.geometry,
  }));

const topo = topology({ provinces: { type: 'FeatureCollection', features } }, 1e5);
const lines = mesh(
  topo,
  topo.objects.provinces,
  (a, b) => a !== b && a.properties.country === b.properties.country,
);
const simplified = lines.coordinates
  .map((line) => rdp(line, TOLERANCE).map(([x, y]) => [q(x), q(y)]))
  .filter((l) => l.length >= 2);
const out = join(root, 'apps/web/src/ui/map/data/provinces.json');
writeFileSync(out, JSON.stringify({ type: 'MultiLineString', coordinates: simplified }));
console.log(
  `${features.length} divisiones, ${simplified.length} líneas, ${Math.round(readFileSync(out).length / 1024)} KB`,
);
