/**
 * System Status Card Component
 *
 * Displays operational status including database, sync, and location information.
 * Supports two variants: systemForward (emphasizes database/sync) and locationForward (emphasizes store/station).
 *
 * Validates Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { useLoginTheme } from '../theme/LoginThemeProvider';

// ============================================================================
// Types
// ============================================================================

type SystemStatusVariant = 'systemForward' | 'locationForward';
type SyncStatus = 'online' | 'offline' | 'syncing' | 'checking';
type DatabaseStatus = 'connected' | 'disconnected' | 'error' | 'checking';

interface SystemStatusCardProps {
  variant?: SystemStatusVariant;
  databaseStatus: DatabaseStatus;
  syncStatus: SyncStatus;
  lastSyncTime?: Date | null;
  storeName: string;
  stationId: string;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format timestamp as human-readable relative time
 * Requirements 6.3
 */
function formatTimestamp(date: Date | null | undefined): string {
  if (!date) {
    return 'Never';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'Just now';
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// ============================================================================
// System Status Card Component
// ============================================================================

export function SystemStatusCard({
  variant = 'systemForward',
  databaseStatus,
  syncStatus,
  lastSyncTime,
  storeName,
  stationId,
  className,
}: SystemStatusCardProps) {
  const { config } = useLoginTheme();
  const { tokens } = config;

  // Determine status colors
  const getDatabaseStatusColor = () => {
    switch (databaseStatus) {
      case 'connected':
        return tokens.colors.status.success;
      case 'disconnected':
      case 'error':
        return tokens.colors.status.error;
      case 'checking':
        return tokens.colors.status.info;
      default:
        return tokens.colors.text.secondary;
    }
  };

  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'online':
        return tokens.colors.status.success;
      case 'syncing':
      case 'checking':
        return tokens.colors.status.info;
      case 'offline':
        return tokens.colors.status.warning;
      default:
        return tokens.colors.text.secondary;
    }
  };

  const getDatabaseStatusLabel = () => {
    switch (databaseStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Error';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  };

  const getSyncStatusLabel = () => {
    switch (syncStatus) {
      case 'online':
        return 'Online';
      case 'syncing':
        return 'Syncing...';
      case 'offline':
        return 'Offline';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  };

  // Variant-specific styling
  const isSystemForward = variant === 'systemForward';
  const primarySize = tokens.typography.fontSize.lg;
  const secondarySize = tokens.typography.fontSize.sm;

  return (
    <div
      className={`system-status-card ${className || ''}`}
      data-testid="system-status-card"
      data-variant={variant}
      style={{
        backgroundColor: tokens.colors.surface.primary,
        border: `1px solid ${tokens.colors.border.default}`,
        borderRadius: tokens.radius.card,
        padding: tokens.spacing.scale.lg,
      }}
    >
      {/* Database Status */}
      <div
        className="system-status-card__section"
        style={{
          marginBottom: tokens.spacing.scale.md,
          order: isSystemForward ? 1 : 3,
        }}
      >
        <div
          className="system-status-card__label"
          style={{
            fontSize: isSystemForward ? primarySize : secondarySize,
            fontWeight: isSystemForward
              ? tokens.typography.fontWeight.semibold
              : tokens.typography.fontWeight.medium,
            color: tokens.colors.text.secondary,
            marginBottom: tokens.spacing.scale.xs,
          }}
          data-testid="database-label"
        >
          Database
        </div>
        <div
          className="system-status-card__value"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.scale.xs,
          }}
        >
          <span
            className="system-status-card__indicator"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: getDatabaseStatusColor(),
            }}
            data-testid="database-indicator"
          />
          <span
            style={{
              fontSize: isSystemForward
                ? tokens.typography.fontSize.base
                : tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.medium,
              color: tokens.colors.text.primary,
            }}
            data-testid="database-status"
          >
            {getDatabaseStatusLabel()}
          </span>
        </div>
      </div>

      {/* Sync Status */}
      <div
        className="system-status-card__section"
        style={{
          marginBottom: tokens.spacing.scale.md,
          order: isSystemForward ? 2 : 4,
        }}
      >
        <div
          className="system-status-card__label"
          style={{
            fontSize: isSystemForward ? primarySize : secondarySize,
            fontWeight: isSystemForward
              ? tokens.typography.fontWeight.semibold
              : tokens.typography.fontWeight.medium,
            color: tokens.colors.text.secondary,
            marginBottom: tokens.spacing.scale.xs,
          }}
          data-testid="sync-label"
        >
          Sync Status
        </div>
        <div
          className="system-status-card__value"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.scale.xs,
          }}
        >
          <span
            className="system-status-card__indicator"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: getSyncStatusColor(),
            }}
            data-testid="sync-indicator"
          />
          <span
            style={{
              fontSize: isSystemForward
                ? tokens.typography.fontSize.base
                : tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.medium,
              color: tokens.colors.text.primary,
            }}
            data-testid="sync-status"
          >
            {getSyncStatusLabel()}
          </span>
        </div>
        {syncStatus === 'offline' && (
          <div
            className="system-status-card__offline-message"
            style={{
              marginTop: tokens.spacing.scale.xs,
              fontSize: tokens.typography.fontSize.xs,
              color: tokens.colors.status.warning,
            }}
            data-testid="offline-message"
          >
            Operating in offline mode
          </div>
        )}
      </div>

      {/* Last Sync Time */}
      <div
        className="system-status-card__section"
        style={{
          marginBottom: tokens.spacing.scale.md,
          order: isSystemForward ? 3 : 5,
        }}
      >
        <div
          className="system-status-card__label"
          style={{
            fontSize: secondarySize,
            fontWeight: tokens.typography.fontWeight.medium,
            color: tokens.colors.text.tertiary,
            marginBottom: tokens.spacing.scale.xs,
          }}
        >
          Last Sync
        </div>
        <div
          className="system-status-card__value"
          style={{
            fontSize: tokens.typography.fontSize.sm,
            color: tokens.colors.text.secondary,
          }}
          data-testid="last-sync-time"
        >
          {formatTimestamp(lastSyncTime)}
        </div>
      </div>

      {/* Store Name */}
      <div
        className="system-status-card__section"
        style={{
          marginBottom: tokens.spacing.scale.md,
          order: isSystemForward ? 4 : 1,
        }}
      >
        <div
          className="system-status-card__label"
          style={{
            fontSize: isSystemForward ? secondarySize : primarySize,
            fontWeight: isSystemForward
              ? tokens.typography.fontWeight.medium
              : tokens.typography.fontWeight.semibold,
            color: tokens.colors.text.secondary,
            marginBottom: tokens.spacing.scale.xs,
          }}
          data-testid="store-label"
        >
          Store
        </div>
        <div
          className="system-status-card__value"
          style={{
            fontSize: isSystemForward
              ? tokens.typography.fontSize.sm
              : tokens.typography.fontSize.base,
            fontWeight: tokens.typography.fontWeight.medium,
            color: tokens.colors.text.primary,
          }}
          data-testid="store-name"
        >
          {storeName}
        </div>
      </div>

      {/* Station ID */}
      <div
        className="system-status-card__section"
        style={{
          marginBottom: 0,
          order: isSystemForward ? 5 : 2,
        }}
      >
        <div
          className="system-status-card__label"
          style={{
            fontSize: isSystemForward ? secondarySize : primarySize,
            fontWeight: isSystemForward
              ? tokens.typography.fontWeight.medium
              : tokens.typography.fontWeight.semibold,
            color: tokens.colors.text.secondary,
            marginBottom: tokens.spacing.scale.xs,
          }}
          data-testid="station-label"
        >
          Station
        </div>
        <div
          className="system-status-card__value"
          style={{
            fontSize: isSystemForward
              ? tokens.typography.fontSize.sm
              : tokens.typography.fontSize.base,
            fontWeight: tokens.typography.fontWeight.medium,
            color: tokens.colors.text.primary,
          }}
          data-testid="station-id"
        >
          {stationId}
        </div>
      </div>

      <style>{`
        .system-status-card {
          display: flex;
          flex-direction: column;
        }

        .system-status-card__section {
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type { SystemStatusCardProps, SystemStatusVariant, SyncStatus, DatabaseStatus };
export { formatTimestamp };
