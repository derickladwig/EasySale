import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface SyncProgressIndicatorProps {
  /** Whether syncing is in progress */
  isSyncing?: boolean;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Number of items synced */
  itemsSynced?: number;
  /** Total number of items to sync */
  totalItems?: number;
  /** Custom message to display */
  message?: string;
  /** Size of the indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

/**
 * SyncProgressIndicator Component
 *
 * Displays a progress indicator when syncing is in progress.
 * Requirement 14.9: Show progress indicator when syncing
 *
 * @example
 * // Basic sync indicator
 * <SyncProgressIndicator isSyncing={true} />
 *
 * @example
 * // With progress percentage
 * <SyncProgressIndicator isSyncing={true} progress={65} />
 *
 * @example
 * // With item count
 * <SyncProgressIndicator 
 *   isSyncing={true} 
 *   itemsSynced={45} 
 *   totalItems={100}
 * />
 */
export const SyncProgressIndicator: React.FC<SyncProgressIndicatorProps> = ({
  isSyncing = false,
  progress,
  itemsSynced,
  totalItems,
  message,
  size = 'md',
  className,
}) => {
  if (!isSyncing) {
    return null;
  }

  // Calculate progress if items are provided
  const calculatedProgress = 
    progress !== undefined 
      ? progress 
      : itemsSynced !== undefined && totalItems !== undefined && totalItems > 0
        ? Math.round((itemsSynced / totalItems) * 100)
        : undefined;

  // Generate message
  const displayMessage = 
    message || 
    (itemsSynced !== undefined && totalItems !== undefined
      ? `Syncing ${itemsSynced} of ${totalItems} items...`
      : 'Syncing...');

  const sizeClasses = {
    sm: {
      container: 'px-3 py-2',
      icon: 16,
      text: 'text-xs',
      progress: 'h-1',
    },
    md: {
      container: 'px-4 py-2.5',
      icon: 18,
      text: 'text-sm',
      progress: 'h-1.5',
    },
    lg: {
      container: 'px-5 py-3',
      icon: 20,
      text: 'text-base',
      progress: 'h-2',
    },
  };

  const sizeConfig = sizeClasses[size];

  return (
    <div
      className={cn(
        'inline-flex flex-col gap-2 bg-status-syncing/20 border border-status-syncing/30 rounded-lg',
        sizeConfig.container,
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <RefreshCw 
          size={sizeConfig.icon} 
          className="text-status-syncing animate-spin flex-shrink-0" 
        />
        <span className={cn('font-medium text-status-syncing', sizeConfig.text)}>
          {displayMessage}
        </span>
      </div>

      {/* Progress bar */}
      {calculatedProgress !== undefined && (
        <div className={cn('w-full bg-surface-base rounded-full overflow-hidden', sizeConfig.progress)}>
          <div
            className="h-full bg-status-syncing transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, calculatedProgress))}%` }}
            role="progressbar"
            aria-valuenow={calculatedProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}

      {/* Screen reader text */}
      <span className="sr-only">
        {displayMessage}
        {calculatedProgress !== undefined && ` - ${calculatedProgress}% complete`}
      </span>
    </div>
  );
};
