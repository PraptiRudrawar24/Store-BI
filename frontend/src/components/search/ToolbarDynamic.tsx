'use client';
import React, { useRef, useState } from 'react';
import { motion, MotionConfig } from 'motion/react';
import useClickOutside from '@/hooks/useClickOutside';
import { ArrowLeft, Search, X } from 'lucide-react';

const transition = {
  type: 'spring' as const,
  bounce: 0.1,
  duration: 0.2,
};

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

function Button({
  children,
  onClick,
  disabled,
  ariaLabel,
  className = '',
}: ButtonProps) {
  return (
    <button
      className={`relative flex h-9 w-9 shrink-0 scale-100 select-none appearance-none items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 focus-visible:ring-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${className}`}
      type='button'
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export interface ToolbarDynamicProps {
  className?: string;
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
  onSubmit?: (val: string) => void;
  expandedWidth?: string;
  collapsedWidth?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ToolbarDynamic({
  className = 'relative',
  placeholder = 'Search notes',
  value,
  onChange,
  onSubmit,
  expandedWidth = '300px',
  collapsedWidth = '52px',
  isOpen: controlledIsOpen,
  onOpenChange,
}: ToolbarDynamicProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const setIsOpen = (next: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(next);
    }
    onOpenChange?.(next);
  };

  const query = value !== undefined ? value : internalQuery;
  const setQuery = (newVal: string) => {
    if (value === undefined) {
      setInternalQuery(newVal);
    }
    onChange?.(newVal);
  };

  useClickOutside(containerRef, () => {
    setIsOpen(false);
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSubmit?.(query);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <MotionConfig transition={transition}>
      <div className={className} ref={containerRef}>
        <div className='h-full w-full rounded-xl border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-sm'>
          <motion.div
            animate={{
              width: isOpen ? expandedWidth : collapsedWidth,
            }}
            initial={false}
          >
            <div className='overflow-hidden p-2'>
              {!isOpen ? (
                <div className='flex items-center justify-center'>
                  <Button
                    onClick={() => setIsOpen(true)}
                    ariaLabel={placeholder}
                  >
                    <Search className='h-5 w-5' />
                  </Button>
                </div>
              ) : (
                <div className='flex space-x-2'>
                  <Button onClick={() => setIsOpen(false)} ariaLabel='Back'>
                    <ArrowLeft className='h-5 w-5' />
                  </Button>
                  <div className='relative w-full flex items-center'>
                    <input
                      className='h-9 w-full rounded-lg border border-zinc-950/10 dark:border-white/10 bg-transparent px-2.5 pr-8 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-hidden focus:outline-none'
                      autoFocus
                      placeholder={placeholder}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    {query && (
                      <button
                        type='button'
                        onClick={() => setQuery('')}
                        aria-label='Clear search'
                        className='absolute right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                      >
                        <X className='h-3.5 w-3.5' />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  );
}
export { ToolbarDynamic };
