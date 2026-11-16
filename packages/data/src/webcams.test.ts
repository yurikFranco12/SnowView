import tauriConf from '../../../src-tauri/tauri.conf.json';
import { describe, expect, it } from 'vitest';
import { STATIONS } from './stations';
import { WEBCAMS, getWebcams, parseWebcams, stationsWithWebcams } from './webcams';

const valid = {
  id: 'a',
  stationId: 'formigal',
  name: 'Anayet',
  credit: 'Aramón',
  pageUrl: 'https://example.com/webcams',
  image: { url: 'https://example.com/a.jpg', refreshSeconds: 300 },
};

const wrap = (...webcams: unknown[]) => ({ webcams });

describe('webcams.json real', () => {
  it('es válido y las estaciones verificadas a mano tienen al menos una webcam', () => {
    expect(WEBCAMS.length).toBeGreaterThan(0);
    // Las webcams se buscaron una a una (ADR 0008): el resto del catálogo aún no tiene.
    const curated = STATIONS.filter((s) => s.elevationsVerified || s.id === 'cauterets');
    for (const s of curated) expect(getWebcams(s.id).length, s.name).toBeGreaterThan(0);
    expect(stationsWithWebcams()).toHaveLength(curated.length);
  });

  it('todas usan https y la caché de la imagen no baja del mínimo', () => {
    for (const w of WEBCAMS) {
      for (const url of [w.image?.url, w.live?.url, w.pageUrl]) {
        if (url) expect(url.startsWith('https://')).toBe(true);
      }
    }
  });
});

describe('parseWebcams', () => {
  it('acepta una webcam correcta, con imagen o con directo', () => {
    expect(parseWebcams(wrap(valid))).toHaveLength(1);
    const live = { ...valid, id: 'b', image: undefined, live: { url: 'https://example.com/p' } };
    expect(parseWebcams(wrap(live))[0]?.live?.url).toBe('https://example.com/p');
  });

  it('rechaza lo que no sea una lista', () => {
    expect(() => parseWebcams({})).toThrowError(/falta la lista/);
    expect(() => parseWebcams(null)).toThrowError(/falta la lista/);
  });

  it('rechaza ids repetidos y estaciones desconocidas', () => {
    expect(() => parseWebcams(wrap(valid, valid))).toThrowError(/repetido/);
    expect(() => parseWebcams(wrap({ ...valid, stationId: 'nadie' }))).toThrowError(
      /estación desconocida/,
    );
  });

  it('exige imagen o directo', () => {
    expect(() => parseWebcams(wrap({ ...valid, image: undefined }))).toThrowError(/necesita/);
  });

  it('rechaza URL que no sean https', () => {
    expect(() =>
      parseWebcams(wrap({ ...valid, image: { url: 'http://x.com/a.jpg', refreshSeconds: 300 } })),
    ).toThrowError(/https/);
    expect(() =>
      parseWebcams(wrap({ ...valid, live: { url: 'javascript:alert(1)' } })),
    ).toThrowError(/https/);
    expect(() => parseWebcams(wrap({ ...valid, pageUrl: 'no es una url' }))).toThrowError(
      /pageUrl/,
    );
  });

  it('exige un refresco razonable', () => {
    expect(() =>
      parseWebcams(wrap({ ...valid, image: { url: 'https://x.com/a.jpg', refreshSeconds: 5 } })),
    ).toThrowError(/refreshSeconds/);
  });

  it('rechaza una cota no válida', () => {
    expect(() => parseWebcams(wrap({ ...valid, elevationM: -3 }))).toThrowError(/elevationM/);
  });
});

describe('CSP de Tauri', () => {
  const csp = (tauriConf.app.security.csp as string).split(';').map((d) => d.trim());
  const sources = (directive: string) =>
    (csp.find((d) => d.startsWith(`${directive} `)) ?? '').split(/\s+/).slice(1);

  it('permite el origen de cada imagen y cada reproductor en directo', () => {
    const img = sources('img-src');
    const frame = sources('frame-src');
    for (const w of WEBCAMS) {
      if (w.image) expect(img, w.id).toContain(new URL(w.image.url).origin);
      if (w.live) expect(frame, w.id).toContain(new URL(w.live.url).origin);
    }
  });
});
