import { describe, expect, it } from 'vitest';
import stationsFile from '../../../../../stations/stations.json';

interface Item {
  c: [number, number][];
}
const files = import.meta.glob<{ pistes: Item[]; lifts: Item[] }>('./data/pistes/*.json', {
  eager: true,
  import: 'default',
});

// No todas las estaciones del catálogo tienen mapa de pistas: se comprueban las que lo llevan.
const withPistes = stationsFile.stations.filter((s) => `./data/pistes/${s.id}.json` in files);

describe('datos de pistas', () => {
  it('las estaciones verificadas a mano tienen mapa de pistas, y ningún mapa queda huérfano', () => {
    expect(withPistes.length).toBe(Object.keys(files).length);
    for (const id of ['baqueira-beret', 'sierra-nevada', 'grandvalira', 'cauterets']) {
      expect(withPistes.some((s) => s.id === id)).toBe(true);
    }
  });

  for (const station of withPistes) {
    it(`${station.id} tiene pistas y remontes cerca de la estación`, () => {
      const data = files[`./data/pistes/${station.id}.json`];
      expect(data).toBeDefined();
      expect(data?.pistes.length).toBeGreaterThan(0);
      const all = [...(data?.pistes ?? []), ...(data?.lifts ?? [])];
      for (const item of all) {
        expect(item.c.length).toBeGreaterThanOrEqual(2);
      }
      const nearest = Math.min(
        ...all.flatMap((i) =>
          i.c.map(([lon, lat]) =>
            Math.hypot(
              (lon - station.longitude) * Math.cos((station.latitude * Math.PI) / 180),
              lat - station.latitude,
            ),
          ),
        ),
      );
      expect(nearest * 111).toBeLessThan(5);
    });
  }
});

const terrainFiles = import.meta.glob<{
  nx: number;
  ny: number;
  z: number[];
}>('./data/terrain/*.json', { eager: true, import: 'default' });

describe('datos de terreno', () => {
  for (const station of withPistes) {
    it(`${station.id} tiene una malla de altitudes coherente`, () => {
      const g = terrainFiles[`./data/terrain/${station.id}.json`];
      expect(g).toBeDefined();
      expect(g?.z.length).toBe((g?.nx ?? 0) * (g?.ny ?? 0));
      // la cima de la estación debe caber en lo que muestra la malla (con holgura)
      expect(Math.max(...(g?.z ?? [0]))).toBeGreaterThan(station.topElevationM - 400);
      expect(Math.min(...(g?.z ?? [0]))).toBeGreaterThan(0);
    });
  }
});
