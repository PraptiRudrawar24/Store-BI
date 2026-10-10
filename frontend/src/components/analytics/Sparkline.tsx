interface SparklineProps {
  data: { date: string; units: number }[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = '#2563EB',
}: SparklineProps) {
  if (!data || data.length === 0) {
    return <div className="w-[80px] h-[24px] bg-canvas rounded-[4px] border border-border/50" />;
  }

  const values = data.map((d) => d.units);
  const maxVal = Math.max(...values, 1);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const padding = 2;
  const plotW = width - padding * 2;
  const plotH = height - padding * 2;
  const stepX = values.length > 1 ? plotW / (values.length - 1) : plotW;

  const points = values.map((val, idx) => {
    const x = padding + idx * stepX;
    const y = height - padding - (val / range) * plotH;
    return { x, y };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible select-none shrink-0"
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Flat baseline */}
      <line
        x1={padding}
        x2={width - padding}
        y1={height - padding}
        y2={height - padding}
        stroke="#E5E7EB"
        strokeWidth={1}
      />
      {/* Line trajectory */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={2.5}
          fill={color}
        />
      )}
    </svg>
  );
}
