/**
 * Skeleton Screen Components
 *
 * Specialized skeleton components for common UI patterns.
 * Provides loading placeholders for cards, tables, and forms.
 *
 * Requirements:
 * - 12.1: Use skeleton screens for content loading
 * - 12.5: Match the shape of the content being loaded
 * - 12.6: Use subtle pulsing animation for skeletons
 *
 * @example
 * // Card skeleton
 * <SkeletonCard hasHeader hasFooter />
 *
 * @example
 * // Table skeleton
 * <SkeletonTable rows={5} columns={4} />
 *
 * @example
 * // Form skeleton
 * <SkeletonForm fields={3} hasSubmitButton />
 */

import React from 'react';
import { cn } from '../../utils/classNames';
import { Skeleton, SkeletonText } from './Skeleton';

/**
 * SkeletonCard Component
 * Displays a skeleton placeholder for card components
 *
 * Validates: Requirements 12.1, 12.5, 12.6
 */
export interface SkeletonCardProps {
  /** Whether to show header skeleton */
  hasHeader?: boolean;

  /** Whether to show footer skeleton */
  hasFooter?: boolean;

  /** Number of content lines to display */
  contentLines?: number;

  /** Additional CSS classes */
  className?: string;

  /** Card padding size */
  padding?: 'sm' | 'md' | 'lg';
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  hasHeader = false,
  hasFooter = false,
  contentLines = 3,
  className,
  padding = 'md',
}) => {
  const paddingClass = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding];

  return (
    <div
      className={cn(
        'bg-background-secondary rounded-lg border border-border-light shadow-md',
        className
      )}
      role="status"
      aria-busy="true"
      aria-label="Loading card content"
    >
      {/* Header skeleton */}
      {hasHeader && (
        <div className={cn(paddingClass, 'border-b border-border-light')}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      )}

      {/* Body skeleton */}
      <div className={paddingClass}>
        <SkeletonText lines={contentLines} lastLineWidth="70%" />
      </div>

      {/* Footer skeleton */}
      {hasFooter && (
        <div
          className={cn(
            paddingClass,
            'border-t border-border-light bg-background-primary/50'
          )}
        >
          <div className="flex items-center justify-end gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * SkeletonTable Component
 * Displays a skeleton placeholder for table components
 *
 * Validates: Requirements 12.1, 12.5, 12.6
 */
export interface SkeletonTableProps {
  /** Number of rows to display */
  rows?: number;

  /** Number of columns to display */
  columns?: number;

  /** Whether to show header row */
  showHeader?: boolean;

  /** Whether to show selection checkboxes */
  showSelection?: boolean;

  /** Whether to show action column */
  showActions?: boolean;

  /** Additional CSS classes */
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  showSelection = false,
  showActions = false,
  className,
}) => {
  // Calculate total columns including selection and actions
  const _totalColumns = columns + (showSelection ? 1 : 0) + (showActions ? 1 : 0);

  return (
    <div
      className={cn('w-full overflow-hidden rounded-lg border border-border-light', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading table content"
    >
      <table className="w-full">
        {/* Header skeleton */}
        {showHeader && (
          <thead className="bg-background-tertiary border-b border-border-light">
            <tr>
              {showSelection && (
                <th className="w-12 px-4 py-3">
                  <Skeleton className="h-4 w-4 mx-auto" />
                </th>
              )}
              {Array.from({ length: columns }).map((_, index) => (
                <th key={`header-${index}`} className="px-4 py-3 text-left">
                  <Skeleton className="h-4 w-24" />
                </th>
              ))}
              {showActions && (
                <th className="w-24 px-4 py-3">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </th>
              )}
            </tr>
          </thead>
        )}

        {/* Body skeleton rows */}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr
              key={`row-${rowIndex}`}
              className={cn(
                'border-b border-border-light',
                rowIndex % 2 === 0 ? 'bg-background-secondary' : 'bg-background-primary'
              )}
            >
              {showSelection && (
                <td className="w-12 px-4 py-3">
                  <Skeleton className="h-4 w-4 mx-auto" />
                </td>
              )}
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={`cell-${rowIndex}-${colIndex}`} className="px-4 py-3">
                  <Skeleton
                    className="h-4"
                    width={`${Math.floor(Math.random() * 40) + 60}%`}
                  />
                </td>
              ))}
              {showActions && (
                <td className="w-24 px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * SkeletonForm Component
 * Displays a skeleton placeholder for form components
 *
 * Validates: Requirements 12.1, 12.5, 12.6
 */
export interface SkeletonFormProps {
  /** Number of form fields to display */
  fields?: number;

  /** Whether to show submit button */
  hasSubmitButton?: boolean;

  /** Whether to show cancel button */
  hasCancelButton?: boolean;

  /** Layout orientation */
  layout?: 'vertical' | 'horizontal';

  /** Additional CSS classes */
  className?: string;
}

export const SkeletonForm: React.FC<SkeletonFormProps> = ({
  fields = 3,
  hasSubmitButton = true,
  hasCancelButton = false,
  layout = 'vertical',
  className,
}) => {
  return (
    <div
      className={cn('space-y-6', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading form content"
    >
      {/* Form fields */}
      {Array.from({ length: fields }).map((_, index) => (
        <div
          key={`field-${index}`}
          className={cn(layout === 'horizontal' && 'flex items-center gap-4')}
        >
          {/* Label */}
          <div className={cn(layout === 'horizontal' && 'w-1/3')}>
            <Skeleton className="h-4 w-24 mb-2" />
          </div>

          {/* Input */}
          <div className={cn(layout === 'horizontal' && 'flex-1')}>
            <Skeleton className="h-11 w-full rounded-lg" />
            {/* Helper text */}
            <Skeleton className="h-3 w-2/3 mt-1.5" />
          </div>
        </div>
      ))}

      {/* Action buttons */}
      {(hasSubmitButton || hasCancelButton) && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-light">
          {hasCancelButton && <Skeleton className="h-11 w-24 rounded-lg" />}
          {hasSubmitButton && <Skeleton className="h-11 w-32 rounded-lg" />}
        </div>
      )}
    </div>
  );
};

/**
 * SkeletonList Component
 * Displays a skeleton placeholder for list components
 *
 * Validates: Requirements 12.1, 12.5, 12.6
 */
export interface SkeletonListProps {
  /** Number of list items to display */
  items?: number;

  /** Whether to show avatar/icon */
  showAvatar?: boolean;

  /** Whether to show secondary text */
  showSecondaryText?: boolean;

  /** Whether to show action button */
  showAction?: boolean;

  /** Additional CSS classes */
  className?: string;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  items = 5,
  showAvatar = true,
  showSecondaryText = true,
  showAction = false,
  className,
}) => {
  return (
    <div
      className={cn('space-y-3', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading list content"
    >
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={`item-${index}`}
          className="flex items-center gap-4 p-4 bg-background-secondary rounded-lg border border-border-light"
        >
          {/* Avatar/Icon */}
          {showAvatar && <Skeleton variant="circle" className="w-12 h-12 flex-shrink-0" />}

          {/* Content */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            {showSecondaryText && <Skeleton className="h-3 w-1/2" />}
          </div>

          {/* Action */}
          {showAction && <Skeleton className="h-9 w-20 flex-shrink-0" />}
        </div>
      ))}
    </div>
  );
};

/**
 * SkeletonGrid Component
 * Displays a skeleton placeholder for grid layouts
 *
 * Validates: Requirements 12.1, 12.5, 12.6
 */
export interface SkeletonGridProps {
  /** Number of grid items to display */
  items?: number;

  /** Number of columns */
  columns?: 1 | 2 | 3 | 4 | 6;

  /** Whether items have images */
  hasImage?: boolean;

  /** Additional CSS classes */
  className?: string;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({
  items = 6,
  columns = 3,
  hasImage = true,
  className,
}) => {
  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  }[columns];

  return (
    <div
      className={cn('grid gap-4 md:gap-6', gridColsClass, className)}
      role="status"
      aria-busy="true"
      aria-label="Loading grid content"
    >
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={`grid-item-${index}`}
          className="bg-background-secondary rounded-lg border border-border-light overflow-hidden"
        >
          {/* Image */}
          {hasImage && <Skeleton className="w-full h-48 rounded-none" />}

          {/* Content */}
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <SkeletonText lines={2} lastLineWidth="60%" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * SkeletonDashboard Component
 * Displays a skeleton placeholder for dashboard layouts
 *
 * Validates: Requirements 12.1, 12.5, 12.6
 */
export interface SkeletonDashboardProps {
  /** Whether to show header */
  showHeader?: boolean;

  /** Number of stat cards to display */
  statCards?: number;

  /** Whether to show chart area */
  showChart?: boolean;

  /** Additional CSS classes */
  className?: string;
}

export const SkeletonDashboard: React.FC<SkeletonDashboardProps> = ({
  showHeader = true,
  statCards = 4,
  showChart = true,
  className,
}) => {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-busy="true">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: statCards }).map((_, index) => (
          <div
            key={`stat-${index}`}
            className="bg-background-secondary rounded-lg border border-border-light p-6"
          >
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      {showChart && (
        <div className="bg-background-secondary rounded-lg border border-border-light p-6">
          <Skeleton className="h-6 w-40 mb-6" />
          <Skeleton className="h-64 w-full rounded" />
        </div>
      )}
    </div>
  );
};

// Export all skeleton components
export default {
  SkeletonCard,
  SkeletonTable,
  SkeletonForm,
  SkeletonList,
  SkeletonGrid,
  SkeletonDashboard,
};
