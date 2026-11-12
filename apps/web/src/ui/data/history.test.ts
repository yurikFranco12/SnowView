import { describe, expect, it } from 'vitest';
import { lastArchiveDate, latestSeason, seasonsToShow } from './history';

describe('latestSeason', () => {
  it('en temporada devuelve la actual', () => {
    expect(latestSeason('2026-11-12')).toBe(2026);
    expect(latestSeason('2027-03-01')).toBe(2026);
    expect(latestSeason('2026-10-01')).toBe(2026);
  });

  it('en verano devuelve la que acaba de terminar', () => {
    expect(latestSeason('2027-07-15')).toBe(2026);
    expect(latestSeason('2027-09-30')).toBe(2026);
  });
});

describe('seasonsToShow', () => {
  it('va de la más reciente a la más antigua', () => {
    expect(seasonsToShow('2026-11-12', 3)).toEqual([2026, 2025, 2024]);
  });
});

describe('lastArchiveDate', () => {
  it('resta los 5 días de retraso en la fecha local', () => {
    expect(lastArchiveDate(Date.UTC(2026, 10, 12, 12), 'Europe/Madrid')).toBe('2026-11-07');
  });

  it('respeta la zona horaria cerca de la medianoche', () => {
    // 12 nov 23:30 UTC ya es 13 nov en Madrid (UTC+1): menos 5 días, 8 nov.
    expect(lastArchiveDate(Date.UTC(2026, 10, 12, 23, 30), 'Europe/Madrid')).toBe('2026-11-08');
  });
});
