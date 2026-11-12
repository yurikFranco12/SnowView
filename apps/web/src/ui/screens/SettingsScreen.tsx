import { Bell, Power } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useId, useState } from 'react';
import { autostartAvailable, isAutostartEnabled, setAutostart } from '../../platform/autostart';
import {
  getNotificationAccess,
  requestNotificationAccess,
  showNotification,
  type NotificationAccess,
} from '../../platform/notifications';
import { revealItem } from '../motion/reveal';

const ACCESS_TEXT: Record<NotificationAccess, string> = {
  granted: 'Activadas',
  denied: 'Bloqueadas en Windows',
  default: 'Sin activar',
  unsupported: 'No disponibles',
};

function AutostartRow() {
  const id = useId();
  const [enabled, setEnabled] = useState<boolean | undefined>(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    void isAutostartEnabled()
      .then(setEnabled)
      .catch(() => setError(true));
  }, []);

  async function change(next: boolean) {
    setError(false);
    try {
      await setAutostart(next);
      setEnabled(next);
    } catch {
      setError(true);
    }
  }

  return (
    <li className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4">
      <Power className="size-5 shrink-0 text-ice" aria-hidden="true" strokeWidth={1.6} />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-[15px] font-semibold">
          Iniciar con Windows
        </label>
        <p className="text-xs text-muted">
          Arranca en la bandeja del sistema para seguir vigilando tus reglas.
        </p>
        {!autostartAvailable && (
          <p className="text-xs text-muted">Solo disponible en la app de escritorio.</p>
        )}
        {error && (
          <p role="alert" className="text-xs text-[#FFB4A8]">
            No se pudo cambiar el arranque con Windows.
          </p>
        )}
      </div>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={enabled === true}
        disabled={!autostartAvailable || enabled === undefined}
        onChange={(e) => void change(e.target.checked)}
        className="size-5 accent-[#7DE3FF]"
      />
    </li>
  );
}

function NotificationsRow() {
  const [access, setAccess] = useState<NotificationAccess | undefined>(undefined);
  const [sent, setSent] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    void getNotificationAccess().then(setAccess);
  }, []);

  async function test() {
    setSent(await showNotification('SnowView', 'Así se verán tus avisos de nieve.'));
  }

  return (
    <li className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4">
      <Bell className="size-5 shrink-0 text-ice" aria-hidden="true" strokeWidth={1.6} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">Notificaciones</p>
        <p className="text-xs text-muted" aria-live="polite">
          {access ? ACCESS_TEXT[access] : 'Comprobando…'}
          {sent === false && ' · no se pudo mostrar la prueba'}
        </p>
      </div>
      {access !== 'granted' && access !== 'unsupported' && (
        <button
          type="button"
          onClick={() => void requestNotificationAccess().then(setAccess)}
          className="rounded-xl bg-ice/[0.14] px-3.5 py-2 text-sm text-ice transition-colors hover:bg-ice/25"
        >
          Activar
        </button>
      )}
      {access === 'granted' && (
        <button
          type="button"
          onClick={() => void test()}
          className="rounded-xl bg-ice/[0.14] px-3.5 py-2 text-sm text-ice transition-colors hover:bg-ice/25"
        >
          Enviar prueba
        </button>
      )}
    </li>
  );
}

export function SettingsScreen() {
  return (
    <div className="flex h-full flex-col gap-5 px-8 py-[26px]">
      <motion.h1
        variants={revealItem}
        className="font-display text-4xl font-semibold tracking-tight"
      >
        Ajustes
      </motion.h1>
      <motion.section variants={revealItem} aria-label="Sistema" className="glass p-5">
        <ul className="flex flex-col gap-3">
          <NotificationsRow />
          <AutostartRow />
        </ul>
        <p className="mt-4 text-xs text-muted">
          Al cerrar la ventana, SnowView sigue en la bandeja. Para salir del todo, usa «Salir» en el
          menú del icono de la bandeja.
        </p>
      </motion.section>
    </div>
  );
}
