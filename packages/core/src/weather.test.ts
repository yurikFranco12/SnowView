import { describe, expect, it } from 'vitest';
import { describeWeatherCode, isSnowCode } from './weather';

describe('describeWeatherCode', () => {
  it('traduce los códigos WMO', () => {
    expect(describeWeatherCode(0)).toBe('Despejado');
    expect(describeWeatherCode(73)).toBe('Nevada moderada');
    expect(describeWeatherCode(86)).toBe('Chubascos de nieve fuertes');
  });

  it('distingue entre sin datos y código desconocido', () => {
    expect(describeWeatherCode(null)).toBe('Sin datos');
    expect(describeWeatherCode(42)).toBe('Desconocido');
  });

  it('reconoce los códigos de nieve', () => {
    expect([71, 75, 77, 85, 86].every(isSnowCode)).toBe(true);
    expect([0, 61, 95, null].some(isSnowCode)).toBe(false);
  });
});
