import React, { useEffect, useState } from 'react';
import { motion, type Transition } from 'motion/react';
import { cn } from '@/lib/utils';

export type BorderTrailProps = {
  className?: string;
  size?: number;
  radius?: number;
  transition?: Transition;
  onAnimationComplete?: () => void;
  style?: React.CSSProperties;
};

export function BorderTrail({
  className,
  size = 60,
  radius = 8,
  transition,
  onAnimationComplete,
  style,
}: BorderTrailProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mq.addEventListener?.('change', listener);
      return () => mq.removeEventListener?.('change', listener);
    }
  }, []);

  if (reducedMotion) {
    return null;
  }

  const defaultTransition: Transition = {
    repeat: Infinity,
    duration: 6,
    ease: 'linear',
  };

  const defaultStyle: React.CSSProperties = {
    boxShadow:
      '0 0 20px 4px rgba(99, 102, 241, 0.5), 0 0 40px 8px rgba(99, 102, 241, 0.25)',
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [-webkit-mask-composite:destination-out] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]"
      style={{
        WebkitMask:
          'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        mask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude',
      }}
    >
      <motion.div
        className={cn(
          'absolute aspect-square bg-gradient-to-r from-primary via-primary/80 to-primary/30 rounded-full',
          className
        )}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${radius}px)`,
          ...defaultStyle,
          ...style,
        }}
        animate={{
          offsetDistance: ['0%', '100%'],
        }}
        transition={transition || defaultTransition}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  );
}
