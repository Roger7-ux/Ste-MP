import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { cn } from '../../utils/cn.js';

const ToastContext = createContext(null);

const DEFAULT_DURATION = 5000;

// Short messages that slide in at the bottom right. A toast can carry one
// action, such as Undo. They are announced to screen readers as they appear.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    ({ message, tone = 'success', action, duration = DEFAULT_DURATION }) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, message, tone, action }]);
      setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      show,
      dismiss,
      success: (message, options) => show({ message, tone: 'success', ...options }),
      error: (message, options) => show({ message, tone: 'error', ...options }),
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-(--z-toast) flex flex-col items-end gap-2 sm:left-auto sm:w-96"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = toast.tone === 'error' ? CircleAlert : CircleCheck;
            return (
              <motion.div
                key={toast.id}
                layout
                role={toast.tone === 'error' ? 'alert' : 'status'}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="pointer-events-auto flex w-full items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 shadow-lift"
              >
                <Icon
                  aria-hidden="true"
                  className={cn('h-5 w-5 shrink-0', toast.tone === 'error' ? 'text-danger' : 'text-primary')}
                />
                <p className="flex-1 text-sm font-medium">{toast.message}</p>
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action.onClick();
                      dismiss(toast.id);
                    }}
                    className="min-h-9 rounded-button px-2.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {toast.action.label}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => dismiss(toast.id)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-button text-muted hover:bg-sunken hover:text-foreground"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
