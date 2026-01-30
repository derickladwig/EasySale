/**
 * Backups Page
 *
 * Backup management interface with overview, list, and settings tabs.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../common/components/atoms/Button';
import { Badge } from '../../common/components/atoms/Badge';
import { Card } from '../../common/components/organisms/Card';
import { Tabs } from '../../common/components/organisms/Tabs';
import { useToast } from '../../common/contexts/ToastContext';
import { RestoreDialog } from '../components/RestoreDialog';
import {
  getBackupOverview,
  listBackups,
  createBackup,
  deleteBackup,
  enforceRetention,
  getBackupSettings,
  updateBackupSettings,
  getGoogleDriveAuthUrl,
  connectGoogleDrive,
  getGoogleDriveStatus,
  updateGoogleDriveConfig,
  disconnectGoogleDrive,
} from '../../domains/backup/api';
import type {
  BackupType,
  BackupStatus,
  BackupSettings,
  RetentionEnforcementResult,
  BackupJob,
} from '../../domains/backup/types';
import {
  Database,
  HardDrive,
  Archive,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Trash2,
  Play,
  RefreshCw,
  FileText,
  Search,
  Filter,
  RotateCcw,
  Cloud,
  Link,
  Unlink,
  Settings,
  Upload,
} from 'lucide-react';

export function BackupsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'backups', label: 'Backups' },
    { id: 'destinations', label: 'Destinations' },
    { id: 'logs', label: 'Logs' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="h-full flex flex-col bg-background-primary">
      <div className="flex-shrink-0 border-b border-border bg-surface-base px-6 py-4">
        <h1 className="text-2xl font-bold text-text-primary">Backup Management</h1>
        <p className="text-sm text-text-tertiary mt-1">
          Manage database and file backups, configure schedules, and restore data
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Tabs items={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="mt-6">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'backups' && <BackupsTab />}
          {activeTab === 'destinations' && <DestinationsTab />}
          {activeTab === 'logs' && <LogsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

/**
 * Overview Tab - Summary cards and statistics
 */
function OverviewTab() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: overview, isLoading } = useQuery({
    queryKey: ['backup-overview'],
    queryFn: () => getBackupOverview(),
  });

  const createBackupMutation = useMutation({
    mutationFn: (backupType: BackupType) =>
      createBackup({ backup_type: backupType, store_id: 'store-1' }),
    onSuccess: () => {
      showToast({ variant: 'success', title: 'Backup started successfully' });
      queryClient.invalidateQueries({ queryKey: ['backup-overview'] });
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: (error: Error) => {
      showToast({ variant: 'error', title: 'Failed to start backup', description: error.message });
    },
  });

  const enforceRetentionMutation = useMutation({
    mutationFn: enforceRetention,
    onSuccess: (result: RetentionEnforcementResult) => {
      showToast({
        variant: 'success',
        title: 'Retention enforced',
        description: `${result.deleted_count} backups deleted`,
      });
      queryClient.invalidateQueries({ queryKey: ['backup-overview'] });
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: (error: Error) => {
      showToast({
        variant: 'error',
        title: 'Failed to enforce retention',
        description: error.message,
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!overview) {
    return <div className="text-center text-text-tertiary py-12">Failed to load backup overview</div>;
  }

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-primary-500" />
            <div>
              <p className="text-sm text-text-tertiary">Last DB Backup</p>
              <p className="text-lg font-semibold text-text-primary">
                {overview.last_db_backup
                  ? formatDate(overview.last_db_backup.completed_at)
                  : 'Never'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-accent" />
            <div>
              <p className="text-sm text-text-tertiary">Last File Backup</p>
              <p className="text-lg font-semibold text-text-primary">
                {overview.last_file_backup
                  ? formatDate(overview.last_file_backup.completed_at)
                  : 'Never'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Archive className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-text-tertiary">Total Backups</p>
              <p className="text-lg font-semibold text-text-primary">{overview.total_backups}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-sm text-text-tertiary">Total Size</p>
              <p className="text-lg font-semibold text-text-primary">
                {formatBytes(overview.total_size_bytes)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            variant="primary"
            leftIcon={<Play />}
            onClick={() => createBackupMutation.mutate('db_full')}
            disabled={createBackupMutation.isPending}
          >
            Run DB Backup
          </Button>

          <Button
            variant="secondary"
            leftIcon={<Play />}
            onClick={() => createBackupMutation.mutate('file')}
            disabled={createBackupMutation.isPending}
          >
            Run File Backup
          </Button>

          <Button
            variant="secondary"
            leftIcon={<Play />}
            onClick={() => createBackupMutation.mutate('full')}
            disabled={createBackupMutation.isPending}
          >
            Run Full Backup
          </Button>

          <Button
            variant="outline"
            leftIcon={<RefreshCw />}
            onClick={() => enforceRetentionMutation.mutate()}
            disabled={enforceRetentionMutation.isPending}
          >
            Enforce Retention
          </Button>
        </div>
      </Card>

      {/* Recent Backups */}
      {overview.last_db_backup && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Last Database Backup</h2>
          <BackupDetails backup={overview.last_db_backup} />
        </Card>
      )}
    </div>
  );
}

/**
 * Backups Tab - List of all backups with filters
 */
function BackupsTab() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{
    backup_type?: BackupType;
    status?: BackupStatus;
  }>({});
  const [restoreBackup, setRestoreBackup] = useState<BackupJob | null>(null);

  const { data: backups, isLoading } = useQuery({
    queryKey: ['backups', filters],
    queryFn: () => listBackups('store-1', filters),
  });

  const deleteBackupMutation = useMutation({
    mutationFn: (backupId: string) => deleteBackup(backupId),
    onSuccess: () => {
      showToast({ variant: 'success', title: 'Backup deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      queryClient.invalidateQueries({ queryKey: ['backup-overview'] });
    },
    onError: (error: Error) => {
      showToast({ variant: 'error', title: 'Failed to delete backup', description: error.message });
    },
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-text-secondary mb-2">Backup Type</label>
            <select
              value={filters.backup_type || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  backup_type: e.target.value as BackupType | undefined,
                })
              }
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Types</option>
              <option value="db_full">DB Full</option>
              <option value="db_incremental">DB Incremental</option>
              <option value="file">File</option>
              <option value="full">Full</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value as BackupStatus | undefined,
                })
              }
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {(filters.backup_type || filters.status) && (
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={() => setFilters({})}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Backups List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : !backups || backups.length === 0 ? (
        <Card className="p-12 text-center">
          <Archive className="w-16 h-16 text-text-disabled mx-auto mb-4" />
          <p className="text-text-tertiary text-lg">
            {filters.backup_type || filters.status
              ? 'No backups match your filters'
              : 'No backups found'}
          </p>
          <p className="text-text-disabled text-sm mt-2">
            {filters.backup_type || filters.status
              ? 'Try adjusting your filters'
              : 'Create your first backup using the Overview tab'}
          </p>
        </Card>
      ) : (
        backups.map((backup) => (
          <Card key={backup.id} className="p-6">
            <div className="flex items-start justify-between">
              <BackupDetails backup={backup} />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<RotateCcw />}
                  onClick={() => setRestoreBackup(backup)}
                  disabled={backup.status !== 'completed'}
                >
                  Restore
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download />}
                  onClick={() => {
                    window.open(`/api/backups/${backup.id}/download`, '_blank');
                  }}
                  disabled={backup.status !== 'completed'}
                >
                  Download
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<Trash2 />}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Are you sure you want to delete this backup? This action cannot be undone.'
                      )
                    ) {
                      deleteBackupMutation.mutate(backup.id);
                    }
                  }}
                  disabled={deleteBackupMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}

      {/* Restore Dialog */}
      <RestoreDialog
        backup={restoreBackup}
        isOpen={!!restoreBackup}
        onClose={() => setRestoreBackup(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['backups'] });
          queryClient.invalidateQueries({ queryKey: ['backup-overview'] });
        }}
      />
    </div>
  );
}

/**
 * Destinations Tab - Google Drive and other backup destinations
 */
function DestinationsTab() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [folderName, setFolderName] = useState('EasySale Backups');
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configData, setConfigData] = useState({
    retention_count: 10,
    enabled: true,
  });

  const { data: status, isLoading } = useQuery({
    queryKey: ['google-drive-status'],
    queryFn: getGoogleDriveStatus,
  });

  const connectMutation = useMutation({
    mutationFn: connectGoogleDrive,
    onSuccess: () => {
      showToast({ variant: 'success', title: 'Google Drive connected successfully' });
      queryClient.invalidateQueries({ queryKey: ['google-drive-status'] });
      setIsConnecting(false);
      setAuthCode('');
    },
    onError: (error: Error) => {
      showToast({
        variant: 'error',
        title: 'Failed to connect Google Drive',
        description: error.message,
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectGoogleDrive,
    onSuccess: () => {
      showToast({ variant: 'success', title: 'Google Drive disconnected' });
      queryClient.invalidateQueries({ queryKey: ['google-drive-status'] });
    },
    onError: (error: Error) => {
      showToast({
        variant: 'error',
        title: 'Failed to disconnect Google Drive',
        description: error.message,
      });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: updateGoogleDriveConfig,
    onSuccess: () => {
      showToast({ variant: 'success', title: 'Configuration updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['google-drive-status'] });
      setShowConfigForm(false);
    },
    onError: (error: Error) => {
      showToast({
        variant: 'error',
        title: 'Failed to update configuration',
        description: error.message,
      });
    },
  });

  const handleGetAuthUrl = async () => {
    try {
      const { auth_url } = await getGoogleDriveAuthUrl();
      window.open(auth_url, '_blank', 'width=600,height=700');
      setIsConnecting(true);
    } catch (error) {
      showToast({
        variant: 'error',
        title: 'Failed to get authorization URL',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleConnect = () => {
    if (!authCode.trim()) {
      showToast({ variant: 'error', title: 'Please enter the authorization code' });
      return;
    }
    connectMutation.mutate({ auth_code: authCode, folder_name: folderName });
  };

  const handleDisconnect = () => {
    if (
      window.confirm(
        'Are you sure you want to disconnect Google Drive? Automatic uploads will be disabled.'
      )
    ) {
      disconnectMutation.mutate();
    }
  };

  const handleUpdateConfig = () => {
    updateConfigMutation.mutate(configData);
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Google Drive Connection Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <Cloud className="w-8 h-8 text-accent" />
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Google Drive</h2>
              <p className="text-sm text-text-tertiary">
                Automatically upload backups to Google Drive for off-site storage
              </p>
            </div>
          </div>
          <Badge variant={status?.connected ? 'success' : 'default'}>
            {status?.connected ? 'Connected' : 'Not Connected'}
          </Badge>
        </div>

        {!status?.connected ? (
          /* Not Connected - Show Connection Form */
          <div className="space-y-4">
            {!isConnecting ? (
              <div className="text-center py-8">
                <Cloud className="w-16 h-16 text-text-disabled mx-auto mb-4" />
                <p className="text-text-secondary mb-6">
                  Connect your Google Drive account to enable automatic backup uploads
                </p>
                <Button variant="primary" leftIcon={<Link />} onClick={handleGetAuthUrl}>
                  Connect Google Drive
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-info-900/20 border border-info-dark rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-info-300 mb-2">
                        A new window has opened for Google authorization. After authorizing, copy
                        the authorization code and paste it below.
                      </p>
                      <p className="text-xs text-info">
                        If the window didn't open, click the button above again.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Folder Name (optional)
                  </label>
                  <input
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="EasySale Backups"
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-text-disabled mt-1">
                    Backups will be stored in this folder in your Google Drive
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Authorization Code *
                  </label>
                  <input
                    type="text"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    placeholder="Paste authorization code here"
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    onClick={handleConnect}
                    disabled={connectMutation.isPending}
                    loading={connectMutation.isPending}
                  >
                    Complete Connection
                  </Button>
                  <Button variant="outline" onClick={() => setIsConnecting(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Connected - Show Status and Configuration */
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface-base rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <p className="text-sm text-text-tertiary">Status</p>
                </div>
                <p className="text-lg font-semibold text-green-400">Connected</p>
              </div>

              <div className="bg-surface-base rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Upload className="w-4 h-4 text-accent" />
                  <p className="text-sm text-text-tertiary">Last Upload</p>
                </div>
                <p className="text-lg font-semibold text-text-primary">
                  {formatDate(status.last_upload_at)}
                </p>
              </div>

              <div className="bg-surface-base rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Archive className="w-4 h-4 text-purple-500" />
                  <p className="text-sm text-text-tertiary">Total Uploads</p>
                </div>
                <p className="text-lg font-semibold text-text-primary">{status.total_uploads}</p>
              </div>

              <div className="bg-surface-base rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-4 h-4 text-orange-500" />
                  <p className="text-sm text-text-tertiary">Total Size</p>
                </div>
                <p className="text-lg font-semibold text-text-primary">
                  {formatBytes(status.total_size_bytes)}
                </p>
              </div>
            </div>

            {/* Folder Information */}
            {status.folder_name && (
              <div className="bg-surface-base rounded-lg p-4">
                <p className="text-sm text-text-tertiary mb-1">Backup Folder</p>
                <p className="text-text-secondary font-medium">{status.folder_name}</p>
                {status.folder_id && (
                  <p className="text-xs text-text-disabled mt-1 font-mono">{status.folder_id}</p>
                )}
              </div>
            )}

            {/* Error Display */}
            {status.last_error && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-400 mb-1">Last Error:</p>
                    <p className="text-sm text-red-300">{status.last_error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Configuration Form */}
            {showConfigForm ? (
              <div className="bg-surface-base rounded-lg p-4 space-y-4">
                <h3 className="text-md font-semibold text-text-primary flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuration
                </h3>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Retention Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={configData.retention_count}
                    onChange={(e) =>
                      setConfigData({ ...configData, retention_count: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-text-disabled mt-1">
                    Number of backups to keep in Google Drive
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="gdrive_enabled"
                    checked={configData.enabled}
                    onChange={(e) => setConfigData({ ...configData, enabled: e.target.checked })}
                    className="w-4 h-4 text-primary-600 bg-surface-elevated border-border rounded focus:ring-primary-500"
                  />
                  <label htmlFor="gdrive_enabled" className="text-text-secondary">
                    Enable automatic uploads
                  </label>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    onClick={handleUpdateConfig}
                    disabled={updateConfigMutation.isPending}
                    loading={updateConfigMutation.isPending}
                  >
                    Save Configuration
                  </Button>
                  <Button variant="outline" onClick={() => setShowConfigForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              /* Action Buttons */
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  leftIcon={<Settings />}
                  onClick={() => setShowConfigForm(true)}
                >
                  Configure
                </Button>
                <Button
                  variant="danger"
                  leftIcon={<Unlink />}
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                >
                  Disconnect
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Information Card */}
      <Card className="p-6">
        <h3 className="text-md font-semibold text-text-primary mb-4">About Google Drive Backups</h3>
        <div className="space-y-3 text-sm text-text-secondary">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p>
              Backups are automatically uploaded to Google Drive after successful completion when
              auto-upload is enabled in Settings
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p>
              Database backups are uploaded daily, file backups weekly, and full backups monthly
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p>
              Old backups are automatically deleted from Google Drive based on the retention count
              to manage storage
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p>
              If uploads fail, local backups are preserved and uploads will be retried on the next
              scheduled backup
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * Logs Tab - Backup execution logs and history
 */
function LogsTab() {
  const [filters, setFilters] = useState<{
    backup_type?: BackupType;
    status?: BackupStatus;
    search?: string;
  }>({});

  const { data: backups, isLoading } = useQuery({
    queryKey: ['backups-logs', filters],
    queryFn: () =>
      listBackups('store-1', {
        backup_type: filters.backup_type,
        status: filters.status,
      }),
  });

  // Filter by search term (client-side)
  const filteredBackups = backups?.filter((backup) => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      backup.id.toLowerCase().includes(searchLower) ||
      backup.backup_type.toLowerCase().includes(searchLower) ||
      backup.status.toLowerCase().includes(searchLower) ||
      backup.error_message?.toLowerCase().includes(searchLower) ||
      backup.backup_chain_id?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'running':
        return <Clock className="w-5 h-5 text-accent animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <FileText className="w-5 h-5 text-text-disabled" />;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const formatDuration = (started: string | null, completed: string | null) => {
    if (!started || !completed) return 'N/A';
    const start = new Date(started).getTime();
    const end = new Date(completed).getTime();
    const durationMs = end - start;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search
            </label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by ID, type, status, error..."
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Backup Type
            </label>
            <select
              value={filters.backup_type || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  backup_type: e.target.value as BackupType | undefined,
                })
              }
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Types</option>
              <option value="db_full">DB Full</option>
              <option value="db_incremental">DB Incremental</option>
              <option value="file">File</option>
              <option value="full">Full</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value as BackupStatus | undefined,
                })
              }
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {(filters.backup_type || filters.status || filters.search) && (
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={() => setFilters({})}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Logs List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : !filteredBackups || filteredBackups.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 text-text-disabled mx-auto mb-4" />
          <p className="text-text-tertiary text-lg">
            {filters.backup_type || filters.status || filters.search
              ? 'No logs match your filters'
              : 'No backup logs found'}
          </p>
          <p className="text-text-disabled text-sm mt-2">
            {filters.backup_type || filters.status || filters.search
              ? 'Try adjusting your filters'
              : 'Backup logs will appear here after backups are created'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBackups.map((backup) => (
            <Card key={backup.id} className="p-4 hover:bg-surface-base transition-colors">
              <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div className="flex-shrink-0 mt-1">{getStatusIcon(backup.status)}</div>

                {/* Log Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-sm text-text-secondary">
                      {backup.id.substring(0, 8)}
                    </span>
                    <Badge
                      variant={
                        backup.backup_type === 'db_full'
                          ? 'primary'
                          : backup.backup_type === 'db_incremental'
                            ? 'info'
                            : backup.backup_type === 'file'
                              ? 'default'
                              : 'success'
                      }
                    >
                      {backup.backup_type}
                    </Badge>
                    {backup.is_base_backup && (
                      <Badge variant="warning" size="sm">
                        Base
                      </Badge>
                    )}
                    <span className="text-xs text-text-disabled">{formatDate(backup.started_at)}</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-2">
                    <div>
                      <span className="text-text-disabled">Status:</span>{' '}
                      <span
                        className={
                          backup.status === 'completed'
                            ? 'text-green-400'
                            : backup.status === 'failed'
                              ? 'text-red-400'
                              : backup.status === 'running'
                                ? 'text-info'
                                : 'text-yellow-400'
                        }
                      >
                        {backup.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-disabled">Duration:</span>{' '}
                      <span className="text-text-secondary">
                        {formatDuration(backup.started_at, backup.completed_at)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-disabled">Files:</span>{' '}
                      <span className="text-text-secondary">
                        {backup.files_included}
                        {backup.files_changed > 0 && (
                          <span className="text-info"> (+{backup.files_changed})</span>
                        )}
                        {backup.files_deleted > 0 && (
                          <span className="text-red-400"> (-{backup.files_deleted})</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-disabled">Method:</span>{' '}
                      <span className="text-text-secondary">{backup.snapshot_method || 'N/A'}</span>
                    </div>
                  </div>

                  {backup.backup_chain_id && (
                    <div className="text-xs text-text-disabled mb-2">
                      Chain: {backup.backup_chain_id} (#{backup.incremental_number})
                    </div>
                  )}

                  {backup.error_message && (
                    <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 mt-2">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-red-400 mb-1">Error:</p>
                          <p className="text-sm text-red-300 font-mono break-all">
                            {backup.error_message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {backup.status === 'completed' && backup.archive_path && (
                    <div className="text-xs text-text-disabled mt-2">Archive: {backup.archive_path}</div>
                  )}
                </div>

                {/* Actions */}
                {backup.status === 'completed' && (
                  <div className="flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Download />}
                      onClick={() => {
                        window.open(`/api/backups/${backup.id}/download`, '_blank');
                      }}
                    >
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Settings Tab - Backup configuration
 */
function SettingsTab() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['backup-settings'],
    queryFn: getBackupSettings,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: updateBackupSettings,
    onSuccess: () => {
      showToast({ variant: 'success', title: 'Settings updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['backup-settings'] });
    },
    onError: (error: Error) => {
      showToast({
        variant: 'error',
        title: 'Failed to update settings',
        description: error.message,
      });
    },
  });

  const [formData, setFormData] = useState<BackupSettings | null>(null);

  // Initialize form data when settings load
  if (settings && !formData) {
    setFormData(settings);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!formData) {
    return (
      <Card className="p-6">
        <p className="text-text-tertiary">Failed to load backup settings</p>
      </Card>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Database Backup Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" />
          Database Backup Settings
        </h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="db_backup_enabled"
              checked={formData.db_backup_enabled}
              onChange={(e) => setFormData({ ...formData, db_backup_enabled: e.target.checked })}
              className="w-4 h-4 text-primary-600 bg-surface-elevated border-border rounded focus:ring-primary-500"
            />
            <label htmlFor="db_backup_enabled" className="text-text-secondary">
              Enable database backups
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Incremental Schedule (cron)
              </label>
              <input
                type="text"
                value={formData.db_incremental_schedule}
                onChange={(e) =>
                  setFormData({ ...formData, db_incremental_schedule: e.target.value })
                }
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0 * * * *"
              />
              <p className="text-xs text-text-disabled mt-1">Hourly: 0 * * * *</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Full Backup Schedule (cron)
              </label>
              <input
                type="text"
                value={formData.db_full_schedule}
                onChange={(e) => setFormData({ ...formData, db_full_schedule: e.target.value })}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="59 23 * * *"
              />
              <p className="text-xs text-text-disabled mt-1">Daily at 11:59 PM: 59 23 * * *</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Daily Retention
              </label>
              <input
                type="number"
                min="1"
                value={formData.db_retention_daily}
                onChange={(e) =>
                  setFormData({ ...formData, db_retention_daily: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Weekly Retention
              </label>
              <input
                type="number"
                min="1"
                value={formData.db_retention_weekly}
                onChange={(e) =>
                  setFormData({ ...formData, db_retention_weekly: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Monthly Retention
              </label>
              <input
                type="number"
                min="1"
                value={formData.db_retention_monthly}
                onChange={(e) =>
                  setFormData({ ...formData, db_retention_monthly: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Max Incrementals per Chain
            </label>
            <input
              type="number"
              min="1"
              value={formData.db_max_incrementals}
              onChange={(e) =>
                setFormData({ ...formData, db_max_incrementals: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-text-disabled mt-1">
              Start new chain after this many incrementals (default: 24)
            </p>
          </div>
        </div>
      </Card>

      {/* File Backup Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <HardDrive className="w-5 h-5" />
          File Backup Settings
        </h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="file_backup_enabled"
              checked={formData.file_backup_enabled}
              onChange={(e) => setFormData({ ...formData, file_backup_enabled: e.target.checked })}
              className="w-4 h-4 text-primary-600 bg-surface-elevated border-border rounded focus:ring-primary-500"
            />
            <label htmlFor="file_backup_enabled" className="text-text-secondary">
              Enable file backups
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                File Backup Schedule (cron)
              </label>
              <input
                type="text"
                value={formData.file_schedule}
                onChange={(e) => setFormData({ ...formData, file_schedule: e.target.value })}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0 3 * * 0"
              />
              <p className="text-xs text-text-disabled mt-1">Weekly on Sunday at 3 AM: 0 3 * * 0</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                File Retention Count
              </label>
              <input
                type="number"
                min="1"
                value={formData.file_retention_count}
                onChange={(e) =>
                  setFormData({ ...formData, file_retention_count: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-text-disabled mt-1">Keep last N file backups</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Include Paths (comma-separated)
            </label>
            <input
              type="text"
              value={formData.file_include_paths}
              onChange={(e) => setFormData({ ...formData, file_include_paths: e.target.value })}
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="data/uploads/, data/config/"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Exclude Patterns (comma-separated)
            </label>
            <input
              type="text"
              value={formData.file_exclude_patterns}
              onChange={(e) => setFormData({ ...formData, file_exclude_patterns: e.target.value })}
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="*.tmp, *.log, paint-swatches/"
            />
          </div>
        </div>
      </Card>

      {/* Full Backup Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Archive className="w-5 h-5" />
          Full Backup Settings
        </h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="full_backup_enabled"
              checked={formData.full_backup_enabled}
              onChange={(e) => setFormData({ ...formData, full_backup_enabled: e.target.checked })}
              className="w-4 h-4 text-primary-600 bg-surface-elevated border-border rounded focus:ring-primary-500"
            />
            <label htmlFor="full_backup_enabled" className="text-text-secondary">
              Enable full backups (DB + Files)
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Full Backup Schedule (cron)
              </label>
              <input
                type="text"
                value={formData.full_schedule}
                onChange={(e) => setFormData({ ...formData, full_schedule: e.target.value })}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0 2 1 * *"
              />
              <p className="text-xs text-text-disabled mt-1">Monthly on 1st at 2 AM: 0 2 1 * *</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Full Retention Count
              </label>
              <input
                type="number"
                min="1"
                value={formData.full_retention_count}
                onChange={(e) =>
                  setFormData({ ...formData, full_retention_count: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-text-disabled mt-1">Keep last N full backups</p>
            </div>
          </div>
        </div>
      </Card>

      {/* General Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">General Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Backup Directory</label>
            <input
              type="text"
              value={formData.backup_directory}
              onChange={(e) => setFormData({ ...formData, backup_directory: e.target.value })}
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="data/backups/"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="compression_enabled"
              checked={formData.compression_enabled}
              onChange={(e) => setFormData({ ...formData, compression_enabled: e.target.checked })}
              className="w-4 h-4 text-primary-600 bg-surface-elevated border-border rounded focus:ring-primary-500"
            />
            <label htmlFor="compression_enabled" className="text-text-secondary">
              Enable compression (gzip)
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="auto_upload_enabled"
              checked={formData.auto_upload_enabled}
              onChange={(e) => setFormData({ ...formData, auto_upload_enabled: e.target.checked })}
              className="w-4 h-4 text-primary-600 bg-surface-elevated border-border rounded focus:ring-primary-500"
            />
            <label htmlFor="auto_upload_enabled" className="text-text-secondary">
              Auto-upload to Google Drive (when configured)
            </label>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => setFormData(settings || null)}>
          Reset
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={updateSettingsMutation.isPending}
          loading={updateSettingsMutation.isPending}
        >
          Save Settings
        </Button>
      </div>
    </form>
  );
}

/**
 * Backup Details Component - Displays backup information
 */
function BackupDetails({ backup }: { backup: any }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'running':
        return <Badge variant="info">Running</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'db_full':
        return <Badge variant="primary">DB Full</Badge>;
      case 'db_incremental':
        return <Badge variant="info">DB Incremental</Badge>;
      case 'file':
        return <Badge variant="default">File</Badge>;
      case 'full':
        return <Badge variant="success">Full</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold text-text-primary">Backup #{backup.incremental_number}</h3>
        {getTypeBadge(backup.backup_type)}
        {getStatusBadge(backup.status)}
        {backup.is_base_backup && <Badge variant="warning">Base</Badge>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-text-disabled">Started</p>
          <p className="text-text-secondary">{formatDate(backup.started_at)}</p>
        </div>
        <div>
          <p className="text-text-disabled">Completed</p>
          <p className="text-text-secondary">{formatDate(backup.completed_at)}</p>
        </div>
        <div>
          <p className="text-text-disabled">Size</p>
          <p className="text-text-secondary">{formatBytes(backup.size_bytes)}</p>
        </div>
        <div>
          <p className="text-text-disabled">Files</p>
          <p className="text-text-secondary">
            {backup.files_included} ({backup.files_changed} changed, {backup.files_deleted} deleted)
          </p>
        </div>
      </div>

      {backup.error_message && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
          <p className="text-red-400 text-sm">{backup.error_message}</p>
        </div>
      )}

      {backup.backup_chain_id && (
        <div className="text-xs text-text-disabled">Chain ID: {backup.backup_chain_id}</div>
      )}
    </div>
  );
}
