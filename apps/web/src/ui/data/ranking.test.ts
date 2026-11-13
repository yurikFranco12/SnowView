import { describe, expect, it } from 'vitest';
import { sortStations, type RankRow } from './ranking';

const rows: RankRow[] = [
  { id: 'c', name: 'Cerler', snowCm: 10, depthCm: null, score: 40 },
  { id: 'a', name: 'Alto Campoo', snowCm: null, depthCm: 5, score: 40 },
  { id: 'b', name: 'Baqueira', snowCm: 30, depthCm: 80, score: null },
];
const ids = (list: RankRow[]) => list.map((r) => r.id).join('');

describe('sortStations', () => {
  it('ordena por nombre', () => {
    expect(ids(sortStations(rows, 'name'))).toBe('abc');
  });
  it('de más a menos, con las que no tienen dato al final', () => {
    expect(ids(sortStations(rows, 'snow'))).toBe('bca');
    expect(ids(sortStations(rows, 'depth'))).toBe('bac');
  });
  it('los empates se deshacen por nombre', () => {
    expect(ids(sortStations(rows, 'score'))).toBe('acb');
  });
  it('no cambia la lista original', () => {
    const copy = [...rows];
    sortStations(rows, 'snow');
    expect(rows).toEqual(copy);
  });
});
