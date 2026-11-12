interface SparklineProps {
  values: readonly number[];
  color: string;
}

/** Mini gráfica de línea (decorativa: el dato ya está en el texto de la tarjeta). */
export function Sparkline({ values, color }: SparklineProps) {
  const width = 200;
  const height = 44;
  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => [i * stepX, height - 6 - (v / max) * (height - 12)] as const);
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  const path = line.join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="mt-auto h-11 w-full"
    >
      <path d={`${path} L${width} ${height} L0 ${height} Z`} fill={color} fillOpacity={0.12} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
