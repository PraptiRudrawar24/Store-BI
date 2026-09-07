import React from 'react';
import { 
  DollarSign, 
  Users, 
  ShoppingBag, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  RotateCw 
} from 'lucide-react';
import { KPIMetric } from '../../types/store';

const iconMap: Record<string, React.ElementType> = {
  DollarSign,
  Users,
  ShoppingBag,
  AlertTriangle,
  TrendingUp,
  RotateCw,
};

interface MetricCardProps {
  kpi: KPIMetric;
}

export const MetricCard: React.FC<MetricCardProps> = ({ kpi }) => {
  const IconComponent = iconMap[kpi.icon] || TrendingUp;

  // Mini sparkline SVG generator
  const min = Math.min(...kpi.sparkline);
  const max = Math.max(...kpi.sparkline);
  const range = max - min || 1;
  const width = 80;
  const height = 28;
  const points = kpi.sparkline
    .map((val, idx) => {
      const x = (idx / (kpi.sparkline.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl p-5 shadow-stitch-card transition-all duration-200 hover:border-primary/40 glass-panel">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          {kpi.label}
        </span>
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <IconComponent size={18} />
        </div>
      </div>

      <div className="flex items-baseline justify-between mt-1">
        <div className="text-2xl font-bold font-mono-nums text-text-primary tracking-tight">
          {kpi.value}
        </div>
        {/* Sparkline */}
        <div className="w-20 h-7 overflow-visible">
          <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`}>
            <polyline
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-3 text-xs">
        <div
          className={`flex items-center font-semibold px-1.5 py-0.5 rounded-full ${
            kpi.isPositive
              ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/60'
              : 'text-rose-700 bg-rose-100 dark:text-rose-400 dark:bg-rose-950/60'
          }`}
        >
          {kpi.isPositive ? <TrendingUp size={12} className="mr-0.5" /> : <TrendingDown size={12} className="mr-0.5" />}
          {Math.abs(kpi.changePercent)}%
        </div>
        <span className="text-text-muted">{kpi.periodText}</span>
      </div>
    </div>
  );
};
