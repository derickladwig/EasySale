/**
 * Restore Dialog Component
 *
 * Confirmation dialog for restoring backups with options and progress display.
 */

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@common/components/atoms/Button';
import { Badge } from '@common/components/atoms/Badge';
import { Modal } from '@common/components/organisms/Modal';
import { useToast } from '@common/contexts/ToastContext';
import { restoreBackup, getRestoreJob, getRollbackInstructions } from '../../domains/backup/api';
import type { BackupJob, RestoreJob } from '../../domains/backup/types';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  HardDrive,
  Shield,
  Info,
  RefreshCw,
} from 'lucide-react';

interface RestoreDialogProps {
  backup: BackupJob | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RestoreDialog({ backup, isOpen, onClose, onSuccess }: RestoreDialogProps) {
  const { showToast } = useToast();
  const [restoreJobId, setRestoreJobId] = useState<string | null>(null);
  const [createSnapshot, setCreateSnapshot] = useState(true);
  const [strictDelete, setStrictDelete] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Poll restore job status
  const { data: restoreJob } = useQuery({
    queryKey: ['restore-job', restoreJobId],
    queryFn: () => getRestoreJob(restoreJobId!),
    enabled: !!restoreJobId,
    refetchInterval: (query) => {
      // Stop polling if completed or failed
      const data = query.state.data;
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });

  // Get rollback instructions if restore failed
  const { data: rollbackInstructions } = useQuery({
    queryKey: ['rollback-instructions', restoreJobId],
    queryFn: () => getRollbackInstructions(restoreJobId!),
    enabled: !!restoreJobId && restoreJob?.status === 'failed',
  });

  const restoreMutation = useMutation({
    mutationFn: () =>
      restoreBackup(backup!.id, {
        restore_type: 'full',
        create_snapshot: createSnapshot,
        strict_delete: strictDelete,
        created_by: 'admin', // TODO: Get from auth context
      }),
    onSuccess: (job: RestoreJob) => {
      setRestoreJobId(job.id);
      showToast({
        variant: 'info',
        title: 'Restore started',
        description: 'Monitoring progress...',
      });
    },
    onError: (error: Error) => {
      showToast({ variant: 'error', title: 'Failed to start restore', description: error.message });
    },
  });

  const handleRestore = () => {
    if (!confirmed) {
      showToast({
        variant: 'warning',
        title: 'Please confirm',
        description: 'Check the confirmation box to proceed',
      });
      return;
    }
    restoreMutation.mutate();
  };

  const handleClose = () => {
    if (restoreJob?.status === 'completed' && onSuccess) {
      onSuccess();
    }
    setRestoreJobId(null);
    setConfirmed(false);
    onClose();
  };

  if (!backup) return null;

  // Show progress if restore is running
  if (restoreJobId && restoreJob) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Restore Progress">
        <div className="space-y-6">
          {/* Status Header */}
          <div className="flex items-center gap-3">
            {restoreJob.status === 'running' && (
              <>
                <RefreshCw className="w-6 h-6 text-info animate-spin" />
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Restore in Progress</h3>
                  <p className="text-sm text-text-tertiary">
                    Please wait while the backup is being restored...
                  </p>
                </div>
              </>
            )}
            {restoreJob.status === 'completed' && (
              <>
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Restore Completed</h3>
                  <p className="text-sm text-text-tertiary">The backup has been successfully restored</p>
                </div>
              </>
            )}
            {restoreJob.status === 'failed' && (
              <>
                <XCircle className="w-6 h-6 text-red-400" />
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Restore Failed</h3>
                  <p className="text-sm text-text-tertiary">
                    An error occurred during the restore process
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Progress Details */}
          <div className="bg-surface-base rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-tertiary">Status:</span>
              <Badge
                variant={
                  restoreJob.status === 'completed'
                    ? 'success'
                    : restoreJob.status === 'failed'
                      ? 'error'
                      : restoreJob.status === 'running'
                        ? 'info'
                        : 'default'
                }
              >
                {restoreJob.status}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-tertiary">Restore Type:</span>
              <span className="text-text-primary">{restoreJob.restore_type}</span>
            </div>
            {restoreJob.started_at && (
              <div className="flex justify-between text-sm">
                <span className="text-text-tertiary">Started:</span>
                <span className="text-text-primary">
                  {new Date(restoreJob.started_at).toLocaleString()}
                </span>
              </div>
            )}
            {restoreJob.completed_at && (
              <div className="flex justify-between text-sm">
                <span className="text-text-tertiary">Completed:</span>
                <span className="text-text-primary">
                  {new Date(restoreJob.completed_at).toLocaleString()}
                </span>
              </div>
            )}
            {restoreJob.files_restored > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-text-tertiary">Files Restored:</span>
                <span className="text-text-primary">{restoreJob.files_restored}</span>
              </div>
            )}
            {restoreJob.pre_restore_snapshot_id && (
              <div className="flex justify-between text-sm">
                <span className="text-text-tertiary">Snapshot Created:</span>
                <span className="text-text-primary font-mono text-xs">
                  {restoreJob.pre_restore_snapshot_id}
                </span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {restoreJob.error_message && (
            <div className="bg-error-900/20 border border-error-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-error-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-error-400 mb-1">Error Details</h4>
                  <p className="text-sm text-error-300">{restoreJob.error_message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Rollback Instructions */}
          {rollbackInstructions && (
            <div className="bg-warning-900/20 border border-warning-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-warning-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-warning-400 mb-2">
                    Rollback Instructions
                  </h4>
                  <pre className="text-xs text-warning-300 whitespace-pre-wrap font-mono">
                    {rollbackInstructions.instructions}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={restoreJob.status === 'running'}
            >
              {restoreJob.status === 'running' ? 'Please Wait...' : 'Close'}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Show confirmation dialog
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Restore Backup">
      <div className="space-y-6">
        {/* Warning Banner */}
        <div className="bg-warning-900/20 border border-warning-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-warning-400 mb-1">
                Warning: Data Will Be Replaced
              </h4>
              <p className="text-sm text-warning-300">
                This operation will replace your current database and files with the backup data.
                All changes made after the backup was created will be lost.
              </p>
            </div>
          </div>
        </div>

        {/* Backup Details */}
        <div className="bg-surface-base rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-text-primary mb-3">Backup Details</h4>
          <div className="flex justify-between text-sm">
            <span className="text-text-tertiary">Backup ID:</span>
            <span className="text-text-primary font-mono text-xs">{backup.id}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-tertiary">Type:</span>
            <Badge variant="default">{backup.backup_type}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-tertiary">Created:</span>
            <span className="text-text-primary">{new Date(backup.created_at).toLocaleString()}</span>
          </div>
          {backup.size_bytes && (
            <div className="flex justify-between text-sm">
              <span className="text-text-tertiary">Size:</span>
              <span className="text-text-primary">
                {(backup.size_bytes / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          )}
          {backup.files_included > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-tertiary">Files:</span>
              <span className="text-text-primary">{backup.files_included} files</span>
            </div>
          )}
        </div>

        {/* Restore Options */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-text-primary">Restore Options</h4>

          {/* Create Snapshot Option */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={createSnapshot}
              onChange={(e) => setCreateSnapshot(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-border bg-surface-elevated text-primary-500 focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary-400" />
                <span className="text-sm font-medium text-text-primary">
                  Create pre-restore snapshot
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-1">
                Recommended. Creates a backup of current data before restoring, allowing rollback if
                needed.
              </p>
            </div>
          </label>

          {/* Strict Delete Option */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={strictDelete}
              onChange={(e) => setStrictDelete(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-border bg-surface-elevated text-primary-500 focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-text-tertiary" />
                <span className="text-sm font-medium text-text-primary">Strict delete mode</span>
              </div>
              <p className="text-xs text-text-tertiary mt-1">
                Delete files that existed in the backup but don't exist in current system. Use with
                caution.
              </p>
            </div>
          </label>
        </div>

        {/* Confirmation Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer bg-surface-base rounded-lg p-4 border-2 border-border hover:border-primary-600 transition-colors">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-border bg-surface-elevated text-primary-500 focus:ring-2 focus:ring-primary-500"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-text-primary">
              I understand that this will replace all current data with the backup data
            </span>
          </div>
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleRestore}
            disabled={!confirmed || restoreMutation.isPending}
            loading={restoreMutation.isPending}
          >
            {restoreMutation.isPending ? 'Starting Restore...' : 'Restore Backup'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
