import React from 'react';
import { badgeVariants } from '../../utils/variants';
import { cn } from '../../utils/classNames';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual style variant */
  variant?: BadgeVariant;

  /** Size of the badge */
  size?: BadgeSize;

  /** Show dot indicator instead of text */
  dot?: boolean;

  /** Count value to display (shows compact format for large numbers) */
  count?: number;

  /** Icon to display (can be used with or without text) */
  icon?: React.ReactNode;

  /** Position of icon relative to text */
  iconPosition?: 'left' | 'right';

  /** Additional CSS classes */
  className?: string;

  /** Badge content */
  children?: React.ReactNode;
}

/**
 * Badge Component
 *
 * A small label component for displaying status, counts, or categories.
 * Supports multiple variants, sizes, dot indicator mode, count display, and icons.
 *
 * @example
 * // Status badge
 * <Badge variant="success">Active</Badge>
 *
 * @example
 * // Count badge
 * <Badge variant="primary" count={5} />
 *
 * @example
 * // Badge with icon
 * <Badge variant="info" icon={<InfoIcon />}>Information</Badge>
 *
 * @example
 * // Dot indicator
 * <Badge variant="success" dot />
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ 
    variant = 'default', 
    size = 'md', 
    dot = false, 
    count, 
    icon, 
    iconPosition = 'left',
    className, 
    children, 
    ...props 
  }, ref) => {
    // Helper function to format count for display
    const formatCount = (value: number): string => {
      if (value >= 1000) return '999+';
      if (value >= 100) return '99+';
      return value.toString();
    };

    // Dot indicator mode
    if (dot) {
      return (
        <span
          ref={ref}
          className={cn(
            'inline-block rounded-full',
            variant === 'default' && 'bg-text-tertiary',
            variant === 'primary' && 'bg-primary-500',
            variant === 'success' && 'bg-success-500',
            variant === 'warning' && 'bg-warning-500',
            variant === 'error' && 'bg-error-500',
            variant === 'info' && 'bg-info-500',
            size === 'sm' && 'w-2 h-2',
            size === 'md' && 'w-3 h-3',
            size === 'lg' && 'w-4 h-4',
            className
          )}
          {...props}
        />
      );
    }

    // Determine content to display
    const displayContent = count !== undefined ? formatCount(count) : children;
    const hasIcon = icon !== undefined;
    const hasContent = displayContent !== undefined && displayContent !== '';

    return (
      <span
        ref={ref}
        className={cn(
          badgeVariants({ variant: variant as any, size: size as any }),
          hasIcon && hasContent && 'gap-1',
          className
        )}
        {...props}
      >
        {hasIcon && iconPosition === 'left' && (
          <span className="inline-flex items-center">{icon}</span>
        )}
        {displayContent}
        {hasIcon && iconPosition === 'right' && (
          <span className="inline-flex items-center">{icon}</span>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
