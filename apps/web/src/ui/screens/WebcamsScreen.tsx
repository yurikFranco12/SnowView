import { getStation, getWebcams, stationsWithWebcams } from '@snowview/data';
import { motion } from 'motion/react';
import { WebcamCard } from '../components/WebcamCard';
import { revealItem } from '../motion/reveal';
import { useAppStore } from '../state/appStore';
import { useFavorites } from '../state/favoritesStore';

const STATION_IDS = stationsWithWebcams();

export function WebcamsScreen() {
  const favorites = useFavorites((s) => s.ids);
  const chosen = useAppStore((s) => s.webcamStationId);
  const setChosen = useAppStore((s) => s.setWebcamStation);
  const stationId =
    chosen && STATION_IDS.includes(chosen) ? chosen : (favorites[0] ?? STATION_IDS[0]);
  const station = stationId ? getStation(stationId) : undefined;
  const cams = stationId ? getWebcams(stationId) : [];

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-8 py-[26px] [&>*]:shrink-0">
      <motion.header variants={revealItem}>
        <p className="text-xs tracking-[0.14em] text-muted uppercase">
          {cams.length} {cams.length === 1 ? 'cámara' : 'cámaras'}
        </p>
        <h1 className="mt-1.5 font-display text-4xl font-semibold tracking-tight">Webcams</h1>
      </motion.header>

      <motion.nav variants={revealItem} aria-label="Estación" className="glass p-4">
        <ul className="flex flex-wrap gap-2">
          {STATION_IDS.map((id) => {
            const on = id === stationId;
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setChosen(id)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
                    on
                      ? 'border-ice/50 bg-ice/[0.16] font-semibold text-ice'
                      : 'border-white/10 text-muted hover:bg-white/[0.08] hover:text-text'
                  }`}
                >
                  {getStation(id)?.name ?? id}
                </button>
              </li>
            );
          })}
        </ul>
      </motion.nav>

      {station && (
        <motion.section variants={revealItem} aria-label={`Webcams de ${station.name}`}>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {cams.map((cam) => (
              <li key={cam.id}>
                <WebcamCard cam={cam} />
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      <motion.p variants={revealItem} className="text-xs text-muted">
        Las imágenes y los vídeos son de las estaciones y de sus proveedores (feratel, ipcamlive,
        Skaping, Cantur, FGC…) y se muestran tal cual, con su crédito. Si una cámara no carga, suele
        estar apagada fuera de temporada o en mantenimiento.
      </motion.p>
    </div>
  );
}
