import { describe, expect, it } from 'vitest';
import { effectiveRefreshMs, withCacheBust } from './webcamUrl';

describe('withCacheBust', () => {
  it('añade el parámetro a una URL sin consulta', () => {
    expect(withCacheBust('https://x.com/a.jpg', 123)).toBe('https://x.com/a.jpg?_sv=123');
  });

  it('conserva los parámetros que ya tiene', () => {
    const out = new URL(withCacheBust('https://x.com/a.jpeg?design=v5&dcsdesign=feratel4', 9));
    expect(out.searchParams.get('design')).toBe('v5');
    expect(out.searchParams.get('dcsdesign')).toBe('feratel4');
    expect(out.searchParams.get('_sv')).toBe('9');
  });

  it('reemplaza el parámetro anterior en lugar de acumularlos', () => {
    const once = withCacheBust('https://x.com/a.jpg', 1);
    const twice = withCacheBust(once, 2);
    expect(new URL(twice).searchParams.getAll('_sv')).toEqual(['2']);
  });
});

describe('effectiveRefreshMs', () => {
  it('nunca baja de 60 segundos', () => {
    expect(effectiveRefreshMs(10)).toBe(60_000);
    expect(effectiveRefreshMs(300)).toBe(300_000);
  });
});
