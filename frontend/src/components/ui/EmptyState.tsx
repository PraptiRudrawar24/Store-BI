import * as React from 'react';
import { Button } from './Button';
import { cn } from './utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-surface border border-border rounded-[8px]',
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-[8px] bg-canvas border border-border flex items-center justify-center text-text-medium mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-text-high mb-1">{title}</h3>
      <p className="text-sm text-text-medium max-w-md mb-6">{description}</p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {actionLabel && onAction && (
          <Button onClick={onAction} variant="primary">
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button onClick={onSecondaryAction} variant="secondary">
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
