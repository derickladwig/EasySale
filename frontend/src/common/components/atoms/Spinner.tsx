import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/classNames';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'white';

export interface SpinnerProps {
  /** Spinner size */
  size?: SpinnerSize;

  /** Spinner color variant */
  variant?: SpinnerVariant;

  /** Additional CSS classes */
  className?: string;

  /** ARIA label for accessibility */
  'aria-label'?: string;
}

// Size configurations (icon dimensions)
const sizeConfig: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

// Variant color configurations
const variantConfig: Record<SpinnerVariant, string> = {
  default: 'text-text-tertiary',
  primary: 'text-primary-500',
  success: 'text-success-DEFAULT',
  warning: 'text-warning-DEFAULT',
  error: 'text-error-DEFAULT',
  white: 'text-white',
};

/**
 * Spinner Component
 *
 * A simple animated loading spinner using Lucide's Loader2 icon.
 * This is the base spinner component used by ButtonSpinner, PageSpinner, and InlineSpinner.
 *
 * Requirements:
 * - 12.2: Use spinners for action loading (buttons, forms)
 * - 12.4: Animate smoothly with CSS animations
 *
 * @example
 * // Basic spinner
 * <Spinner />
 *
 * @example
 * // Primary colored spinner
 * <Spinner variant="primary" size="lg" />
 *
 * @example
 * // Small spinner for inline use
 * <Spinner size="sm" variant="default" />
 */
export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ size = 'md', variant = 'default', className, 'aria-label': ariaLabel }, ref) => {
    return (
      <Loader2
        ref={ref}
        className={cn(
          'animate-spin',
          sizeConfig[size],
          variantConfig[variant],
          className
        )}
        aria-label={ariaLabel || 'Loading'}
        aria-hidden="true"
      />
    );
  }
);

Spinner.displayName = 'Spinner';

/**
 * ButtonSpinner Component
 *
 * A spinner specifically designed for use inside buttons.
 * Automatically sized to match button text and includes proper spacing.
 *
 * Requirements:
 * - 12.2: Use spinners for action loading (buttons, forms)
 * - 7.5: Display loading spinners when processing
 *
 * @example
 * // Inside a button
 * <button>
 *   <ButtonSpinner />
 *   Saving...
 * </button>
 */
export interface ButtonSpinnerProps {
  /** Additional CSS classes */
  className?: string;

  /** ARIA label for accessibility */
  'aria-label'?: string;
}

export const ButtonSpinner = React.forwardRef<SVGSVGElement, ButtonSpinnerProps>(
  ({ className, 'aria-label': ariaLabel }, ref) => {
    return (
      <Spinner
        ref={ref}
        size="sm"
        variant="white"
        className={cn('mr-2', className)}
        aria-label={ariaLabel || 'Loading'}
      />
    );
  }
);

ButtonSpinner.displayName = 'ButtonSpinner';

/**
 * PageSpinner Component
 *
 * A larger spinner for page-level loading states.
 * Includes optional text and automatic centering.
 *
 * Requirements:
 * - 12.2: Use spinners for action loading
 * - 12.7: Display loading text for long operations
 *
 * @example
 * // Basic page spinner
 * <PageSpinner />
 *
 * @example
 * // With text
 * <PageSpinner text="Loading products..." />
 *
 * @example
 * // Custom variant
 * <PageSpinner variant="primary" text="Please wait..." />
 */
export interface PageSpinnerProps {
  /** Spinner color variant */
  variant?: SpinnerVariant;

  /** Optional loading text */
  text?: string;

  /** Whether to center the spinner */
  centered?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** ARIA label for accessibility */
  'aria-label'?: string;
}

export const PageSpinner = React.forwardRef<HTMLDivElement, PageSpinnerProps>(
  (
    {
      variant = 'primary',
      text,
      centered = true,
      className,
      'aria-label': ariaLabel,
    },
    ref
  ) => {
    const content = (
      <div
        ref={ref}
        className={cn('inline-flex flex-col items-center gap-3', className)}
        role="status"
        aria-live="polite"
        aria-label={ariaLabel || text || 'Loading'}
      >
        <Spinner size="xl" variant={variant} />
        {text && (
          <span className={cn('text-base font-medium', variantConfig[variant])}>
            {text}
          </span>
        )}
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

PageSpinner.displayName = 'PageSpinner';

/**
 * InlineSpinner Component
 *
 * A small spinner for inline use within text or compact UI elements.
 * Automatically aligns with text baseline.
 *
 * Requirements:
 * - 12.2: Use spinners for action loading
 *
 * @example
 * // Inline with text
 * <span>
 *   <InlineSpinner /> Loading...
 * </span>
 *
 * @example
 * // In a compact UI element
 * <div className="flex items-center gap-2">
 *   <InlineSpinner variant="primary" />
 *   <span>Syncing...</span>
 * </div>
 */
export interface InlineSpinnerProps {
  /** Spinner color variant */
  variant?: SpinnerVariant;

  /** Additional CSS classes */
  className?: string;

  /** ARIA label for accessibility */
  'aria-label'?: string;
}

export const InlineSpinner = React.forwardRef<SVGSVGElement, InlineSpinnerProps>(
  ({ variant = 'default', className, 'aria-label': ariaLabel }, ref) => {
    return (
      <Spinner
        ref={ref}
        size="sm"
        variant={variant}
        className={cn('inline-block align-text-bottom', className)}
        aria-label={ariaLabel || 'Loading'}
      />
    );
  }
);

InlineSpinner.displayName = 'InlineSpinner';
