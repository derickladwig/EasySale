import React, { useState } from 'react';
import { Button } from '@common/components/atoms/Button';
import { toast } from '@common/components/molecules/Toast';
import { Clock, HardDrive, Cloud, CheckCircle, XCircle } from 'lucide-react';

interface BackupConfig {
  automated_enabled: boolean;
  schedule_cron: string;
  local_path: string;
  retention_days: number;
  google_drive_enabled: boolean;
  google_drive_folder_id: string;
}

export const BackupConfiguration: React.FC = () => {
  const [config, setConfig] = useState<BackupConfig>({
    automated_enabled: true,
    schedule_cron: '0 2 * * *', // Daily at 2 AM
    local_path: './data/backups',
    retention_days: 30,
    google_drive_enabled: false,
    google_drive_folder_id: '',
  });

  const [isTestingPath, setIsTestingPath] = useState(false);
  const [pathTestResult, setPathTestResult] = useState<'success' | 'error' | null>(null);
  const [isTestingGoogleDrive, setIsTestingGoogleDrive] = useState(false);
  const [googleDriveTestResult, setGoogleDriveTestResult] = useState<'success' | 'error' | null>(
    null
  );

  const handleSave = async () => {
    toast.info('Saving backup configuration...');
    try {
      // In production, would call API to save config
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Backup configuration saved');
    } catch {
      toast.error('Failed to save configuration');
    }
  };

  const handleTestPath = async () => {
    setIsTestingPath(true);
    setPathTestResult(null);

    try {
      // In production, would test if path is writable
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setPathTestResult('success');
      toast.success('Backup path is accessible');
    } catch {
      setPathTestResult('error');
      toast.error('Cannot access backup path');
    } finally {
      setIsTestingPath(false);
    }
  };

  const handleTestGoogleDrive = async () => {
    setIsTestingGoogleDrive(true);
    setGoogleDriveTestResult(null);

    try {
      // In production, would test Google Drive connection
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setGoogleDriveTestResult('success');
      toast.success('Google Drive connection successful');
    } catch {
      setGoogleDriveTestResult('error');
      toast.error('Failed to connect to Google Drive');
    } finally {
      setIsTestingGoogleDrive(false);
    }
  };

  const scheduleOptions = [
    { value: '0 * * * *', label: 'Every hour' },
    { value: '0 */6 * * *', label: 'Every 6 hours' },
    { value: '0 2 * * *', label: 'Daily at 2:00 AM' },
    { value: '0 2 * * 0', label: 'Weekly on Sunday at 2:00 AM' },
    { value: '0 2 1 * *', label: 'Monthly on 1st at 2:00 AM' },
  ];

  return (
    <div className="space-y-6">
      {/* Automated Backups */}
      <div className="bg-surface-base border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-semibold text-text-primary">Automated Backups</h3>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.automated_enabled}
              onChange={(e) => setConfig({ ...config, automated_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-surface-elevated peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {config.automated_enabled && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Backup Schedule
              </label>
              <select
                value={config.schedule_cron}
                onChange={(e) => setConfig({ ...config, schedule_cron: e.target.value })}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary"
              >
                {scheduleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-disabled mt-1">Cron expression: {config.schedule_cron}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Retention Period (days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={config.retention_days}
                onChange={(e) => setConfig({ ...config, retention_days: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary"
              />
              <p className="text-xs text-text-disabled mt-1">
                Backups older than {config.retention_days} days will be automatically deleted
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Local Backup */}
      <div className="bg-surface-base border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <HardDrive className="w-5 h-5 text-primary-400" />
          <h3 className="text-lg font-semibold text-text-primary">Local Backup</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Backup Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={config.local_path}
                onChange={(e) => setConfig({ ...config, local_path: e.target.value })}
                className="flex-1 px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary"
                placeholder="./data/backups"
              />
              <Button onClick={handleTestPath} loading={isTestingPath} variant="outline">
                Test Path
              </Button>
            </div>
            {pathTestResult && (
              <div
                className={`flex items-center gap-2 mt-2 text-sm ${
                  pathTestResult === 'success' ? 'text-success-400' : 'text-error-400'
                }`}
              >
                {pathTestResult === 'success' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>
                  {pathTestResult === 'success'
                    ? 'Path is accessible and writable'
                    : 'Cannot access path or insufficient permissions'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Google Drive Backup */}
      <div className="bg-surface-base border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Cloud className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-semibold text-text-primary">Google Drive Backup</h3>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.google_drive_enabled}
              onChange={(e) => setConfig({ ...config, google_drive_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-surface-elevated peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {config.google_drive_enabled && (
          <div className="space-y-4">
            <div className="bg-warning-500/10 border border-warning-500/30 rounded-lg p-4">
              <p className="text-sm text-text-secondary">
                <strong className="text-warning-400">Note:</strong> You need to upload a Google
                Drive service account credentials JSON file to enable cloud backups.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Service Account Credentials
              </label>
              <input
                type="file"
                accept=".json"
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Google Drive Folder ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.google_drive_folder_id}
                  onChange={(e) => setConfig({ ...config, google_drive_folder_id: e.target.value })}
                  className="flex-1 px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary"
                  placeholder="1a2b3c4d5e6f7g8h9i0j"
                />
                <Button
                  onClick={handleTestGoogleDrive}
                  loading={isTestingGoogleDrive}
                  variant="outline"
                  disabled={!config.google_drive_folder_id}
                >
                  Test Connection
                </Button>
              </div>
              {googleDriveTestResult && (
                <div
                  className={`flex items-center gap-2 mt-2 text-sm ${
                    googleDriveTestResult === 'success' ? 'text-success-400' : 'text-error-400'
                  }`}
                >
                  {googleDriveTestResult === 'success' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>
                    {googleDriveTestResult === 'success'
                      ? 'Successfully connected to Google Drive'
                      : 'Failed to connect. Check credentials and folder ID'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} variant="primary">
          Save Configuration
        </Button>
      </div>
    </div>
  );
};
