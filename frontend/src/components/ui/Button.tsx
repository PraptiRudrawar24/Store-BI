import * as React from 'react';
import { cn } from './utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', fullWidth = false, children, ...props }, ref) => {
    const variants = {
      primary:
        'bg-primary text-primary-foreground border-transparent hover:bg-primary-hover active:bg-primary-active shadow-none',
      secondary:
        'bg-surface dark:bg-transparent text-secondary dark:text-text-primary border-border-card dark:border-border-strong hover:bg-canvas dark:hover:bg-surface-high',
      destructive:
        'bg-destructive-solid text-white dark:text-[#00201d] border-transparent hover:opacity-90 active:opacity-80',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-[6px] h-12 min-h-[48px] min-w-[48px] px-4 font-semibold text-sm border transition-colors select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
          fullWidth && 'w-full',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
