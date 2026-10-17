import * as React from 'react';
import { Card, CardContent, type CardTrailColor } from './Card';
import { cn } from './utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  currentValue?: number;
  previousValue?: number;
  trendText?: string;
  subtext?: string;
  icon?: React.ReactNode;
  className?: string;
  showTrail?: boolean;
  trailColor?: CardTrailColor;
  trailSize?: number;
}

export function StatCard({
  label,
  value,
  currentValue,
  previousValue,
  trendText,
  subtext,
  icon,
  className,
  showTrail = true,
  trailColor,
  trailSize = 75,
}: StatCardProps) {
  // Determine trend badge adhering to ZERO-START RULE:
  // "Percent-change values show '–' when the previous period is 0 (no divide-by-zero)."
  let changeDisplay = '–';
  let trendType: 'positive' | 'negative' | 'neutral' = 'neutral';

  if (trendText !== undefined) {
    changeDisplay = trendText;
    if (trendText.startsWith('+')) trendType = 'positive';
    else if (trendText.startsWith('-')) trendType = 'negative';
  } else if (currentValue !== undefined && previousValue !== undefined) {
    if (previousValue === 0) {
      changeDisplay = '–';
      trendType = 'neutral';
    } else {
      const pct = ((currentValue - previousValue) / previousValue) * 100;
      changeDisplay = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
      trendType = pct > 0 ? 'positive' : pct < 0 ? 'negative' : 'neutral';
    }
  }

  const determinedColor: CardTrailColor =
    trailColor ||
    (label.toLowerCase().includes('profit') || label.toLowerCase().includes('margin')
      ? 'emerald'
      : label.toLowerCase().includes('transaction') || label.toLowerCase().includes('bill')
      ? 'violet'
      : label.toLowerCase().includes('stock') || label.toLowerCase().includes('alert')
      ? 'amber'
      : 'indigo');

  return (
    <Card
      showTrail={showTrail}
      trailColor={determinedColor}
      trailSize={trailSize}
      className={cn(
        'flex flex-col justify-between hover:border-border-hover dark:hover:border-border-strong hover:shadow-raised transition-all shadow-sm',
        className
      )}
    >
      <CardContent className="p-4 flex flex-col justify-between h-full gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-medium">{label}</span>
          {icon && (
            <div className="w-8 h-8 rounded-[6px] bg-canvas dark:bg-surface-low border border-border flex items-center justify-center text-text-medium shrink-0">
              {icon}
            </div>
          )}
        </div>

        <div>
          <div className="text-[32px] font-bold text-text-high tracking-tight tabular-nums mb-1 leading-tight">
            {value}
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] font-semibold text-[11px] border tabular-nums',
                trendType === 'positive' && 'bg-success-bg text-success border-success-border',
                trendType === 'negative' && 'bg-destructive-bg text-destructive border-destructive-border',
                trendType === 'neutral' && 'bg-canvas dark:bg-surface-low text-text-medium border-border'
              )}
            >
              {trendType === 'positive' && <TrendingUp className="w-3 h-3" strokeWidth={2} />}
              {trendType === 'negative' && <TrendingDown className="w-3 h-3" strokeWidth={2} />}
              {trendType === 'neutral' && <Minus className="w-3 h-3" strokeWidth={2} />}
              {changeDisplay}
            </span>
            {subtext && <span className="text-text-medium">{subtext}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
