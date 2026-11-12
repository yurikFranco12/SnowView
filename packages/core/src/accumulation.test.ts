import { describe, expect, it } from 'vitest';
import { HOUR_MS, accumulateSnow, dailySnowfall, localDateKey, sumDays } from './accumulation';
import type { HourlyPoint } from './models';

function hour(time: number, snowfallCm: number | null): HourlyPoint {
  return {
    time,
    snowfallCm,
    snowDepthCm: null,
    temperatureC: null,
    windKmh: null,
    gustKmh: null,
    weatherCode: null,
  };
}

/** `n` horas seguidas desde `start`, con la nieve que devuelva `cm(i)`. */
function series(start: number, n: number, cm: (i: number) => number | null): HourlyPoint[] {
  return Array.from({ length: n }, (_, i) => hour(start + i * HOUR_MS, cm(i)));
}

const T0 = Date.UTC(2026, 10, 12, 0); // 12 nov 2026 00:00 UTC

describe('accumulateSnow', () => {
  it('suma la nieve de la ventana', () => {
    const points = series(T0, 72, () => 0.5);
    expect(accumulateSnow(points, T0, 48)).toEqual({
      totalCm: 24,
      hoursWithData: 48,
      hoursExpected: 48,
      complete: true,
    });
  });

  it('ventana vacía: sin puntos da 0 cm e incompleta', () => {
    expect(accumulateSnow([], T0, 48)).toEqual({
      totalCm: 0,
      hoursWithData: 0,
      hoursExpected: 48,
      complete: false,
    });
  });

  it('ventana de 0 horas: 0 cm y completa', () => {
    expect(
      accumulateSnow(
        series(T0, 5, () => 3),
        T0,
        0,
      ),
    ).toMatchObject({
      totalCm: 0,
      complete: true,
    });
  });

  it('los nulos no cuentan como 0: dejan la ventana incompleta', () => {
    const points = series(T0, 4, (i) => (i === 1 ? null : 2));
    expect(accumulateSnow(points, T0, 4)).toEqual({
      totalCm: 6,
      hoursWithData: 3,
      hoursExpected: 4,
      complete: false,
    });
  });

  it('descarta NaN y valores negativos', () => {
    const points = [hour(T0, Number.NaN), hour(T0 + HOUR_MS, -1), hour(T0 + 2 * HOUR_MS, 1.25)];
    expect(accumulateSnow(points, T0, 3)).toMatchObject({ totalCm: 1.3, hoursWithData: 2 });
  });

  it('el final de la ventana es exclusivo', () => {
    const points = series(T0, 3, () => 1);
    expect(accumulateSnow(points, T0, 2).totalCm).toBe(2);
    expect(accumulateSnow(points, T0 + HOUR_MS, 2).totalCm).toBe(2);
  });

  it('no cuenta dos veces una hora duplicada', () => {
    const points = [hour(T0, 2), hour(T0, 2), hour(T0 + HOUR_MS, 1)];
    expect(accumulateSnow(points, T0, 2).totalCm).toBe(3);
  });

  it('una ventana de 48 h son 48 horas reales también con cambio de hora', () => {
    // 25 oct 2026: en Madrid se atrasa la hora (el día local tiene 25 horas).
    const start = Date.UTC(2026, 9, 24, 22); // 25 oct 00:00 en Madrid (CEST, UTC+2)
    const points = series(start, 60, () => 1);
    expect(accumulateSnow(points, start, 48)).toMatchObject({ totalCm: 48, complete: true });
  });
});

describe('dailySnowfall', () => {
  it('agrupa por día local de la estación', () => {
    // 12 nov en Madrid (CET, UTC+1) empieza a las 23:00 UTC del 11 nov.
    const start = Date.UTC(2026, 10, 11, 23);
    const points = series(start, 48, (i) => (i < 24 ? 1 : 2));
    const days = dailySnowfall(points, 'Europe/Madrid', start, 2);
    expect(days).toEqual([
      { date: '2026-11-12', totalCm: 24, hoursWithData: 24 },
      { date: '2026-11-13', totalCm: 48, hoursWithData: 24 },
    ]);
  });

  it('el día del cambio de hora tiene 25 horas', () => {
    const start = Date.UTC(2026, 9, 24, 22); // 25 oct 00:00 en Madrid
    const points = series(start, 25 + 24, () => 1);
    const [dstDay, next] = dailySnowfall(points, 'Europe/Madrid', start, 2);
    expect(dstDay).toEqual({ date: '2026-10-25', totalCm: 25, hoursWithData: 25 });
    expect(next?.hoursWithData).toBe(24);
  });

  it('los días sin datos aparecen con 0 cm', () => {
    const days = dailySnowfall([], 'Europe/Madrid', T0, 3);
    expect(days.map((d) => d.totalCm)).toEqual([0, 0, 0]);
    expect(days.map((d) => d.date)).toEqual(['2026-11-12', '2026-11-13', '2026-11-14']);
  });

  it('cruza el fin de mes y de año', () => {
    const days = dailySnowfall([], 'Europe/Madrid', Date.UTC(2026, 11, 30, 12), 3);
    expect(days.map((d) => d.date)).toEqual(['2026-12-30', '2026-12-31', '2027-01-01']);
  });

  it('sumDays suma y redondea a 0,1 cm', () => {
    expect(
      sumDays([
        { date: 'a', totalCm: 0.1, hoursWithData: 1 },
        { date: 'b', totalCm: 0.2, hoursWithData: 1 },
      ]),
    ).toBe(0.3);
  });
});

describe('localDateKey', () => {
  it('usa la zona horaria de la estación, no la del equipo', () => {
    const t = Date.UTC(2026, 10, 12, 23, 30); // 23:30 UTC
    expect(localDateKey(t, 'UTC')).toBe('2026-11-12');
    expect(localDateKey(t, 'Europe/Madrid')).toBe('2026-11-13');
  });
});
