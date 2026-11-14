import { Bell, Power, RefreshCw, Snowflake } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useId, useState } from 'react';
import { autostartAvailable, isAutostartEnabled, setAutostart } from '../../platform/autostart';
import { isAndroid, isDesktopApp, systemName } from '../../platform/device';
import {
  getNotificationAccess,
  requestNotificationAccess,
  showNotification,
  type NotificationAccess,
} from '../../platform/notifications';
import { revealItem } from '../motion/reveal';
import { REFRESH_OPTIONS, SNOW_LEVELS, useSettings } from '../state/settingsStore';

const ACCESS_TEXT: Record<NotificationAccess, string> = {
  granted: 'Activadas',
  denied: `Bloqueadas en ${systemName}`,
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
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-4 md:px-5">
      <Power className="size-5 shrink-0 text-ice" aria-hidden="true" strokeWidth={1.6} />
      <div className="min-w-0 flex-1 basis-40">
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
    setSent(
      await showNotification({ title: 'SnowView', body: 'Así se verán tus avisos de nieve.' }),
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-4 md:px-5">
      <Bell className="size-5 shrink-0 text-ice" aria-hidden="true" strokeWidth={1.6} />
      <div className="min-w-0 flex-1 basis-40">
        <p className="text-[15px] font-semibold">Notificaciones</p>
        <p className="text-xs text-muted" aria-live="polite">
          {access ? ACCESS_TEXT[access] : 'Comprobando…'}
          {sent === false && ' · no se pudo mostrar la prueba'}
        </p>
        {isAndroid && access === 'denied' && (
          <p className="text-xs text-muted">
            Si Android ya no pregunta, actívalas en Ajustes → Aplicaciones → SnowView →
            Notificaciones.
          </p>
        )}
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

interface ChoiceProps<T extends string | number> {
  icon: typeof Bell;
  title: string;
  hint: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** Fila con un grupo de opciones excluyentes (radiogroup). */
function ChoiceRow<T extends string | number>({
  icon: Icon,
  title,
  hint,
  value,
  options,
  onChange,
}: ChoiceProps<T>) {
  const labelId = useId();
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-4 md:px-5">
      <Icon className="size-5 shrink-0 text-ice" aria-hidden="true" strokeWidth={1.6} />
      <div className="min-w-0 flex-1 basis-40">
        <p id={labelId} className="text-[15px] font-semibold">
          {title}
        </p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex shrink-0 flex-wrap gap-1.5 max-md:basis-full"
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
            className={`rounded-xl px-3 py-1.5 text-xs transition-colors ${
              o.value === value
                ? 'bg-ice/[0.2] font-semibold text-ice'
                : 'text-muted hover:bg-white/[0.08] hover:text-text'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </li>
  );
}

function RefreshRow() {
  const minutes = useSettings((s) => s.refreshMinutes);
  const set = useSettings((s) => s.setRefreshMinutes);
  return (
    <ChoiceRow
      icon={RefreshCw}
      title="Consultar la previsión cada"
      hint="Con menos tiempo los avisos llegan antes, pero se hacen más peticiones a Open-Meteo."
      value={minutes}
      options={REFRESH_OPTIONS.map((o) => ({ value: o.minutes, label: o.label }))}
      onChange={set}
    />
  );
}

function SnowRow() {
  const level = useSettings((s) => s.snowLevel);
  const set = useSettings((s) => s.setSnowLevel);
  return (
    <ChoiceRow
      icon={Snowflake}
      title="Nevada de fondo"
      hint="Menos copos gastan menos GPU. Con movimiento reducido en el sistema la escena queda fija."
      value={level}
      options={SNOW_LEVELS.map((l) => ({ value: l.level, label: l.label }))}
      onChange={set}
    />
  );
}

export function SettingsScreen() {
  return (
    <div className="flex min-h-full flex-col gap-5 md:h-full px-4 py-5 md:px-8 md:py-[26px]">
      <motion.h1
        variants={revealItem}
        className="font-display text-3xl font-semibold md:text-4xl tracking-tight"
      >
        Ajustes
      </motion.h1>
      <motion.section variants={revealItem} aria-label="Sistema" className="glass p-3 md:p-5">
        <ul className="flex flex-col gap-3">
          <NotificationsRow />
          {!isAndroid && <AutostartRow />}
          <RefreshRow />
          <SnowRow />
        </ul>
        {isDesktopApp && (
          <p className="mt-4 text-xs text-muted">
            Al cerrar la ventana, SnowView sigue en la bandeja. Para salir del todo, usa «Salir» en
            el menú del icono de la bandeja.
          </p>
        )}
        {isAndroid && (
          <p className="mt-4 text-xs text-muted">
            En Android los avisos de los próximos 5 días quedan programados con la última previsión
            descargada y llegan aunque la app esté cerrada. Ábrela de vez en cuando para
            actualizarlos.
          </p>
        )}
      </motion.section>
    </div>
  );
}
