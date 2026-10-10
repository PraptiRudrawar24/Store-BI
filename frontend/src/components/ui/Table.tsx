import * as React from 'react';
import { cn } from './utils';

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-[8px] border border-border bg-surface">
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
        'text-xs text-text-medium border-b border-border bg-canvas/60 font-semibold normal-case tracking-normal',
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
  return <tbody className={cn('divide-y divide-border', className)} {...props} />;
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-border last:border-0 hover:bg-canvas/40 transition-colors',
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
        'px-4 py-3.5 font-semibold text-xs text-text-medium normal-case tracking-normal',
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
