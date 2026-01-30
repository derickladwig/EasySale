import React from 'react';
import { cn } from '../../utils/classNames';

export type ProgressBarSize = 'sm' | 'md' | 'lg';
export type ProgressBarVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

export interface ProgressBarProps {
  /** Progress value (0-100). If undefined, shows indeterminate state */
  value?: number;

  /** Size of the progress bar */
  size?: ProgressBarSize;

  /** Color variant */
  variant?: ProgressBarVariant;

  /** Whether to show the percentage label */
  showLabel?: boolean;

  /** Custom label text (overrides percentage) */
  label?: string;

  /** Additional CSS classes */
  className?: string;

  /** ARIA label for accessibility */
  'aria-label'?: string;
}

// Size configurations (height)
const sizeConfig: Record<ProgressBarSize, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

// Variant color configurations for the progress bar fill
const variantConfig: Record<ProgressBarVariant, string> = {
  default: 'bg-secondary-400',
  primary: 'bg-primary-500',
  success: 'bg-success-DEFAULT',
  warning: 'bg-warning-DEFAULT',
  error: 'bg-error-DEFAULT',
  info: 'bg-info-DEFAULT',
};

// Background color for the track
const trackBgColor = 'bg-background-tertiary';

/**
 * ProgressBar Component
 *
 * A progress indicator that shows completion status of an operation.
 * Supports both determinate (specific percentage) and indeterminate (ongoing activity) modes.
 *
 * Requirements:
 * - 12.3: Use progress bars for determinate operations
 * - 12.4: Animate smoothly with CSS animations
 *
 * @example
 * // Determinate progress bar
 * <ProgressBar value={65} variant="primary" showLabel />
 *
 * @example
 * // Indeterminate progress bar
 * <ProgressBar variant="primary" />
 *
 * @example
 * // With custom label
 * <ProgressBar value={50} label="Uploading files..." />
 */
export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value,
      size = 'md',
      variant = 'primary',
      showLabel = false,
      label,
      className,
      'aria-label': ariaLabel,
    },
    ref
  ) => {
    // Clamp value between 0 and 100
    const clampedValue = value !== undefined ? Math.min(Math.max(value, 0), 100) : undefined;
    const isIndeterminate = clampedValue === undefined;

    // Determine label text
    const labelText = label || (showLabel && clampedValue !== undefined ? `${Math.round(clampedValue)}%` : '');

    return (
      <div ref={ref} className={cn('w-full', className)}>
        {/* Progress bar track */}
        <div
          className={cn(
            'relative w-full rounded-full overflow-hidden',
            trackBgColor,
            sizeConfig[size]
          )}
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={ariaLabel || labelText || (isIndeterminate ? 'Loading' : 'Progress')}
        >
          {/* Progress bar fill */}
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300 ease-out',
              variantConfig[variant],
              isIndeterminate && 'animate-progress-indeterminate'
            )}
            style={{
              width: isIndeterminate ? '40%' : `${clampedValue}%`,
            }}
          />
        </div>

        {/* Optional label */}
        {labelText && (
          <div className="mt-2 text-sm text-text-secondary text-center">
            {labelText}
          </div>
        )}
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';

/**
 * DeterminateProgressBar Component
 *
 * A progress bar that shows a specific percentage of completion.
 * This is a convenience wrapper around ProgressBar with determinate behavior.
 *
 * Requirements:
 * - 12.3: Use progress bars for determinate operations
 *
 * @example
 * // Basic determinate progress
 * <DeterminateProgressBar value={75} />
 *
 * @example
 * // With label
 * <DeterminateProgressBar value={50} showLabel variant="success" />
 */
export interface DeterminateProgressBarProps extends Omit<ProgressBarProps, 'value'> {
  /** Progress value (0-100) - required for determinate progress */
  value: number;
}

export const DeterminateProgressBar = React.forwardRef<HTMLDivElement, DeterminateProgressBarProps>(
  (props, ref) => {
    return <ProgressBar ref={ref} {...props} />;
  }
);

DeterminateProgressBar.displayName = 'DeterminateProgressBar';

/**
 * IndeterminateProgressBar Component
 *
 * A progress bar that shows ongoing activity without a specific completion percentage.
 * This is a convenience wrapper around ProgressBar with indeterminate behavior.
 *
 * Requirements:
 * - 12.4: Animate smoothly with CSS animations
 *
 * @example
 * // Basic indeterminate progress
 * <IndeterminateProgressBar />
 *
 * @example
 * // With custom styling
 * <IndeterminateProgressBar variant="primary" size="lg" />
 */
export interface IndeterminateProgressBarProps extends Omit<ProgressBarProps, 'value' | 'showLabel'> {
  // No additional props needed
}

export const IndeterminateProgressBar = React.forwardRef<HTMLDivElement, IndeterminateProgressBarProps>(
  (props, ref) => {
    return <ProgressBar ref={ref} {...props} value={undefined} />;
  }
);

IndeterminateProgressBar.displayName = 'IndeterminateProgressBar';
