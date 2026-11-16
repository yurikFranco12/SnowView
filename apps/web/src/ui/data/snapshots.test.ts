import type { StationSnapshot } from '@snowview/core';
import { describe, expect, it } from 'vitest';
import { SNAPSHOT_STALE_MS, isFreshAndComplete, pruneSnapshots, snapshotSnowCm } from './snapshots';

const snap = (stationId: string, fetchedAt: number, snow: (number | null)[]): StationSnapshot => ({
  stationId,
  fetchedAt,
  dailySnowCm: snow,
  temperatureC: -2,
  weatherCode: 71,
  snowDepthCm: 40,
});

describe('snapshotSnowCm', () => {
  it('suma los primeros días del periodo y trata lo negativo como cero', () => {
    const s = snap('a', 0, [1.5, 2, -1, 10]);
    expect(snapshotSnowCm(s, 3)).toBe(3.5);
    expect(snapshotSnowCm(s, 14)).toBe(13.5);
  });

  it('ignora los días sin dato y devuelve null si no hay ninguno', () => {
    expect(snapshotSnowCm(snap('a', 0, [null, 4]), 2)).toBe(4);
    expect(snapshotSnowCm(snap('a', 0, [null, null]), 2)).toBeNull();
    expect(snapshotSnowCm(snap('a', 0, []), 7)).toBeNull();
  });
});

describe('caché de resúmenes', () => {
  const now = 100 * 3_600_000;

  it('descarta lo mal formado y lo de hace más de un día', () => {
    const raw = [snap('a', now - 3_600_000, [1]), snap('b', now - 25 * 3_600_000, [1]), { x: 1 }];
    expect(pruneSnapshots(raw, now).map((s) => s.stationId)).toEqual(['a']);
    expect(pruneSnapshots('nada', now)).toEqual([]);
  });

  it('solo se reutiliza si es reciente y trae todas las estaciones', () => {
    const fresh = [snap('a', now - 1000, [1]), snap('b', now - 1000, [1])];
    expect(isFreshAndComplete(fresh, ['a', 'b'], now)).toBe(true);
    expect(isFreshAndComplete(fresh, ['a', 'b', 'c'], now)).toBe(false);
    const old = [snap('a', now - SNAPSHOT_STALE_MS - 1, [1])];
    expect(isFreshAndComplete(old, ['a'], now)).toBe(false);
  });
});
