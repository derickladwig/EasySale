import { useState, useEffect } from 'react';
import { WifiOff, Database, AlertTriangle } from 'lucide-react';
import { Button } from '@common/components/atoms';

interface OfflineSettings {
  offline_mode_enabled: boolean;
  max_queue_size: number;
  pending_operations: number;
  queue_usage_percent: number;
}

export function OfflineModeConfiguration() {
  const [settings, setSettings] = useState<OfflineSettings>({
    offline_mode_enabled: true,
    max_queue_size: 10000,
    pending_operations: 0,
    queue_usage_percent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/network', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSettings({
          offline_mode_enabled: data.offline_mode_enabled ?? true,
          max_queue_size: data.max_queue_size ?? 10000,
          pending_operations: data.pending_operations ?? 0,
          queue_usage_percent: data.queue_usage_percent ?? 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch offline settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/settings/network', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offline_mode_enabled: settings.offline_mode_enabled,
          max_queue_size: settings.max_queue_size,
        }),
      });

      if (response.ok) {
        alert('Offline mode settings saved successfully');
        fetchSettings();
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to save');
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClearQueue = async () => {
    if (!confirm('Are you sure you want to clear the pending sync queue? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/sync/clear-queue', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        alert('Sync queue cleared successfully');
        fetchSettings();
      } else if (response.status === 404) {
        alert('Clear queue feature requires backend implementation');
      } else {
        throw new Error('Failed to clear queue');
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to clear queue');
      alert(`Failed to clear queue: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="p-6 text-secondary-500">Loading offline mode configuration...</div>;
  }

  const isQueueNearFull = settings.queue_usage_percent > 80;

  return (
    <div className="space-y-6">
      {/* Offline Mode Toggle */}
      <div className="p-4 bg-surface-base border border-border rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <WifiOff className="w-6 h-6 text-secondary-400 mt-1" />
            <div>
              <h3 className="text-lg font-medium text-secondary-900">Offline Mode</h3>
              <p className="text-sm text-secondary-600 mt-1">
                Allow operations to continue when network connectivity is unavailable. Changes will
                be queued and synchronized when connection is restored.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.offline_mode_enabled}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, offline_mode_enabled: e.target.checked }))
            }
            className="w-5 h-5 text-primary-600 focus:ring-primary-500 rounded mt-1"
          />
        </div>
      </div>

      {/* Queue Settings */}
      <div className="p-4 bg-surface-base border border-border rounded-lg space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-secondary-400" />
          <h3 className="text-lg font-medium text-secondary-900">Sync Queue</h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">
            Maximum Queue Size
          </label>
          <input
            type="number"
            value={settings.max_queue_size}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, max_queue_size: parseInt(e.target.value) }))
            }
            min={100}
            max={100000}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p className="text-xs text-secondary-500 mt-1">
            Maximum number of operations to queue (100-100,000)
          </p>
        </div>

        {/* Queue Status */}
        <div className="p-3 bg-secondary-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-secondary-700">Queue Status</span>
            <span className="text-sm text-secondary-600">
              {settings.pending_operations.toLocaleString()} /{' '}
              {settings.max_queue_size.toLocaleString()}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-secondary-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                isQueueNearFull ? 'bg-error-600' : 'bg-primary-600'
              }`}
              style={{ width: `${Math.min(settings.queue_usage_percent, 100)}%` }}
            />
          </div>

          <p className="text-xs text-secondary-500 mt-2">
            {settings.queue_usage_percent.toFixed(1)}% full
          </p>
        </div>

        {/* Warning if queue is near full */}
        {isQueueNearFull && (
          <div className="p-3 bg-error-50 border border-error-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-error-800">Queue Nearly Full</p>
              <p className="text-sm text-error-700 mt-1">
                The sync queue is over 80% full. Consider increasing the maximum queue size or
                clearing old operations.
              </p>
            </div>
          </div>
        )}

        {/* Clear Queue Button */}
        {settings.pending_operations > 0 && (
          <div className="pt-3 border-t border-secondary-200">
            <Button onClick={handleClearQueue} variant="secondary" size="sm">
              Clear Pending Queue
            </Button>
            <p className="text-xs text-secondary-500 mt-2">
              Warning: This will permanently delete all pending sync operations
            </p>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
