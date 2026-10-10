import * as React from 'react';
import { cn } from './utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixLabel?: string;
  isCurrency?: boolean;
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      prefixLabel,
      isCurrency = false,
      label,
      error,
      helperText,
      id,
      inputMode,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const effectivePrefix = isCurrency ? '₹' : prefixLabel;
    const effectiveInputMode = isCurrency ? (inputMode || 'decimal') : inputMode;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-high">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {effectivePrefix && (
            <span className="absolute left-3.5 text-text-medium font-medium select-none pointer-events-none tabular-nums text-sm">
              {effectivePrefix}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            inputMode={effectiveInputMode}
            className={cn(
              'flex h-12 min-h-[48px] w-full rounded-[8px] border border-border bg-surface px-3.5 py-2 text-sm text-text-high placeholder:text-text-low transition-colors',
              'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-canvas',
              effectivePrefix && 'pl-8',
              error && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive',
              isCurrency && 'tabular-nums',
              className
            )}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-destructive">{error}</span>}
        {!error && helperText && <span className="text-xs text-text-medium">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
