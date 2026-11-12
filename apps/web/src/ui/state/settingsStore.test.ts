import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings, snowIntensity } from './settingsStore';

describe('parseSettings', () => {
  it('usa los valores por defecto si no hay nada guardado', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('basura')).toEqual(DEFAULT_SETTINGS);
  });

  it('acepta valores válidos', () => {
    expect(
      parseSettings({ refreshMinutes: 15, snowLevel: 'high', discipline: 'snowboard' }),
    ).toEqual({ refreshMinutes: 15, snowLevel: 'high', discipline: 'snowboard' });
  });

  it('descarta opciones que ya no existen', () => {
    expect(
      parseSettings({ refreshMinutes: 7, snowLevel: 'tormenta', discipline: 'parapente' }),
    ).toEqual(DEFAULT_SETTINGS);
  });
});

describe('snowIntensity', () => {
  it('apaga la nieve con "off" y la sube con "high"', () => {
    expect(snowIntensity('off')).toBe(0);
    expect(snowIntensity('normal')).toBe(1);
    expect(snowIntensity('high')).toBeGreaterThan(1);
  });
});
