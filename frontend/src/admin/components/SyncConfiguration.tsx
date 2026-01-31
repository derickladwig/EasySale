import { useState, useEffect } from 'react';
import { RefreshCw, Plus, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button, Input } from '@common/components/atoms';

interface SyncSettings {
  sync_enabled: boolean;
  sync_interval: number;
  auto_resolve_conflicts: boolean;
  remote_stores: RemoteStore[];
}

interface RemoteStore {
  id: string;
  name: string;
  url: string;
  api_key: string;
  is_active: boolean;
  last_sync: string | null;
  status: 'connected' | 'disconnected' | 'error';
}

export function SyncConfiguration() {
  const [settings, setSettings] = useState<SyncSettings>({
    sync_enabled: true,
    sync_interval: 300,
    auto_resolve_conflicts: false,
    remote_stores: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/network', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch sync settings:', error);
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
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert('Sync settings saved successfully');
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

  const handleAddRemoteStore = () => {
    const newStore: RemoteStore = {
      id: `store-${Date.now()}`,
      name: '',
      url: '',
      api_key: '',
      is_active: true,
      last_sync: null,
      status: 'disconnected',
    };
    setSettings((prev) => ({
      ...prev,
      remote_stores: [...prev.remote_stores, newStore],
    }));
  };

  const handleRemoveRemoteStore = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      remote_stores: prev.remote_stores.filter((s) => s.id !== id),
    }));
  };

  const handleUpdateRemoteStore = (id: string, field: keyof RemoteStore, value: any) => {
    setSettings((prev) => ({
      ...prev,
      remote_stores: prev.remote_stores.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  };

  const handleTestConnection = async (store: RemoteStore) => {
    try {
      setTestingConnection(store.id);
      const response = await fetch('/api/sync/test-connection', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: store.url, api_key: store.api_key }),
      });

      if (response.ok) {
        handleUpdateRemoteStore(store.id, 'status', 'connected');
        alert('Connection successful!');
      } else {
        handleUpdateRemoteStore(store.id, 'status', 'error');
        alert('Connection failed');
      }
    } catch {
      handleUpdateRemoteStore(store.id, 'status', 'error');
      alert('Connection test failed');
    } finally {
      setTestingConnection(null);
    }
  };

  if (loading) {
    return <div className="p-6 text-text-secondary">Loading sync configuration...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Sync Settings */}
      <div className="p-4 bg-surface-base border border-border rounded-lg space-y-4">
        <h3 className="text-lg font-medium text-text-primary">Sync Settings</h3>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-text-secondary">Enable Sync</label>
            <p className="text-xs text-text-tertiary">
              Automatically synchronize data with remote stores
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.sync_enabled}
            onChange={(e) => setSettings((prev) => ({ ...prev, sync_enabled: e.target.checked }))}
            className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Sync Interval (seconds)
          </label>
          <Input
            type="number"
            value={settings.sync_interval}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, sync_interval: parseInt(e.target.value) }))
            }
            min={60}
            max={3600}
          />
          <p className="text-xs text-text-tertiary mt-1">
            How often to sync data (60-3600 seconds)
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-text-secondary">Auto-Resolve Conflicts</label>
            <p className="text-xs text-text-tertiary">
              Automatically resolve sync conflicts using last-write-wins
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.auto_resolve_conflicts}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, auto_resolve_conflicts: e.target.checked }))
            }
            className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
          />
        </div>
      </div>

      {/* Remote Stores */}
      <div className="p-4 bg-surface-base border border-border rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-text-primary">Remote Stores</h3>
          <Button
            onClick={handleAddRemoteStore}
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Store
          </Button>
        </div>

        {settings.remote_stores.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary">
            <p>No remote stores configured</p>
            <p className="text-sm mt-1">Add a remote store to enable multi-location sync</p>
          </div>
        ) : (
          <div className="space-y-4">
            {settings.remote_stores.map((store) => (
              <div key={store.id} className="p-4 border border-border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {store.status === 'connected' && (
                      <CheckCircle className="w-5 h-5 text-success-600" />
                    )}
                    {store.status === 'disconnected' && (
                      <AlertCircle className="w-5 h-5 text-text-tertiary" />
                    )}
                    {store.status === 'error' && <XCircle className="w-5 h-5 text-error-600" />}
                    <span className="font-medium text-text-primary">
                      {store.name || 'Unnamed Store'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveRemoteStore(store.id)}
                    className="text-error-600 hover:text-error-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Store Name
                    </label>
                    <Input
                      value={store.name}
                      onChange={(e) => handleUpdateRemoteStore(store.id, 'name', e.target.value)}
                      placeholder="Store name"
                      size="sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      API URL
                    </label>
                    <Input
                      value={store.url}
                      onChange={(e) => handleUpdateRemoteStore(store.id, 'url', e.target.value)}
                      placeholder="https://store.example.com/api"
                      size="sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      API Key
                    </label>
                    <Input
                      type="password"
                      value={store.api_key}
                      onChange={(e) => handleUpdateRemoteStore(store.id, 'api_key', e.target.value)}
                      placeholder="Enter API key"
                      size="sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={store.is_active}
                      onChange={(e) =>
                        handleUpdateRemoteStore(store.id, 'is_active', e.target.checked)
                      }
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
                    />
                    <span className="text-sm text-text-secondary">Active</span>
                  </div>

                  <Button
                    onClick={() => handleTestConnection(store)}
                    disabled={testingConnection === store.id}
                    variant="secondary"
                    size="sm"
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                  >
                    {testingConnection === store.id ? 'Testing...' : 'Test Connection'}
                  </Button>
                </div>

                {store.last_sync && (
                  <p className="text-xs text-text-tertiary">
                    Last sync: {new Date(store.last_sync).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
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
