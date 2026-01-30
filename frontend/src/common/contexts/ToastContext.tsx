import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastContainer } from '../components/organisms/ToastContainer';
import { ToastVariant } from '../components/organisms/Toast';

interface ToastData {
  id: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ToastOptions {
  variant?: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  /** Show a toast notification - supports both string and object-based calls */
  showToast: {
    (message: string, variant?: ToastVariant, duration?: number): void;
    (options: ToastOptions): void;
  };

  /** Show a success toast */
  success: (message: string, duration?: number) => void;

  /** Show an error toast */
  error: (message: string, duration?: number) => void;

  /** Show a warning toast */
  warning: (message: string, duration?: number) => void;

  /** Show an info toast */
  info: (message: string, duration?: number) => void;

  /** Dismiss a specific toast */
  dismissToast: (id: string) => void;

  /** Dismiss all toasts */
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * ToastProvider Component
 *
 * Provides toast notification functionality to the entire application.
 * Wrap your app with this provider to enable toast notifications.
 *
 * @example
 * // In your app root
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Generate unique ID for each toast
  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Show a toast notification - supports both string and object-based calls
  const showToast = useCallback(
    (messageOrOptions: string | ToastOptions, variant: ToastVariant = 'info', duration: number = 5000) => {
      const id = generateId();
      let newToast: ToastData;

      if (typeof messageOrOptions === 'object') {
        // Object-based call: showToast({ variant, title, description })
        const opts = messageOrOptions;
        const message = opts.description ? `${opts.title}: ${opts.description}` : opts.title;
        newToast = {
          id,
          message,
          variant: opts.variant as ToastVariant || 'info',
          duration: opts.duration || 5000,
        };
      } else {
        // Positional call: showToast(message, variant, duration)
        newToast = {
          id,
          message: messageOrOptions,
          variant,
          duration,
        };
      }

      setToasts((prev) => [...prev, newToast]);
    },
    [generateId]
  ) as ToastContextValue['showToast'];

  // Convenience methods for different toast types
  const success = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'success', duration);
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'error', duration);
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'warning', duration);
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'info', duration);
    },
    [showToast]
  );

  // Dismiss a specific toast
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Dismiss all toasts
  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value: ToastContextValue = {
    showToast,
    success,
    error,
    warning,
    info,
    dismissToast,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

/**
 * useToast Hook
 *
 * Hook to access toast notification functionality.
 * Must be used within a ToastProvider.
 *
 * @returns Toast context value with methods to show and dismiss toasts
 *
 * @example
 * // In a component
 * const toast = useToast();
 *
 * // Show different types of toasts
 * toast.success('Item saved successfully');
 * toast.error('Failed to save item');
 * toast.warning('Please review your changes');
 * toast.info('New update available');
 *
 * // Custom toast with duration
 * toast.showToast('Custom message', 'success', 10000);
 *
 * // Dismiss all toasts
 * toast.dismissAll();
 */
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);

  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
};
