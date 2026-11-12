import {
  Bell,
  CalendarDays,
  ChartColumn,
  House,
  Mountain,
  Scale,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAppStore, type View } from '../state/appStore';

interface NavItem {
  view: View;
  label: string;
  icon: LucideIcon;
}

const MAIN_ITEMS: readonly NavItem[] = [
  { view: 'inicio', label: 'Inicio', icon: House },
  { view: 'estaciones', label: 'Estaciones', icon: Mountain },
  { view: 'comparar', label: 'Comparar', icon: Scale },
  { view: 'calendario', label: 'Calendario', icon: CalendarDays },
  { view: 'historial', label: 'Historial', icon: ChartColumn },
  { view: 'alertas', label: 'Alertas', icon: Bell },
];

const SETTINGS_ITEM: NavItem = { view: 'ajustes', label: 'Ajustes', icon: Settings };

function NavButton({ item }: { item: NavItem }) {
  const active = useAppStore((s) => s.view === item.view);
  const setView = useAppStore((s) => s.setView);
  const Icon = item.icon;

  return (
    <button
      type="button"
      aria-label={item.label}
      title={item.label}
      aria-current={active ? 'page' : undefined}
      onClick={() => setView(item.view)}
      className="relative grid size-14 place-items-center rounded-2xl transition-colors hover:bg-white/[0.06]"
    >
      {active && (
        // layoutId: el resaltado se desliza de un botón a otro en lugar de aparecer de golpe.
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-ice/30 to-indigo/20 shadow-[inset_0_0_0_1px_rgba(125,227,255,0.35)]"
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        />
      )}
      <Icon
        className={`relative size-[22px] ${active ? 'text-text' : 'text-muted'}`}
        aria-hidden="true"
        strokeWidth={1.8}
      />
    </button>
  );
}

export function Sidebar() {
  return (
    <nav
      aria-label="Principal"
      className="relative z-10 flex w-[84px] shrink-0 flex-col items-center gap-3.5 border-r border-white/[0.06] py-[18px]"
    >
      {MAIN_ITEMS.map((item) => (
        <NavButton key={item.view} item={item} />
      ))}
      <div className="mt-auto">
        <NavButton item={SETTINGS_ITEM} />
      </div>
    </nav>
  );
}
