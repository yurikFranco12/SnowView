import { skyKind, type SkyKind } from '@snowview/core';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  HelpCircle,
  Sun,
  type LucideIcon,
} from 'lucide-react';

const ICON: Record<SkyKind, LucideIcon> = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
  unknown: HelpCircle,
};

const TINT: Record<SkyKind, string> = {
  clear: 'text-amber-200',
  partly: 'text-amber-100',
  cloudy: 'text-muted',
  fog: 'text-muted',
  drizzle: 'text-sky-200',
  rain: 'text-sky-300',
  snow: 'text-ice',
  storm: 'text-violet-200',
  unknown: 'text-muted',
};

/** Icono del cielo a partir del código WMO. Decorativo: la descripción va siempre en texto. */
export function WeatherIcon({
  code,
  className = 'size-5',
}: {
  code: number | null;
  className?: string;
}) {
  const kind = skyKind(code);
  const Icon = ICON[kind];
  return <Icon className={`${className} ${TINT[kind]}`} aria-hidden="true" strokeWidth={1.6} />;
}
