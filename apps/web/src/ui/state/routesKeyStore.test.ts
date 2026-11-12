import { describe, expect, it } from 'vitest';
import { isPlausibleApiKey } from './routesKeyStore';

describe('isPlausibleApiKey', () => {
  it('acepta algo con forma de clave de Google', () => {
    expect(isPlausibleApiKey('A'.repeat(39))).toBe(true);
    expect(isPlausibleApiKey('  ' + 'a1_-'.repeat(10) + '  ')).toBe(true);
  });

  it('rechaza lo vacío, lo corto, lo largo y lo que lleva espacios o símbolos', () => {
    expect(isPlausibleApiKey('')).toBe(false);
    expect(isPlausibleApiKey('corta')).toBe(false);
    expect(isPlausibleApiKey('A'.repeat(61))).toBe(false);
    expect(isPlausibleApiKey('A'.repeat(20) + ' ' + 'B'.repeat(20))).toBe(false);
    expect(isPlausibleApiKey('A'.repeat(39) + '!')).toBe(false);
  });
});
