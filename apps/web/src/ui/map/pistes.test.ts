import { describe, expect, it } from 'vitest';
import stationsFile from '../../../../../stations/stations.json';

interface Item {
  c: [number, number][];
}
const files = import.meta.glob<{ pistes: Item[]; lifts: Item[] }>('./data/pistes/*.json', {
  eager: true,
  import: 'default',
});

describe('datos de pistas', () => {
  for (const station of stationsFile.stations) {
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
