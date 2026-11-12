import { describe, expect, it } from 'vitest';
import { HOUR_MS } from './accumulation';
import { dayConditions, localHour, rateDay, ratingOf, type DayConditions } from './conditions';
import type { HourlyPoint, StationForecast } from './models';

/** Un día perfecto: mucha nieve, nevó, frío, sin viento, buen tiempo. */
const GOOD: DayConditions = {
  date: '2026-12-10',
  snowfallCm: 10,
  recentSnowCm: 35,
  depthTopCm: 120,
  depthBaseCm: 60,
  tempC: -6,
  windKmh: 10,
  rainHours: 0,
  fogHours: 0,
  snowHours: 0,
  liftHoursWithData: 8,
};

const day = (over: Partial<DayConditions>): DayConditions => ({ ...GOOD, ...over });

describe('ratingOf', () => {
  it('traduce la nota en una etiqueta', () => {
    expect(ratingOf(95)).toBe('excelente');
    expect(ratingOf(80)).toBe('excelente');
    expect(ratingOf(79)).toBe('buena');
    expect(ratingOf(50)).toBe('aceptable');
    expect(ratingOf(30)).toBe('floja');
    expect(ratingOf(5)).toBe('mala');
  });
});

describe('rateDay', () => {
  it('un día perfecto es excelente en esquí y en snowboard', () => {
    expect(rateDay(GOOD, 'ski')).toMatchObject({ score: 100, rating: 'excelente' });
    expect(rateDay(GOOD, 'snowboard').rating).toBe('excelente');
  });

  it('sin nieve en el suelo no se puede esquiar', () => {
    const r = rateDay(day({ depthTopCm: 5, recentSnowCm: 0 }), 'ski');
    expect(r.score).toBeLessThanOrEqual(20);
    expect(r.rating).toBe('mala');
    expect(r.reasons[0]).toContain('Poca nieve');
  });

  it('un viento de 70 km/h o más tumba el día', () => {
    const r = rateDay(day({ windKmh: 75 }), 'ski');
    expect(r.score).toBeLessThanOrEqual(20);
    expect(r.reasons).toContain('Viento fuerte (75 km/h)');
  });

  it('el viento penaliza más al snowboard que al esquí', () => {
    const c = day({ windKmh: 45 });
    const ski = rateDay(c, 'ski').score ?? 0;
    const board = rateDay(c, 'snowboard').score ?? 0;
    expect(board).toBeLessThan(ski);
  });

  it('la nieve reciente suma más al snowboard', () => {
    const c = day({ recentSnowCm: 30, windKmh: 10, depthTopCm: 60, tempC: -15 });
    const withFresh = rateDay(c, 'snowboard').score ?? 0;
    const without = rateDay(day({ ...c, recentSnowCm: 0 }), 'snowboard').score ?? 0;
    const skiGain =
      (rateDay(c, 'ski').score ?? 0) - (rateDay(day({ ...c, recentSnowCm: 0 }), 'ski').score ?? 0);
    expect(withFresh - without).toBeGreaterThan(skiGain - 6); // pesa 25 frente a 20 puntos
    expect(withFresh).toBeGreaterThan(without);
  });

  it('con poca cobertura el snowboard tiene un tope más bajo', () => {
    const c = day({ depthTopCm: 25, recentSnowCm: 40 });
    expect(rateDay(c, 'snowboard').score).toBeLessThanOrEqual(45);
    expect(rateDay(c, 'ski').score ?? 0).toBeGreaterThan(45);
  });

  it('la lluvia durante varias horas limita la nota', () => {
    const r = rateDay(day({ rainHours: 4, tempC: 3 }), 'ski');
    expect(r.score).toBeLessThanOrEqual(40);
    expect(r.reasons.some((t) => t.startsWith('Lluvia'))).toBe(true);
  });

  it('el calor baja la nota aunque haya nieve', () => {
    const cold = rateDay(day({ tempC: -5 }), 'ski').score ?? 0;
    const warm = rateDay(day({ tempC: 5 }), 'ski').score ?? 0;
    expect(warm).toBeLessThan(cold);
  });

  it('el frío extremo también baja la nota, pero menos', () => {
    const ideal = rateDay(day({ tempC: -8 }), 'ski').score ?? 0;
    const polar = rateDay(day({ tempC: -22 }), 'ski').score ?? 0;
    expect(polar).toBeLessThan(ideal);
    expect(polar).toBeGreaterThan(rateDay(day({ tempC: 5 }), 'ski').score ?? 0);
  });

  it('los datos que faltan cuentan como neutros y marcan el día incompleto', () => {
    const r = rateDay(day({ depthTopCm: null, tempC: null, windKmh: null }), 'ski');
    expect(r.incomplete).toBe(true);
    expect(r.score).not.toBeNull();
  });

  it('sin horas de pistas con dato no hay nota', () => {
    expect(rateDay(day({ liftHoursWithData: 0 }), 'ski')).toMatchObject({
      score: null,
      rating: null,
      incomplete: true,
    });
  });

  it('la nota nunca sale de 0 a 100', () => {
    for (const c of [GOOD, day({ depthTopCm: 0, windKmh: 200, tempC: 30, rainHours: 8 })]) {
      for (const d of ['ski', 'snowboard'] as const) {
        const s = rateDay(c, d).score ?? -1;
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      }
    }
  });

  it('da como mucho tres motivos', () => {
    expect(
      rateDay(day({ windKmh: 50, tempC: 3, rainHours: 2, depthTopCm: 25 }), 'ski').reasons.length,
    ).toBeLessThanOrEqual(3);
  });
});

describe('localHour', () => {
  it('convierte a la hora local, con cambio horario', () => {
    expect(localHour(Date.UTC(2026, 11, 10, 8), 'Europe/Madrid')).toBe(9); // invierno: UTC+1
    expect(localHour(Date.UTC(2026, 6, 10, 8), 'Europe/Madrid')).toBe(10); // verano: UTC+2
    expect(localHour(Date.UTC(2026, 11, 10, 23), 'Europe/Madrid')).toBe(0);
  });
});

describe('dayConditions', () => {
  const T0 = Date.UTC(2026, 11, 10, 0); // 10 dic 2026, 00:00 UTC = 01:00 en Madrid

  function point(i: number, over: Partial<HourlyPoint> = {}): HourlyPoint {
    return {
      time: T0 + i * HOUR_MS,
      snowfallCm: 0,
      snowDepthCm: 80,
      temperatureC: -5,
      windKmh: 12,
      gustKmh: null,
      weatherCode: 3,
      ...over,
    };
  }

  function forecast(over: (i: number) => Partial<HourlyPoint>, n = 72): StationForecast {
    const hours = Array.from({ length: n }, (_, i) => point(i, over(i)));
    return {
      stationId: 's',
      fetchedAt: T0,
      top: { elevationM: 2500, hours },
      base: { elevationM: 1500, hours: hours.map((h) => ({ ...h, snowDepthCm: 30 })) },
      attribution: '',
    };
  }

  it('agrupa por día local y resume horario de pistas', () => {
    const [d0, d1] = dayConditions(
      forecast(() => ({})),
      'Europe/Madrid',
      T0,
      2,
    );
    expect(d0?.date).toBe('2026-12-10');
    expect(d1?.date).toBe('2026-12-11');
    expect(d0?.liftHoursWithData).toBe(8); // 9:00 a 16:59
    expect(d0?.depthTopCm).toBe(80);
    expect(d0?.depthBaseCm).toBe(30);
    expect(d0?.tempC).toBe(-5);
    expect(d0?.windKmh).toBe(12);
  });

  it('usa 0,7 × ráfaga si supera al viento medio', () => {
    const [d] = dayConditions(
      forecast(() => ({ windKmh: 20, gustKmh: 80 })),
      'Europe/Madrid',
      T0,
      1,
    );
    expect(d?.windKmh).toBeCloseTo(56);
  });

  it('suma la nieve del día y la reciente (72 h antes, hasta las 18:00)', () => {
    // Nieva 1 cm/h entre las horas 0 y 47 de la previsión.
    const f = forecast((i) => ({ snowfallCm: i < 48 ? 1 : 0 }));
    const [d0, d1] = dayConditions(f, 'Europe/Madrid', T0, 2);
    expect(d0?.snowfallCm).toBe(23); // 00:00 UTC es 01:00 local: el día 10 tiene 23 h
    expect(d1?.snowfallCm).toBeGreaterThan(20);
    expect(d1?.recentSnowCm).toBeGreaterThan(d1?.snowfallCm ?? 0);
  });

  it('cuenta lluvia, niebla y nevada cayendo en horario de pistas', () => {
    const f = forecast((i) => ({
      weatherCode: i === 9 || i === 10 ? 61 : i === 11 ? 45 : i === 12 ? 73 : 3,
    }));
    const [d] = dayConditions(f, 'Europe/Madrid', T0, 1);
    expect(d).toMatchObject({ rainHours: 2, fogHours: 1, snowHours: 1 });
  });

  it('los días sin previsión salen vacíos, sin inventar datos', () => {
    const f = forecast(() => ({}), 23);
    const [, d1] = dayConditions(f, 'Europe/Madrid', T0, 2);
    expect(d1).toMatchObject({
      liftHoursWithData: 0,
      depthTopCm: null,
      tempC: null,
      windKmh: null,
    });
  });

  it('con datos nulos deja los valores en null', () => {
    const f = forecast(() => ({
      snowDepthCm: null,
      temperatureC: null,
      windKmh: null,
      weatherCode: null,
    }));
    const [d] = dayConditions(f, 'Europe/Madrid', T0, 1);
    expect(d).toMatchObject({ depthTopCm: null, tempC: null, windKmh: null, rainHours: 0 });
  });
});
