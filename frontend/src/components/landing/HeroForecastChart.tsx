import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { heroForecastData } from '../../content/landingMockData';
import { useTheme } from '../../context/ThemeContext';
import { formatINR } from '../../utils';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      fullName: string;
      sales: number;
      footfall: number;
      isPeak?: boolean;
    };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-surface border border-border p-2.5 rounded-[6px] shadow-raised text-xs tabular-nums">
        <p className="font-bold text-text-high mb-1">{data.fullName}</p>
        <p className="text-primary font-semibold">Sales: {formatINR(data.sales)}</p>
        <p className="text-text-medium">Footfall: {data.footfall} visitors</p>
        {data.isPeak && (
          <span className="inline-block mt-1 px-1.5 py-0.5 rounded-[4px] bg-primary-container/20 text-primary text-[10px] font-bold">
            Weekend Peak (+38%)
          </span>
        )}
      </div>
    );
  }
  return null;
}

export function HeroForecastChart() {
  const { isDark } = useTheme();

  const weekdayColor = isDark ? '#1c2b42' : '#cbd5e1';
  const weekendColor = isDark ? '#80d5cb' : '#005c55';
  const runRateColor = isDark ? '#334155' : '#94a3b8';

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="h-36 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={heroForecastData}
            margin={{ top: 12, right: 6, left: 6, bottom: 0 }}
          >
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: isDark ? '#9aa8bd' : '#64748b',
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            <YAxis hide domain={[0, 95000]} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <ReferenceLine
              y={42000}
              stroke={runRateColor}
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <Bar dataKey="sales" radius={[4, 4, 0, 0]} maxBarSize={38}>
              {heroForecastData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isPeak ? weekendColor : weekdayColor}
                  className="transition-colors duration-150 cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Indicator Legend */}
      <div className="flex items-center justify-between text-[11px] text-text-medium pt-1 border-t border-border/60">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600 inline-block" />
          <span>Weekday Run-Rate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary inline-block" />
          <span className="text-primary font-semibold">Weekend Rush Surge (+38%)</span>
        </div>
      </div>
    </div>
  );
}

export default HeroForecastChart;
