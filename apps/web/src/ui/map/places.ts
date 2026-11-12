/**
 * Ciudades de referencia para orientarse en el mapa (no son estaciones). Coordenadas aproximadas
 * (centro urbano, al centésimo de grado). `minZoom` es el zoom a partir del cual se dibujan: las
 * capitales primero, y las poblaciones pequeñas solo al acercarse.
 */
export interface Place {
  name: string;
  latitude: number;
  longitude: number;
  minZoom: number;
}

export const PLACES: readonly Place[] = [
  { name: 'Madrid', latitude: 40.42, longitude: -3.7, minZoom: 6 },
  { name: 'Barcelona', latitude: 41.39, longitude: 2.17, minZoom: 6 },
  { name: 'Valencia', latitude: 39.47, longitude: -0.38, minZoom: 10 },
  { name: 'Sevilla', latitude: 37.39, longitude: -5.98, minZoom: 10 },
  { name: 'Málaga', latitude: 36.72, longitude: -4.42, minZoom: 10 },
  { name: 'Bilbao', latitude: 43.26, longitude: -2.94, minZoom: 10 },
  { name: 'Zaragoza', latitude: 41.65, longitude: -0.89, minZoom: 10 },
  { name: 'Toulouse', latitude: 43.6, longitude: 1.44, minZoom: 8 },
  { name: 'Lisboa', latitude: 38.72, longitude: -9.14, minZoom: 8 },
  { name: 'Granada', latitude: 37.18, longitude: -3.6, minZoom: 14 },
  { name: 'Santander', latitude: 43.46, longitude: -3.81, minZoom: 14 },
  { name: 'Burgos', latitude: 42.34, longitude: -3.7, minZoom: 18 },
  { name: 'Pamplona', latitude: 42.81, longitude: -1.65, minZoom: 18 },
  { name: 'Huesca', latitude: 42.14, longitude: -0.41, minZoom: 22 },
  { name: 'Lleida', latitude: 41.62, longitude: 0.62, minZoom: 22 },
  { name: 'Girona', latitude: 41.98, longitude: 2.82, minZoom: 22 },
  { name: 'Pau', latitude: 43.3, longitude: -0.37, minZoom: 22 },
  { name: 'Tarbes', latitude: 43.23, longitude: 0.08, minZoom: 30 },
  { name: 'Andorra la Vella', latitude: 42.51, longitude: 1.52, minZoom: 40 },
  { name: 'Jaca', latitude: 42.57, longitude: -0.55, minZoom: 60 },
  { name: 'Puigcerdà', latitude: 42.43, longitude: 1.93, minZoom: 60 },
  { name: 'Lourdes', latitude: 43.1, longitude: -0.05, minZoom: 60 },
  { name: 'Reinosa', latitude: 43.0, longitude: -4.14, minZoom: 60 },
  { name: 'Vielha', latitude: 42.7, longitude: 0.8, minZoom: 100 },
  { name: 'Benasque', latitude: 42.6, longitude: 0.52, minZoom: 100 },
  { name: 'Sallent de Gállego', latitude: 42.77, longitude: -0.33, minZoom: 100 },
];
