import * as React from 'react';
import { cn } from './utils';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, description?: string) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = React.useCallback(
    (message: string, type: ToastType = 'info', description?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message, description }]);
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = React.useCallback(
    (message: string, description?: string) => showToast(message, 'success', description),
    [showToast]
  );
  const error = React.useCallback(
    (message: string, description?: string) => showToast(message, 'error', description),
    [showToast]
  );
  const info = React.useCallback(
    (message: string, description?: string) => showToast(message, 'info', description),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-3.5 bg-surface border border-border rounded-[8px] transition-all',
              t.type === 'success' && 'border-success-border',
              t.type === 'error' && 'border-destructive-border',
              t.type === 'info' && 'border-border'
            )}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-success" strokeWidth={2} />
              )}
              {t.type === 'error' && (
                <AlertCircle className="w-5 h-5 text-destructive" strokeWidth={2} />
              )}
              {t.type === 'info' && <Info className="w-5 h-5 text-primary" strokeWidth={2} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-high">{t.message}</p>
              {t.description && (
                <p className="text-xs text-text-medium mt-0.5">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="w-10 h-10 -mr-2 -mt-2 flex items-center justify-center rounded-[8px] text-text-medium hover:text-text-high hover:bg-canvas transition-colors"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
