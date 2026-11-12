import { describe, expect, it } from 'vitest';
import { formatDistanceKm, formatDuration, haversineKm, isValidLatLng } from './geo';

const madrid = { latitude: 40.4168, longitude: -3.7038 };
const barcelona = { latitude: 41.3874, longitude: 2.1686 };
const baqueira = { latitude: 42.6996, longitude: 0.93165 };

describe('haversineKm', () => {
  it('Madrid a Barcelona son unos 505 km en línea recta', () => {
    expect(haversineKm(madrid, barcelona)).toBeGreaterThan(500);
    expect(haversineKm(madrid, barcelona)).toBeLessThan(510);
  });

  it('es simétrica y vale 0 entre un punto y él mismo', () => {
    expect(haversineKm(madrid, madrid)).toBe(0);
    expect(haversineKm(madrid, baqueira)).toBeCloseTo(haversineKm(baqueira, madrid), 9);
  });

  it('un grado de latitud son unos 111 km', () => {
    const d = haversineKm({ latitude: 40, longitude: 0 }, { latitude: 41, longitude: 0 });
    expect(d).toBeGreaterThan(110.5);
    expect(d).toBeLessThan(111.8);
  });

  it('cruza el antimeridiano por el camino corto', () => {
    const d = haversineKm({ latitude: 0, longitude: 179.5 }, { latitude: 0, longitude: -179.5 });
    expect(d).toBeLessThan(120);
  });

  it('los antípodas están a la mitad de la circunferencia sin salir NaN', () => {
    const d = haversineKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 180 });
    expect(d).toBeGreaterThan(20000);
    expect(d).toBeLessThan(20040);
  });
});

describe('isValidLatLng', () => {
  it('acepta coordenadas reales y rechaza las imposibles', () => {
    expect(isValidLatLng(madrid)).toBe(true);
    expect(isValidLatLng({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidLatLng({ latitude: 0, longitude: 181 })).toBe(false);
    expect(isValidLatLng({ latitude: NaN, longitude: 0 })).toBe(false);
  });
});

describe('formatDistanceKm', () => {
  it('usa metros, un decimal o enteros según el tamaño', () => {
    expect(formatDistanceKm(0.85)).toBe('850 m');
    expect(formatDistanceKm(12.43)).toBe('12,4 km');
    expect(formatDistanceKm(312.4)).toBe('312 km');
    expect(formatDistanceKm(1234.5)).toBe('1235 km');
  });

  it('da "—" con valores inválidos', () => {
    expect(formatDistanceKm(NaN)).toBe('—');
    expect(formatDistanceKm(-1)).toBe('—');
  });
});

describe('formatDuration', () => {
  it('escribe minutos, horas o ambas', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(180)).toBe('3 h');
    expect(formatDuration(205)).toBe('3 h 25 min');
    expect(formatDuration(59.6)).toBe('1 h');
  });

  it('da "—" sin duración válida', () => {
    expect(formatDuration(0)).toBe('—');
    expect(formatDuration(NaN)).toBe('—');
  });
});
