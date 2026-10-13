import * as React from 'react';
import { cn } from './utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'destructive' | 'neutral' | 'info';
  dot?: boolean;
}

export function Badge({
  className,
  variant = 'neutral',
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    success: 'bg-success-bg text-success border-success-border',
    warning: 'bg-warning-bg text-warning border-warning-border',
    destructive: 'bg-destructive-bg text-destructive border-destructive-border',
    info: 'bg-info-bg text-info border-info-border',
    neutral: 'bg-canvas dark:bg-surface-high text-text-medium border-border',
  };

  const dotColors = {
    success: 'bg-success-solid',
    warning: 'bg-warning-solid',
    destructive: 'bg-destructive-solid',
    info: 'bg-info-solid',
    neutral: 'bg-text-low',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-semibold h-6 min-h-[24px] border select-none tabular-nums tracking-tight',
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
}

export const StatusChip = Badge;
