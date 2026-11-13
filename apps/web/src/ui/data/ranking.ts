/** Orden de la lista de estaciones. */
export type StationSort = 'name' | 'snow' | 'depth' | 'score';

export interface RankRow {
  id: string;
  name: string;
  /** Nieve prevista en el periodo, espesor actual en la cima y nota de hoy; null = sin dato. */
  snowCm: number | null;
  depthCm: number | null;
  score: number | null;
}

/**
 * Ordena las estaciones: por nombre, o de mayor a menor en la medida elegida. Las que no tienen
 * dato van al final, y los empates se deshacen por nombre para que el orden sea estable.
 */
export function sortStations<T extends RankRow>(rows: readonly T[], sort: StationSort): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, 'es');
  if (sort === 'name') return [...rows].sort(byName);
  const value = (r: T) => (sort === 'snow' ? r.snowCm : sort === 'depth' ? r.depthCm : r.score);
  return [...rows].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (va === null && vb === null) return byName(a, b);
    if (va === null) return 1;
    if (vb === null) return -1;
    return vb - va || byName(a, b);
  });
}
