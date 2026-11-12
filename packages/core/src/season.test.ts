import { describe, expect, it } from 'vitest';
import {
  daysBetweenInclusive,
  seasonLabel,
  seasonOf,
  seasonRange,
  summarizeSeason,
  type DailySnowRecord,
} from './season';

function rec(date: string, snowfallCm: number | null): DailySnowRecord {
  return { date, snowfallCm };
}

describe('seasonOf, seasonLabel y seasonRange', () => {
  it('asigna cada fecha a su temporada', () => {
    expect(seasonOf('2025-10-01')).toBe(2025);
    expect(seasonOf('2025-12-31')).toBe(2025);
    expect(seasonOf('2026-01-01')).toBe(2025);
    expect(seasonOf('2026-05-31')).toBe(2025);
  });

  it('en verano devuelve la temporada que va a empezar', () => {
    expect(seasonOf('2026-06-01')).toBe(2026);
    expect(seasonOf('2026-09-30')).toBe(2026);
  });

  it('escribe la etiqueta con dos cifras, también en el cambio de siglo', () => {
    expect(seasonLabel(2025)).toBe('2025/26');
    expect(seasonLabel(1999)).toBe('1999/00');
    expect(seasonLabel(2008)).toBe('2008/09');
  });

  it('da el primer y último día', () => {
    expect(seasonRange(2025)).toEqual({ start: '2025-10-01', end: '2026-05-31' });
  });
});

describe('daysBetweenInclusive', () => {
  it('cuenta ambos extremos y no se confunde con bisiestos', () => {
    expect(daysBetweenInclusive('2025-10-01', '2025-10-01')).toBe(1);
    expect(daysBetweenInclusive('2025-10-01', '2026-05-31')).toBe(243);
    expect(daysBetweenInclusive('2023-10-01', '2024-05-31')).toBe(244); // 2024 bisiesto
    expect(daysBetweenInclusive('2025-10-02', '2025-10-01')).toBe(0);
  });
});

describe('summarizeSeason', () => {
  it('suma, cuenta días de nieve y encuentra el mayor', () => {
    const s = summarizeSeason(
      [
        rec('2025-11-02', 12.3),
        rec('2025-11-03', 0.4),
        rec('2026-01-10', 30),
        rec('2026-01-11', 1),
      ],
      2025,
    );
    expect(s.totalCm).toBe(43.7);
    expect(s.snowyDays).toBe(3); // 0,4 cm no cuenta
    expect(s.maxDay).toEqual({ date: '2026-01-10', cm: 30 });
    expect(s.label).toBe('2025/26');
  });

  it('reparte por meses en orden de octubre a mayo', () => {
    const s = summarizeSeason(
      [rec('2025-12-24', 5), rec('2026-02-01', 8), rec('2025-10-15', 2)],
      2025,
    );
    expect(s.months.map((m) => m.month)).toEqual([10, 11, 12, 1, 2, 3, 4, 5]);
    expect(s.months.map((m) => m.totalCm)).toEqual([2, 0, 5, 0, 8, 0, 0, 0]);
  });

  it('ignora días fuera de la temporada y duplicados', () => {
    const s = summarizeSeason(
      [rec('2025-09-30', 50), rec('2026-06-01', 50), rec('2025-11-01', 4), rec('2025-11-01', 99)],
      2025,
    );
    expect(s.totalCm).toBe(4);
    expect(s.daysWithData).toBe(1);
  });

  it('trata los nulos como "sin dato", no como cero, y marca incompleta', () => {
    const s = summarizeSeason(
      [rec('2025-10-01', 1), rec('2025-10-02', null), rec('2025-10-03', 2)],
      2025,
      '2025-10-03',
    );
    expect(s.daysExpected).toBe(3);
    expect(s.daysWithData).toBe(2);
    expect(s.complete).toBe(false);
    expect(s.totalCm).toBe(3);
  });

  it('en la temporada en curso solo espera datos hasta lastDate', () => {
    const s = summarizeSeason([rec('2025-10-01', 1), rec('2025-10-02', 0)], 2025, '2025-10-02');
    expect(s.daysExpected).toBe(2);
    expect(s.complete).toBe(true);
  });

  it('con lastDate posterior al fin de temporada espera la temporada entera', () => {
    expect(summarizeSeason([], 2025, '2027-01-01').daysExpected).toBe(243);
  });

  it('sin registros da 0 cm, sin día máximo e incompleta', () => {
    const s = summarizeSeason([], 2025);
    expect(s).toMatchObject({ totalCm: 0, snowyDays: 0, maxDay: null, complete: false });
  });

  it('ignora cantidades negativas (error del proveedor) y no inventa máximo', () => {
    const s = summarizeSeason([rec('2025-11-01', -3), rec('2025-11-02', 0)], 2025);
    expect(s.totalCm).toBe(0);
    expect(s.maxDay).toBeNull();
  });
});
