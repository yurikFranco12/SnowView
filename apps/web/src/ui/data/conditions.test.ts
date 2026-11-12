import type { DayConditions } from '@snowview/core';
import { describe, expect, it } from 'vitest';
import {
  averageScore,
  bestPerDay,
  sortByAverage,
  topPicks,
  type RatedDay,
  type StationDays,
} from './conditions';

function day(date: string, score: number | null): RatedDay {
  return {
    conditions: { date } as DayConditions,
    rating: { date, discipline: 'ski', score, rating: null, reasons: [], incomplete: false },
  };
}

const A: StationDays = { stationId: 'a', days: [day('2026-12-10', 40), day('2026-12-11', 85)] };
const B: StationDays = { stationId: 'b', days: [day('2026-12-10', 70), day('2026-12-11', 60)] };
const C: StationDays = { stationId: 'c', days: [day('2026-12-10', null), day('2026-12-11', null)] };

describe('averageScore', () => {
  it('promedia los días con nota e ignora los vacíos', () => {
    expect(averageScore([day('x', 50), day('y', null), day('z', 70)])).toBe(60);
    expect(averageScore(C.days)).toBeNull();
  });
});

describe('topPicks', () => {
  it('da el mejor día de cada estación, de mayor a menor', () => {
    const picks = topPicks([B, A, C]);
    expect(picks.map((p) => [p.stationId, p.date, p.score])).toEqual([
      ['a', '2026-12-11', 85],
      ['b', '2026-12-10', 70],
    ]);
  });

  it('respeta el límite y no incluye estaciones sin nota', () => {
    expect(topPicks([A, B, C], 1)).toHaveLength(1);
    expect(topPicks([C])).toEqual([]);
    expect(topPicks([A], 0)).toEqual([]);
  });

  it('con empate de nota gana el día más próximo y luego la mejor media', () => {
    const x: StationDays = { stationId: 'x', days: [day('2026-12-12', 80), day('2026-12-13', 10)] };
    const y: StationDays = { stationId: 'y', days: [day('2026-12-11', 80), day('2026-12-12', 90)] };
    const z: StationDays = { stationId: 'z', days: [day('2026-12-12', 80), day('2026-12-13', 70)] };
    // x, y y z tienen 80 y 90, 80 y 80: y gana con 90; entre x y z empatan 80 el mismo día y z tiene mejor media.
    expect(topPicks([x, y, z]).map((p) => p.stationId)).toEqual(['y', 'z', 'x']);
  });
});

describe('bestPerDay', () => {
  it('marca la mejor estación de cada día, con empates', () => {
    const t: StationDays = { stationId: 't', days: [day('2026-12-10', 70), day('2026-12-11', 85)] };
    const best = bestPerDay([A, B, t]);
    expect([...(best.get('2026-12-10') ?? [])]).toEqual(['b', 't']);
    expect([...(best.get('2026-12-11') ?? [])]).toEqual(['a', 't']);
  });

  it('no marca a nadie si ninguna estación llega a aceptable', () => {
    const low: StationDays = { stationId: 'l', days: [day('2026-12-10', 44)] };
    expect(bestPerDay([low]).size).toBe(0);
    expect(bestPerDay([low], 0).size).toBe(1);
  });

  it('no incluye días sin ninguna nota', () => {
    expect(bestPerDay([C]).size).toBe(0);
  });
});

describe('sortByAverage', () => {
  it('ordena por nota media y deja al final las que no tienen', () => {
    expect(sortByAverage([C, A, B]).map((e) => e.stationId)).toEqual(['b', 'a', 'c']);
  });
});
