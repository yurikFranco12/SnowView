// Genera las capas de relieve y de provincias del mapa. Se ejecuta a mano, una sola vez (o cuando
// haga falta cambiar la zona); la app solo usa los archivos que salen de aquí:
//
//   node scripts/build-map-relief.mjs <carpeta-teselas-terrarium> <ne_10m_admin_1.geojson>
//
// Datos de origen (no van en el repositorio, ver docs/adr/0010-relieve-y-provincias.md):
// - Teselas de elevación "Terrarium" z8 de Terrain Tiles (AWS Open Data), mezcla de SRTM, EU-DEM
//   (Copernicus) y otras fuentes: https://registry.opendata.aws/terrain-tiles/
// - Natural Earth admin-1 (dominio público): provincias de España, departamentos de Francia y
//   parroquias de Andorra.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rootRequire = createRequire(join(root, 'package.json'));
const webRequire = createRequire(join(root, 'apps/web/package.json'));
const { PNG } = rootRequire('pngjs');
const { contours } = rootRequire('d3-contour');
const { topology } = rootRequire('topojson-server');
const { mesh } = webRequire('topojson-client');

const [terrainDir, adminFile] = process.argv.slice(2);
if (!terrainDir || !adminFile)
  throw new Error('Uso: node scripts/build-map-relief.mjs <teselas> <admin1.geojson>');
const outDir = join(root, 'apps/web/src/ui/map/data');

const Z = 8;
const TILE = 256;
const X0 = 119,
  X1 = 135,
  Y0 = 88,
  Y1 = 101; // teselas descargadas (ver download.mjs del scratchpad)
const BOX = { west: -11.5, east: 10, south: 34.5, north: 48.8 };
const SIDE = 3; // factor de reducción de la rejilla para las curvas y la imagen

// ---------- utilidades ----------
const q = (n, d = 3) => Math.round(n * 10 ** d) / 10 ** d;
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
const worldPx = 2 ** Z * TILE;
const pxToLon = (X) => (X / worldPx) * 360 - 180;
const pxToLat = (Y) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * Y) / worldPx))) * 180) / Math.PI;

// ---------- 1. provincias ----------
{
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
    .map((line) => rdp(line, 0.0015).map(([x, y]) => [q(x), q(y)]))
    .filter((l) => l.length >= 2);
  writeFileSync(
    join(outDir, 'provinces.json'),
    JSON.stringify({ type: 'MultiLineString', coordinates: simplified }),
  );
  console.log(`provincias: ${features.length} divisiones, ${simplified.length} líneas`);
}

// ---------- 2. rejilla de elevación ----------
const W = (X1 - X0 + 1) * TILE;
const H = (Y1 - Y0 + 1) * TILE;
const elev = new Float32Array(W * H);
for (let tx = X0; tx <= X1; tx++) {
  for (let ty = Y0; ty <= Y1; ty++) {
    const png = PNG.sync.read(readFileSync(join(terrainDir, `${Z}_${tx}_${ty}.png`)));
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const i = (y * TILE + x) * 4;
        const h = png.data[i] * 256 + png.data[i + 1] + png.data[i + 2] / 256 - 32768; // Terrarium
        elev[((ty - Y0) * TILE + y) * W + (tx - X0) * TILE + x] = h;
      }
    }
  }
}
console.log(`rejilla de elevación: ${W}×${H}`);

// reducción SIDE×SIDE (media) y suavizado ligero: quita el ruido del modelo
const w2 = Math.floor(W / SIDE),
  h2 = Math.floor(H / SIDE);
const grid = new Float32Array(w2 * h2);
for (let y = 0; y < h2; y++)
  for (let x = 0; x < w2; x++) {
    let s = 0;
    for (let dy = 0; dy < SIDE; dy++)
      for (let dx = 0; dx < SIDE; dx++) s += elev[(y * SIDE + dy) * W + x * SIDE + dx];
    grid[y * w2 + x] = s / (SIDE * SIDE);
  }
const smooth = new Float32Array(grid.length);
for (let y = 0; y < h2; y++)
  for (let x = 0; x < w2; x++) {
    let s = 0,
      n = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx,
          yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w2 || yy >= h2) continue;
        const wgt = dx === 0 && dy === 0 ? 4 : dx === 0 || dy === 0 ? 2 : 1;
        s += grid[yy * w2 + xx] * wgt;
        n += wgt;
      }
    smooth[y * w2 + x] = s / n;
  }

// ---------- 3. relieve sombreado (PNG con transparencia) ----------
/**
 * Sombreado de ladera con luz desde el noroeste, en tonos fríos de la app. `grid` es la elevación
 * (m) de una zona; `originX/Y` es su esquina en píxeles de la tesela z8 y `side` los píxeles z8 que
 * mide cada celda. El mar y los lagos quedan transparentes.
 */
function renderRelief(grid, gw, gh, originX, originY, side, file) {
  const ZF = 1.7; // exageración vertical: con celdas de ~1 km el relieve real apenas se ve
  const AZ = (315 * Math.PI) / 180,
    ALT = (42 * Math.PI) / 180;
  const flat = Math.sin(ALT);
  // Alfa en pasos de 6/255: casi no se nota y el PNG comprime mucho mejor.
  const quantAlpha = (a) => Math.min(255, Math.round(a / 6) * 6);
  const png = new PNG({ width: gw, height: gh, colorType: 6, deflateLevel: 9 });
  const z = (xx, yy) =>
    Math.max(0, grid[Math.min(gh - 1, Math.max(0, yy)) * gw + Math.min(gw - 1, Math.max(0, xx))]);
  for (let y = 0; y < gh; y++) {
    const lat = (pxToLat(originY + (y + 0.5) * side) * Math.PI) / 180;
    const cell = ((156543.03392 * Math.cos(lat)) / 2 ** Z) * side; // metros por celda a esa latitud
    for (let x = 0; x < gw; x++) {
      const o = (y * gw + x) * 4;
      const e = z(x, y);
      if (e <= 1) {
        png.data[o + 3] = 0;
        continue;
      } // mar y lagos: transparente
      const a = z(x - 1, y - 1),
        b = z(x, y - 1),
        c = z(x + 1, y - 1);
      const d = z(x - 1, y),
        f = z(x + 1, y);
      const g = z(x - 1, y + 1),
        h = z(x, y + 1),
        i = z(x + 1, y + 1);
      const dzdx = ((c + 2 * f + i - (a + 2 * d + g)) / (8 * cell)) * ZF;
      const dzdy = ((g + 2 * h + i - (a + 2 * b + c)) / (8 * cell)) * ZF;
      const slope = Math.atan(Math.hypot(dzdx, dzdy));
      const aspect = Math.atan2(dzdy, -dzdx);
      const shade =
        Math.cos(Math.PI / 2 - ALT) * Math.cos(slope) +
        Math.sin(Math.PI / 2 - ALT) * Math.sin(slope) * Math.cos(AZ - aspect);
      const r = shade - flat; // >0 ladera iluminada, <0 ladera en sombra
      const tint = Math.min(1, e / 3000) * 0.1; // lo alto, algo más claro
      if (r >= 0) {
        png.data[o] = 205;
        png.data[o + 1] = 232;
        png.data[o + 2] = 255;
        png.data[o + 3] = quantAlpha(255 * Math.min(0.42, tint + r * 1.4));
      } else {
        png.data[o] = 4;
        png.data[o + 1] = 8;
        png.data[o + 2] = 34;
        png.data[o + 3] = quantAlpha(255 * Math.min(0.45, Math.max(0, -r * 1.5 - tint * 0.5)));
      }
    }
  }
  const buf = PNG.sync.write(png);
  writeFileSync(join(outDir, file), buf);
  console.log(`${file}: ${gw}×${gh}, ${Math.round(buf.length / 1024)} KB`);
  return {
    file,
    west: pxToLon(originX),
    east: pxToLon(originX + gw * side),
    north: pxToLat(originY),
    south: pxToLat(originY + gh * side),
  };
}

const reliefs = {
  coarse: renderRelief(smooth, w2, h2, X0 * TILE, Y0 * TILE, SIDE, 'relief.png'),
  details: [],
};

// Zonas con las estaciones, a la resolución completa de las teselas (unos 470 m por celda).
const lonToPx = (lon) => ((lon + 180) / 360) * worldPx;
const latToPx = (lat) =>
  ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
    2) *
  worldPx;
const DETAIL_ZONES = [
  {
    name: 'pirineos-cantabrico',
    file: 'relief-north.png',
    west: -5.6,
    east: 3.6,
    south: 41.4,
    north: 43.9,
  },
  {
    name: 'sierra-nevada',
    file: 'relief-sierra-nevada.png',
    west: -4.3,
    east: -2.6,
    south: 36.8,
    north: 37.5,
  },
];
for (const zone of DETAIL_ZONES) {
  const px0 = Math.floor(lonToPx(zone.west)),
    px1 = Math.ceil(lonToPx(zone.east));
  const py0 = Math.floor(latToPx(zone.north)),
    py1 = Math.ceil(latToPx(zone.south));
  const gw = px1 - px0,
    gh = py1 - py0;
  const crop = new Float32Array(gw * gh);
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++)
      crop[y * gw + x] = elev[(py0 - Y0 * TILE + y) * W + (px0 - X0 * TILE + x)];
  // suavizado ligero (3×3): quita el escalonado del modelo sin perder las crestas
  const sm = new Float32Array(crop.length);
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      let sum = 0,
        n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx,
            yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue;
          const wgt = dx === 0 && dy === 0 ? 4 : dx === 0 || dy === 0 ? 2 : 1;
          sum += crop[yy * gw + xx] * wgt;
          n += wgt;
        }
      sm[y * gw + x] = sum / n;
    }
  reliefs.details.push({ name: zone.name, ...renderRelief(sm, gw, gh, px0, py0, 1, zone.file) });
}

// ---------- 4. curvas de nivel ----------
{
  const INTERVAL = 500;
  const thresholds = [];
  for (let m = INTERVAL; m <= 3500; m += INTERVAL) thresholds.push(m);
  const polys = contours().size([w2, h2]).thresholds(thresholds)(Array.from(smooth));
  const levels = [];
  let total = 0;
  for (const poly of polys) {
    const lines = [];
    for (const polygon of poly.coordinates) {
      for (const ring of polygon) {
        // se parten los anillos donde tocan el borde de la rejilla (allí no son curvas reales)
        let current = [];
        const flush = () => {
          if (current.length >= 4) lines.push(current);
          current = [];
        };
        for (const [gx, gy] of ring) {
          if (gx <= 1 || gy <= 1 || gx >= w2 - 1 || gy >= h2 - 1) {
            flush();
            continue;
          }
          const X = X0 * TILE + gx * SIDE,
            Y = Y0 * TILE + gy * SIDE;
          current.push([pxToLon(X), pxToLat(Y)]);
        }
        flush();
      }
    }
    const out = lines
      .map((l) => rdp(l, 0.004).map(([x, y]) => [q(x), q(y)]))
      .filter((l) => l.length >= 4);
    total += out.length;
    if (out.length) levels.push({ m: poly.value, lines: out });
  }
  writeFileSync(join(outDir, 'contours.json'), JSON.stringify({ intervalM: INTERVAL, levels }));
  console.log(`curvas: ${levels.length} niveles, ${total} líneas`);
}

// ---------- 5. extensión geográfica de cada imagen de relieve (para colocarlas) ----------
writeFileSync(join(outDir, 'relief-bounds.json'), JSON.stringify(reliefs));
console.log('imágenes de relieve:', 1 + reliefs.details.length);
