import React from 'react';
import { cn } from '../../utils/classNames';

export type CardVariant = 'default' | 'elevated' | 'outlined';

export interface CardProps {
  /** Card variant style */
  variant?: CardVariant;

  /** Header content */
  header?: React.ReactNode;

  /** Body content */
  children: React.ReactNode;

  /** Footer content */
  footer?: React.ReactNode;

  /** Whether the card is interactive (adds hover effect) */
  interactive?: boolean;

  /** Click handler for interactive cards */
  onClick?: () => void;

  /** Additional CSS classes */
  className?: string;

  /** Action buttons to display in the header (right-aligned) */
  actions?: React.ReactNode;

  /** Whether the card is in a loading state */
  loading?: boolean;
}

// Variant styles - using design tokens from tailwind.config.js
const variantStyles: Record<CardVariant, string> = {
  default: 'bg-surface-base border border-border shadow-md',
  elevated: 'bg-surface-base shadow-lg',
  outlined: 'bg-transparent border-2 border-border shadow-md',
};

/**
 * Skeleton Loader Component
 * Displays a pulsing placeholder while content is loading
 */
const CardSkeleton: React.FC<{ hasHeader?: boolean; hasFooter?: boolean }> = ({
  hasHeader,
  hasFooter,
}) => {
  return (
    <div className="animate-pulse">
      {hasHeader && (
        <div className="px-4 sm:px-6 py-4 border-b border-border">
          <div className="h-6 bg-surface-elevated rounded w-1/3"></div>
        </div>
      )}

      <div className="px-4 sm:px-6 py-4 space-y-3">
        <div className="h-4 bg-surface-elevated rounded w-full"></div>
        <div className="h-4 bg-surface-elevated rounded w-5/6"></div>
        <div className="h-4 bg-surface-elevated rounded w-4/6"></div>
      </div>

      {hasFooter && (
        <div className="px-4 sm:px-6 py-4 border-t border-border bg-background-primary/50">
          <div className="h-8 bg-surface-elevated rounded w-24"></div>
        </div>
      )}
    </div>
  );
};

/**
 * Card Component
 *
 * A flexible container component with optional header, body, and footer sections.
 * Supports multiple variants and interactive states.
 *
 * @example
 * // Basic card
 * <Card>
 *   <p>Card content goes here</p>
 * </Card>
 *
 * @example
 * // Card with header and footer
 * <Card
 *   header={<h3>Card Title</h3>}
 *   footer={<button>Action</button>}
 * >
 *   <p>Card body content</p>
 * </Card>
 *
 * @example
 * // Interactive card
 * <Card
 *   variant="elevated"
 *   interactive
 *   onClick={handleClick}
 * >
 *   <p>Click me!</p>
 * </Card>
 *
 * @example
 * // Card with actions in header
 * <Card
 *   header={<h3>Card Title</h3>}
 *   actions={<button>Edit</button>}
 * >
 *   <p>Card content</p>
 * </Card>
 *
 * @example
 * // Loading card
 * <Card loading>
 *   <p>This content will be hidden while loading</p>
 * </Card>
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      header,
      children,
      footer,
      interactive = false,
      onClick,
      className,
      actions,
      loading = false,
    },
    ref
  ) => {
    const isClickable = interactive || !!onClick;

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg overflow-hidden',
          variantStyles[variant],
          isClickable && 'cursor-pointer transition-all duration-100',
          isClickable && variant === 'default' && 'hover:border-primary-500 hover:shadow-lg',
          isClickable && variant === 'elevated' && 'hover:shadow-xl hover:scale-[1.02]',
          isClickable && variant === 'outlined' && 'hover:border-primary-500 hover:shadow-lg',
          className
        )}
        onClick={onClick}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={
          isClickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
      >
        {loading ? (
          <CardSkeleton hasHeader={!!header} hasFooter={!!footer} />
        ) : (
          <>
            {(header || actions) && (
              <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-4">
                {header && <div className="flex-1 min-w-0">{header}</div>}
                {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
              </div>
            )}

            <div className="px-4 sm:px-6 py-4">{children}</div>

            {footer && (
              <div className="px-4 sm:px-6 py-4 border-t border-border bg-background-primary/50">
                {footer}
              </div>
            )}
          </>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';
