import * as React from 'react';
import { cn } from './utils';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[8px] bg-[#E5E7EB]/60 border border-border/40',
        className
      )}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-[8px] p-4 flex flex-col gap-3">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}
