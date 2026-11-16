import { QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { SnowCanvas } from './background/SnowCanvas';
import { applyRefreshInterval, queryClient } from './data/forecast';
import { useRuleMonitor } from './data/rules';
import { Sidebar } from './layout/Sidebar';
import { storage } from '../platform/storage';
import { CommandPalette, useGlobalShortcuts } from './components/CommandPalette';
import { StationSheet } from './components/StationSheet';
import { TitleBar } from './layout/TitleBar';
import { screenVariants } from './motion/reveal';
import { HomeScreen } from './screens/HomeScreen';
import { useAppStore, type View } from './state/appStore';
import { useFavorites } from './state/favoritesStore';
import { useRules } from './state/rulesStore';
import { useManualLocation } from './state/manualLocationStore';
import { snowIntensity, useSettings } from './state/settingsStore';

// Cada pantalla se descarga al abrirla por primera vez: el arranque carga solo el inicio.
const AlertsScreen = lazy(() =>
  import('./screens/AlertsScreen').then((m) => ({ default: m.AlertsScreen })),
);
const CalendarScreen = lazy(() =>
  import('./screens/CalendarScreen').then((m) => ({ default: m.CalendarScreen })),
);
const CompareScreen = lazy(() =>
  import('./screens/CompareScreen').then((m) => ({ default: m.CompareScreen })),
);
const HistoryScreen = lazy(() =>
  import('./screens/HistoryScreen').then((m) => ({ default: m.HistoryScreen })),
);
const MapScreen = lazy(() => import('./screens/MapScreen').then((m) => ({ default: m.MapScreen })));
const SettingsScreen = lazy(() =>
  import('./screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen })),
);
const StationsScreen = lazy(() =>
  import('./screens/StationsScreen').then((m) => ({ default: m.StationsScreen })),
);
const WebcamsScreen = lazy(() =>
  import('./screens/WebcamsScreen').then((m) => ({ default: m.WebcamsScreen })),
);

const SCREENS: Record<View, () => ReactNode> = {
  inicio: () => <HomeScreen />,
  estaciones: () => <StationsScreen />,
  mapa: () => <MapScreen />,
  comparar: () => <CompareScreen />,
  calendario: () => <CalendarScreen />,
  webcams: () => <WebcamsScreen />,
  historial: () => <HistoryScreen />,
  alertas: () => <AlertsScreen />,
  ajustes: () => <SettingsScreen />,
};

/** Vigila las reglas mientras la app está abierta. Va dentro del QueryClientProvider. */
function RuleMonitor() {
  useRuleMonitor();
  return null;
}

export function App() {
  const view = useAppStore((s) => s.view);
  useGlobalShortcuts();
  const loadFavorites = useFavorites((s) => s.load);
  const loadRules = useRules((s) => s.load);
  const loadSettings = useSettings((s) => s.load);
  const loadManualLocation = useManualLocation((s) => s.load);
  const refreshMinutes = useSettings((s) => s.refreshMinutes);
  const snowLevel = useSettings((s) => s.snowLevel);

  useEffect(() => {
    void loadFavorites();
    void loadRules();
    void loadSettings();
    // La clave de Google de las rutas (quitadas en la fase 15) ya no se usa: se borra del equipo.
    void storage.set('googleMapsKey', null);
    void loadManualLocation();
  }, [loadFavorites, loadRules, loadSettings, loadManualLocation]);

  useEffect(() => {
    applyRefreshInterval(refreshMinutes);
  }, [refreshMinutes]);

  return (
    <QueryClientProvider client={queryClient}>
      <RuleMonitor />
      {/* reducedMotion="user": todas las animaciones de Motion respetan prefers-reduced-motion. */}
      <MotionConfig reducedMotion="user">
        <div
          className="relative flex h-full flex-col overflow-hidden"
          style={{ background: 'var(--sv-background)' }}
        >
          <SnowCanvas intensity={snowIntensity(snowLevel)} />
          <TitleBar />
          {/* En el móvil la navegación va abajo (columna invertida); en el escritorio, a la izquierda. */}
          <div className="relative flex min-h-0 flex-1 flex-col-reverse md:flex-row">
            <Sidebar />
            <main className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* El contenedor no anima nada propio: solo escalona a los paneles (ver reveal.ts). */}
                <motion.div
                  key={view}
                  className="h-full"
                  variants={screenVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <Suspense
                    fallback={
                      <p
                        role="status"
                        className="grid h-full place-items-center text-sm text-muted"
                      >
                        Cargando…
                      </p>
                    }
                  >
                    {SCREENS[view]()}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
          <StationSheet />
          <CommandPalette />
        </div>
      </MotionConfig>
    </QueryClientProvider>
  );
}
