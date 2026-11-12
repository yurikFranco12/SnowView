// Genera el mapa detallado del suroeste de Europa a partir de Natural Earth (dominio público, vía
// el paquete world-atlas): España, Francia, Andorra, Portugal y vecinos, recortados a una caja y
// simplificados para que pesen poco. Se ejecuta a mano cuando haga falta cambiar la zona:
//   node scripts/build-map-data.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'apps/web/package.json'));
const { feature } = require('topojson-client');
const topology = JSON.parse(
  readFileSync(require.resolve('world-atlas/countries-10m.json'), 'utf8'),
);

const BOX = { west: -17, east: 17, south: 28, north: 53 }; // cobertura del mapa: ver COVERAGE en projection.ts
const TOLERANCE = 0.002; // grados (~200 m)

const intersects = (ring) => {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const [x, y] of ring) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return maxX >= BOX.west && minX <= BOX.east && maxY >= BOX.south && minY <= BOX.north;
};
const area = (ring) => {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return Math.abs(a / 2);
};
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
const rdp = (pts, tol) => {
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
};
const q = (n) => Math.round(n * 1000) / 1000;
const simplifyRing = (ring) => {
  const out = rdp(ring, TOLERANCE).map(([x, y]) => [q(x), q(y)]);
  const dedup = out.filter((p, i) => i === 0 || p[0] !== out[i - 1][0] || p[1] !== out[i - 1][1]);
  return dedup.length >= 4 ? dedup : null;
};

const features = [];
// Rusia cruza el antimeridiano: su caja envuelve todo el mundo y cuela un polígono enorme.
const EXCLUDE = new Set(['Russia']);
for (const f of feature(topology, topology.objects.countries).features) {
  if (EXCLUDE.has(f.properties.name)) continue;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const kept = [];
  for (const poly of polys) {
    if (!intersects(poly[0]) || area(poly[0]) < 0.0004) continue;
    const rings = poly.map(simplifyRing).filter(Boolean);
    if (rings[0]) kept.push(rings);
  }
  if (kept.length)
    features.push({
      type: 'Feature',
      properties: { name: f.properties.name },
      geometry: { type: 'MultiPolygon', coordinates: kept },
    });
}
const out = join(root, 'apps/web/src/ui/map/data/southwest-europe.json');
writeFileSync(out, JSON.stringify({ type: 'FeatureCollection', features }));
console.log(features.map((f) => f.properties.name).join(', '));
console.log(Math.round(readFileSync(out).length / 1024) + ' KB');
