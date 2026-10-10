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
        'bg-primary text-primary-foreground border-transparent hover:bg-[#1d4ed8] active:bg-[#1e40af]',
      secondary:
        'bg-surface text-text-high border-border hover:bg-canvas active:bg-[#f3f4f6]',
      destructive:
        'bg-destructive text-primary-foreground border-transparent hover:bg-[#b91c1c] active:bg-[#991b1b]',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-[8px] h-12 min-h-[48px] min-w-[48px] px-4 font-semibold text-sm border transition-colors select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
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
