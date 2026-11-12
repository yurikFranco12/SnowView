// Descarga el terreno alrededor de las pistas de cada estación y guarda una malla de altitudes en el
// proyecto, para dibujar la forma de la montaña bajo las pistas sin conexión. Se ejecuta a mano,
// después de build-pistes.mjs:
//
//   node scripts/build-terrain.mjs [id-de-estacion ...] [--rehacer]
//
// Datos: Terrain Tiles de Mapzen en AWS (formato «terrarium», altitud = R·256 + G + B/256 − 32768),
// que combinan SRTM y otros modelos de terreno. https://registry.opendata.aws/terrain-tiles/
// No lleva clave ni límite de uso práctico. Se decodifica el PNG aquí mismo, sin dependencias.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const stations = JSON.parse(readFileSync(join(root, 'stations/stations.json'), 'utf8')).stations;
const pistesDir = join(root, 'apps/web/src/ui/map/data/pistes');
const outDir = join(root, 'apps/web/src/ui/map/data/terrain');
mkdirSync(outDir, { recursive: true });

const ZOOM = 12; // ~30 m por píxel a 42° de latitud
const MAX_POINTS = 9000; // por estación
const MIN_CELL_KM = 0.08;
const TILE = 256;
const tiles = new Map();

/** Decodifica un PNG RGB/RGBA de 8 bits sin entrelazar (el de los Terrain Tiles). */
function decodePng(buf) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let channels = 3;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error('PNG no admitido');
      channels = data[9] === 6 ? 4 : data[9] === 2 ? 3 : 0;
      if (!channels) throw new Error('PNG no admitido');
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 255;
    }
  }
  return { width, height, channels, data: out };
}

async function tile(z, x, y) {
  const key = `${z}/${x}/${y}`;
  if (!tiles.has(key)) {
    const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${key}.png`;
    let res;
    for (let attempt = 1; attempt <= 4; attempt++) {
      res = await fetch(url);
      if (res.ok) break;
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
    if (!res?.ok) throw new Error(`Sin tesela ${key}`);
    tiles.set(key, decodePng(Buffer.from(await res.arrayBuffer())));
  }
  return tiles.get(key);
}

/** Altitud en un punto (píxel más cercano de la tesela que lo contiene). */
async function elevation(lon, lat) {
  const n = 2 ** ZOOM;
  const fx = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const fy = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const tx = Math.floor(fx);
  const ty = Math.floor(fy);
  const t = await tile(ZOOM, tx, ty);
  const px = Math.min(TILE - 1, Math.floor((fx - tx) * TILE));
  const py = Math.min(TILE - 1, Math.floor((fy - ty) * TILE));
  const o = (py * t.width + px) * t.channels;
  return t.data[o] * 256 + t.data[o + 1] + t.data[o + 2] / 256 - 32768;
}

const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
for (const st of stations) {
  if (only.length && !only.includes(st.id)) continue;
  const pistesFile = join(pistesDir, `${st.id}.json`);
  if (!existsSync(pistesFile)) continue;
  if (existsSync(join(outDir, `${st.id}.json`)) && !process.argv.includes('--rehacer')) continue;
  const { pistes, lifts } = JSON.parse(readFileSync(pistesFile, 'utf8'));
  let minLon = Infinity,
    maxLon = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;
  for (const [lon, lat] of [...pistes, ...lifts].flatMap((i) => i.c)) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  const kx = Math.cos((st.latitude * Math.PI) / 180) * 111.32;
  // Margen mayor que lo que se dibuja alrededor de las pistas (1,5 km), para que el relieve no se corte.
  const padLon = 1.8 / kx;
  const padLat = 1.8 / 111.32;
  minLon -= padLon;
  maxLon += padLon;
  minLat -= padLat;
  maxLat += padLat;
  const wKm = (maxLon - minLon) * kx;
  const hKm = (maxLat - minLat) * 111.32;
  const cellKm = Math.max(MIN_CELL_KM, Math.sqrt((wKm * hKm) / MAX_POINTS));
  const nx = Math.max(2, Math.round(wKm / cellKm) + 1);
  const ny = Math.max(2, Math.round(hKm / cellKm) + 1);
  const dLon = (maxLon - minLon) / (nx - 1);
  const dLat = (maxLat - minLat) / (ny - 1);
  console.log(`${st.id}: ${nx}x${ny} (${nx * ny} puntos, celda ${(cellKm * 1000).toFixed(0)} m)`);

  const z = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      z.push(Math.round(await elevation(minLon + i * dLon, maxLat - j * dLat))); // de norte a sur
    }
  }
  const out = join(outDir, `${st.id}.json`);
  writeFileSync(
    out,
    JSON.stringify({
      lon0: +minLon.toFixed(5),
      lat0: +maxLat.toFixed(5),
      dLon: +dLon.toFixed(6),
      dLat: +dLat.toFixed(6),
      nx,
      ny,
      z,
    }),
  );
  console.log(
    `  ${Math.round(readFileSync(out).length / 1024)} KB, ${Math.min(...z)}–${Math.max(...z)} m`,
  );
}
