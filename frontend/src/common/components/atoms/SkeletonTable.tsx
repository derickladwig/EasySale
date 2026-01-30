/**
 * SkeletonTable Component
 *
 * Skeleton placeholder for table components.
 * Matches the shape of the DataTable component with configurable rows and columns.
 *
 * Requirements:
 * - 12.1: Use skeleton screens for content loading
 * - 12.5: Match the shape of the content being loaded
 * - 12.6: Use subtle pulsing animation for skeletons
 *
 * @example
 * // Basic table skeleton
 * <SkeletonTable rows={5} columns={4} />
 *
 * @example
 * // Table skeleton with header
 * <SkeletonTable rows={10} columns={6} showHeader />
 *
 * @example
 * // Mobile card layout skeleton
 * <SkeletonTable rows={5} columns={4} mobileCardLayout />
 */

import React from 'react';
import { cn } from '../../utils/classNames';
import { Skeleton } from './Skeleton';

export interface SkeletonTableProps {
  /** Number of skeleton rows to display */
  rows?: number;

  /** Number of columns */
  columns?: number;

  /** Whether to show header skeleton */
  showHeader?: boolean;

  /** Whether to show selection checkboxes */
  showSelection?: boolean;

  /** Whether to use mobile card layout */
  mobileCardLayout?: boolean;

  /** Additional CSS classes */
  className?: string;
}

/**
 * SkeletonTableRow Component
 * Displays a single skeleton row for table
 */
const SkeletonTableRow: React.FC<{ columnCount: number; showSelection?: boolean }> = ({
  columnCount,
  showSelection,
}) => {
  const totalColumns = showSelection ? columnCount + 1 : columnCount;

  return (
    <tr className="border-b border-border-light">
      {Array.from({ length: totalColumns }).map((_, index) => (
        <td key={index} className="px-4 py-3">
          {showSelection && index === 0 ? (
            <Skeleton className="w-4 h-4" />
          ) : (
            <Skeleton className="h-4 w-full" />
          )}
        </td>
      ))}
    </tr>
  );
};

/**
 * SkeletonTableHeader Component
 * Displays skeleton header for table
 */
const SkeletonTableHeader: React.FC<{ columnCount: number; showSelection?: boolean }> = ({
  columnCount,
  showSelection,
}) => {
  const totalColumns = showSelection ? columnCount + 1 : columnCount;

  return (
    <thead className="bg-background-tertiary/50 border-b-2 border-border-DEFAULT">
      <tr>
        {Array.from({ length: totalColumns }).map((_, index) => (
          <th key={index} className="px-4 py-3 text-left">
            {showSelection && index === 0 ? (
              <Skeleton className="w-4 h-4" />
            ) : (
              <Skeleton className="h-4 w-24" />
            )}
          </th>
        ))}
      </tr>
    </thead>
  );
};

/**
 * SkeletonTableCard Component
 * Displays skeleton in mobile card layout
 */
const SkeletonTableCard: React.FC = () => {
  return (
    <div className="bg-background-secondary border border-border-light rounded-lg p-4 space-y-2">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="pt-2 flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
};

/**
 * SkeletonTable Component
 * Displays a skeleton placeholder matching the DataTable component structure
 */
export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  showSelection = false,
  mobileCardLayout = true,
  className,
}) => {
  return (
    <div className={cn('w-full', className)} role="status" aria-busy="true">
      {/* Mobile card layout (visible on small screens) */}
      {mobileCardLayout && (
        <div className="md:hidden space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <SkeletonTableCard key={`mobile-skeleton-${index}`} />
          ))}
        </div>
      )}

      {/* Desktop table layout (hidden on small screens) */}
      <div className={cn('overflow-x-auto', mobileCardLayout && 'hidden md:block')}>
        <table className="w-full border-collapse">
          {showHeader && <SkeletonTableHeader columnCount={columns} showSelection={showSelection} />}
          <tbody>
            {Array.from({ length: rows }).map((_, index) => (
              <SkeletonTableRow
                key={`skeleton-row-${index}`}
                columnCount={columns}
                showSelection={showSelection}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * SkeletonTableWithPagination Component
 * Displays a skeleton table with pagination controls
 */
export interface SkeletonTableWithPaginationProps extends SkeletonTableProps {
  /** Whether to show pagination skeleton */
  showPagination?: boolean;
}

export const SkeletonTableWithPagination: React.FC<SkeletonTableWithPaginationProps> = ({
  showPagination = true,
  ...tableProps
}) => {
  return (
    <div className="space-y-4">
      <SkeletonTable {...tableProps} />

      {showPagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-light">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      )}
    </div>
  );
};

export default SkeletonTable;
