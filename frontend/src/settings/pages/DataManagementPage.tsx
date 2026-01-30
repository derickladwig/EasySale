import React, { useState, useEffect } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { toast } from '@common/components/molecules/Toast';
import { Database, Download, Upload, Trash2, Archive, FileText } from 'lucide-react';
import { apiClient } from '@common/utils/apiClient';
import { ImportWizard } from '../components/ImportWizard';
import { devLog } from '@common/utils/devLog';

interface BackupHistory {
  id: number;
  created_at: string;
  file_path: string;
  file_size: number;
  status: 'success' | 'failed' | 'in_progress';
  location: string;
}

export const DataManagementPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([]);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [importEntityType, setImportEntityType] = useState<string>('');

  useEffect(() => {
    loadBackupHistory();
  }, []);

  const loadBackupHistory = async () => {
    try {
      const response = await apiClient.get('/api/data-management/backups');
      setBackupHistory((response as any).data);
    } catch (error) {
      devLog.error('Failed to load backup history:', error);
      toast.error('Failed to load backup history');
    }
  };

  const handleManualBackup = async () => {
    setIsLoading(true);
    toast.info('Starting manual backup...');
    try {
      await apiClient.post('/api/data-management/backup');
      toast.success('Backup completed successfully');
      await loadBackupHistory();
    } catch (error) {
      devLog.error('Backup failed:', error);
      toast.error('Backup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async (entityType: string) => {
    toast.info(`Exporting ${entityType} to CSV...`);
    try {
      const response = await apiClient.post('/api/data-management/export', {
        entity_type: entityType.toLowerCase(),
        format: 'csv',
      });
      toast.success(`Exported ${(response as any).data.record_count} ${entityType} records`);
      // In production, would trigger file download
    } catch (error) {
      devLog.error('Export failed:', error);
      toast.error('Export failed');
    }
  };

  const handleImportData = (entityType: string) => {
    setImportEntityType(entityType);
    setShowImportWizard(true);
  };

  const handleCleanupSessions = async () => {
    if (!confirm('Delete sessions older than 30 days? This cannot be undone.')) {
      return;
    }
    toast.info('Cleaning up old sessions...');
    try {
      const response = await apiClient.post('/api/data-management/cleanup', {
        operation: 'sessions',
        days_old: 30,
      });
      toast.success(`Deleted ${(response as any).data.deleted_count} old sessions`);
    } catch (error) {
      devLog.error('Cleanup failed:', error);
      toast.error('Cleanup failed');
    }
  };

  const handleArchiveLayaways = async () => {
    if (!confirm('Archive completed layaways older than 90 days? This cannot be undone.')) {
      return;
    }
    toast.info('Archiving completed layaways...');
    try {
      const response = await apiClient.post('/api/data-management/cleanup', {
        operation: 'layaways',
        days_old: 90,
      });
      toast.success(`Archived ${(response as any).data.deleted_count} completed layaways`);
    } catch (error) {
      devLog.error('Archive failed:', error);
      toast.error('Archive failed');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="h-full overflow-auto bg-background-primary p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Data Management</h1>
          <p className="text-text-secondary mt-2">Backup, export, import, and cleanup data</p>
        </div>

        {/* Backup Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-primary-400" />
                <h2 className="text-xl font-semibold text-text-primary">Database Backup</h2>
              </div>
              <Button
                onClick={handleManualBackup}
                loading={isLoading}
                variant="primary"
                leftIcon={<Database className="w-4 h-4" />}
              >
                Backup Now
              </Button>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-text-secondary mb-3">Recent Backups</h3>
              <div className="space-y-2">
                {backupHistory.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-3 bg-surface-base rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium text-text-primary">
                          {formatDate(backup.created_at)}
                        </div>
                        <div className="text-sm text-text-tertiary">
                          {formatFileSize(backup.file_size)} • {backup.location}
                        </div>
                      </div>
                      {backup.status === 'success' ? (
                        <span className="px-2 py-1 text-xs font-medium bg-success-500/20 text-success-400 rounded">
                          Success
                        </span>
                      ) : backup.status === 'in_progress' ? (
                        <span className="px-2 py-1 text-xs font-medium bg-warning-500/20 text-warning-400 rounded">
                          In Progress
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-error-500/20 text-error-400 rounded">
                          Failed
                        </span>
                      )}
                    </div>

                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-sm text-text-tertiary">
              Automated backups run daily at 2:00 AM. Configure backup settings in the Backup & Sync
              section.
            </p>
          </div>
        </Card>

        {/* Export Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Download className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-text-primary">Export Data</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'Products', icon: FileText },
                { name: 'Customers', icon: FileText },
                { name: 'Sales', icon: FileText },
                { name: 'Inventory', icon: FileText },
                { name: 'Users', icon: FileText },
                { name: 'Transactions', icon: FileText },
              ].map((entity) => (
                <div
                  key={entity.name}
                  className="flex items-center justify-between p-4 bg-surface-base rounded-lg border border-border hover:border-border transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <entity.icon className="w-5 h-5 text-text-tertiary" />
                    <span className="font-medium text-text-primary">{entity.name}</span>
                  </div>
                  <Button
                    onClick={() => handleExportData(entity.name)}
                    variant="outline"
                    size="sm"
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Export CSV
                  </Button>
                </div>
              ))}
            </div>

            <p className="text-sm text-text-tertiary mt-4">
              Export data to CSV format for analysis or migration. Exports include all records from
              the current store.
            </p>
          </div>
        </Card>

        {/* Import Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Upload className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-text-primary">Import Data</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'Products', icon: FileText },
                { name: 'Customers', icon: FileText },
                { name: 'Inventory', icon: FileText },
              ].map((entity) => (
                <div
                  key={entity.name}
                  className="flex items-center justify-between p-4 bg-surface-base rounded-lg border border-border hover:border-border transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <entity.icon className="w-5 h-5 text-text-tertiary" />
                    <span className="font-medium text-text-primary">{entity.name}</span>
                  </div>
                  <Button
                    onClick={() => handleImportData(entity.name)}
                    variant="outline"
                    size="sm"
                    leftIcon={<Upload className="w-4 h-4" />}
                  >
                    Import CSV
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-warning-500/10 border border-warning-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-warning-400 mt-0.5">⚠️</div>
                <div>
                  <div className="font-medium text-warning-400 mb-1">Important</div>
                  <p className="text-sm text-text-secondary">
                    Imports will validate data before inserting. Invalid rows will be skipped and
                    reported. Always backup your database before importing large datasets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Cleanup Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Trash2 className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-text-primary">Data Cleanup</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-base rounded-lg border border-border">
                <div>
                  <div className="font-medium text-text-primary">Delete Old Sessions</div>
                  <div className="text-sm text-text-tertiary">
                    Remove login sessions older than 30 days
                  </div>
                </div>
                <Button
                  onClick={handleCleanupSessions}
                  variant="outline"
                  size="sm"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  Clean Up
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-base rounded-lg border border-border">
                <div>
                  <div className="font-medium text-text-primary">Archive Completed Layaways</div>
                  <div className="text-sm text-text-tertiary">
                    Move completed layaways older than 90 days to archive
                  </div>
                </div>
                <Button
                  onClick={handleArchiveLayaways}
                  variant="outline"
                  size="sm"
                  leftIcon={<Archive className="w-4 h-4" />}
                >
                  Archive
                </Button>
              </div>
            </div>

            <div className="mt-4 p-4 bg-error-500/10 border border-error-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-error-400 mt-0.5">⚠️</div>
                <div>
                  <div className="font-medium text-error-400 mb-1">Warning</div>
                  <p className="text-sm text-text-secondary">
                    Cleanup operations cannot be undone. Always create a backup before performing
                    cleanup operations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Import Wizard Modal */}
      {showImportWizard && (
        <ImportWizard entityType={importEntityType} onClose={() => setShowImportWizard(false)} />
      )}
    </div>
  );
};
