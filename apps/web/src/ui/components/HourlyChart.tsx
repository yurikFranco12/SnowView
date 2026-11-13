import {
  HOUR_MS,
  describeWeatherCode,
  localDateKey,
  localHour,
  windChillC,
  type HourlyPoint,
} from '@snowview/core';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { formatCm } from '../data/forecast';
import { WeatherIcon } from './WeatherIcon';

const HEIGHT = 272;
const M = { left: 38, right: 40, top: 22, bottom: 20 };
const MAIN_H = 150;
const GAP = 32;
const WIND_H = HEIGHT - M.top - M.bottom - MAIN_H - GAP;

const finite = (v: number | null | undefined): v is number =>
  v !== null && v !== undefined && Number.isFinite(v);

/** Tope «redondo» de un eje: 1, 2, 5, 10, 20… por encima del valor. */
export function niceMax(value: number, minimum: number): number {
  const v = Math.max(value, minimum);
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  for (const step of [1, 2, 5, 10]) if (v <= step * pow) return step * pow;
  return 10 * pow;
}

/** Trazo SVG de una serie con huecos: cada tramo sin datos corta la línea. */
export function linePath(
  values: readonly (number | null)[],
  x: (i: number) => number,
  y: (v: number) => number,
): string {
  let d = '';
  let pen = false;
  values.forEach((v, i) => {
    if (!finite(v)) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

const dayFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric' });

/**
 * Gráfica hora a hora (hecha a mano, ver ADR 0004): barras de nieve y línea de temperatura arriba,
 * viento y rachas abajo. Al pasar el puntero, o con las flechas, se lee el detalle de cada hora.
 */
export function HourlyChart({
  hours,
  timeZone,
  now,
  spanHours = 72,
  label,
}: {
  hours: readonly HourlyPoint[];
  timeZone: string;
  now: number;
  spanHours?: number;
  label: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [active, setActive] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => {
    const from = Math.floor(now / HOUR_MS) * HOUR_MS;
    return hours.filter((h) => h.time >= from && h.time < from + spanHours * HOUR_MS);
  }, [hours, now, spanHours]);

  const hourFmt = useMemo(
    () =>
      new Intl.DateTimeFormat('es-ES', {
        timeZone,
        weekday: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [timeZone],
  );

  if (data.length < 2) {
    return (
      <p role="status" className="grid h-40 place-items-center text-sm text-muted">
        No hay previsión hora a hora para este tramo.
      </p>
    );
  }

  const n = data.length;
  const innerW = Math.max(100, width - M.left - M.right);
  const band = innerW / n;
  const xMid = (i: number) => M.left + (i + 0.5) * band;

  const snow = data.map((h) => h.snowfallCm);
  const temps = data.map((h) => h.temperatureC);
  const winds = data.map((h) => h.windKmh);
  const gusts = data.map((h) => h.gustKmh);
  const snowMax = niceMax(Math.max(0, ...snow.filter(finite)), 1);
  const tVals = temps.filter(finite);
  const tMin = Math.floor(Math.min(...(tVals.length ? tVals : [0])) - 1);
  const tMax = Math.ceil(Math.max(...(tVals.length ? tVals : [0])) + 1);
  const windMax = niceMax(Math.max(0, ...gusts.filter(finite), ...winds.filter(finite)), 40);

  const mainTop = M.top;
  const mainBottom = M.top + MAIN_H;
  const windTop = mainBottom + GAP;
  const windBottom = windTop + WIND_H;
  const ySnow = (v: number) => mainBottom - (v / snowMax) * MAIN_H;
  const yTemp = (v: number) => mainBottom - ((v - tMin) / Math.max(1, tMax - tMin)) * MAIN_H;
  const yWind = (v: number) => windBottom - (v / windMax) * WIND_H;

  // Separadores de día: la primera hora de cada día local.
  const dayStarts: { i: number; text: string }[] = [];
  data.forEach((h, i) => {
    if (
      i > 0 &&
      localDateKey(h.time, timeZone) !== localDateKey(data[i - 1]?.time ?? 0, timeZone)
    ) {
      const [y, m, d] = localDateKey(h.time, timeZone).split('-').map(Number);
      dayStarts.push({ i, text: dayFmt.format(new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1)) });
    }
  });
  const hourTicks = data
    .map((h, i) => ({ i, hour: localHour(h.time, timeZone) }))
    .filter((t) => t.hour % 6 === 0 && t.hour !== 0);

  const windArea =
    linePath(winds, xMid, yWind) &&
    `${linePath(winds, xMid, yWind)}L${xMid(n - 1).toFixed(1)} ${windBottom}L${xMid(0).toFixed(1)} ${windBottom}Z`;

  const totalSnow = snow.filter(finite).reduce((a, b) => a + b, 0);
  const summary = `${label}. ${formatCm(totalSnow)} cm de nieve en ${n} horas; temperatura de ${Math.round(
    Math.min(...(tVals.length ? tVals : [0])),
  )} a ${Math.round(Math.max(...(tVals.length ? tVals : [0])))} grados; rachas de hasta ${Math.round(
    Math.max(0, ...gusts.filter(finite)),
  )} kilómetros por hora. Usa las flechas para leer cada hora.`;

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - r.left - M.left) / band);
    setActive(i >= 0 && i < n ? i : undefined);
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowRight') setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? n) - 1));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(n - 1);
    else return;
    e.preventDefault();
  };

  const point = active !== undefined ? data[active] : undefined;
  // La ficha de la hora va al lado contrario del puntero, para no tapar lo que se mira.
  const tipLeft =
    active === undefined ? 0 : active < n / 2 ? xMid(active) + 14 : xMid(active) - 14 - 210;

  return (
    <div ref={boxRef} className="relative">
      <svg
        role="img"
        tabIndex={0}
        aria-label={summary}
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className="block touch-none select-none"
        onPointerMove={onMove}
        onPointerLeave={() => setActive(undefined)}
        onKeyDown={onKey}
        onBlur={() => setActive(undefined)}
      >
        <defs>
          <linearGradient id="hc-snow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7de3ff" />
            <stop offset="1" stopColor="#4c5bd4" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id="hc-wind" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a5b4ff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#a5b4ff" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Rejilla y ejes */}
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={M.left}
            x2={width - M.right}
            y1={mainBottom - f * MAIN_H}
            y2={mainBottom - f * MAIN_H}
            stroke="rgba(255,255,255,0.07)"
          />
        ))}
        <line
          x1={M.left}
          x2={width - M.right}
          y1={windBottom}
          y2={windBottom}
          stroke="rgba(255,255,255,0.07)"
        />
        {tMin < 0 && tMax > 0 && (
          <g>
            <line
              x1={M.left}
              x2={width - M.right}
              y1={yTemp(0)}
              y2={yTemp(0)}
              stroke="rgba(255,214,150,0.45)"
              strokeDasharray="4 4"
            />
            <text
              x={width - M.right + 5}
              y={yTemp(0) + 3.5}
              fontSize="10"
              fill="rgba(255,224,170,0.9)"
            >
              0°
            </text>
          </g>
        )}
        <g fontSize="10" fill="#9fb3d9">
          <text x={M.left - 6} y={mainTop + 4} textAnchor="end">
            {snowMax}
          </text>
          <text x={M.left - 6} y={mainBottom + 3} textAnchor="end">
            0
          </text>
          <text x={M.left - 6} y={mainTop - 10} textAnchor="end" fill="#7de3ff">
            cm/h
          </text>
          <text x={width - M.right + 5} y={mainTop + 4}>
            {tMax}°
          </text>
          <text x={width - M.right + 5} y={mainBottom + 3}>
            {tMin}°
          </text>
          <text x={M.left - 6} y={windTop + 4} textAnchor="end">
            {windMax}
          </text>
          <text x={M.left - 6} y={windTop - 8} textAnchor="end" fill="#a5b4ff">
            km/h
          </text>
        </g>

        {/* Días y horas */}
        {dayStarts.map((d) => (
          <g key={d.i}>
            <line
              x1={M.left + d.i * band}
              x2={M.left + d.i * band}
              y1={mainTop - 6}
              y2={windBottom}
              stroke="rgba(255,255,255,0.16)"
            />
            <text
              x={M.left + d.i * band + 5}
              y={mainTop - 9}
              fontSize="10.5"
              fontWeight="600"
              fill="#eaf2ff"
            >
              {d.text}
            </text>
          </g>
        ))}
        <g fontSize="9.5" fill="#9fb3d9" textAnchor="middle">
          {hourTicks.map((t) => (
            <text key={t.i} x={M.left + t.i * band} y={HEIGHT - 6}>
              {String(t.hour).padStart(2, '0')}h
            </text>
          ))}
        </g>

        {/* Nieve */}
        {snow.map((v, i) =>
          finite(v) && v > 0 ? (
            <rect
              key={i}
              x={M.left + i * band + band * 0.14}
              width={Math.max(1, band * 0.72)}
              y={ySnow(Math.min(v, snowMax))}
              height={mainBottom - ySnow(Math.min(v, snowMax))}
              rx={Math.min(3, band * 0.3)}
              fill="url(#hc-snow)"
            />
          ) : null,
        )}

        {/* Temperatura */}
        <path
          d={linePath(temps, xMid, yTemp)}
          fill="none"
          stroke="#ffd9a0"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Viento y rachas */}
        {windArea && <path d={windArea} fill="url(#hc-wind)" />}
        <path d={linePath(winds, xMid, yWind)} fill="none" stroke="#a5b4ff" strokeWidth={1.6} />
        <path
          d={linePath(gusts, xMid, yWind)}
          fill="none"
          stroke="#a5b4ff"
          strokeOpacity={0.6}
          strokeWidth={1.2}
          strokeDasharray="3 3"
        />

        {active !== undefined && (
          <g pointerEvents="none">
            <rect
              x={M.left + active * band}
              width={band}
              y={mainTop - 6}
              height={windBottom - mainTop + 6}
              fill="rgba(125,227,255,0.1)"
            />
            <line
              x1={xMid(active)}
              x2={xMid(active)}
              y1={mainTop - 6}
              y2={windBottom}
              stroke="rgba(125,227,255,0.7)"
            />
            {finite(point?.temperatureC) && (
              <circle cx={xMid(active)} cy={yTemp(point.temperatureC)} r={3.5} fill="#ffd9a0" />
            )}
          </g>
        )}
      </svg>

      <ul
        className="mt-1 flex flex-wrap gap-x-4 gap-y-1 pl-[38px] text-[11px] text-muted"
        aria-hidden="true"
      >
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2 rounded-sm bg-ice" /> Nieve (cm/h)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-[#ffd9a0]" /> Temperatura
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-indigo" /> Viento
        </li>
        <li className="flex items-center gap-1.5">
          <span className="w-4 border-t border-dashed border-indigo" /> Rachas
        </li>
      </ul>

      {point && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute top-3 z-10 w-[210px] rounded-xl border border-white/15 bg-[#0d1340]/95 px-3 py-2 text-xs shadow-xl"
          style={{ left: tipLeft }}
        >
          <p className="flex items-center gap-1.5 font-semibold capitalize">
            <WeatherIcon code={point.weatherCode} className="size-4" />
            {hourFmt.format(point.time)}
          </p>
          <p className="mt-0.5 text-muted">{describeWeatherCode(point.weatherCode)}</p>
          <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <dt className="text-muted">Nieve</dt>
            <dd className="text-right tabular-nums">
              {finite(point.snowfallCm) ? `${formatCm(point.snowfallCm)} cm` : '—'}
            </dd>
            <dt className="text-muted">Temperatura</dt>
            <dd className="text-right tabular-nums">
              {finite(point.temperatureC) ? `${Math.round(point.temperatureC)} °C` : '—'}
              {finite(point.temperatureC) && finite(point.windKmh) && (
                <span className="text-muted">
                  {' '}
                  (sens. {Math.round(windChillC(point.temperatureC, point.windKmh))} °C)
                </span>
              )}
            </dd>
            <dt className="text-muted">Viento</dt>
            <dd className="text-right tabular-nums">
              {finite(point.windKmh) ? `${Math.round(point.windKmh)} km/h` : '—'}
              {finite(point.gustKmh) && (
                <span className="text-muted"> (rachas {Math.round(point.gustKmh)})</span>
              )}
            </dd>
            {finite(point.freezingLevelM) && (
              <>
                <dt className="text-muted">Isoterma 0 °C</dt>
                <dd className="text-right tabular-nums">
                  {Math.round(point.freezingLevelM / 10) * 10} m
                </dd>
              </>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
