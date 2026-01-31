import React from 'react';
import { cn } from '../../utils/classNames';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  AlertTriangle,
  Plug,
  PlugZap,
  ShieldAlert
} from 'lucide-react';

/**
 * Connector status values
 */
export type ConnectorStatus = 
  | 'connected' 
  | 'disconnected' 
  | 'degraded' 
  | 'reauth_required' 
  | 'error';

/**
 * Sync run status values
 */
export type SyncRunStatus = 
  | 'queued' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'skipped';

/**
 * Circuit breaker state values
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half_open';

export type StatusChipStatus = ConnectorStatus | SyncRunStatus | CircuitBreakerState;

export type StatusChipSize = 'sm' | 'md';

export interface StatusChipProps {
  /** Status to display */
  status: StatusChipStatus;
  /** Size variant */
  size?: StatusChipSize;
  /** Whether to show the icon */
  showIcon?: boolean;
  /** Whether to show the label */
  showLabel?: boolean;
  /** Custom label override */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Status to semantic color token mapping
 * Uses semantic tokens from tokens.css
 */
const statusColors: Record<StatusChipStatus, { bg: string; text: string; border: string }> = {
  // Connector statuses
  connected: { 
    bg: 'bg-success-500/20', 
    text: 'text-success-400', 
    border: 'border-success-500/30' 
  },
  disconnected: { 
    bg: 'bg-surface-elevated', 
    text: 'text-text-tertiary', 
    border: 'border-border-default' 
  },
  degraded: { 
    bg: 'bg-warning-500/20', 
    text: 'text-warning-400', 
    border: 'border-warning-500/30' 
  },
  reauth_required: { 
    bg: 'bg-warning-500/20', 
    text: 'text-warning-400', 
    border: 'border-warning-500/30' 
  },
  error: { 
    bg: 'bg-error-500/20', 
    text: 'text-error-400', 
    border: 'border-error-500/30' 
  },
  // Sync run statuses
  queued: { 
    bg: 'bg-surface-elevated', 
    text: 'text-text-tertiary', 
    border: 'border-border-default' 
  },
  running: { 
    bg: 'bg-primary-500/20', 
    text: 'text-primary-400', 
    border: 'border-primary-500/30' 
  },
  completed: { 
    bg: 'bg-success-500/20', 
    text: 'text-success-400', 
    border: 'border-success-500/30' 
  },
  failed: { 
    bg: 'bg-error-500/20', 
    text: 'text-error-400', 
    border: 'border-error-500/30' 
  },
  skipped: { 
    bg: 'bg-surface-elevated', 
    text: 'text-text-tertiary', 
    border: 'border-border-default' 
  },
  // Circuit breaker states
  closed: { 
    bg: 'bg-success-500/20', 
    text: 'text-success-400', 
    border: 'border-success-500/30' 
  },
  open: { 
    bg: 'bg-error-500/20', 
    text: 'text-error-400', 
    border: 'border-error-500/30' 
  },
  half_open: { 
    bg: 'bg-warning-500/20', 
    text: 'text-warning-400', 
    border: 'border-warning-500/30' 
  },
};

/**
 * Status to label mapping
 */
const statusLabels: Record<StatusChipStatus, string> = {
  // Connector statuses
  connected: 'Connected',
  disconnected: 'Disconnected',
  degraded: 'Degraded',
  reauth_required: 'Re-auth Required',
  error: 'Error',
  // Sync run statuses
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  skipped: 'Skipped',
  // Circuit breaker states
  closed: 'Healthy',
  open: 'Circuit Open',
  half_open: 'Recovering',
};

/**
 * Get icon component for status
 */
function getStatusIcon(status: StatusChipStatus, size: StatusChipSize): React.ReactNode {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const spinClass = status === 'running' ? 'animate-spin' : '';
  
  switch (status) {
    // Connector statuses
    case 'connected':
      return <Plug className={cn(iconSize)} />;
    case 'disconnected':
      return <PlugZap className={cn(iconSize)} />;
    case 'degraded':
      return <AlertTriangle className={cn(iconSize)} />;
    case 'reauth_required':
      return <ShieldAlert className={cn(iconSize)} />;
    case 'error':
      return <XCircle className={cn(iconSize)} />;
    // Sync run statuses
    case 'queued':
      return <Clock className={cn(iconSize)} />;
    case 'running':
      return <RefreshCw className={cn(iconSize, spinClass)} />;
    case 'completed':
      return <CheckCircle className={cn(iconSize)} />;
    case 'failed':
      return <XCircle className={cn(iconSize)} />;
    case 'skipped':
      return <Clock className={cn(iconSize)} />;
    // Circuit breaker states
    case 'closed':
      return <CheckCircle className={cn(iconSize)} />;
    case 'open':
      return <XCircle className={cn(iconSize)} />;
    case 'half_open':
      return <AlertTriangle className={cn(iconSize)} />;
    default:
      return <Clock className={cn(iconSize)} />;
  }
}

/**
 * Size mappings
 */
const sizeClasses: Record<StatusChipSize, string> = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-sm gap-1.5',
};

/**
 * StatusChip Component
 * 
 * Displays a status badge with icon and label for connector statuses,
 * sync run statuses, and circuit breaker states.
 * 
 * Uses semantic color tokens from tokens.css for theming compliance.
 * 
 * Validates: Requirements 2.3, 2.4
 * 
 * @example
 * // Connector status
 * <StatusChip status="connected" />
 * 
 * @example
 * // Sync run status with running animation
 * <StatusChip status="running" size="md" />
 * 
 * @example
 * // Circuit breaker state
 * <StatusChip status="open" showLabel />
 */
export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  size = 'md',
  showIcon = true,
  showLabel = true,
  label,
  className,
}) => {
  const colors = statusColors[status];
  const displayLabel = label || statusLabels[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        sizeClasses[size],
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
      role="status"
      aria-label={displayLabel}
    >
      {showIcon && getStatusIcon(status, size)}
      {showLabel && <span>{displayLabel}</span>}
    </span>
  );
};

export default StatusChip;
