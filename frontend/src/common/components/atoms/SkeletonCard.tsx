/**
 * SkeletonCard Component
 *
 * Skeleton placeholder for card components.
 * Matches the shape of the Card component with optional header and footer.
 *
 * Requirements:
 * - 12.1: Use skeleton screens for content loading
 * - 12.5: Match the shape of the content being loaded
 * - 12.6: Use subtle pulsing animation for skeletons
 *
 * @example
 * // Basic card skeleton
 * <SkeletonCard />
 *
 * @example
 * // Card skeleton with header and footer
 * <SkeletonCard hasHeader hasFooter />
 *
 * @example
 * // Multiple card skeletons
 * <div className="grid grid-cols-3 gap-4">
 *   {Array.from({ length: 6 }).map((_, i) => (
 *     <SkeletonCard key={i} />
 *   ))}
 * </div>
 */

import React from 'react';
import { cn } from '../../utils/classNames';
import { Skeleton } from './Skeleton';

export interface SkeletonCardProps {
  /** Whether to show header skeleton */
  hasHeader?: boolean;

  /** Whether to show footer skeleton */
  hasFooter?: boolean;

  /** Number of content lines to show */
  lines?: number;

  /** Additional CSS classes */
  className?: string;

  /** Variant matching Card component variants */
  variant?: 'default' | 'elevated' | 'outlined';
}

/**
 * SkeletonCard Component
 * Displays a skeleton placeholder matching the Card component structure
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  hasHeader = false,
  hasFooter = false,
  lines = 3,
  className,
  variant = 'default',
}) => {
  // Variant-specific styles matching Card component
  const variantStyles = {
    default: 'bg-background-secondary shadow-md border border-border-light',
    elevated: 'bg-background-secondary shadow-lg border border-border-light',
    outlined: 'bg-transparent border-2 border-border-DEFAULT',
  }[variant];

  return (
    <div className={cn('rounded-lg overflow-hidden', variantStyles, className)} role="status" aria-busy="true">
      {/* Header skeleton */}
      {hasHeader && (
        <div className="px-4 sm:px-6 py-4 border-b border-border-light">
          <Skeleton className="h-6 w-1/3" />
        </div>
      )}

      {/* Body skeleton */}
      <div className="px-4 sm:px-6 py-4 space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            className={cn(
              'h-4',
              index === 0 && 'w-full',
              index === 1 && 'w-5/6',
              index === 2 && 'w-4/6',
              index > 2 && 'w-3/4'
            )}
          />
        ))}
      </div>

      {/* Footer skeleton */}
      {hasFooter && (
        <div className="px-4 sm:px-6 py-4 border-t border-border-light bg-background-primary/50">
          <Skeleton className="h-8 w-24" />
        </div>
      )}
    </div>
  );
};

/**
 * SkeletonCardGrid Component
 * Displays a grid of skeleton cards
 */
export interface SkeletonCardGridProps {
  /** Number of skeleton cards to display */
  count?: number;

  /** Grid columns configuration */
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };

  /** Props to pass to each SkeletonCard */
  cardProps?: Omit<SkeletonCardProps, 'className'>;

  /** Additional CSS classes */
  className?: string;
}

export const SkeletonCardGrid: React.FC<SkeletonCardGridProps> = ({
  count = 6,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  cardProps,
  className,
}) => {
  const gridClass = cn(
    'grid gap-4 sm:gap-6',
    `grid-cols-${columns.mobile}`,
    `sm:grid-cols-${columns.tablet}`,
    `lg:grid-cols-${columns.desktop}`,
    className
  );

  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} {...cardProps} />
      ))}
    </div>
  );
};

export default SkeletonCard;
