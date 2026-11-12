import { Bell, Mountain, Settings } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { SnowCanvas } from './background/SnowCanvas';
import { Sidebar } from './layout/Sidebar';
import { TitleBar } from './layout/TitleBar';
import { screenVariants } from './motion/reveal';
import { HomeScreen } from './screens/HomeScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen';
import { useAppStore, type View } from './state/appStore';

const SCREENS: Record<View, () => ReactNode> = {
  inicio: () => <HomeScreen />,
  estaciones: () => (
    <PlaceholderScreen
      title="Estaciones"
      icon={Mountain}
      description="Aquí podrás buscar estaciones y marcar tus favoritas con la previsión real de Open-Meteo."
      phase="Llega en la Fase 1b"
    />
  ),
  alertas: () => (
    <PlaceholderScreen
      title="Alertas"
      icon={Bell}
      description="Aquí crearás reglas como «más de 15 cm en 48 h» y recibirás un aviso de Windows cuando se cumplan."
      phase="Llega en la Fase 1c"
    />
  ),
  ajustes: () => (
    <PlaceholderScreen
      title="Ajustes"
      icon={Settings}
      description="Arranque con Windows, frecuencia de consulta e intensidad de la nevada de fondo."
      phase="Llega en la Fase 1c"
    />
  ),
};

export function App() {
  const view = useAppStore((s) => s.view);

  return (
    // reducedMotion="user": todas las animaciones de Motion respetan prefers-reduced-motion.
    <MotionConfig reducedMotion="user">
      <div
        className="relative flex h-full flex-col overflow-hidden"
        style={{ background: 'var(--sv-background)' }}
      >
        <SnowCanvas />
        <TitleBar />
        <div className="relative flex min-h-0 flex-1">
          <Sidebar />
          <main className="relative min-w-0 flex-1 overflow-y-auto">
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
                {SCREENS[view]()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}
