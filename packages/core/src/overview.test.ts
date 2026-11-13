import { describe, expect, it } from 'vitest';
import type { HourlyPoint } from './models';
import { dailyOverview, significantWeatherCode, skyKind, windChillC } from './overview';

const H = 3_600_000;
const start = Date.UTC(2026, 0, 10, 0); // 01:00 en Madrid

function hour(i: number, over: Partial<HourlyPoint> = {}): HourlyPoint {
  return {
    time: start + i * H,
    snowfallCm: 0,
    snowDepthCm: 50,
    temperatureC: -2,
    windKmh: 10,
    gustKmh: 20,
    weatherCode: 3,
    freezingLevelM: 1800,
    ...over,
  };
}

describe('significantWeatherCode', () => {
  it('sin datos devuelve null', () => {
    expect(significantWeatherCode([null, null])).toBeNull();
  });
  it('dos horas de nieve mandan sobre un día nublado', () => {
    expect(significantWeatherCode([3, 3, 3, 3, 3, 3, 73, 73])).toBe(73);
  });
  it('una hora suelta de llovizna no cambia el día', () => {
    expect(significantWeatherCode([2, 2, 2, 2, 2, 2, 2, 51])).toBe(2);
  });
  it('la tormenta gana a la nieve si las dos son frecuentes', () => {
    expect(significantWeatherCode([95, 95, 71, 71, 71, 3])).toBe(95);
  });
  it('dentro de una familia gana el más frecuente', () => {
    expect(significantWeatherCode([71, 71, 71, 75, 3, 3])).toBe(71);
  });
});

describe('dailyOverview', () => {
  const tz = 'Europe/Madrid';
  it('agrupa por día local y calcula extremos', () => {
    const points: HourlyPoint[] = [];
    for (let i = 0; i < 48; i++) {
      points.push(
        hour(i, {
          snowfallCm: i < 24 ? 0.5 : 0,
          temperatureC: -5 + (i % 24) / 2,
          windKmh: i === 12 ? 60 : 10,
          gustKmh: i === 12 ? 90 : 20,
        }),
      );
    }
    // 48 h desde las 00:00 UTC: la última hora cae ya en el día 12 local, y el 13 queda vacío.
    const [d1, d2, , d4] = dailyOverview(points, tz, start, 4);
    expect(d1?.date).toBe('2026-01-10');
    // El día local empieza a la 01:00 UTC+1: 23 horas del primer bloque caen en el día 10.
    expect(d1?.snowCm).toBe(11.5);
    expect(d1?.maxWindKmh).toBe(60);
    expect(d1?.maxGustKmh).toBe(90);
    expect(d1?.tMinC).toBe(-5);
    expect(d1?.freezingLevelM).toBe(1800);
    expect(d1?.snowDepthCm).toBe(50);
    expect(d2?.date).toBe('2026-01-11');
    expect(d2?.snowCm).toBe(0.5);
    expect(d4).toMatchObject({ date: '2026-01-13', snowCm: 0, tMinC: null, hoursWithData: 0 });
  });
  it('los datos que faltan quedan en null, no en 0', () => {
    const points = [
      hour(10, { temperatureC: null, windKmh: null, gustKmh: null, snowDepthCm: null }),
    ];
    const [d] = dailyOverview(points, tz, start, 1);
    expect(d?.tMaxC).toBeNull();
    expect(d?.maxWindKmh).toBeNull();
    expect(d?.snowDepthCm).toBeNull();
  });
  it('admite previsiones antiguas sin nivel de congelación', () => {
    const { freezingLevelM: _omit, ...old } = hour(10);
    void _omit;
    expect(dailyOverview([old], tz, start, 1)[0]?.freezingLevelM).toBeNull();
  });
  it('no cuenta dos veces una hora repetida', () => {
    const p = hour(10, { snowfallCm: 2 });
    expect(dailyOverview([p, p], tz, start, 1)[0]?.snowCm).toBe(2);
  });
});

describe('skyKind y windChillC', () => {
  it('clasifica los códigos', () => {
    expect(skyKind(0)).toBe('clear');
    expect(skyKind(2)).toBe('partly');
    expect(skyKind(3)).toBe('cloudy');
    expect(skyKind(48)).toBe('fog');
    expect(skyKind(55)).toBe('drizzle');
    expect(skyKind(81)).toBe('rain');
    expect(skyKind(86)).toBe('snow');
    expect(skyKind(96)).toBe('storm');
    expect(skyKind(null)).toBe('unknown');
  });
  it('la sensación térmica baja con el viento y no se aplica con calor o calma', () => {
    expect(windChillC(-5, 30)).toBeCloseTo(-13, 0);
    expect(windChillC(-5, 3)).toBe(-5);
    expect(windChillC(15, 40)).toBe(15);
  });
});
