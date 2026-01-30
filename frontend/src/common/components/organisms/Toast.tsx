import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/classNames';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  /** Unique identifier for the toast */
  id: string;

  /** Toast message */
  message: string;

  /** Toast variant (determines color and icon) */
  variant?: ToastVariant;

  /** Duration in milliseconds before auto-dismiss (0 = no auto-dismiss) */
  duration?: number;

  /** Callback when toast is dismissed */
  onDismiss: (id: string) => void;

  /** Additional CSS classes */
  className?: string;
}

// Icon mapping for each variant (Requirement 11.7)
const variantIcons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle size={20} />,
  error: <AlertCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  info: <Info size={20} />,
};

// Color styles for each variant (Requirement 11.2)
const variantStyles: Record<ToastVariant, string> = {
  success: 'bg-success-DEFAULT border-success-dark text-white',
  error: 'bg-error-DEFAULT border-error-dark text-white',
  warning: 'bg-warning-DEFAULT border-warning-dark text-white',
  info: 'bg-info-DEFAULT border-info-dark text-white',
};

/**
 * Toast Component
 *
 * A notification component that displays temporary messages to the user.
 * Supports semantic color variants, auto-dismiss, and manual dismissal.
 *
 * Requirements:
 * - 11.2: Semantic colors (success: green, error: red, info: blue, warning: yellow)
 * - 11.3: Auto-dismiss after 5 seconds (configurable)
 * - 11.4: Manual dismissal with close button
 * - 11.6: Slide in from the right with smooth animation
 * - 11.7: Include an icon matching the toast type
 *
 * @example
 * // Success toast
 * <Toast
 *   id="1"
 *   message="Item saved successfully"
 *   variant="success"
 *   onDismiss={handleDismiss}
 * />
 *
 * @example
 * // Error toast with no auto-dismiss
 * <Toast
 *   id="2"
 *   message="Failed to save item"
 *   variant="error"
 *   duration={0}
 *   onDismiss={handleDismiss}
 * />
 */
export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      id,
      message,
      variant = 'info',
      duration = 5000,
      onDismiss,
      className,
    },
    ref
  ) => {
    // State for managing exit animation
    const [isExiting, setIsExiting] = useState(false);

    // Auto-dismiss timer (Requirement 11.3)
    useEffect(() => {
      if (duration === 0) return; // No auto-dismiss if duration is 0

      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }, [duration, id]);

    // Handle dismiss with exit animation
    const handleDismiss = () => {
      setIsExiting(true);
      // Wait for animation to complete before calling onDismiss
      setTimeout(() => {
        onDismiss(id);
      }, 300); // Match animation duration
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start gap-3 p-4 rounded-lg shadow-lg border-2',
          'min-w-[300px] max-w-md',
          // Semantic color variants (Requirement 11.2)
          variantStyles[variant],
          // Slide-in animation from right (Requirement 11.6)
          isExiting ? 'animate-slide-out-to-right' : 'animate-slide-in-from-right',
          // Mobile: full-width at top (Requirement 11.10)
          'max-sm:min-w-full max-sm:rounded-none',
          className
        )}
        role="alert"
        aria-live="polite"
        aria-atomic="true"
      >
        {/* Icon matching toast type (Requirement 11.7) */}
        <div className="flex-shrink-0 mt-0.5">
          {variantIcons[variant]}
        </div>

        {/* Message */}
        <div className="flex-1 text-sm font-medium">
          {message}
        </div>

        {/* Manual dismiss button (Requirement 11.4) */}
        <button
          type="button"
          onClick={handleDismiss}
          className={cn(
            'flex-shrink-0 rounded-lg p-1',
            'hover:bg-white/20 active:bg-white/30',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-white/50'
          )}
          aria-label="Dismiss notification"
        >
          <X size={16} />
        </button>
      </div>
    );
  }
);

Toast.displayName = 'Toast';
