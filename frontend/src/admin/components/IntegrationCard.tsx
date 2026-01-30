/**
 * IntegrationCard Component
 * 
 * Displays integration status and provides actions for managing integrations.
 * 
 * States:
 * - Empty state: Integration is disconnected (not configured)
 * - Connected state: Integration is active and working
 * - Error state: Integration has an error
 * - Disabled state: Capability is off (feature not enabled)
 * - Bug state: Capability is on but backend is missing (this is a bug)
 * 
 * Validates: Requirements 10.1, 10.2
 */

import React from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Plug,
  Settings as SettingsIcon,
  TestTube,
  Power
} from 'lucide-react';
import { cn } from '@common/utils/classNames';

export interface IntegrationCardProps {
  /** Unique identifier for the integration */
  id: string;
  
  /** Display name of the integration */
  name: string;
  
  /** Description of what the integration does */
  description: string;
  
  /** Current connection status */
  status: 'connected' | 'not_connected' | 'error' | 'syncing';
  
  /** Icon component or icon name */
  icon?: React.ReactNode;
  
  /** Whether the integration is enabled (toggle state) */
  enabled?: boolean;
  
  /** Configuration data for the integration */
  config?: {
    storeUrl?: string;
    lastSync?: string;
    errorMessage?: string;
  };
  
  /** Whether the capability for this integration is enabled in the backend */
  capabilityEnabled?: boolean;
  
  /** Reason why the integration is disabled (if capability is off) */
  disabledReason?: string;
  
  /** Whether the backend endpoint exists for this integration */
  backendAvailable?: boolean;
  
  /** Action handlers */
  actions?: {
    onConnect?: () => void;
    onConfigure?: () => void;
    onTestConnection?: () => void;
    onDisconnect?: () => void;
    onToggle?: (enabled: boolean) => void;
  };
  
  /** Whether to show the configuration panel */
  showConfig?: boolean;
  
  /** Configuration panel content */
  configContent?: React.ReactNode;
}

// Display state type includes both status values and derived states
type DisplayState = 'connected' | 'not_connected' | 'error' | 'syncing' | 'bug' | 'disabled';

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  id,
  name,
  description,
  status,
  icon,
  enabled = false,
  config,
  capabilityEnabled = true,
  disabledReason,
  backendAvailable = true,
  actions,
  showConfig = false,
  configContent,
}) => {
  // Determine the display state
  const getDisplayState = (): DisplayState => {
    // Bug state: capability is on but backend is missing
    if (capabilityEnabled && !backendAvailable) {
      return 'bug';
    }
    
    // Disabled state: capability is off
    if (!capabilityEnabled) {
      return 'disabled';
    }
    
    // Normal states
    return status;
  };

  const displayState: DisplayState = getDisplayState();

  // Get status icon based on display state
  const getStatusIcon = () => {
    switch (displayState) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-success-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-error-400" />;
      case 'syncing':
        return <Clock className="w-5 h-5 text-primary-400 animate-pulse" />;
      case 'bug':
        return <AlertTriangle className="w-5 h-5 text-warning-400" />;
      case 'disabled':
        return <Power className="w-5 h-5 text-text-disabled" />;
      default:
        return <Plug className="w-5 h-5 text-text-disabled" />;
    }
  };

  // Get status badge styling
  const getStatusBadge = () => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded';
    
    switch (displayState) {
      case 'connected':
        return cn(baseClasses, 'bg-success-500/20 text-success-400');
      case 'error':
        return cn(baseClasses, 'bg-error-500/20 text-error-400');
      case 'syncing':
        return cn(baseClasses, 'bg-primary-500/20 text-primary-400');
      case 'bug':
        return cn(baseClasses, 'bg-warning-500/20 text-warning-400');
      case 'disabled':
        return cn(baseClasses, 'bg-surface-elevated text-text-disabled');
      default:
        return cn(baseClasses, 'bg-surface-elevated text-text-tertiary');
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (displayState) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Error';
      case 'syncing':
        return 'Syncing...';
      case 'bug':
        return 'Backend Missing';
      case 'disabled':
        return 'Disabled';
      default:
        return 'Not Connected';
    }
  };

  // Render empty state for disconnected integrations
  const renderEmptyState = () => (
    <div className="text-center py-6">
      <div className="flex justify-center mb-3">
        {icon || <Plug className="w-12 h-12 text-text-disabled" />}
      </div>
      <p className="text-sm text-text-tertiary mb-4">
        Connect your {name} account to sync data automatically.
      </p>
      {actions?.onConnect && (
        <Button
          onClick={actions.onConnect}
          variant="primary"
          size="sm"
          disabled={displayState === 'disabled' || displayState === 'bug'}
        >
          Connect {name}
        </Button>
      )}
    </div>
  );

  // Render disabled state with reason
  const renderDisabledState = () => (
    <div className="bg-surface-base border border-border rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Power className="w-5 h-5 text-text-disabled mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-1">
            Integration Disabled
          </h4>
          <p className="text-sm text-text-tertiary">
            {disabledReason || 'This integration is currently disabled. Enable the required capability to use this feature.'}
          </p>
        </div>
      </div>
    </div>
  );

  // Render bug state (capability on but backend missing)
  const renderBugState = () => (
    <div className="bg-warning-500/10 border border-warning-500/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning-400 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-warning-300 mb-1">
            Backend Not Available
          </h4>
          <p className="text-sm text-warning-400/80">
            The capability is enabled but the backend endpoint is missing. This is a bug that needs to be fixed.
          </p>
        </div>
      </div>
    </div>
  );

  // Render error state
  const renderErrorState = () => (
    <div className="bg-error-500/10 border border-error-500/30 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <XCircle className="w-5 h-5 text-error-400 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-error-300 mb-1">
            Connection Error
          </h4>
          <p className="text-sm text-error-400/80">
            {config?.errorMessage || 'Failed to connect to the integration. Please check your configuration and try again.'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-semibold text-text-primary">{name}</h3>
              <p className="text-sm text-text-tertiary mt-1">{description}</p>
            </div>
          </div>

          {/* Toggle switch - only show if not disabled or bug state */}
          {displayState !== 'disabled' && displayState !== 'bug' && actions?.onToggle && (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => actions.onToggle?.(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-elevated peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          )}
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className={getStatusBadge()}>
            {getStatusText()}
          </span>
          {config?.lastSync && displayState === 'connected' && (
            <span className="text-xs text-text-tertiary">
              Last sync: {new Date(config.lastSync).toLocaleString()}
            </span>
          )}
        </div>

        {/* State-specific content */}
        {displayState === 'disabled' && renderDisabledState()}
        {displayState === 'bug' && renderBugState()}
        {displayState === 'error' && renderErrorState()}
        {displayState === 'not_connected' && !enabled && renderEmptyState()}

        {/* Actions - only show if enabled and not in disabled/bug state */}
        {enabled && displayState !== 'disabled' && displayState !== 'bug' && (
          <div className="space-y-3">
            {/* Action buttons */}
            <div className="flex gap-2">
              {actions?.onConfigure && (
                <Button
                  onClick={actions.onConfigure}
                  variant="outline"
                  size="sm"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <SettingsIcon className="w-4 h-4" />
                  Configure
                </Button>
              )}
              
              {actions?.onTestConnection && displayState !== 'not_connected' && (
                <Button
                  onClick={actions.onTestConnection}
                  variant="outline"
                  size="sm"
                  className="flex-1 flex items-center justify-center gap-2"
                  disabled={displayState === 'syncing'}
                >
                  <TestTube className="w-4 h-4" />
                  Test
                </Button>
              )}
              
              {actions?.onDisconnect && displayState === 'connected' && (
                <Button
                  onClick={actions.onDisconnect}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Disconnect
                </Button>
              )}
            </div>

            {/* Configuration panel */}
            {showConfig && configContent && (
              <div className="pt-3 border-t border-border">
                {configContent}
              </div>
            )}
          </div>
        )}

        {/* Store URL display for connected integrations */}
        {config?.storeUrl && displayState === 'connected' && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-xs text-text-tertiary">
              <span className="font-medium">Store URL:</span>{' '}
              <span className="text-text-secondary">{config.storeUrl}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
