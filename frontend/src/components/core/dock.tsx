'use client';

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useMemo,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { NavLink } from 'react-router-dom';
import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence,
  useReducedMotion,
} from 'motion/react';
import { cn } from '@/lib/utils';

// ============================================================================
// DOCK CONTEXT
// ============================================================================

interface DockContextType {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  orientation: 'horizontal' | 'vertical';
  distance: number;
  magnification: number;
  baseItemSize: number;
  spring: SpringOptions;
}

const DockContext = createContext<DockContextType | null>(null);

function useDock() {
  const context = useContext(DockContext);
  if (!context) {
    throw new Error('Dock sub-components must be rendered within a <Dock /> provider');
  }
  return context;
}

// ============================================================================
// DOCK ITEM CONTEXT
// ============================================================================

interface DockItemContextType {
  isHovered: boolean;
  isActive: boolean;
  orientation: 'horizontal' | 'vertical';
  scale: MotionValue<number>;
}

const DockItemContext = createContext<DockItemContextType | null>(null);

function useDockItem() {
  return useContext(DockItemContext);
}

// ============================================================================
// DOCK ROOT COMPONENT
// ============================================================================

export interface DockProps {
  children: ReactNode;
  className?: string;
  distance?: number;
  magnification?: number;
  baseItemSize?: number;
  orientation?: 'horizontal' | 'vertical';
  spring?: SpringOptions;
  as?: React.ElementType;
  id?: string;
  role?: string;
  'aria-label'?: string;
}

export function Dock({
  children,
  className,
  distance = 120,
  magnification = 54,
  baseItemSize = 44,
  orientation = 'horizontal',
  spring = { mass: 0.1, stiffness: 160, damping: 14 },
  as: Component = 'div',
  ...props
}: DockProps) {
  const mouseX = useMotionValue(Infinity);
  const mouseY = useMotionValue(Infinity);

  const handlePointerMove = (e: React.PointerEvent) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  };

  const handlePointerLeave = () => {
    mouseX.set(Infinity);
    mouseY.set(Infinity);
  };

  const contextValue = useMemo(
    () => ({
      mouseX,
      mouseY,
      orientation,
      distance,
      magnification,
      baseItemSize,
      spring,
    }),
    [orientation, distance, magnification, baseItemSize, spring]
  );

  return (
    <DockContext.Provider value={contextValue}>
      <Component
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={cn(
          'flex select-none',
          orientation === 'vertical'
            ? 'flex-col w-full gap-1'
            : 'flex-row items-end gap-3',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    </DockContext.Provider>
  );
}

// ============================================================================
// DOCK ITEM COMPONENT
// ============================================================================

export interface DockItemProps {
  children: ReactNode;
  className?: string;
  onClick?: (e: ReactMouseEvent) => void;
  isActive?: boolean;
  tabIndex?: number;
  role?: string;
  'aria-label'?: string;
  as?: React.ElementType;
  to?: string;
  id?: string;
  style?: React.CSSProperties;
}

export function DockItem({
  children,
  className,
  onClick,
  isActive,
  to,
  tabIndex,
  role,
  'aria-label': ariaLabel,
  id,
  style,
}: DockItemProps) {
  const { mouseX, mouseY, orientation, distance, magnification, baseItemSize, spring } = useDock();
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Static fallback values when reduced motion is requested
  const staticScale = useMotionValue(1);
  const staticX = useMotionValue(0);
  const staticSize = useMotionValue(baseItemSize);

  // Calculate distance from cursor to item center along primary axis
  const mouseDistance = useTransform(
    orientation === 'vertical' ? mouseY : mouseX,
    (val) => {
      const bounds = ref.current?.getBoundingClientRect();
      if (!bounds) return Infinity;
      if (orientation === 'vertical') {
        return val - (bounds.top + bounds.height / 2);
      }
      return val - (bounds.left + bounds.width / 2);
    }
  );

  // Smooth spring magnification calculation
  const targetScale = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [1, Math.min(1.2, magnification / baseItemSize), 1]
  );

  const springScale = useSpring(targetScale, spring);
  const scale = prefersReducedMotion ? staticScale : springScale;

  // Subtle horizontal rail slide on vertical hover (4px nudge to the right)
  const targetX = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [0, 4, 0]
  );
  const springX = useSpring(targetX, spring);
  const smoothX = prefersReducedMotion ? staticX : springX;

  // Horizontal dimension magnification for horizontal docks
  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize]
  );
  const springSize = useSpring(targetSize, spring);
  const size = prefersReducedMotion ? staticSize : springSize;

  // If a route destination `to` is provided, wrap with react-router-dom NavLink
  if (to) {
    return (
      <NavLink
        to={to}
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(
          'block w-full outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[8px] no-underline',
          orientation === 'vertical' ? 'my-0.5' : ''
        )}
      >
        {({ isActive: navActive }) => {
          const effectiveActive = isActive !== undefined ? isActive : navActive;
          return (
            <DockItemContext.Provider
              value={{
                isHovered,
                isActive: effectiveActive,
                orientation,
                scale,
              }}
            >
              <motion.div
                ref={ref}
                id={id}
                style={
                  orientation === 'vertical'
                    ? { x: smoothX, ...style }
                    : { width: size, height: size, ...style }
                }
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onFocus={() => setIsHovered(true)}
                onBlur={() => setIsHovered(false)}
                className={cn(
                  orientation === 'vertical'
                    ? 'group relative flex items-center w-full min-h-[48px] h-12 px-3.5 rounded-[8px] cursor-pointer outline-none transition-colors duration-150'
                    : 'group relative flex items-center justify-center rounded-full cursor-pointer outline-none transition-colors',
                  effectiveActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-text-medium hover:text-text-high hover:bg-canvas dark:hover:bg-surface-high',
                  className
                )}
                role="link"
                aria-current={effectiveActive ? 'page' : undefined}
              >
                {/* Active indicator bar on the left */}
                {orientation === 'vertical' && effectiveActive && (
                  <motion.span
                    layoutId="active-nav-indicator"
                    className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full bg-primary-light"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                  />
                )}
                {children}
              </motion.div>
            </DockItemContext.Provider>
          );
        }}
      </NavLink>
    );
  }

  // Fallback for non-routing DockItems (e.g. standalone buttons, custom triggers)
  const effectiveActive = isActive ?? false;
  return (
    <DockItemContext.Provider
      value={{
        isHovered,
        isActive: effectiveActive,
        orientation,
        scale,
      }}
    >
      <motion.div
        ref={ref}
        id={id}
        style={
          orientation === 'vertical'
            ? { x: smoothX, ...style }
            : { width: size, height: size, ...style }
        }
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        onClick={onClick}
        className={cn(
          orientation === 'vertical'
            ? 'group relative flex items-center w-full min-h-[48px] h-12 px-3.5 rounded-[8px] cursor-pointer outline-none transition-colors duration-150'
            : 'group relative flex items-center justify-center rounded-full cursor-pointer outline-none transition-colors',
          effectiveActive
            ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
            : 'text-text-medium hover:text-text-high hover:bg-canvas dark:hover:bg-surface-high',
          className
        )}
        tabIndex={tabIndex ?? 0}
        role={role ?? 'button'}
        aria-pressed={effectiveActive}
        aria-label={ariaLabel}
      >
        {orientation === 'vertical' && effectiveActive && (
          <motion.span
            layoutId="active-nav-indicator"
            className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full bg-primary-light"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
          />
        )}
        {children}
      </motion.div>
    </DockItemContext.Provider>
  );
}

// ============================================================================
// DOCK ICON COMPONENT
// ============================================================================

export interface DockIconProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function DockIcon({ children, className, ...props }: DockIconProps) {
  const itemContext = useDockItem();
  const isVertical = itemContext?.orientation === 'vertical';

  return (
    <motion.div
      style={itemContext?.scale ? { scale: itemContext.scale } : undefined}
      className={cn(
        'flex items-center justify-center shrink-0 w-6 h-6 transition-colors duration-150',
        isVertical ? 'mr-3' : '',
        itemContext?.isActive
          ? 'text-primary-foreground'
          : 'text-text-medium group-hover:text-text-high',
        className
      )}
      {...(props as any)}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// DOCK LABEL COMPONENT
// ============================================================================

export interface DockLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  className?: string;
  asTooltip?: boolean;
}

export function DockLabel({ children, className, asTooltip = false, ...props }: DockLabelProps) {
  const itemContext = useDockItem();
  const isVertical = itemContext?.orientation === 'vertical';

  // In vertical sidebar mode without explicit asTooltip, render inline label beside icon
  if (isVertical && !asTooltip) {
    return (
      <span
        className={cn(
          'text-sm font-semibold tracking-tight transition-colors duration-150 select-none truncate',
          itemContext?.isActive
            ? 'text-primary-foreground font-bold'
            : 'text-text-medium group-hover:text-text-high',
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }

  // Floating tooltip mode (e.g. for horizontal dock or compact icon-only rails)
  return (
    <AnimatePresence>
      {itemContext?.isHovered && (
        <motion.div
          initial={{ opacity: 0, x: isVertical ? -6 : 0, y: isVertical ? '-50%' : 8, scale: 0.95 }}
          animate={{ opacity: 1, x: isVertical ? 0 : 0, y: isVertical ? '-50%' : 0, scale: 1 }}
          exit={{ opacity: 0, x: isVertical ? -4 : 0, y: isVertical ? '-50%' : 4, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'pointer-events-none absolute z-50 whitespace-nowrap rounded-[6px] bg-surface dark:bg-surface-high border border-border px-2.5 py-1 text-xs font-semibold text-text-high shadow-raised',
            isVertical
              ? 'left-full ml-3 top-1/2'
              : '-top-8 left-1/2 -translate-x-1/2',
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
