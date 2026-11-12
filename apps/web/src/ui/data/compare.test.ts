import { describe, expect, it } from 'vitest';
import type { CuratedStation } from '@snowview/data';
import { MAX_COMPARED, highlightBest, toggleCompared } from './compare';
import type { StationSummary } from './forecast';

function summary(id: string, top: number, next48: number, wind: number | null): StationSummary {
  return {
    station: { id } as CuratedStation,
    days: [],
    topTotalCm: top,
    baseTotalCm: 0,
    next48hCm: next48,
    current:
      wind === null
        ? undefined
        : {
            time: 0,
            snowfallCm: 0,
            snowDepthCm: null,
            temperatureC: 0,
            windKmh: wind,
            gustKmh: null,
            weatherCode: null,
          },
    condition: '',
    incomplete: false,
  };
}

describe('highlightBest', () => {
  it('marca la estación con más nieve y menos viento', () => {
    const h = highlightBest([
      summary('a', 10, 5, 30),
      summary('b', 25, 2, 12),
      summary('c', 3, 8, 40),
    ]);
    expect([...h.topSnow]).toEqual(['b']);
    expect([...h.next48h]).toEqual(['c']);
    expect([...h.calmestWind]).toEqual(['b']);
  });

  it('con empate marca a todas las empatadas', () => {
    const h = highlightBest([summary('a', 10, 5, 20), summary('b', 10, 1, 20)]);
    expect([...h.topSnow].sort()).toEqual(['a', 'b']);
    expect([...h.calmestWind].sort()).toEqual(['a', 'b']);
  });

  it('sin nieve prevista no destaca a nadie', () => {
    const h = highlightBest([summary('a', 0, 0, 10), summary('b', 0, 0, 5)]);
    expect(h.topSnow.size).toBe(0);
    expect(h.next48h.size).toBe(0);
  });

  it('ignora el viento sin dato y no compara una sola estación', () => {
    const h = highlightBest([summary('a', 1, 1, null), summary('b', 1, 1, 15)]);
    expect([...h.calmestWind]).toEqual(['b']);
    expect(highlightBest([summary('a', 5, 5, 10)]).calmestWind.size).toBe(0);
  });

  it('con lista vacía no marca nada', () => {
    expect(highlightBest([]).topSnow.size).toBe(0);
  });
});

describe('toggleCompared', () => {
  it('añade y quita', () => {
    expect(toggleCompared(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleCompared(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('respeta el máximo', () => {
    const full = Array.from({ length: MAX_COMPARED }, (_, i) => `e${i}`);
    expect(toggleCompared(full, 'nueva')).toEqual(full);
    expect(toggleCompared(full, 'e0')).toHaveLength(MAX_COMPARED - 1);
  });
});
