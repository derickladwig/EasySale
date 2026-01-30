import React from 'react';
import { cn } from '../../utils/classNames';

export type StatusType = 'online' | 'offline' | 'syncing' | 'synced' | 'error';
export type StatusSize = 'sm' | 'md' | 'lg';

export interface StatusIndicatorProps {
  /** Status type to display */
  status: StatusType;

  /** Optional label text */
  label?: string;

  /** Whether to show the label */
  showLabel?: boolean;

  /** Size of the indicator */
  size?: StatusSize;

  /** Count to display in badge (optional) */
  count?: number;

  /** Tooltip text for additional context */
  tooltip?: string;

  /** Additional CSS classes */
  className?: string;
}

// Status color mappings (using design tokens) - Req 14.1
const statusColors: Record<StatusType, string> = {
  online: 'bg-status-online',      // Green
  offline: 'bg-status-offline',    // Red
  syncing: 'bg-status-syncing',    // Blue
  synced: 'bg-status-synced',      // Green
  error: 'bg-status-error',        // Red
};

// Status text color mappings for labels
const statusTextColors: Record<StatusType, string> = {
  online: 'text-status-online',
  offline: 'text-status-offline',
  syncing: 'text-status-syncing',
  synced: 'text-status-synced',
  error: 'text-status-error',
};

// Status label text - Req 14.3
const statusLabels: Record<StatusType, string> = {
  online: 'Online',
  offline: 'Offline',
  syncing: 'Syncing...',
  synced: 'Synced',
  error: 'Error',
};

// Size mappings for the dot - Req 14.5
const dotSizes: Record<StatusSize, string> = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

// Size mappings for the text - Req 14.5
const textSizes: Record<StatusSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

// Size mappings for badge - Req 14.4
const badgeSizes: Record<StatusSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5 min-w-[16px]',
  md: 'text-xs px-2 py-0.5 min-w-[20px]',
  lg: 'text-sm px-2.5 py-1 min-w-[24px]',
};

/**
 * StatusIndicator Component
 *
 * Displays a colored dot indicator for various status states.
 * Supports animated syncing state, optional labels, count badges, and tooltips.
 *
 * Requirements:
 * - 14.1: Consistent colors (online: green, offline: red, syncing: blue)
 * - 14.2: Animated pulse for active states
 * - 14.3: Text labels alongside icons
 * - 14.4: Badge for count indicators
 * - 14.5: Different sizes (sm, md, lg)
 * - 14.6: Tooltips for additional context
 *
 * @example
 * // Basic status indicator
 * <StatusIndicator status="online" />
 *
 * @example
 * // With label
 * <StatusIndicator status="syncing" showLabel />
 *
 * @example
 * // With count badge
 * <StatusIndicator status="error" count={5} showLabel />
 *
 * @example
 * // With tooltip
 * <StatusIndicator status="online" tooltip="Connected to server" showLabel size="lg" />
 */
export const StatusIndicator = React.forwardRef<HTMLDivElement, StatusIndicatorProps>(
  ({ status, label, showLabel = false, size = 'md', count, tooltip, className }, ref) => {
    const displayLabel = label || statusLabels[status];
    const isSyncing = status === 'syncing';
    const isError = status === 'error';

    return (
      <div 
        ref={ref} 
        className={cn('inline-flex items-center gap-2', className)}
        title={tooltip} // Req 14.6: Tooltip support
      >
        <div className="relative">
          {/* Main status dot - Req 14.1: Consistent colors */}
          <div
            className={cn(
              'rounded-full',
              dotSizes[size],
              statusColors[status],
              // Req 14.2: Animated pulse for active states (syncing)
              isSyncing && 'animate-pulse',
              // Req 14.10: Pulse red on error
              isError && 'animate-pulse-fast'
            )}
            aria-hidden="true"
          />

          {/* Syncing animation ring - Req 14.2 */}
          {isSyncing && (
            <div
              className={cn(
                'absolute inset-0 rounded-full',
                statusColors[status],
                'animate-ping opacity-75'
              )}
              aria-hidden="true"
            />
          )}

          {/* Error pulse ring - Req 14.10 */}
          {isError && (
            <div
              className={cn(
                'absolute inset-0 rounded-full',
                statusColors[status],
                'animate-ping opacity-75'
              )}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Req 14.3: Text labels alongside icons */}
        {showLabel && (
          <span className={cn('font-medium', statusTextColors[status], textSizes[size])}>
            {displayLabel}
          </span>
        )}

        {/* Req 14.4: Badge for count indicators */}
        {count !== undefined && count > 0 && (
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-full font-semibold',
              badgeSizes[size],
              statusColors[status],
              'text-white'
            )}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}

        {/* Screen reader text */}
        <span className="sr-only">
          Status: {displayLabel}
          {count !== undefined && count > 0 && ` (${count})`}
          {tooltip && ` - ${tooltip}`}
        </span>
      </div>
    );
  }
);

StatusIndicator.displayName = 'StatusIndicator';
