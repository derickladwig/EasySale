import React, { useState } from 'react';
import { Button } from '@common/components/atoms/Button';
import { toast } from '@common/components/molecules/Toast';
import { AlertTriangle, Database, CheckCircle } from 'lucide-react';

interface BackupFile {
  id: number;
  created_at: string;
  file_path: string;
  file_size: number;
  location: string;
}

interface RestoreWizardProps {
  backups: BackupFile[];
  onClose: () => void;
  onRestore: () => void;
}

export const RestoreWizard: React.FC<RestoreWizardProps> = ({ backups, onClose, onRestore }) => {
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);
  const [step, setStep] = useState<'select' | 'confirm' | 'restore' | 'complete'>('select');
  // // const [isRestoring, setIsRestoring] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleRestore = async () => {
    if (!selectedBackup) return;

    // // // // // // setIsRestoring(true);
    setStep('restore');

    try {
      // Simulate restore process
      await new Promise((resolve) => setTimeout(resolve, 5000));

      setStep('complete');
      toast.success('Database restored successfully');
      onRestore();
    } catch {
      toast.error('Restore failed');
      setStep('confirm');
    } finally {
      // // // // // // setIsRestoring(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-base rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-text-primary">Restore Database</h2>
          <p className="text-sm text-text-tertiary mt-1">Select a backup to restore your database</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Step 1: Select Backup */}
          {step === 'select' && (
            <div className="space-y-4">
              <div className="bg-error-500/10 border border-error-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-error-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-error-400 mb-1">Warning</h3>
                    <p className="text-sm text-text-secondary">
                      Restoring a backup will replace all current data. This action cannot be
                      undone. Make sure to create a backup of your current data before proceeding.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-text-secondary mb-3">Available Backups</h3>
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    onClick={() => setSelectedBackup(backup)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedBackup?.id === backup.id
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-border bg-background-primary hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-text-primary">
                          {formatDate(backup.created_at)}
                        </div>
                        <div className="text-sm text-text-tertiary mt-1">
                          {formatFileSize(backup.file_size)} • {backup.location}
                        </div>
                      </div>
                      {selectedBackup?.id === backup.id && (
                        <CheckCircle className="w-5 h-5 text-primary-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Confirm */}
          {step === 'confirm' && selectedBackup && (
            <div className="space-y-6">
              <div className="bg-error-500/10 border border-error-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-error-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-error-400 mb-1">Final Warning</h3>
                    <p className="text-sm text-text-secondary mb-3">
                      You are about to restore the database from:
                    </p>
                    <div className="bg-background-primary rounded p-3 text-sm text-text-secondary">
                      <div>
                        <strong>Date:</strong> {formatDate(selectedBackup.created_at)}
                      </div>
                      <div>
                        <strong>Size:</strong> {formatFileSize(selectedBackup.file_size)}
                      </div>
                      <div>
                        <strong>Location:</strong> {selectedBackup.location}
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary mt-3">
                      All current data will be permanently replaced. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Type <strong className="text-error-400">RESTORE</strong> to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-secondary"
                  placeholder="RESTORE"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 3: Restoring */}
          {step === 'restore' && (
            <div className="text-center py-12">
              <Database className="w-16 h-16 text-primary-400 mx-auto mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">Restoring Database...</h3>
              <p className="text-text-tertiary mb-4">
                This may take several minutes. Please do not close this window.
              </p>
              <div className="w-full max-w-md mx-auto bg-surface-elevated rounded-full h-2 overflow-hidden">
                <div className="bg-primary-500 h-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-success-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text-primary mb-2">Restore Complete!</h3>
              <p className="text-text-tertiary">
                Your database has been successfully restored. The application will reload.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3">
          {step === 'select' && (
            <>
              <Button onClick={onClose} variant="outline">
                Cancel
              </Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={!selectedBackup}
                variant="primary"
              >
                Continue
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <Button onClick={() => setStep('select')} variant="outline">
                Back
              </Button>
              <Button
                onClick={handleRestore}
                disabled={confirmText !== 'RESTORE'}
                variant="primary"
                className="bg-error-600 hover:bg-error-700"
              >
                Restore Database
              </Button>
            </>
          )}

          {step === 'complete' && (
            <Button onClick={() => window.location.reload()} variant="primary">
              Reload Application
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
