import type { PisteData } from './pisteScene';
import type { TerrainGrid } from './terrain';

/** Pistas y mallas de altitud que van dentro de la app; cada una se carga solo al abrir su mapa. */
export const pisteLoaders = import.meta.glob<PisteData>('./data/pistes/*.json', {
  import: 'default',
});
export const terrainLoaders = import.meta.glob<TerrainGrid>('./data/terrain/*.json', {
  import: 'default',
});

/** ¿Hay mapa de pistas de esta estación? No todas las del catálogo lo tienen todavía. */
export function hasPisteMap(stationId: string): boolean {
  return `./data/pistes/${stationId}.json` in pisteLoaders;
}
