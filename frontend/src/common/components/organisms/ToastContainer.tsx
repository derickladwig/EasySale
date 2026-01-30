import React from 'react';
import { Toast, ToastProps } from './Toast';
import { cn } from '../../utils/classNames';

export interface ToastContainerProps {
  /** Array of toasts to display */
  toasts: Omit<ToastProps, 'onDismiss'>[];

  /** Callback when a toast is dismissed */
  onDismiss: (id: string) => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * ToastContainer Component
 *
 * A container component that manages and displays multiple toast notifications.
 * Toasts are stacked vertically with proper spacing and positioned in the top-right corner.
 *
 * Requirements:
 * - 11.1: Toast container in top-right corner of the screen
 * - 11.5: Stack multiple toasts vertically
 * - 11.8: 8px gap between stacked toasts
 * - 11.9: Remaining toasts slide up to fill space when one is dismissed
 * - 11.10: Full-width at top of screen on mobile
 *
 * @example
 * // Basic usage
 * <ToastContainer
 *   toasts={[
 *     { id: '1', message: 'Success!', variant: 'success' },
 *     { id: '2', message: 'Error occurred', variant: 'error' },
 *   ]}
 *   onDismiss={handleDismiss}
 * />
 */
export const ToastContainer = React.forwardRef<HTMLDivElement, ToastContainerProps>(
  ({ toasts, onDismiss, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'fixed z-toast',
          // Top-right corner on desktop (Requirement 11.1)
          'top-4 right-4',
          // Full-width at top on mobile (Requirement 11.10)
          'max-sm:top-0 max-sm:right-0 max-sm:left-0',
          // Vertical stack with gap (Requirement 11.5, 11.8)
          'flex flex-col gap-2', // 8px gap (0.5rem = 8px)
          // Pointer events only on toasts, not container
          'pointer-events-none',
          className
        )}
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto"
          >
            <Toast
              {...toast}
              onDismiss={onDismiss}
            />
          </div>
        ))}
      </div>
    );
  }
);

ToastContainer.displayName = 'ToastContainer';
