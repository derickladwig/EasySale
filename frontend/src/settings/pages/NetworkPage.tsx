import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { Input } from '@common/components/atoms/Input';
import { Toggle } from '@common/components/atoms/Toggle';
import { toast } from '@common/components/molecules/Toast';
import { EmptyState } from '@common/components/molecules/EmptyState';
import { LoadingSpinner } from '@common/components/organisms/LoadingSpinner';
import { Alert } from '@common/components/organisms/Alert';
import { useRemoteStoresQuery, RemoteStore } from '../hooks';
import {
  Wifi,
  WifiOff,
  Server,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Save,
  Globe,
  ChevronRight,
} from 'lucide-react';

export const NetworkPage: React.FC = () => {
  // Fetch remote stores data using React Query
  const { data: remoteStores = [], isLoading, error, refetch } = useRemoteStoresQuery();

  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync settings state
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState('300'); // seconds
  const [autoResolveConflicts, setAutoResolveConflicts] = useState(true);

  // Offline mode state
  const [offlineModeEnabled, setOfflineModeEnabled] = useState(true);
  const [maxQueueSize, setMaxQueueSize] = useState('10000');
  const [pendingOperations, setPendingOperations] = useState(0);

  // Store original values for reset
  const originalValues = {
    syncEnabled: true,
    syncInterval: '300',
    autoResolveConflicts: true,
    offlineModeEnabled: true,
    maxQueueSize: '10000',
  };

  const handleSaveSyncSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/network', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sync_enabled: syncEnabled,
          sync_interval: syncInterval,
          auto_resolve_conflicts: autoResolveConflicts
        })
      });
      if (!response.ok) throw new Error('Failed to update sync settings');
      toast.success('Network settings updated successfully');
      setHasUnsavedChanges(false);
    } catch {
      toast.error('Failed to update network settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async (store: RemoteStore) => {
    toast.info(`Testing connection to ${store.name}...`);
    try {
      // Use the integrations test endpoint with store platform
      const response = await fetch('/api/integrations/sync/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          store_id: store.id,
          url: store.url,
          api_key: store.apiKey 
        })
      });
      if (!response.ok) {
        // Graceful fallback if endpoint not available
        toast.warning(`Connection test not available. Store: ${store.name}`);
        return;
      }
      const result = await response.json();
      if (result.success) {
        toast.success(`Connection to ${store.name} successful! Latency: ${result.latency_ms}ms`);
      } else {
        throw new Error(result.error || 'Connection failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to connect to ${store.name}: ${message}`);
    }
  };

  const handleAddRemoteStore = () => {
    toast.info('Remote store configuration requires admin privileges. Contact your administrator to configure multi-store synchronization.');
  };

  const handleEditRemoteStore = (store: RemoteStore) => {
    toast.info(`Edit remote store: ${store.name}`);
  };

  const handleDeleteRemoteStore = (store: RemoteStore) => {
    toast.info(`Delete remote store: ${store.name}`);
  };

  const handleSyncNow = async () => {
    toast.info('Starting manual sync...');
    try {
      const response = await fetch('/api/integrations/sync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
      if (!response.ok) {
        // Graceful fallback if endpoint not available
        toast.warning('Manual sync not available. Sync will occur automatically based on your configured interval.');
        return;
      }
      const result = await response.json();
      toast.success(`Sync completed: ${result.synced_count || 0} items synchronized`);
    } catch {
      toast.warning('Manual sync not available. Sync will occur automatically based on your configured interval.');
    }
  };

  const handleClearQueue = async () => {
    if (
      !window.confirm(
        'Are you sure you want to clear the pending operations queue? This cannot be undone.'
      )
    ) {
      return;
    }
    toast.info('Clearing queue...');
    try {
      const response = await fetch('/api/integrations/sync/queue/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        // Graceful fallback if endpoint not available
        toast.warning('Queue clear not available. Pending operations will be processed on next sync.');
        return;
      }
      setPendingOperations(0);
      toast.success('Queue cleared successfully');
    } catch {
      toast.warning('Queue clear not available. Pending operations will be processed on next sync.');
    }
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-background-primary">
        <div className="px-6 py-4 border-b border-border-light">
          <h1 className="text-3xl font-bold text-text-primary">Network & Sync</h1>
          <p className="text-text-secondary mt-2">
            Configure synchronization and offline operation settings
          </p>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="h-full flex flex-col bg-background-primary">
        <div className="px-6 py-4 border-b border-border-light">
          <h1 className="text-3xl font-bold text-text-primary">Network & Sync</h1>
          <p className="text-text-secondary mt-2">
            Configure synchronization and offline operation settings
          </p>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            <Alert
              variant="error"
              title="Failed to load remote stores"
              description={error.message || 'An error occurred while fetching remote stores data'}
              dismissible={false}
            />
            <div className="mt-4">
              <Button onClick={() => refetch()} variant="primary">
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background-primary">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-light">
        <h1 className="text-3xl font-bold text-text-primary">Network & Sync</h1>
        <p className="text-text-secondary mt-2">
          Configure synchronization and offline operation settings
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">

        {/* LAN Access Quick Link */}
        <Link to="/admin/network/lan" className="block">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-text-primary">LAN Access Settings</h3>
                  <p className="text-sm text-text-secondary">
                    Configure access from other devices on your network
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-tertiary" />
            </div>
          </Card>
        </Link>

        {/* Sync Settings Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <RefreshCw className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-text-primary">Sync Settings</h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-background-secondary rounded-lg">
                <Toggle
                  checked={syncEnabled}
                  onChange={(checked) => {
                    setSyncEnabled(checked);
                    setHasUnsavedChanges(true);
                  }}
                  label="Enable Synchronization"
                  description="Automatically sync data with remote stores"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Sync Interval (seconds)"
                  type="number"
                  value={syncInterval}
                  onChange={(e) => {
                    setSyncInterval(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="300"
                  disabled={!syncEnabled}
                  helperText="How often to sync data with remote stores"
                />

                <div className="p-4 bg-background-secondary rounded-lg">
                  <Toggle
                    checked={autoResolveConflicts}
                    onChange={(checked) => {
                      setAutoResolveConflicts(checked);
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!syncEnabled}
                    label="Auto-resolve Conflicts"
                    description="Use last-write-wins strategy"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button
                onClick={handleSyncNow}
                variant="outline"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                disabled={!syncEnabled}
              >
                Sync Now
              </Button>
            </div>
          </div>
        </Card>

        {/* Remote Stores Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Server className="w-5 h-5 text-primary-400" />
                <h2 className="text-xl font-semibold text-text-primary">Remote Stores</h2>
              </div>
              <Button
                onClick={handleAddRemoteStore}
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Remote Store
              </Button>
            </div>

            {remoteStores.length === 0 ? (
              <EmptyState
                title="No remote stores configured"
                description="Add remote stores to enable multi-location synchronization"
                icon={<Server className="w-16 h-16" />}
                primaryAction={{
                  label: 'Add remote store',
                  onClick: handleAddRemoteStore,
                  icon: <Plus className="w-4 h-4" />,
                }}
              />
            ) : (
              <div className="space-y-4">
                {remoteStores.map((store) => (
                  <div
                    key={store.id}
                    className="p-4 bg-surface-base rounded-lg border border-border hover:border-border transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-text-primary">{store.name}</h3>
                          {store.status === 'connected' ? (
                            <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-success-500/20 text-success-400 rounded">
                              <CheckCircle className="w-3 h-3" />
                              Connected
                            </span>
                          ) : store.status === 'disconnected' ? (
                            <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-surface-elevated text-text-tertiary rounded">
                              <WifiOff className="w-3 h-3" />
                              Disconnected
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-error-500/20 text-error-400 rounded">
                              <XCircle className="w-3 h-3" />
                              Error
                            </span>
                          )}
                          {!store.is_active && (
                            <span className="px-2 py-1 text-xs font-medium bg-surface-elevated text-text-tertiary rounded">
                              Inactive
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="text-text-secondary">
                            <span className="text-text-disabled">URL:</span> {store.url}
                          </div>
                          <div className="text-text-secondary">
                            <span className="text-text-disabled">Last Sync:</span> {store.last_sync}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          onClick={() => handleTestConnection(store)}
                          variant="ghost"
                          size="sm"
                        >
                          <Wifi className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleEditRemoteStore(store)}
                          variant="ghost"
                          size="sm"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteRemoteStore(store)}
                          variant="ghost"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Offline Mode Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <WifiOff className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-text-primary">Offline Mode</h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-background-secondary rounded-lg">
                <Toggle
                  checked={offlineModeEnabled}
                  onChange={(checked) => {
                    setOfflineModeEnabled(checked);
                    setHasUnsavedChanges(true);
                  }}
                  label="Enable Offline Mode"
                  description="Allow operations when network is unavailable"
                />
              </div>

              <Input
                label="Maximum Queue Size"
                type="number"
                value={maxQueueSize}
                onChange={(e) => {
                  setMaxQueueSize(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="10000"
                helperText="Maximum number of pending operations to queue"
                disabled={!offlineModeEnabled}
              />

              <div className="p-4 bg-background-secondary rounded-lg border border-border-light">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-text-primary">Pending Operations</div>
                  <span className="text-2xl font-bold text-primary-400">{pendingOperations}</span>
                </div>
                <div className="text-sm text-text-tertiary mb-4">
                  Operations waiting to be synchronized
                </div>
                {pendingOperations > 0 && (
                  <Button onClick={handleClearQueue} variant="outline" size="sm">
                    Clear Queue
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
        </div>
      </div>

      {/* Sticky Footer with Save/Cancel */}
      <div className="border-t border-border-light bg-background-secondary px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            {hasUnsavedChanges && (
              <span className="text-sm text-warning-DEFAULT flex items-center gap-2">
                <span className="w-2 h-2 bg-warning-DEFAULT rounded-full animate-pulse"></span>
                You have unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                // Reset to original values
                setSyncEnabled(originalValues.syncEnabled);
                setSyncInterval(originalValues.syncInterval);
                setAutoResolveConflicts(originalValues.autoResolveConflicts);
                setOfflineModeEnabled(originalValues.offlineModeEnabled);
                setMaxQueueSize(originalValues.maxQueueSize);
                setHasUnsavedChanges(false);
                toast.info('Changes discarded');
              }}
              variant="ghost"
              disabled={!hasUnsavedChanges}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSyncSettings}
              variant="primary"
              loading={isSaving}
              disabled={!hasUnsavedChanges}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
