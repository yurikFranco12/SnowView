import { describe, expect, it } from 'vitest';
import { FORECAST_PROVIDER, NORMALIZED_SNOW_UNIT } from './index';

// Test de humo: comprueba que data/ resuelve core/ a través del workspace.
describe('@snowview/data', () => {
  it('normaliza a la unidad de core', () => {
    expect(NORMALIZED_SNOW_UNIT).toBe('cm');
  });

  it('deja constancia del uso no comercial de Open-Meteo', () => {
    expect(FORECAST_PROVIDER.freeUse).toBe('non-commercial');
    expect(FORECAST_PROVIDER.attribution).toContain('Open-Meteo');
  });
});
