import React, { useState, useEffect } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Ban } from 'lucide-react';
import { syncApi, SyncDirection, SyncDirectionConfig } from '../../services/syncApi';
import { toast } from '@common/components/molecules/Toast';

interface SyncDirectionToggleProps {
  /** Optional entity type for per-entity override */
  entityType?: string;
  /** Callback when direction changes */
  onChange?: (direction: SyncDirection) => void;
  /** Whether the control is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const DIRECTION_OPTIONS: Array<{
  value: SyncDirection;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'pull',
    label: 'Pull Only',
    description: 'Import data from remote to local',
    icon: <ArrowDownToLine className="w-4 h-4" />,
  },
  {
    value: 'push',
    label: 'Push Only',
    description: 'Export data from local to remote',
    icon: <ArrowUpFromLine className="w-4 h-4" />,
  },
  {
    value: 'bidirectional',
    label: 'Bidirectional',
    description: 'Sync in both directions',
    icon: <ArrowLeftRight className="w-4 h-4" />,
  },
  {
    value: 'disabled',
    label: 'Disabled',
    description: 'Sync is disabled',
    icon: <Ban className="w-4 h-4" />,
  },
];

/**
 * SyncDirectionToggle - TASK-011
 * 
 * Allows operators to configure sync direction globally or per-entity.
 * Options: Pull, Push, Bidirectional, Disabled
 */
export const SyncDirectionToggle: React.FC<SyncDirectionToggleProps> = ({
  entityType,
  onChange,
  disabled = false,
  size = 'md',
}) => {
  const [config, setConfig] = useState<SyncDirectionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load current configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await syncApi.getSyncDirection();
        setConfig(data);
      } catch (error) {
        console.error('Failed to load sync direction config:', error);
        // Use defaults if API fails
        setConfig({
          global_direction: 'bidirectional',
          entity_overrides: {},
        });
      } finally {
        setLoading(false);
      }
    };
    void loadConfig();
  }, []);

  // Get current direction (entity override or global)
  const currentDirection = entityType && config?.entity_overrides[entityType]
    ? config.entity_overrides[entityType]
    : config?.global_direction ?? 'bidirectional';

  // Handle direction change
  const handleChange = async (newDirection: SyncDirection) => {
    if (!config || disabled) return;

    setSaving(true);
    try {
      let newConfig: SyncDirectionConfig;

      if (entityType) {
        // Update entity override
        newConfig = {
          ...config,
          entity_overrides: {
            ...config.entity_overrides,
            [entityType]: newDirection,
          },
        };
      } else {
        // Update global direction
        newConfig = {
          ...config,
          global_direction: newDirection,
        };
      }

      await syncApi.updateSyncDirection(newConfig);
      setConfig(newConfig);
      onChange?.(newDirection);
      toast.success(`Sync direction updated to ${newDirection}`);
    } catch (error) {
      console.error('Failed to update sync direction:', error);
      toast.error('Failed to update sync direction');
    } finally {
      setSaving(false);
    }
  };

  // Clear entity override (use global)
  const handleClearOverride = async () => {
    if (!config || !entityType || disabled) return;

    setSaving(true);
    try {
      const newOverrides = { ...config.entity_overrides };
      delete newOverrides[entityType];

      const newConfig: SyncDirectionConfig = {
        ...config,
        entity_overrides: newOverrides,
      };

      await syncApi.updateSyncDirection(newConfig);
      setConfig(newConfig);
      onChange?.(config.global_direction);
      toast.success('Using global sync direction');
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
          Sync Direction
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
        {DIRECTION_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleChange(option.value)}
            disabled={disabled || saving}
            className={`
              flex items-center gap-2 rounded-lg border transition-colors
              ${sizeClasses[size]}
              ${currentDirection === option.value
                ? 'bg-primary-500/20 border-primary-500 text-primary-400'
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
          This entity has a custom sync direction. Global default: {config?.global_direction}
        </p>
      )}
    </div>
  );
};

export default SyncDirectionToggle;
