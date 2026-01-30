import React from 'react';
import { cn } from '../../utils/classNames';

export interface EmptyChartProps {
  /** Main message to display (e.g., "Not enough data to display chart") */
  message: string;

  /** Optional context message providing additional guidance (e.g., "Add transactions to see trends") */
  context?: string;

  /** Additional CSS classes */
  className?: string;
}

/**
 * EmptyChart Component
 *
 * Displays a helpful message in chart and metrics areas when there's not enough data
 * to display visualizations. Prevents NaN, undefined, or blank areas from appearing.
 *
 * Features:
 * - Clear messaging when data is insufficient
 * - Optional context to guide users on how to populate data
 * - Consistent styling for chart/metrics areas
 * - Accessible format with proper ARIA labels
 * - Prevents runtime errors from empty data
 *
 * @example
 * // Basic empty chart
 * <EmptyChart
 *   message="Not enough data to display chart"
 * />
 *
 * @example
 * // With context
 * <EmptyChart
 *   message="Not enough data to display metrics"
 *   context="Add transactions to see trends"
 * />
 */
export const EmptyChart = React.forwardRef<HTMLDivElement, EmptyChartProps>(
  ({ message, context, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center',
          'min-h-[300px] p-6 text-center',
          'bg-surface-base rounded-lg border border-border',
          className
        )}
        role="status"
        aria-live="polite"
      >
        {/* Chart icon placeholder */}
        <div className="mb-4 text-text-disabled" aria-hidden="true">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>

        {/* Main message */}
        <p className="text-base font-medium text-text-secondary mb-2">{message}</p>

        {/* Context message */}
        {context && <p className="text-sm text-text-tertiary">{context}</p>}
      </div>
    );
  }
);

EmptyChart.displayName = 'EmptyChart';
