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
  isCollapsed: boolean;
  distance: number;
  magnification: number;
  baseItemSize: number;
  spring: SpringOptions;
}

const DockContext = createContext<DockContextType | null>(null);

export function useDock() {
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
  isCollapsed: boolean;
  scale: MotionValue<number>;
}

const DockItemContext = createContext<DockItemContextType | null>(null);

export function useDockItem() {
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
  isCollapsed?: boolean;
  spring?: SpringOptions;
  as?: React.ElementType;
  id?: string;
  role?: string;
  'aria-label'?: string;
}

export function Dock({
  children,
  className,
  distance = 110,
  magnification = 68,
  baseItemSize = 44,
  orientation = 'vertical',
  isCollapsed = true,
  spring = { mass: 0.1, stiffness: 240, damping: 18 },
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
      isCollapsed,
      distance,
      magnification,
      baseItemSize,
      spring,
    }),
    [orientation, isCollapsed, distance, magnification, baseItemSize, spring]
  );

  return (
    <DockContext.Provider value={contextValue}>
      <Component
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={cn(
          'flex select-none overflow-visible',
          orientation === 'vertical'
            ? 'flex-col w-full gap-2.5 items-center'
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
  const { mouseX, mouseY, orientation, isCollapsed, distance, magnification, baseItemSize, spring } = useDock();
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Static fallback values when reduced motion is requested
  const staticScale = useMotionValue(1);

  // Distance from cursor along primary axis
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

  // macOS Dock-style bell-curve magnification wave (matches reference image)
  const maxScale = Math.max(1.52, magnification / baseItemSize);
  const targetScale = useTransform(
    mouseDistance,
    [
      -distance,
      -distance * 0.65,
      -distance * 0.35,
      0,
      distance * 0.35,
      distance * 0.65,
      distance,
    ],
    [1, 1.10, 1.28, maxScale, 1.28, 1.10, 1]
  );
  const springScale = useSpring(targetScale, spring);
  const scale = prefersReducedMotion ? staticScale : springScale;

  // Layering: elevate magnified items above neighbors
  const zIndex = useTransform(scale, [1, 1.1, 1.25], [1, 10, 30]);

  // Render navigation item using react-router-dom NavLink if `to` is provided
  if (to) {
    return (
      <NavLink
        to={to}
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(
          'block outline-none focus-visible:ring-2 focus-visible:ring-[#00665F] rounded-xl no-underline overflow-visible w-full',
          className
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
                isCollapsed,
                scale,
              }}
            >
              <motion.div
                ref={ref}
                id={id}
                style={{ zIndex, ...style }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onFocus={() => setIsHovered(true)}
                onBlur={() => setIsHovered(false)}
                className="group relative flex flex-col items-center justify-center cursor-pointer outline-none transition-colors duration-150 overflow-visible w-full py-1"
                role="link"
                aria-current={effectiveActive ? 'page' : undefined}
              >
                {children}
              </motion.div>
            </DockItemContext.Provider>
          );
        }}
      </NavLink>
    );
  }

  // Fallback for non-routing DockItems (buttons, modal triggers, logout, toggle)
  const effectiveActive = isActive ?? false;
  return (
    <DockItemContext.Provider
      value={{
        isHovered,
        isActive: effectiveActive,
        orientation,
        isCollapsed,
        scale,
      }}
    >
      <motion.div
        ref={ref}
        id={id}
        style={{ zIndex, ...style }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        onClick={onClick}
        className="group relative flex flex-col items-center justify-center cursor-pointer outline-none transition-colors duration-150 overflow-visible w-full py-1"
        tabIndex={tabIndex ?? 0}
        role={role ?? 'button'}
        aria-pressed={effectiveActive}
        aria-label={ariaLabel}
      >
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
  const scale = itemContext?.scale;

  return (
    <motion.div
      style={scale ? { scale } : undefined}
      className={cn(
        'w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors duration-150 relative shadow-xs',
        itemContext?.isActive
          ? 'bg-[#00665F] text-white shadow-md shadow-[#00665F]/30 ring-2 ring-[#00665F]/20'
          : 'bg-slate-100/90 dark:bg-slate-800/90 text-[#475569] dark:text-slate-300 group-hover:bg-[#E6F4F1] group-hover:text-[#00665F] dark:group-hover:bg-teal-950/60 dark:group-hover:text-teal-300 border border-slate-200/80 dark:border-slate-700/80',
        className
      )}
      {...(props as any)}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// DOCK LABEL COMPONENT (SHOWS SECTION NAME JUST BELOW THE ICON)
// ============================================================================

export interface DockLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  className?: string;
  asTooltip?: boolean;
}

export function DockLabel({ children, className, asTooltip = false, ...props }: DockLabelProps) {
  const itemContext = useDockItem();

  if (asTooltip) {
    return (
      <AnimatePresence>
        {itemContext?.isHovered && (
          <motion.div
            initial={{ opacity: 0, x: -8, y: '-50%', scale: 0.9 }}
            animate={{ opacity: 1, x: 0, y: '-50%', scale: 1 }}
            exit={{ opacity: 0, x: -6, y: '-50%', scale: 0.9 }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.2 }}
            className={cn(
              'pointer-events-none absolute left-full ml-4 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-[8px] bg-[#0F172A] text-white px-3 py-1.5 text-xs font-semibold shadow-2xl border border-slate-700/80 select-none flex items-center gap-1.5 tracking-wide',
              className
            )}
            role="tooltip"
          >
            <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-[#0F172A]" />
            <span>{children}</span>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Section name rendered just below the icon
  return (
    <span
      className={cn(
        'text-[10px] sm:text-[10.5px] font-semibold tracking-tight text-center leading-[1.2] mt-1 select-none max-w-[72px] truncate transition-colors duration-150',
        itemContext?.isActive
          ? 'text-[#00665F] dark:text-teal-400 font-bold'
          : 'text-slate-500 dark:text-slate-400 group-hover:text-[#00665F] dark:group-hover:text-teal-300',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// Alias AppleStyleDock for explicit compatibility
export { Dock as AppleStyleDock };
