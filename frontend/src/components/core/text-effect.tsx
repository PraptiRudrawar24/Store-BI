'use client';
import React, { useMemo } from 'react';
import {
  motion,
  type Transition,
  type Variants,
  useReducedMotion,
} from 'motion/react';
import { cn } from '@/lib/utils';

export type TextEffectPer = 'char' | 'word' | 'line';
export type TextEffectPreset = 'fade' | 'slide' | 'scale' | 'blur' | 'fade-in-blur';

export interface TextEffectProps {
  children: string;
  per?: TextEffectPer;
  as?: keyof React.JSX.IntrinsicElements;
  preset?: TextEffectPreset;
  delay?: number;
  speedReveal?: number;
  speedSegment?: number;
  trigger?: boolean;
  onAnimationComplete?: () => void;
  className?: string;
  segmentWrapperClassName?: string;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
  transition?: Transition;
}

const defaultItemVariants: Record<TextEffectPreset, Variants> = {
  fade: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.2,
        ease: 'easeIn',
      },
    },
  },
  slide: {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      y: -15,
      transition: {
        duration: 0.2,
      },
    },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: {
        duration: 0.2,
      },
    },
  },
  blur: {
    hidden: { opacity: 0, filter: 'blur(8px)' },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      filter: 'blur(8px)',
      transition: {
        duration: 0.2,
      },
    },
  },
  'fade-in-blur': {
    hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      filter: 'blur(4px)',
      transition: {
        duration: 0.2,
      },
    },
  },
};

export function TextEffect({
  children,
  per = 'char',
  as = 'h1',
  preset = 'fade',
  delay = 0,
  speedReveal = 1,
  speedSegment = 1,
  trigger = true,
  onAnimationComplete,
  className,
  segmentWrapperClassName,
  variants,
  transition,
}: TextEffectProps) {
  const shouldReduceMotion = useReducedMotion();

  // Create or resolve motion component for the given tag
  const MotionComponent = useMemo(() => {
    return motion.create(as as any);
  }, [as]);

  const containerVariants: Variants = useMemo(() => {
    if (variants?.container) return variants.container;
    const baseStagger = per === 'char' ? 0.04 : 0.1;
    return {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: baseStagger / speedReveal,
          delayChildren: delay,
          ...transition,
        },
      },
      exit: {
        opacity: 0,
        transition: {
          staggerChildren: (baseStagger * 0.7) / speedReveal,
          staggerDirection: -1,
        },
      },
    };
  }, [variants?.container, per, speedReveal, delay, transition]);

  const itemVariants: Variants = useMemo(() => {
    if (variants?.item) return variants.item;
    const baseVariant = defaultItemVariants[preset] || defaultItemVariants.fade;
    if (speedSegment === 1) return baseVariant;
    return {
      ...baseVariant,
      visible: {
        ...baseVariant.visible,
        transition: {
          ...((baseVariant.visible as any)?.transition || {}),
          duration:
            (((baseVariant.visible as any)?.transition?.duration ?? 0.3) / speedSegment),
        },
      },
    };
  }, [variants?.item, preset, speedSegment]);

  // If user requests reduced motion, render immediately without animations
  if (shouldReduceMotion) {
    const Component = as as any;
    return (
      <Component className={cn(className)} aria-label={children}>
        {children}
      </Component>
    );
  }

  // Parse segments based on 'per' granularity
  const segments = useMemo(() => {
    if (typeof children !== 'string') return [];

    if (per === 'line') {
      return children.split('\n');
    }

    // Split words while preserving spaces (e.g. "Store BI" -> ["Store", " ", "BI"])
    return children.split(/(\s+)/);
  }, [children, per]);

  return (
    <MotionComponent
      initial="hidden"
      animate={trigger ? 'visible' : 'hidden'}
      variants={containerVariants}
      onAnimationComplete={onAnimationComplete}
      className={cn(className)}
      aria-label={children}
    >
      <span aria-hidden="true" className="inline-block">
        {segments.map((segment, segIdx) => {
          // If segment is whitespace, preserve it exactly
          if (/^\s+$/.test(segment)) {
            return (
              <span key={`space-${segIdx}`} className="inline-block whitespace-pre">
                {segment}
              </span>
            );
          }

          // If per is line
          if (per === 'line') {
            return (
              <motion.span
                key={`line-${segIdx}`}
                variants={itemVariants}
                className={cn('block', segmentWrapperClassName)}
              >
                {segment}
              </motion.span>
            );
          }

          // If per is word
          if (per === 'word') {
            return (
              <motion.span
                key={`word-${segIdx}`}
                variants={itemVariants}
                className={cn('inline-block whitespace-nowrap', segmentWrapperClassName)}
              >
                {segment}
              </motion.span>
            );
          }

          // If per is char
          return (
            <span
              key={`word-chars-${segIdx}`}
              className="inline-block whitespace-nowrap"
            >
              {segment.split('').map((char, charIdx) => (
                <motion.span
                  key={`char-${charIdx}`}
                  variants={itemVariants}
                  className={cn('inline-block', segmentWrapperClassName)}
                >
                  {char}
                </motion.span>
              ))}
            </span>
          );
        })}
      </span>
    </MotionComponent>
  );
}

export default TextEffect;
