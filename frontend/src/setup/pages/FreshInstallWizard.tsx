import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import { apiClient } from '@common/utils/apiClient';

interface FreshInstallCheckResponse {
  is_fresh_install: boolean;
  reason?: string;
}

interface UploadRestoreResponse {
  success: boolean;
  message: string;
  restore_job_id?: string;
}

interface RestoreProgressResponse {
  status: string;
  progress_percent: number;
  message: string;
  completed_at?: string;
  error_message?: string;
}

export const FreshInstallWizard: React.FC = () => {
  const [isFreshInstall, setIsFreshInstall] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [restoreJobId, setRestoreJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<RestoreProgressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkFreshInstall();
  }, []);

  useEffect(() => {
    if (restoreJobId) {
      const interval = setInterval(() => {
        fetchProgress();
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    }
  }, [restoreJobId]);

  const checkFreshInstall = async () => {
    try {
      const response = await apiClient.get<FreshInstallCheckResponse>('/api/fresh-install/check');
      setIsFreshInstall(response.is_fresh_install);
    } catch (err) {
      console.error('Failed to check fresh install:', err);
      setError('Failed to check installation status');
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    if (!restoreJobId) return;

    try {
      const response = await apiClient.get<RestoreProgressResponse>(
        `/api/fresh-install/progress/${restoreJobId}`
      );
      setProgress(response);

      if (response.status === 'completed') {
        // Redirect to login after successful restore
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      }
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setError(null);
    }
  };

  const handleUploadAndRestore = async () => {
    if (!uploadFile) {
      setError('Please select a backup file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await apiClient.post<UploadRestoreResponse>(
        '/api/fresh-install/upload-and-restore',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.success && response.restore_job_id) {
        setRestoreJobId(response.restore_job_id);
      } else {
        setError(response.message || 'Restore failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    // Redirect to setup wizard
    window.location.href = '/setup';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Checking installation status...</p>
        </div>
      </div>
    );
  }

  if (isFreshInstall === false) {
    // Not a fresh install, redirect to login
    window.location.href = '/login';
    return null;
  }

  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Welcome to EasySale</h1>
          <p className="text-text-secondary">
            This appears to be a fresh installation. You can restore from a backup or start fresh.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-surface-base rounded-lg border border-border p-8">
          {!restoreJobId && !progress && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">Restore from Backup</h2>
                <p className="text-sm text-text-secondary mb-4">
                  If you have a backup file from a previous installation, you can restore it here.
                  This will restore your database, products, customers, and all other data.
                </p>

                {error && (
                  <div className="mb-4 p-4 bg-error-500/10 border border-error-500/20 rounded flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-error-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-error-400">{error}</p>
                    </div>
                  </div>
                )}

                {/* File Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Select Backup File
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".zip"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="backup-file"
                    />
                    <label
                      htmlFor="backup-file"
                      className="flex items-center justify-center gap-3 px-4 py-8 bg-surface-elevated border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary-500 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-text-tertiary" />
                      <div className="text-center">
                        {uploadFile ? (
                          <>
                            <p className="text-text-primary font-medium">{uploadFile.name}</p>
                            <p className="text-sm text-text-secondary">
                              {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-text-primary font-medium">Click to select backup file</p>
                            <p className="text-sm text-text-secondary">Supported format: .zip</p>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    onClick={handleUploadAndRestore}
                    disabled={!uploadFile || uploading}
                    className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader className="w-5 h-5 animate-spin" />
                        Uploading...
                      </span>
                    ) : (
                      'Restore from Backup'
                    )}
                  </button>
                  <button
                    onClick={handleSkip}
                    disabled={uploading}
                    className="px-6 py-3 bg-surface-elevated text-text-primary rounded-lg hover:bg-surface-overlay transition-colors font-medium"
                  >
                    Start Fresh
                  </button>
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-primary-300">
                    <strong>Note:</strong> Restoring from a backup will overwrite any existing data.
                    Make sure you have the correct backup file before proceeding.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Progress Display */}
          {progress && (
            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-6">Restore Progress</h2>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-secondary">{progress.message}</span>
                  <span className="text-sm text-text-secondary">{progress.progress_percent}%</span>
                </div>
                <div className="w-full h-3 bg-surface-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all duration-500"
                    style={{ width: `${progress.progress_percent}%` }}
                  />
                </div>
              </div>

              {/* Status */}
              {progress.status === 'completed' && (
                <div className="p-4 bg-success-500/10 border border-success-500/20 rounded flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-success-400 font-medium mb-1">
                      Restore Completed Successfully
                    </p>
                    <p className="text-sm text-text-secondary">Redirecting to login page...</p>
                  </div>
                </div>
              )}

              {progress.status === 'failed' && progress.error_message && (
                <div className="p-4 bg-error-500/10 border border-error-500/20 rounded flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-error-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-error-400 font-medium mb-1">Restore Failed</p>
                    <p className="text-sm text-text-secondary">{progress.error_message}</p>
                    <button
                      onClick={() => {
                        setRestoreJobId(null);
                        setProgress(null);
                        setError(null);
                      }}
                      className="mt-3 px-4 py-2 bg-surface-elevated text-text-primary rounded hover:bg-surface-overlay text-sm"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {progress.status !== 'completed' && progress.status !== 'failed' && (
                <div className="flex items-center justify-center gap-3 text-text-secondary">
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Please wait while we restore your data...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-text-tertiary">
          <p>Need help? Contact support or check the documentation.</p>
        </div>
      </div>
    </div>
  );
};
