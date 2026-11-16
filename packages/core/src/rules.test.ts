import { describe, expect, it } from 'vitest';
import { HOUR_MS } from './accumulation';
import type { HourlyPoint, StationForecast } from './models';
import {
  type AlertRule,
  evaluateRule,
  markKeysNotified,
  markNotified,
  notificationId,
  parseRules,
  pickNewAlerts,
  planUpcomingAlert,
  pruneLog,
  snowEpisodeStart,
  validateRule,
} from './rules';

const T0 = Date.UTC(2026, 10, 12, 0);

function point(time: number, over: Partial<HourlyPoint> = {}): HourlyPoint {
  return {
    time,
    snowfallCm: 0,
    snowDepthCm: null,
    temperatureC: -5,
    windKmh: 10,
    gustKmh: null,
    weatherCode: null,
    ...over,
  };
}

function hours(start: number, n: number, over: (i: number) => Partial<HourlyPoint>): HourlyPoint[] {
  return Array.from({ length: n }, (_, i) => point(start + i * HOUR_MS, over(i)));
}

function forecast(top: HourlyPoint[], base: HourlyPoint[] = top): StationForecast {
  return {
    stationId: 'formigal',
    fetchedAt: T0,
    base: { elevationM: 1500, hours: base },
    top: { elevationM: 2250, hours: top },
    attribution: 'test',
  };
}

const RULE: AlertRule = {
  id: 'r1',
  stationId: 'formigal',
  thresholdCm: 15,
  windowHours: 48,
  elevation: 'top',
  enabled: true,
};

describe('evaluateRule', () => {
  it('se cumple al alcanzar el umbral en la ventana', () => {
    const f = forecast(hours(T0, 72, () => ({ snowfallCm: 0.4 }))); // 48 h × 0,4 = 19,2 cm
    const e = evaluateRule(RULE, f, T0 + 10 * 60_000);
    expect(e.totalCm).toBe(19.2);
    expect(e.met).toBe(true);
    expect(e.status).toBe('cumplida');
    expect(e.progress).toBe(1);
    expect(e.complete).toBe(true);
  });

  it('empieza en la hora en curso y no cuenta lo ya pasado', () => {
    const f = forecast(hours(T0, 72, (i) => ({ snowfallCm: i < 24 ? 1 : 0 })));
    const e = evaluateRule(RULE, f, T0 + 24 * HOUR_MS);
    expect(e.totalCm).toBe(0);
    expect(e.met).toBe(false);
    expect(e.status).toBe('pendiente');
  });

  it('"más de" exige superar el umbral, no igualarlo', () => {
    const f = forecast(hours(T0, 48, (i) => ({ snowfallCm: i < 3 ? 5 : 0 }))); // justo 15 cm
    const e = evaluateRule(RULE, f, T0);
    expect(e.totalCm).toBe(15);
    expect(e.met).toBe(false);
    expect(e.progress).toBe(1);
  });

  it('por debajo del umbral queda en curso con su avance', () => {
    const f = forecast(hours(T0, 48, (i) => ({ snowfallCm: i < 3 ? 2.5 : 0 }))); // 7,5 cm
    const e = evaluateRule(RULE, f, T0);
    expect(e.met).toBe(false);
    expect(e.status).toBe('en-curso');
    expect(e.progress).toBeCloseTo(0.5);
    expect(e.eventKey).toBeNull();
  });

  it('con datos nulos avisa de ventana incompleta y no los cuenta como cero', () => {
    const f = forecast(hours(T0, 48, (i) => ({ snowfallCm: i === 5 ? null : 1 })));
    const e = evaluateRule(RULE, f, T0);
    expect(e.complete).toBe(false);
    expect(e.totalCm).toBe(47);
  });

  it('sin previsión da 0 cm y no se cumple', () => {
    const e = evaluateRule(RULE, forecast([]), T0);
    expect(e.totalCm).toBe(0);
    expect(e.met).toBe(false);
    expect(e.complete).toBe(false);
  });

  it('usa la cota elegida', () => {
    const top = hours(T0, 48, () => ({ snowfallCm: 1 }));
    const base = hours(T0, 48, () => ({ snowfallCm: 0 }));
    const f = forecast(top, base);
    expect(evaluateRule(RULE, f, T0).met).toBe(true);
    expect(evaluateRule({ ...RULE, elevation: 'base' }, f, T0).met).toBe(false);
  });

  it('una regla desactivada nunca se cumple', () => {
    const f = forecast(hours(T0, 48, () => ({ snowfallCm: 1 })));
    const e = evaluateRule({ ...RULE, enabled: false }, f, T0);
    expect(e.thresholdMet).toBe(true);
    expect(e.met).toBe(false);
  });

  describe('condiciones opcionales', () => {
    const snowy = (over: Partial<HourlyPoint>) => hours(T0, 48, () => ({ snowfallCm: 1, ...over }));

    it('el viento máximo de la ventana no debe pasar el límite', () => {
      const rule = { ...RULE, maxWindKmh: 40 };
      expect(evaluateRule(rule, forecast(snowy({ windKmh: 30 })), T0).met).toBe(true);
      expect(evaluateRule(rule, forecast(snowy({ windKmh: 55 })), T0).met).toBe(false);
    });

    it('la temperatura más alta de la ventana no debe pasar el límite', () => {
      const rule = { ...RULE, maxTemperatureC: -2 };
      expect(evaluateRule(rule, forecast(snowy({ temperatureC: -6 })), T0).met).toBe(true);
      const e = evaluateRule(rule, forecast(snowy({ temperatureC: 1 })), T0);
      expect(e.thresholdMet).toBe(true);
      expect(e.conditionsMet).toBe(false);
      expect(e.met).toBe(false);
    });

    it('sin dato de viento o temperatura la condición no se da por cumplida', () => {
      const f = forecast(snowy({ windKmh: null, temperatureC: null }));
      expect(evaluateRule({ ...RULE, maxWindKmh: 40 }, f, T0).met).toBe(false);
      expect(evaluateRule({ ...RULE, maxTemperatureC: 0 }, f, T0).met).toBe(false);
      expect(evaluateRule(RULE, f, T0).met).toBe(true);
    });
  });
});

describe('snowEpisodeStart', () => {
  it('une horas con nieve separadas por menos de 12 h', () => {
    const pts = hours(T0, 30, (i) => ({ snowfallCm: i === 2 || i === 10 || i === 20 ? 1 : 0 }));
    // Huecos de 8 h y 10 h: un solo episodio que empieza en la hora 2.
    expect(snowEpisodeStart(pts, T0 + 12 * HOUR_MS, 12)).toBe(T0 + 2 * HOUR_MS);
  });

  it('separa episodios con 12 h o más sin nieve', () => {
    const pts = hours(T0, 40, (i) => ({ snowfallCm: i === 2 || i === 30 ? 1 : 0 }));
    expect(snowEpisodeStart(pts, T0 + 20 * HOUR_MS, 20)).toBe(T0 + 30 * HOUR_MS);
  });

  it('devuelve null si la ventana no tiene nieve', () => {
    expect(
      snowEpisodeStart(
        hours(T0, 10, () => ({})),
        T0,
        10,
      ),
    ).toBeNull();
  });
});

describe('avisos sin repetir', () => {
  // Una nevada de 20 cm entre las horas 6 y 15 dentro de una previsión de 96 h.
  const storm = hours(T0, 96, (i) => ({ snowfallCm: i >= 6 && i < 16 ? 2 : 0 }));
  const f = forecast(storm);

  it('la clave no cambia mientras la ventana se desliza sobre la misma nevada', () => {
    const a = evaluateRule(RULE, f, T0);
    const b = evaluateRule(RULE, f, T0 + 3 * HOUR_MS);
    expect(a.met && b.met).toBe(true);
    expect(a.eventKey).toBe(b.eventKey);
    expect(a.eventKey).toBe(`formigal|r1|${T0 + 6 * HOUR_MS}`);
  });

  it('dispara una vez por evento y no se repite en la siguiente consulta', () => {
    const first = pickNewAlerts([evaluateRule(RULE, f, T0)], {});
    expect(first).toHaveLength(1);
    const log = markNotified({}, first, T0);

    const later = pickNewAlerts([evaluateRule(RULE, f, T0 + 4 * HOUR_MS)], log);
    expect(later).toHaveLength(0);
  });

  it('una nevada distinta vuelve a disparar', () => {
    const twoStorms = hours(T0, 200, (i) =>
      (i >= 6 && i < 16) || (i >= 100 && i < 110) ? { snowfallCm: 2 } : { snowfallCm: 0 },
    );
    const f2 = forecast(twoStorms);
    const first = pickNewAlerts([evaluateRule(RULE, f2, T0)], {});
    const log = markNotified({}, first, T0);
    const second = pickNewAlerts([evaluateRule(RULE, f2, T0 + 90 * HOUR_MS)], log);
    expect(second).toHaveLength(1);
    expect(second[0]?.eventKey).not.toBe(first[0]?.eventKey);
  });

  it('dos reglas de la misma estación avisan por separado', () => {
    const r2 = { ...RULE, id: 'r2', thresholdCm: 10 };
    const evals = [evaluateRule(RULE, f, T0), evaluateRule(r2, f, T0)];
    expect(pickNewAlerts(evals, {})).toHaveLength(2);
  });

  it('no repite una clave duplicada en la misma tanda', () => {
    const e = evaluateRule(RULE, f, T0);
    expect(pickNewAlerts([e, e], {})).toHaveLength(1);
  });

  it('pruneLog quita los avisos antiguos y conserva los recientes', () => {
    const log = { viejo: T0, nuevo: T0 + 20 * 24 * HOUR_MS };
    expect(pruneLog(log, T0 + 21 * 24 * HOUR_MS)).toEqual({ nuevo: T0 + 20 * 24 * HOUR_MS });
  });
});

describe('validateRule y parseRules', () => {
  it('acepta una regla correcta', () => {
    expect(validateRule(RULE)).toEqual([]);
  });

  it('señala los valores no válidos', () => {
    const errors = validateRule({
      ...RULE,
      stationId: '',
      thresholdCm: 0,
      windowHours: 500,
      maxWindKmh: -1,
    });
    expect(errors).toHaveLength(4);
  });

  it('parseRules descarta lo mal formado y aplica valores por defecto', () => {
    const parsed = parseRules([
      { id: 'a', stationId: 's', thresholdCm: 10, windowHours: 24, maxWindKmh: 30 },
      { id: 'b', stationId: 's', thresholdCm: -3, windowHours: 24 },
      'basura',
      null,
      { id: 'c' },
    ]);
    expect(parsed).toEqual([
      {
        id: 'a',
        stationId: 's',
        thresholdCm: 10,
        windowHours: 24,
        elevation: 'top',
        enabled: true,
        maxWindKmh: 30,
      },
    ]);
    expect(parseRules(undefined)).toEqual([]);
  });
});

describe('avisos programados', () => {
  // 20 cm entre las horas 100 y 109: la regla de 48 h aún no se cumple en T0.
  const later = hours(T0, 240, (i) => ({ snowfallCm: i >= 100 && i < 110 ? 2 : 0 }));
  const f = forecast(later);

  it('programa el aviso para la primera hora en que la ventana ya supera el umbral', () => {
    expect(evaluateRule(RULE, f, T0).met).toBe(false);
    const plan = planUpcomingAlert(RULE, f, T0 + 10 * 60_000, {});
    // La ventana [t, t+48) suma más de 15 cm cuando incluye 8 horas de nieve: t + 48 > 107.
    expect(plan?.atMs).toBe(T0 + 60 * HOUR_MS);
    expect(plan?.evaluation.eventKey).toBe(`formigal|r1|${T0 + 100 * HOUR_MS}`);
    expect(plan?.evaluation.totalCm).toBeCloseTo(16);
  });

  it('no programa el evento que ya se cumple ahora ni uno ya avisado', () => {
    const now = hours(T0, 96, (i) => ({ snowfallCm: i >= 6 && i < 16 ? 2 : 0 }));
    expect(planUpcomingAlert(RULE, forecast(now), T0, {})).toBeNull();
    const key = `formigal|r1|${T0 + 100 * HOUR_MS}`;
    expect(planUpcomingAlert(RULE, f, T0, { [key]: T0 })).toBeNull();
  });

  it('no programa reglas desactivadas ni nevadas más allá del horizonte', () => {
    expect(planUpcomingAlert({ ...RULE, enabled: false }, f, T0, {})).toBeNull();
    const far = hours(T0, 300, (i) => ({ snowfallCm: i >= 200 && i < 210 ? 2 : 0 }));
    expect(planUpcomingAlert(RULE, forecast(far), T0, {})).toBeNull();
  });

  it('markKeysNotified anota los avisos que ya saltaron', () => {
    expect(markKeysNotified({ a: 1 }, [{ eventKey: 'b', atMs: 2 }])).toEqual({ a: 1, b: 2 });
  });

  it('notificationId es estable, positivo y cabe en 31 bits', () => {
    const id = notificationId('formigal|r1|123');
    expect(id).toBe(notificationId('formigal|r1|123'));
    expect(id).not.toBe(notificationId('formigal|r2|123'));
    expect(Number.isInteger(id) && id > 0 && id <= 0x7fffffff).toBe(true);
  });
});
