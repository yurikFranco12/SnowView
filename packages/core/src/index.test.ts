import { describe, expect, it } from 'vitest';
import { SNOW_UNIT } from './index';

// Test de humo: comprueba que el paquete compila, se importa y Vitest funciona en el monorepo.
describe('@snowview/core', () => {
  it('trabaja en centímetros', () => {
    expect(SNOW_UNIT).toBe('cm');
  });
});
