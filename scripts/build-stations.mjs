// Paso 2 del catálogo de estaciones: a partir de lo descargado por `build-stations-download.mjs`
// monta `stations/stations.json` con todas las estaciones de España, Francia, Portugal y Andorra.
// Se ejecuta a mano (solo si hay que actualizar el catálogo):
//
//   node scripts/build-stations.mjs <carpeta-de-trabajo> <ne_10m_admin_1_states_provinces.geojson>
//
// Qué hace:
// - Estación = dominio de OpenStreetMap (`landuse=winter_sports` o relación `site=piste`) con
//   remontes en servicio y al menos 20 km de pistas de esquí alpino (40 km en Francia): las pequeñas y
//   los centros de esquí de fondo quedan fuera. Los dominios duplicados se funden.
// - Cotas: la base y la cima son la altitud más baja y más alta de las estaciones de los remontes
//   (o de las pistas de fondo), leídas de Terrain Tiles (el relieve de los mapas de pistas).
//   Son estimadas: `elevationsVerified: false`.
// - Provincia o departamento: Natural Earth admin-1 (dominio público).
// - Las estaciones ya verificadas a mano en `stations.json` se conservan tal cual.
//
// Datos © colaboradores de OpenStreetMap (ODbL). No se envía ningún dato personal.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [dir, adminFile] = process.argv.slice(2);
if (!dir || !adminFile)
  throw new Error('Uso: node scripts/build-stations.mjs <carpeta-de-trabajo> <admin1.geojson>');

const COUNTRIES = ['ES', 'FR', 'PT', 'AD'];
const TODAY = new Date().toISOString().slice(0, 10);
const stationsPath = join(root, 'stations/stations.json');
const current = JSON.parse(readFileSync(stationsPath, 'utf8'));
/** Estaciones verificadas a mano: se conservan sin tocar. */
const curated = current.stations.filter((s) => !s.osm);

// ---------- utilidades ----------
const load = (kind) => {
  const seen = new Set();
  const out = [];
  for (const c of COUNTRIES) {
    for (const e of JSON.parse(readFileSync(join(dir, `${kind}-${c}.json`), 'utf8')).elements) {
      const key = `${e.type}/${e.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
  }
  return out;
};
const norm = (t) =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
const key = (t) => norm(t).replace(/[^a-z0-9]/g, '');
const km = (a, b) => {
  const dLat = (b[1] - a[1]) * 111.2;
  const dLon = (b[0] - a[0]) * 111.2 * Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
};
const inRing = ([x, y], ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
function hull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = (list) => {
    const h = [];
    for (const p of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  return [...build(pts), ...build(pts.reverse())];
}
const coords = (geometry) => (geometry ?? []).filter(Boolean).map((g) => [g.lon, g.lat]);

// ---------- nombres ----------
const SKIP_NAME =
  /abandon|ancien|ferm[ée]|cerrad|tancad|snowkite|snowpark|snow park|cascades? de glace|luge|tubing|stade de slalom|jardin des neiges|baby/i;
// Fin de palabra que también vale tras una letra con tilde (\b de JavaScript no la reconoce).
const END = "(?=[\\s'’]|$)";
const PREFIXES = [
  new RegExp(
    `^(estaci[oó]n?|estância|station|domaine|centro|centre|site|stade|punto|complejo)${END}`,
    'i',
  ),
  new RegExp(`^espace\\s+nordique${END}`, 'i'),
  new RegExp(
    `^(invernal|de montaña|de muntanya|d['’]esqu[ií]|de esqu[ií]|esqu[ií]|de ski|skiable|nordique|n[oòó]rdic[oa]?|alp[ií]n?[oa]?|de fond|de neiges?|de nieves?|des neiges|i muntanya|y montaña|y de montaña|y|i)${END}`,
    'i',
  ),
  // «de la Molina» queda en «la Molina»: el artículo es parte del nombre.
  /^de\s+/i,
  /^d['’]/i,
  /^[-–—·/\s]+/,
];
function cleanName(raw) {
  let name = raw
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (let changed = true; changed;) {
    changed = false;
    for (const re of PREFIXES) {
      const next = name.replace(re, '').trim();
      if (next !== name && next.length >= 3) {
        name = next;
        changed = true;
      }
    }
  }
  // «Station du Markstein» es «Le Markstein»: la contracción se deshace en su artículo.
  name = name
    .replace(/^du\s+/i, 'Le ')
    .replace(/^des\s+/i, 'Les ')
    .replace(/^del\s+/i, 'El ')
    .replace(/^aram[oó]n\s+/i, '');
  name = name.charAt(0).toUpperCase() + name.slice(1);
  // El paréntesis suele ser el pueblo o el dominio («Les Houches (Chamonix)») y hace falta para
  // encontrar la estación al buscar; si solo nombra un sector de la misma estación, sobra.
  const place = /\(([^)]*)\)/.exec(raw)?.[1]?.trim();
  return place && !/sector|secteur/i.test(place) ? `${name} (${place})` : name;
}
const slug = (t) =>
  norm(t)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Dominios que siguen en OpenStreetMap con remontes pero no son estaciones de esquí en servicio.
 * Se comparan con el nombre ya limpio, sin tildes ni signos.
 */
const EXCLUDED = new Map([
  ['llessui', 'cerrada en 1987'],
  ['latuca', 'cerrada en 1989'],
  ['vallfosca', 'nunca llegó a abrir; su teleférico es el de la presa'],
  ['rasosdepeguera', 'cerrada en 2004'],
  ['aiguilledumidichamonix', 'teleférico turístico, sin pistas balizadas'],
]);
/** Nombres de OpenStreetMap que se cambian por el de uso común. */
const NAME_FIX = new Map([
  ['espaceliberte', 'Châtel'],
  ['praloup1600', 'Pra Loup'],
  ['alpedhuezgranddomaine', "Alpe d'Huez"],
]);
/**
 * Tamaño mínimo para entrar en el catálogo: kilómetros de pistas de esquí alpino según
 * OpenStreetMap. Deja fuera las estaciones pequeñas y los centros de esquí de fondo.
 */
const MIN_PISTE_KM = 20;
/** Mínimo propio de un país: en Francia hay tantas estaciones que el corte es más alto. */
const MIN_PISTE_KM_BY_COUNTRY = { FR: 40 };
/**
 * Kilómetros que publica la estación, para las que OpenStreetMap tiene las pistas a medio dibujar
 * y por eso se quedarían fuera. Cifras apuntadas de memoria el 2026-11-15, sin comprobar una a una
 * en la web de cada estación.
 */
const OFFICIAL_KM = new Map([
  ['panticosa', 39],
  ['espot', 25],
  ['valdezcaray', 22],
  ['valgrandepajares', 21],
]);
/** Estaciones que se conservan aunque no lleguen al mínimo. */
const KEEP_SMALL = new Map([['serradaestrela', 'la única estación de Portugal']]);
/** Por debajo de esta cota de cima no hay estación de esquí: son pistas cubiertas o artificiales. */
const MIN_TOP_M = 600;
/** Dominios pegados a la frontera que el contorno simplificado de Natural Earth deja al otro lado. */
const REGION_FIX = new Map([
  ['larrabelagua', { country: 'ES', region: 'Navarra · Pirineo' }],
  ['lacontienda', { country: 'ES', region: 'Navarra · Pirineo' }],
  ['balmevallorcine', { country: 'FR', region: 'Haute-Savoie · Alpes' }],
  // El puerto está en la raya de Madrid y Segovia; la estación se gestiona desde Madrid.
  ['puertodenavacerrada', { country: 'ES', region: 'Madrid · Sistema Central' }],
]);

// ---------- regiones ----------
// Nombres de Natural Earth que se cambian por el de uso oficial (o se corrigen: «Haute-Rhin»).
const ES_NAMES = {
  Lérida: 'Lleida',
  Gerona: 'Girona',
  Orense: 'Ourense',
  'La Coruña': 'A Coruña',
  'Haute-Rhin': 'Haut-Rhin',
};
const MASSIF = {
  ES: [
    ['Pirineo', ['Huesca', 'Lleida', 'Girona', 'Navarra', 'Barcelona']],
    ['Cordillera Cantábrica', ['Asturias', 'León', 'Cantabria', 'Palencia', 'Burgos', 'Lugo']],
    ['Macizo Galaico', ['Ourense']],
    ['Sistema Central', ['Madrid', 'Segovia', 'Salamanca', 'Ávila', 'Guadalajara', 'Cáceres']],
    ['Sistema Ibérico', ['Teruel', 'La Rioja', 'Soria', 'Zaragoza']],
    ['Sierra Nevada', ['Granada']],
  ],
  FR: [
    [
      'Pirineos',
      ['Pyrénées-Atlantiques', 'Hautes-Pyrénées', 'Haute-Garonne', 'Ariège', 'Aude'].concat([
        'Pyrénées-Orientales',
      ]),
    ],
    [
      'Alpes',
      ['Savoie', 'Haute-Savoie', 'Isère', 'Hautes-Alpes', 'Alpes-de-Haute-Provence'].concat([
        'Alpes-Maritimes',
        'Drôme',
        'Vaucluse',
        'Var',
      ]),
    ],
    ['Jura', ['Jura', 'Doubs', 'Ain']],
    [
      'Vosgos',
      ['Vosges', 'Haut-Rhin', 'Bas-Rhin', 'Haute-Saône', 'Territoire de Belfort'].concat([
        'Moselle',
        'Meurthe-et-Moselle',
      ]),
    ],
    [
      'Macizo Central',
      ['Puy-de-Dôme', 'Cantal', 'Lozère', 'Ardèche', 'Haute-Loire', 'Loire', 'Aveyron'].concat([
        'Corrèze',
        'Allier',
        'Gard',
        'Hérault',
        'Tarn',
        'Rhône',
      ]),
    ],
    ['Córcega', ['Haute-Corse', 'Corse-du-Sud']],
  ],
  PT: [['Serra da Estrela', ['Guarda', 'Castelo Branco']]],
};
const A3 = { ESP: 'ES', FRA: 'FR', PRT: 'PT', AND: 'AD' };
const TIME_ZONE = {
  ES: 'Europe/Madrid',
  FR: 'Europe/Paris',
  PT: 'Europe/Lisbon',
  AD: 'Europe/Andorra',
};
const admin = JSON.parse(readFileSync(adminFile, 'utf8'))
  .features.filter((f) => A3[f.properties.adm0_a3])
  .map((f) => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    let box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const poly of polys)
      for (const [x, y] of poly[0])
        box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)];
    return { country: A3[f.properties.adm0_a3], name: f.properties.name, polys, box };
  });
function regionOf(point) {
  for (const a of admin) {
    if (point[0] < a.box[0] || point[0] > a.box[2] || point[1] < a.box[1] || point[1] > a.box[3])
      continue;
    if (
      a.polys.some((poly) => inRing(point, poly[0]) && !poly.slice(1).some((h) => inRing(point, h)))
    ) {
      if (a.country === 'AD') return { country: 'AD', region: 'Andorra · Pirineo' };
      const name = ES_NAMES[a.name] ?? a.name;
      const massif = (MASSIF[a.country] ?? []).find(([, list]) => list.includes(name))?.[0];
      return { country: a.country, region: massif ? `${name} · ${massif}` : name };
    }
  }
  return undefined;
}

// ---------- dominios, remontes y pistas de fondo ----------
const lifts = load('lifts')
  .map((e) => ({ id: e.id, pts: coords(e.geometry) }))
  .filter((l) => l.pts.length >= 2)
  .map((l) => ({
    id: l.id,
    ends: [l.pts[0], l.pts[l.pts.length - 1]],
    mid: [
      (l.pts[0][0] + l.pts[l.pts.length - 1][0]) / 2,
      (l.pts[0][1] + l.pts[l.pts.length - 1][1]) / 2,
    ],
  }));
const liftById = new Map(lifts.map((l) => [l.id, l]));
const nordic = load('nordic')
  .map((e) => ({ id: e.id, pts: coords(e.geometry) }))
  .filter((w) => w.pts.length >= 2);
const nordicById = new Map(nordic.map((w) => [w.id, w]));

/** Cada dominio con sus remontes y sus pistas de fondo. */
const domains = [];
for (const e of load('areas')) {
  const name = e.tags?.name;
  if (!name || SKIP_NAME.test(name) || EXCLUDED.has(key(cleanName(name)))) continue;
  const b = e.bounds;
  if (!b) continue;
  const inBox = (p) => p[0] >= b.minlon && p[0] <= b.maxlon && p[1] >= b.minlat && p[1] <= b.maxlat;
  let liftIds;
  let nordicIds;
  if (e.type === 'relation' && e.tags.site === 'piste') {
    // Relación de sitio: sus miembros son las pistas y los remontes.
    const members = new Set((e.members ?? []).filter((m) => m.type === 'way').map((m) => m.ref));
    liftIds = [...members].filter((id) => liftById.has(id));
    nordicIds = [...members].filter((id) => nordicById.has(id));
    if (liftIds.length === 0) {
      // Sitio que solo lista pistas: los remontes son los que caen dentro de su contorno.
      const ring = hull((e.members ?? []).flatMap((m) => coords(m.geometry)));
      if (ring.length >= 3)
        liftIds = lifts.filter((l) => inBox(l.mid) && inRing(l.mid, ring)).map((l) => l.id);
    }
  } else {
    const rings =
      e.type === 'way'
        ? [coords(e.geometry)]
        : [
            hull(
              (e.members ?? [])
                .filter((m) => m.role !== 'inner')
                .flatMap((m) => coords(m.geometry)),
            ),
          ];
    const inside = (p) => inBox(p) && rings.some((r) => r.length >= 3 && inRing(p, r));
    liftIds = lifts.filter((l) => inside(l.mid)).map((l) => l.id);
    nordicIds = nordic.filter((w) => inside(w.pts[Math.floor(w.pts.length / 2)])).map((w) => w.id);
  }
  if (liftIds.length === 0 && nordicIds.length === 0) continue;
  domains.push({
    osm: `${e.type}/${e.id}`,
    rawName: name,
    name: cleanName(name),
    lifts: new Set(liftIds),
    nordic: new Set(nordicIds),
    center: [(b.minlon + b.maxlon) / 2, (b.minlat + b.maxlat) / 2],
  });
}

// ---------- fundir duplicados ----------
const overlap = (a, b) => {
  if (a.size === 0 || b.size === 0) return 0;
  let common = 0;
  for (const id of a) if (b.has(id)) common++;
  return common / (a.size + b.size - common);
};
const groups = [];
// Primero los dominios con más remontes: dan el nombre al grupo.
domains.sort((a, b) => b.lifts.size - a.lifts.size || a.name.length - b.name.length);
for (const d of domains) {
  const same = groups.find(
    (g) =>
      (key(g.name) === key(d.name) && km(g.center, d.center) < 15) ||
      overlap(g.lifts, d.lifts) >= 0.5 ||
      (g.lifts.size === 0 && d.lifts.size === 0 && overlap(g.nordic, d.nordic) >= 0.5) ||
      km(g.center, d.center) < 0.8,
  );
  if (same) {
    for (const id of d.lifts) same.lifts.add(id);
    for (const id of d.nordic) same.nordic.add(id);
    // Dos formas del mismo nombre («Estació d'esquí i muntanya Vallter 2000» y «Vallter 2000»): se
    // queda la corta. Si son nombres distintos, manda el dominio con más remontes (el primero).
    if (
      d.name.length < same.name.length &&
      key(d.name).length >= 4 &&
      key(same.name).includes(key(d.name))
    )
      same.name = d.name;
  } else groups.push({ ...d, lifts: new Set(d.lifts), nordic: new Set(d.nordic) });
}

// Dominios «paraguas» (Les 3 Vallées, Paradiski…): si casi todos sus remontes ya están en dos o más
// estaciones con nombre propio, sobra el paraguas; así no sale la misma nieve dos veces.
const inside = (child, parent) => {
  let n = 0;
  for (const id of child.lifts) if (parent.lifts.has(id)) n++;
  return child.lifts.size > 0 && n / child.lifts.size >= 0.8;
};
const umbrellas = new Set();
for (const g of groups) {
  if (g.lifts.size < 6) continue;
  const children = groups.filter(
    (c) => c !== g && c.lifts.size >= 2 && c.lifts.size < g.lifts.size && inside(c, g),
  );
  if (children.length < 2) continue;
  const covered = new Set(children.flatMap((c) => [...c.lifts].filter((id) => g.lifts.has(id))));
  if (covered.size / g.lifts.size >= 0.7) umbrellas.add(g);
}
for (const g of umbrellas) {
  console.log(`paraguas: ${g.name} (${g.lifts.size} remontes)`);
  groups.splice(groups.indexOf(g), 1);
}

// Remontes que no pertenecen a ningún dominio: se listan para revisarlos a mano.
const used = new Set(groups.flatMap((g) => [...g.lifts]));
const orphans = lifts.filter((l) => !used.has(l.id) && !umbrellasHave(l.id));
function umbrellasHave(id) {
  for (const g of umbrellas) if (g.lifts.has(id)) return true;
  return false;
}
const clusters = [];
for (const l of orphans) {
  const near = clusters.filter((c) => c.some((o) => km(o.mid, l.mid) < 1.5));
  if (near.length === 0) clusters.push([l]);
  else {
    near[0].push(l);
    for (const other of near.slice(1)) {
      near[0].push(...other);
      clusters.splice(clusters.indexOf(other), 1);
    }
  }
}
/**
 * Estaciones que OpenStreetMap tiene sin dominio (solo sus remontes sueltos): se les pone nombre a
 * mano. Cada una se reconoce por el grupo de remontes sin dominio más cercano a su punto.
 */
const NAMED = [
  { name: 'Puerto de Navacerrada', at: [-4.006, 40.788] },
  { name: 'Lunada', at: [-3.658, 43.164] },
  { name: 'Ordino Arcalís', at: [1.493, 42.628] },
  { name: 'Serra da Estrela', at: [-7.614, 40.329] },
  { name: 'Saint-Colomban-des-Villards', at: [6.23, 45.287] },
  { name: 'Le Tanet', at: [7.056, 48.081] },
];
const centroid = (c) => [
  c.reduce((t, l) => t + l.mid[0], 0) / c.length,
  c.reduce((t, l) => t + l.mid[1], 0) / c.length,
];
for (const n of NAMED) {
  const cluster = clusters.find((c) => km(centroid(c), n.at) < 2);
  if (!cluster || groups.some((g) => key(g.name) === key(n.name))) continue;
  clusters.splice(clusters.indexOf(cluster), 1);
  groups.push({
    osm: `way/${cluster[0].id}`,
    name: n.name,
    lifts: new Set(cluster.map((l) => l.id)),
    nordic: new Set(),
    center: n.at,
  });
}
writeFileSync(
  join(dir, 'orphans.json'),
  JSON.stringify(
    clusters
      .filter((c) => c.length >= 3)
      .sort((a, b) => b.length - a.length)
      .map((c) => ({
        lifts: c.length,
        lat: +(c.reduce((t, l) => t + l.mid[1], 0) / c.length).toFixed(4),
        lon: +(c.reduce((t, l) => t + l.mid[0], 0) / c.length).toFixed(4),
      })),
    null,
    1,
  ),
);

// ---------- kilómetros esquiables ----------
// Una pista es de una estación si empieza, acaba o pasa (punto medio) a menos de 500 m de la
// llegada o la salida de uno de sus remontes. Las pistas de enlace entre dos estaciones vecinas
// cuentan en las dos.
const CELL = 0.01; // grados (~1 km): celda de la rejilla para buscar remontes cercanos
const cellOf = (p) => `${Math.floor(p[0] / CELL)},${Math.floor(p[1] / CELL)}`;
const liftGrid = new Map();
groups.forEach((g, index) => {
  for (const id of g.lifts) {
    for (const end of liftById.get(id).ends) {
      const cell = cellOf(end);
      if (!liftGrid.has(cell)) liftGrid.set(cell, []);
      liftGrid.get(cell).push({ end, index });
    }
  }
  g.pisteKm = 0;
});
for (const way of load('downhill')) {
  const pts = coords(way.geometry);
  if (pts.length < 2) continue;
  let length = 0;
  for (let i = 1; i < pts.length; i++) length += km(pts[i - 1], pts[i]);
  const owners = new Set();
  for (const probe of [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1]]) {
    const cx = Math.floor(probe[0] / CELL);
    const cy = Math.floor(probe[1] / CELL);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const item of liftGrid.get(`${cx + dx},${cy + dy}`) ?? [])
          if (km(item.end, probe) < 0.5) owners.add(item.index);
  }
  for (const index of owners) groups[index].pisteKm += length;
}

// ---------- altitudes (Terrain Tiles) ----------
// Mismo modelo de terreno que los mapas de pistas (scripts/build-terrain.mjs): Terrain Tiles de
// Mapzen en AWS, formato «terrarium» (altitud = R·256 + G + B/256 − 32768), sin clave ni límite de
// uso práctico. Las teselas se guardan en la carpeta de trabajo para no volver a bajarlas.
const ZOOM = 12; // ~25 m por píxel a 45° de latitud
const TILE = 256;
const tileDir = join(dir, 'tiles');
mkdirSync(tileDir, { recursive: true });
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

async function tile(x, y) {
  const name = `${ZOOM}-${x}-${y}`;
  if (!tiles.has(name)) {
    const file = join(tileDir, `${name}.png`);
    if (!existsSync(file)) {
      const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${ZOOM}/${x}/${y}.png`;
      let res;
      for (let attempt = 1; attempt <= 4; attempt++) {
        res = await fetch(url).catch(() => undefined);
        if (res?.ok) break;
        await new Promise((r) => setTimeout(r, 3000 * attempt));
      }
      if (!res?.ok) throw new Error(`Sin tesela ${name}`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    }
    tiles.set(name, decodePng(readFileSync(file)));
    // Con cientos de estaciones no caben todas las teselas en memoria: se suelta la más antigua.
    if (tiles.size > 60) tiles.delete(tiles.keys().next().value);
  }
  return tiles.get(name);
}

/** Altitud en metros de un punto [longitud, latitud]. */
async function elevationAt([lon, lat]) {
  const n = 2 ** ZOOM;
  const fx = ((lon + 180) / 360) * n;
  const rad = (lat * Math.PI) / 180;
  const fy = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  const t = await tile(Math.floor(fx), Math.floor(fy));
  const px = Math.min(TILE - 1, Math.floor((fx - Math.floor(fx)) * TILE));
  const py = Math.min(TILE - 1, Math.floor((fy - Math.floor(fy)) * TILE));
  const i = (py * t.width + px) * t.channels;
  return t.data[i] * 256 + t.data[i + 1] + t.data[i + 2] / 256 - 32768;
}

const elev = {};
const pkey = (p) => `${p[1].toFixed(4)},${p[0].toFixed(4)}`;
for (const g of groups) {
  if (g.lifts.size > 0) g.points = [...g.lifts].flatMap((id) => liftById.get(id).ends);
  else {
    const all = [...g.nordic].flatMap((id) => nordicById.get(id).pts);
    const step = Math.max(1, Math.floor(all.length / 60));
    g.points = all.filter((_, i) => i % step === 0);
  }
}
// Ordenados por tesela, para aprovechar las que ya están en memoria.
const allPoints = groups
  .flatMap((g) => g.points)
  .sort((p, q) => Math.floor(p[0] * 10) - Math.floor(q[0] * 10) || p[1] - q[1]);
for (const [i, point] of allPoints.entries()) {
  elev[pkey(point)] ??= await elevationAt(point);
  if (i % 2000 === 0) console.log(`altitudes ${i}/${allPoints.length}`);
}

// ---------- estaciones ----------
const round5 = (n) => Math.round(n * 1e5) / 1e5;
const built = [];
for (const g of groups) {
  const heights = g.points.map((p) => elev[pkey(p)]).filter((h) => Number.isFinite(h) && h > 0);
  if (heights.length === 0) continue;
  const lowest = Math.min(...heights);
  const lon = g.points.reduce((s, p) => s + p[0], 0) / g.points.length;
  const lat = g.points.reduce((s, p) => s + p[1], 0) / g.points.length;
  const name = NAME_FIX.get(key(g.name)) ?? g.name;
  const where = REGION_FIX.get(key(g.name)) ?? regionOf([lon, lat]);
  if (!where) {
    // Fuera de España, Francia, Portugal y Andorra (estaciones italianas o suizas de la frontera).
    console.log(`fuera: ${g.name} (${lat.toFixed(3)}, ${lon.toFixed(3)})`);
    continue;
  }
  if (Math.max(...heights) < MIN_TOP_M) continue;
  const pisteKm = OFFICIAL_KM.get(key(g.name)) ?? Math.round(g.pisteKm);
  const minKm = MIN_PISTE_KM_BY_COUNTRY[where.country] ?? MIN_PISTE_KM;
  if (pisteKm < minKm && !KEEP_SMALL.has(key(g.name))) continue;
  const base = Math.round(lowest);
  const top = Math.max(Math.round(Math.max(...heights)), base + 10);
  built.push({
    id: slug(name),
    name,
    region: where.region,
    country: where.country,
    latitude: round5(lat),
    longitude: round5(lon),
    baseElevationM: base,
    topElevationM: top,
    timeZone: TIME_ZONE[where.country],
    elevationsVerified: false,
    ...(g.lifts.size === 0 ? { kind: 'nordic' } : {}),
    osm: g.osm,
    pisteKm,
    liftCount: g.lifts.size,
  });
}

// Las verificadas a mano sustituyen a su equivalente de OpenStreetMap (mismo nombre o muy cerca).
const result = [...curated];
const taken = new Set(curated.map((s) => s.id));
for (const s of built.sort((a, b) => b.liftCount - a.liftCount)) {
  const here = [s.longitude, s.latitude];
  const twin = curated.find(
    (c) =>
      key(c.name) === key(s.name) ||
      km([c.longitude, c.latitude], here) < 0.7 ||
      (key(s.name).includes(key(c.name)) && km([c.longitude, c.latitude], here) < 12),
  );
  if (twin) continue;
  // Mismo nombre en otro sitio: se distingue con la provincia o el departamento.
  if (taken.has(s.id)) s.id = `${s.id}-${slug(s.region.split(' · ')[0])}`;
  if (taken.has(s.id)) s.id = `${s.id}-${s.osm.split('/')[1]}`;
  taken.add(s.id);
  delete s.liftCount; // solo servía para ordenar
  result.push(s);
}

const order = { ES: 0, AD: 1, FR: 2, PT: 3 };
const newOnes = result
  .slice(curated.length)
  .sort((a, b) => order[a.country] - order[b.country] || a.name.localeCompare(b.name, 'es'));
const stations = [...curated, ...newOnes];

current.version = 2;
current.updated = TODAY;
current.sources.catalog = `Estaciones sin verificar a mano (las que llevan "osm"): dominios de OpenStreetMap (landuse=winter_sports y relaciones site=piste) con remontes en servicio y al menos ${MIN_PISTE_KM} km de pistas de esquí alpino (${MIN_PISTE_KM_BY_COUNTRY.FR} km en Francia; campo "pisteKm": suma de las pistas de OpenStreetMap, o la cifra de la estación si allí están incompletas), descargados con Overpass el ${TODAY}. © colaboradores de OpenStreetMap, ODbL. Sus coordenadas son el centro de sus remontes; sus cotas son la altitud más baja y más alta de las estaciones de los remontes según Terrain Tiles de Mapzen en AWS (https://registry.opendata.aws/terrain-tiles/), por eso van con elevationsVerified: false. Provincia o departamento: Natural Earth admin-1 (dominio público). Generado por scripts/build-stations.mjs.`;
current.stations = stations;
writeFileSync(stationsPath, JSON.stringify(current, null, 2) + '\n');

const count = (c) => stations.filter((s) => s.country === c).length;
console.log(
  `${stations.length} estaciones: ES ${count('ES')}, FR ${count('FR')}, PT ${count('PT')}, AD ${count('AD')}; de fondo ${stations.filter((s) => s.kind).length}`,
);
