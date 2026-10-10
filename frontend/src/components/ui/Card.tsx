import * as React from 'react';
import { cn } from './utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-surface border border-border rounded-[8px]', className)}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  title,
  subtitle,
  action,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn('px-4 py-3.5 border-b border-border flex items-center justify-between', className)}
      {...props}
    >
      <div>
        {title && <h3 className="font-semibold text-text-high text-base">{title}</h3>}
        {subtitle && <p className="text-xs text-text-medium mt-0.5">{subtitle}</p>}
        {children}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-4 py-3 border-t border-border bg-canvas/40 flex items-center justify-between rounded-b-[8px]', className)}
      {...props}
    />
  );
}
