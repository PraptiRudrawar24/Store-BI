import * as React from 'react';
import { cn } from './utils';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  isBottomSheetOnMobile?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  isBottomSheetOnMobile = true,
  maxWidth = 'md',
}: ModalProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* 40% neutral backdrop tint per DESIGN.md */}
      <div
        className="fixed inset-0 bg-[#111827]/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog container: bottom sheet on mobile, centered modal on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full bg-surface border border-border z-10 flex flex-col max-h-[90vh] overflow-hidden',
          isBottomSheetOnMobile
            ? 'rounded-t-[8px] sm:rounded-[8px]'
            : 'rounded-[8px]',
          maxWidthClasses[maxWidth]
        )}
      >
        {/* Mobile handle indicator */}
        {isBottomSheetOnMobile && (
          <div className="sm:hidden flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
        )}

        {/* Header */}
        <div className="px-4 py-3.5 border-b border-border flex items-center justify-between shrink-0">
          <div>
            {title && <h3 className="font-semibold text-text-high text-base">{title}</h3>}
            {description && (
              <p className="text-xs text-text-medium mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 -mr-2 flex items-center justify-center rounded-[8px] text-text-medium hover:text-text-high hover:bg-canvas transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-4 py-3 border-t border-border bg-canvas/40 flex items-center justify-end gap-3 shrink-0 rounded-b-[8px]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export const BottomSheet = Modal;
