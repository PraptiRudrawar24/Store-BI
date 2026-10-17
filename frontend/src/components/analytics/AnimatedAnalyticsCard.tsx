import React from 'react';
import { BorderTrail } from '@/components/core/border-trail';
import { cn } from '@/lib/utils';

export type TrailColor =
  | 'indigo'
  | 'emerald'
  | 'violet'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'blue'
  | 'neutral';

export interface AnimatedAnalyticsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  trailColor?: TrailColor;
  trailSize?: number;
  trailDuration?: number;
  trailStyle?: React.CSSProperties;
  trailClassName?: string;
  radius?: number;
  disableTrail?: boolean;
}

const TRAIL_PALETTES: Record<
  TrailColor,
  { className: string; style: React.CSSProperties }
> = {
  indigo: {
    className: 'bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-600',
    style: {
      boxShadow:
        '0 0 20px 4px rgba(99, 102, 241, 0.65), 0 0 40px 10px rgba(99, 102, 241, 0.35)',
    },
  },
  emerald: {
    className: 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600',
    style: {
      boxShadow:
        '0 0 20px 4px rgba(16, 185, 129, 0.65), 0 0 40px 10px rgba(16, 185, 129, 0.35)',
    },
  },
  violet: {
    className: 'bg-gradient-to-r from-violet-500 via-purple-400 to-violet-600',
    style: {
      boxShadow:
        '0 0 20px 4px rgba(139, 92, 246, 0.65), 0 0 40px 10px rgba(139, 92, 246, 0.35)',
    },
  },
  amber: {
    className: 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600',
    style: {
      boxShadow:
        '0 0 20px 4px rgba(245, 158, 11, 0.65), 0 0 40px 10px rgba(245, 158, 11, 0.35)',
    },
  },
  rose: {
    className: 'bg-gradient-to-r from-rose-500 via-rose-400 to-rose-600',
    style: {
      boxShadow:
        '0 0 20px 4px rgba(244, 63, 94, 0.65), 0 0 40px 10px rgba(244, 63, 94, 0.35)',
    },
  },
  cyan: {
    className: 'bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-600',
    style: {
      boxShadow:
        '0 0 20px 4px rgba(6, 182, 212, 0.65), 0 0 40px 10px rgba(6, 182, 212, 0.35)',
    },
  },
  blue: {
    className: 'bg-gradient-to-r from-blue-500 via-sky-400 to-blue-600',
    style: {
      boxShadow:
        '0 0 20px 4px rgba(59, 130, 246, 0.65), 0 0 40px 10px rgba(59, 130, 246, 0.35)',
    },
  },
  neutral: {
    className: 'bg-gradient-to-r from-indigo-500/70 via-sky-400/80 to-indigo-600/70',
    style: {
      boxShadow:
        '0 0 16px 3px rgba(99, 102, 241, 0.45), 0 0 32px 6px rgba(56, 189, 248, 0.25)',
    },
  },
};

export function AnimatedAnalyticsCard({
  children,
  className,
  trailColor = 'indigo',
  trailSize = 75,
  trailDuration = 7,
  trailStyle,
  trailClassName,
  radius = 8,
  disableTrail = false,
  ...props
}: AnimatedAnalyticsCardProps) {
  const palette = TRAIL_PALETTES[trailColor] || TRAIL_PALETTES.indigo;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[8px] bg-surface border border-border-card shadow-card transition-all',
        className
      )}
      {...props}
    >
      {!disableTrail && (
        <BorderTrail
          size={trailSize}
          radius={radius}
          className={cn(palette.className, trailClassName)}
          style={{ ...palette.style, ...trailStyle }}
          transition={{
            repeat: Infinity,
            duration: trailDuration,
            ease: 'linear',
          }}
        />
      )}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}
