import * as React from 'react';
import { cn } from './utils';

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-[8px] border border-border-card bg-surface shadow-card">
      <table className={cn('w-full text-sm text-left text-text-high', className)} {...props} />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'text-[11px] text-text-medium border-b border-border bg-canvas dark:bg-surface-low font-semibold uppercase tracking-[0.05em]',
        className
      )}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-border-table', className)} {...props} />;
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-border-table last:border-0 hover:bg-canvas dark:hover:bg-surface-high transition-colors',
        className
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-3 font-semibold text-[11px] text-text-medium uppercase tracking-[0.05em]',
        className
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  isNumeric = false,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { isNumeric?: boolean }) {
  return (
    <td
      className={cn(
        'px-4 py-3 text-sm text-text-high',
        isNumeric && 'tabular-nums text-right',
        className
      )}
      {...props}
    />
  );
}
