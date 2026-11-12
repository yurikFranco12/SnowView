import { describe, expect, it } from 'vitest';
import { parseManualLocation } from './manualLocationStore';

describe('parseManualLocation', () => {
  it('acepta coordenadas válidas', () => {
    expect(parseManualLocation({ latitude: 43.3167, longitude: -3.3667 })).toEqual({
      latitude: 43.3167,
      longitude: -3.3667,
    });
  });

  it('descarta lo que no son coordenadas', () => {
    expect(parseManualLocation(undefined)).toBeUndefined();
    expect(parseManualLocation(null)).toBeUndefined();
    expect(parseManualLocation('43,-3')).toBeUndefined();
    expect(parseManualLocation({ latitude: '43', longitude: -3 })).toBeUndefined();
    expect(parseManualLocation({ latitude: 120, longitude: 0 })).toBeUndefined();
  });
});
