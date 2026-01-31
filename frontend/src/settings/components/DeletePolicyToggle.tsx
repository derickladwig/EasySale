import React, { useState, useEffect } from 'react';
import { Trash2, Archive, AlertTriangle } from 'lucide-react';
import { syncApi, DeletePolicy, DeletePolicyConfig } from '../../services/syncApi';
import { toast } from '@common/components/molecules/Toast';

interface DeletePolicyToggleProps {
  /** Optional entity type for per-entity override */
  entityType?: string;
  /** Callback when policy changes */
  onChange?: (policy: DeletePolicy) => void;
  /** Whether the control is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const POLICY_OPTIONS: Array<{
  value: DeletePolicy;
  label: string;
  description: string;
  icon: React.ReactNode;
  warning?: boolean;
}> = [
  {
    value: 'local_only',
    label: 'Local Only',
    description: 'Delete locally, keep remote data intact',
    icon: <Trash2 className="w-4 h-4" />,
  },
  {
    value: 'archive_remote',
    label: 'Archive Remote',
    description: 'Archive remote data instead of deleting',
    icon: <Archive className="w-4 h-4" />,
  },
  {
    value: 'delete_remote',
    label: 'Delete Remote',
    description: 'Delete from both local and remote (destructive)',
    icon: <AlertTriangle className="w-4 h-4" />,
    warning: true,
  },
];

/**
 * DeletePolicyToggle - TASK-012
 * 
 * Allows operators to configure delete policy globally or per-entity.
 * Options: Local Only, Archive Remote, Delete Remote
 * Shows warning modal for destructive "Delete Remote" option.
 */
export const DeletePolicyToggle: React.FC<DeletePolicyToggleProps> = ({
  entityType,
  onChange,
  disabled = false,
  size = 'md',
}) => {
  const [config, setConfig] = useState<DeletePolicyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingPolicy, setPendingPolicy] = useState<DeletePolicy | null>(null);

  // Load current configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await syncApi.getDeletePolicy();
        setConfig(data);
      } catch (error) {
        console.error('Failed to load delete policy config:', error);
        // Use defaults if API fails
        setConfig({
          global_policy: 'local_only',
          entity_overrides: {},
        });
      } finally {
        setLoading(false);
      }
    };
    void loadConfig();
  }, []);

  // Get current policy (entity override or global)
  const currentPolicy = entityType && config?.entity_overrides[entityType]
    ? config.entity_overrides[entityType]
    : config?.global_policy ?? 'local_only';

  // Handle policy change
  const handleChange = async (newPolicy: DeletePolicy) => {
    if (!config || disabled) return;

    // Show warning for destructive option
    if (newPolicy === 'delete_remote') {
      setPendingPolicy(newPolicy);
      setShowWarning(true);
      return;
    }

    await applyPolicy(newPolicy);
  };

  // Apply the policy change
  const applyPolicy = async (newPolicy: DeletePolicy) => {
    if (!config) return;

    setSaving(true);
    try {
      let newConfig: DeletePolicyConfig;

      if (entityType) {
        // Update entity override
        newConfig = {
          ...config,
          entity_overrides: {
            ...config.entity_overrides,
            [entityType]: newPolicy,
          },
        };
      } else {
        // Update global policy
        newConfig = {
          ...config,
          global_policy: newPolicy,
        };
      }

      await syncApi.updateDeletePolicy(newConfig);
      setConfig(newConfig);
      onChange?.(newPolicy);
      toast.success(`Delete policy updated to ${newPolicy.replace('_', ' ')}`);
    } catch (error) {
      console.error('Failed to update delete policy:', error);
      toast.error('Failed to update delete policy');
    } finally {
      setSaving(false);
      setShowWarning(false);
      setPendingPolicy(null);
    }
  };

  // Confirm destructive policy
  const handleConfirmDestructive = () => {
    if (pendingPolicy) {
      void applyPolicy(pendingPolicy);
    }
  };

  // Cancel destructive policy
  const handleCancelDestructive = () => {
    setShowWarning(false);
    setPendingPolicy(null);
  };

  // Clear entity override (use global)
  const handleClearOverride = async () => {
    if (!config || !entityType || disabled) return;

    setSaving(true);
    try {
      const newOverrides = { ...config.entity_overrides };
      delete newOverrides[entityType];

      const newConfig: DeletePolicyConfig = {
        ...config,
        entity_overrides: newOverrides,
      };

      await syncApi.updateDeletePolicy(newConfig);
      setConfig(newConfig);
      onChange?.(config.global_policy);
      toast.success('Using global delete policy');
    } catch (error) {
      console.error('Failed to clear override:', error);
      toast.error('Failed to clear override');
    } finally {
      setSaving(false);
    }
  };

  const hasOverride = entityType && config?.entity_overrides[entityType];

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3',
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-surface-base rounded h-10 w-48" />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-text-secondary">
          Delete Policy
          {entityType && <span className="text-text-tertiary ml-1">({entityType})</span>}
        </label>
        {hasOverride && (
          <button
            onClick={handleClearOverride}
            disabled={disabled || saving}
            className="text-xs text-primary-400 hover:text-primary-300 disabled:opacity-50"
          >
            Use Global
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {POLICY_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleChange(option.value)}
            disabled={disabled || saving}
            className={`
              flex items-center gap-2 rounded-lg border transition-colors
              ${sizeClasses[size]}
              ${currentPolicy === option.value
                ? option.warning
                  ? 'bg-error-500/20 border-error-500 text-error-400'
                  : 'bg-primary-500/20 border-primary-500 text-primary-400'
                : 'bg-surface-base border-border text-text-secondary hover:border-primary-400'
              }
              ${disabled || saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={option.description}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {hasOverride && (
        <p className="text-xs text-text-tertiary">
          This entity has a custom delete policy. Global default: {config?.global_policy.replace('_', ' ')}
        </p>
      )}

      {/* Warning Modal for Destructive Option */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 'var(--z-modal)' }}>
          <div className="bg-surface-elevated rounded-lg p-6 max-w-md mx-4" style={{ boxShadow: 'var(--shadow-modal)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-error-500/20 rounded-full">
                <AlertTriangle className="w-6 h-6 text-error-400" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                Enable Remote Deletion?
              </h3>
            </div>

            <p className="text-text-secondary mb-4">
              This will permanently delete data from remote systems (WooCommerce, QuickBooks, etc.) 
              when you delete items locally. This action cannot be undone.
            </p>

            <div className="bg-error-500/10 border border-error-500/30 rounded-lg p-3 mb-6">
              <p className="text-sm text-error-400">
                <strong>Warning:</strong> Deleted remote data cannot be recovered. 
                Consider using "Archive Remote" instead for safer data management.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelDestructive}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDestructive}
                disabled={saving}
                className="px-4 py-2 bg-error-500 text-white rounded-lg hover:bg-error-600 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Enable Remote Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletePolicyToggle;
