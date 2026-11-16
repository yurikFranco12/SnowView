import { COUNTRIES, STATIONS, getStation, type CuratedStation } from '@snowview/data';

const byName = (a: CuratedStation, b: CuratedStation) => a.name.localeCompare(b.name, 'es');
const GROUPS = COUNTRIES.map((c) => ({
  label: c.name,
  stations: STATIONS.filter((s) => s.country === c.code).sort(byName),
})).filter((g) => g.stations.length > 0);

/**
 * Opciones de un `<select>` con todas las estaciones: primero las favoritas y luego el resto por
 * país y en orden alfabético. Con cientos de estaciones, un desplegable sin agrupar no se puede
 * recorrer; el nativo además permite escribir para saltar a un nombre y funciona con el teclado.
 */
export function StationOptions({ favorites = [] }: { favorites?: readonly string[] }) {
  const favoriteStations = favorites.flatMap((id) => getStation(id) ?? []);
  return (
    <>
      {favoriteStations.length > 0 && (
        <optgroup label="Favoritas" className="bg-bg-start">
          {favoriteStations.map((s) => (
            <option key={s.id} value={s.id} className="bg-bg-start">
              {s.name}
            </option>
          ))}
        </optgroup>
      )}
      {GROUPS.map((g) => (
        <optgroup key={g.label} label={g.label} className="bg-bg-start">
          {g.stations.map((s) => (
            <option key={s.id} value={s.id} className="bg-bg-start">
              {s.name} · {s.region}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}
