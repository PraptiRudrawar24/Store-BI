'use client';
import React, { useEffect, useRef } from 'react';
import { useSpring, useMotionValueEvent, useReducedMotion, type SpringOptions } from 'motion/react';
import { cn } from '@/lib/utils';
import { formatINR } from '@/utils';

export type AnimatedNumberProps = {
  value: number;
  className?: string;
  springOptions?: SpringOptions;
  as?: React.ElementType;
  format?: (value: number) => string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  isCurrency?: boolean;
  initialValue?: number;
};

export function AnimatedNumber({
  value,
  className,
  springOptions,
  as: Component = 'span',
  format,
  prefix = '',
  suffix = '',
  decimals,
  isCurrency = false,
  initialValue = 0,
}: AnimatedNumberProps) {
  const prefersReducedMotion = useReducedMotion();
  const spanRef = useRef<HTMLElement>(null);
  const isFirstMount = useRef(true);

  // Normalize duration: motion expects duration in seconds (e.g. 2s).
  // If user passed milliseconds like 2000 (> 50), normalize to seconds (2000 / 1000 = 2).
  const normalizedSpringOptions: SpringOptions = React.useMemo(() => {
    const raw = springOptions || { bounce: 0, duration: 2 };
    const duration =
      raw.duration !== undefined
        ? raw.duration > 50
          ? raw.duration / 1000
          : raw.duration
        : 2;

    return {
      bounce: raw.bounce ?? 0,
      ...raw,
      duration: prefersReducedMotion ? 0 : duration,
    };
  }, [springOptions, prefersReducedMotion]);

  // Formatter logic supporting currency (INR), fixed decimals, custom formats, and prefix/suffix
  const formatNumber = React.useCallback(
    (val: number): string => {
      if (val === undefined || val === null || isNaN(val)) {
        return `${prefix}0${suffix}`;
      }

      let formatted: string;

      if (format) {
        formatted = format(val);
      } else if (isCurrency) {
        // Use Indian Rupee format
        const rounded = decimals !== undefined ? val : Math.round(val);
        formatted = formatINR(rounded, decimals !== undefined && decimals > 0);
      } else if (decimals !== undefined) {
        formatted = val.toLocaleString('en-IN', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
      } else {
        formatted = Math.round(val).toLocaleString('en-IN');
      }

      // Add prefix/suffix only if not already present in the formatted string
      let result = formatted;
      if (prefix && !result.startsWith(prefix)) {
        result = `${prefix}${result}`;
      }
      if (suffix && !result.endsWith(suffix)) {
        result = `${result}${suffix}`;
      }

      return result;
    },
    [format, isCurrency, decimals, prefix, suffix]
  );

  // Spring starts from initialValue (defaults to 0 on mount unless value is already 0)
  const spring = useSpring(
    prefersReducedMotion ? value : initialValue,
    normalizedSpringOptions
  );

  // Subscribe to spring value changes and update DOM text directly at 60/120fps
  useMotionValueEvent(spring, 'change', (latest) => {
    if (spanRef.current) {
      spanRef.current.textContent = formatNumber(latest);
    }
  });

  // Animate to target value on mount and when target value updates
  useEffect(() => {
    if (prefersReducedMotion) {
      spring.set(value);
      if (spanRef.current) {
        spanRef.current.textContent = formatNumber(value);
      }
      return;
    }

    if (isFirstMount.current) {
      isFirstMount.current = false;
      // Animate from initialValue to actual value
      spring.set(value);
    } else {
      // Animate smoothly to new value
      spring.set(value);
    }
  }, [value, spring, prefersReducedMotion, formatNumber]);

  return (
    <Component
      ref={spanRef as any}
      className={cn('tabular-nums inline-block', className)}
    >
      {formatNumber(prefersReducedMotion ? value : initialValue)}
    </Component>
  );
}
