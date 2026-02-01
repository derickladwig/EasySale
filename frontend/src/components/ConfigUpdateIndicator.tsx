/**
 * Configuration Update Indicator
 * Shows WebSocket connection status for configuration hot-reload
 * Only visible in development/demo modes
 */

import { useConfig } from '../config/ConfigProvider';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '../common/utils/classNames';

export interface ConfigUpdateIndicatorProps {
  /** Position of the indicator (default: 'bottom-right') */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Show only when there's an issue (default: false) */
  showOnlyOnError?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Displays the current WebSocket connection status for configuration updates
 * 
 * @example
 * ```tsx
 * // Show in corner (always visible)
 * <ConfigUpdateIndicator position="bottom-right" />
 * 
 * // Show only when there's an error
 * <ConfigUpdateIndicator showOnlyOnError />
 * ```
 */
export function ConfigUpdateIndicator({
  position = 'bottom-right',
  showOnlyOnError = false,
  className,
}: ConfigUpdateIndicatorProps) {
  const { wsStatus, wsError, profile } = useConfig();

  // Only show in dev/demo modes
  if (profile === 'prod') {
    return null;
  }

  // Hide if showOnlyOnError is true and status is connected
  if (showOnlyOnError && wsStatus === 'connected' && !wsError) {
    return null;
  }

  // Determine icon and styling based on status
  const getStatusDisplay = () => {
    switch (wsStatus) {
      case 'connected':
        return {
          icon: Wifi,
          label: 'Config sync active',
          className: 'bg-success-100 text-success-700 border-success-300',
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          label: 'Connecting...',
          className: 'bg-warning-100 text-warning-700 border-warning-300 animate-pulse',
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          label: 'Config sync offline',
          className: 'bg-surface-elevated text-text-secondary border-border-default',
        };
      case 'error':
        return {
          icon: AlertCircle,
          label: wsError || 'Connection error',
          className: 'bg-error-100 text-error-700 border-error-300',
        };
      default:
        return {
          icon: WifiOff,
          label: 'Unknown status',
          className: 'bg-surface-elevated text-text-secondary border-border-default',
        };
    }
  };

  const { icon: Icon, label, className: statusClassName } = getStatusDisplay();

  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div
      className={cn(
        'fixed z-50 flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm text-sm font-medium',
        'transition-all duration-200',
        positionClasses[position],
        statusClassName,
        className
      )}
      role="status"
      aria-live="polite"
      title={label}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

/**
 * Compact version that only shows an icon
 */
export function ConfigUpdateIndicatorCompact({
  position = 'bottom-right',
  className,
}: Omit<ConfigUpdateIndicatorProps, 'showOnlyOnError'>) {
  const { wsStatus, wsError, profile } = useConfig();

  // Only show in dev/demo modes
  if (profile === 'prod') {
    return null;
  }

  // Determine icon based on status
  const getStatusIcon = () => {
    switch (wsStatus) {
      case 'connected':
        return { icon: Wifi, className: 'text-success-600' };
      case 'connecting':
        return { icon: RefreshCw, className: 'text-warning-600 animate-spin' };
      case 'disconnected':
        return { icon: WifiOff, className: 'text-text-tertiary' };
      case 'error':
        return { icon: AlertCircle, className: 'text-error-600' };
      default:
        return { icon: WifiOff, className: 'text-text-tertiary' };
    }
  };

  const { icon: Icon, className: iconClassName } = getStatusIcon();

  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const label = wsStatus === 'error' && wsError ? wsError : `Config sync: ${wsStatus}`;

  return (
    <div
      className={cn(
        'fixed z-50 p-2 rounded-full bg-surface-elevated border border-border-default shadow-sm',
        'transition-all duration-200',
        positionClasses[position],
        className
      )}
      role="status"
      aria-live="polite"
      title={label}
    >
      <Icon className={cn('w-4 h-4', iconClassName)} aria-hidden="true" />
    </div>
  );
}
