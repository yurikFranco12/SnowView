import type { Station } from '@snowview/core';
import stationsFile from '../../../stations/stations.json';

/** Estación tal como está en `stations/stations.json`. */
export interface CuratedStation extends Station {
  /** false mientras las cotas de base y cima no se hayan comprobado una a una. */
  elevationsVerified: boolean;
  /** 'nordic' en los centros de esquí de fondo sin remontes; sin valor, estación de esquí alpino. */
  kind?: 'nordic';
}

/** Países del catálogo, en el orden en que se muestran. */
export const COUNTRIES = [
  { code: 'ES', name: 'España' },
  { code: 'FR', name: 'Francia' },
  { code: 'PT', name: 'Portugal' },
  { code: 'AD', name: 'Andorra' },
] as const;

export function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

function fail(msg: string): never {
  throw new Error(`stations.json no es válido: ${msg}`);
}

/** Valida la lista curada. Se ejecuta al cargar y en los tests, así un error en el JSON se ve pronto. */
export function parseStations(raw: unknown): CuratedStation[] {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !Array.isArray((raw as { stations?: unknown }).stations)
  ) {
    fail('falta la lista "stations"');
  }
  const list = (raw as { stations: unknown[] }).stations;
  const ids = new Set<string>();
  return list.map((item, i) => {
    const s = item as Record<string, unknown>;
    const where = `estación ${i} (${String(s.id)})`;
    for (const key of ['id', 'name', 'region', 'country', 'timeZone'] as const) {
      if (typeof s[key] !== 'string' || !s[key]) fail(`${where}: falta "${key}"`);
    }
    for (const key of ['latitude', 'longitude', 'baseElevationM', 'topElevationM'] as const) {
      if (typeof s[key] !== 'number' || !Number.isFinite(s[key]))
        fail(`${where}: "${key}" no es un número`);
    }
    const st = s as unknown as CuratedStation;
    if (Math.abs(st.latitude) > 90 || Math.abs(st.longitude) > 180)
      fail(`${where}: coordenadas fuera de rango`);
    if (st.topElevationM <= st.baseElevationM)
      fail(`${where}: la cima debe estar por encima de la base`);
    if (ids.has(st.id)) fail(`${where}: id repetido`);
    ids.add(st.id);
    try {
      new Intl.DateTimeFormat('en', { timeZone: st.timeZone });
    } catch {
      fail(`${where}: zona horaria desconocida "${st.timeZone}"`);
    }
    return {
      id: st.id,
      name: st.name,
      region: st.region,
      country: st.country,
      latitude: st.latitude,
      longitude: st.longitude,
      baseElevationM: st.baseElevationM,
      topElevationM: st.topElevationM,
      timeZone: st.timeZone,
      elevationsVerified: s.elevationsVerified === true,
      ...(s.kind === 'nordic' ? { kind: 'nordic' as const } : {}),
    };
  });
}

export const STATIONS: readonly CuratedStation[] = parseStations(stationsFile);

/** Quita tildes y pasa a minúsculas para buscar "candanchu" y encontrar "Candanchú". */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Busca por nombre, región o país, sin distinguir tildes ni mayúsculas. Consulta vacía: todas. */
export function searchStations(
  query: string,
  stations: readonly CuratedStation[] = STATIONS,
): CuratedStation[] {
  const q = normalize(query);
  if (!q) return [...stations];
  return stations.filter((s) =>
    normalize(`${s.name} ${s.region} ${countryName(s.country)}`).includes(q),
  );
}

const BY_ID = new Map(STATIONS.map((s) => [s.id, s]));

export function getStation(id: string): CuratedStation | undefined {
  return BY_ID.get(id);
}
