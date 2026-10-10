import * as React from 'react';
import { cn } from './utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'destructive' | 'neutral';
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
    neutral: 'bg-canvas text-text-medium border-border',
  };

  const dotColors = {
    success: 'bg-success',
    warning: 'bg-warning',
    destructive: 'bg-destructive',
    neutral: 'bg-text-low',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-xs font-semibold h-6 min-h-[24px] border select-none tabular-nums',
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
