import React from 'react';
import { Loader2 } from 'lucide-react';
import { Icon } from '../atoms/Icon';
import { cn } from '../../utils/classNames';

export type LoadingSpinnerSize = 'sm' | 'md' | 'lg';
export type LoadingSpinnerVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';

export interface LoadingSpinnerProps {
  /** Spinner size */
  size?: LoadingSpinnerSize;

  /** Spinner color variant */
  variant?: LoadingSpinnerVariant;

  /** Optional loading text */
  text?: string;

  /** Whether to center the spinner */
  centered?: boolean;

  /** Additional CSS classes */
  className?: string;
}

// Size configurations
const sizeConfig: Record<LoadingSpinnerSize, { icon: 'sm' | 'md' | 'lg' | 'xl'; text: string }> = {
  sm: { icon: 'sm', text: 'text-sm' },
  md: { icon: 'md', text: 'text-base' },
  lg: { icon: 'lg', text: 'text-lg' },
};

// Variant color configurations
const variantConfig: Record<LoadingSpinnerVariant, string> = {
  default: 'text-text-secondary',
  primary: 'text-primary-500',
  success: 'text-success-500',
  warning: 'text-warning-500',
  error: 'text-error-500',
};

/**
 * LoadingSpinner Component
 *
 * An animated loading indicator with optional text.
 * Supports different sizes and color variants.
 *
 * @example
 * // Basic spinner
 * <LoadingSpinner />
 *
 * @example
 * // With text and custom size
 * <LoadingSpinner
 *   size="lg"
 *   variant="primary"
 *   text="Loading..."
 * />
 *
 * @example
 * // Centered spinner
 * <LoadingSpinner centered text="Please wait..." />
 */
export const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ size = 'md', variant = 'default', text, centered = false, className }, ref) => {
    const config = sizeConfig[size];
    const colorClass = variantConfig[variant];

    const content = (
      <div
        ref={ref}
        className={cn('inline-flex flex-col items-center gap-2', className)}
        role="status"
        aria-live="polite"
        aria-label={text || 'Loading'}
      >
        <div className={cn('animate-spin', colorClass)}>
          <Icon icon={Loader2} size={config.icon} />
        </div>
        {text && <span className={cn('font-medium', colorClass, config.text)}>{text}</span>}
      </div>
    );

    if (centered) {
      return (
        <div className="flex items-center justify-center w-full h-full min-h-[200px]">
          {content}
        </div>
      );
    }

    return content;
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';
