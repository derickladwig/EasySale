import React, { useState } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { toast } from '@common/components/molecules/Toast';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Database,
  Clock
} from 'lucide-react';
import { syncApi, BulkOperationConfirmation, DryRunResult } from '../../services/syncApi';

interface BulkSyncConfirmationProps {
  entity: string;
  operation: string;
  recordCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const BulkSyncConfirmation: React.FC<BulkSyncConfirmationProps> = ({
  entity,
  operation,
  recordCount,
  onConfirm,
  onCancel,
}) => {
  const [confirmation, setConfirmation] = useState<BulkOperationConfirmation | null>(null);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [step, setStep] = useState<'preview' | 'confirm'>('preview');

  const handleDryRun = async () => {
    setLoading(true);
    try {
      const result = await syncApi.dryRunSync(entity, { mode: 'full' });
      setDryRunResult(result);
    } catch (error) {
      console.error('Dry run failed:', error);
      toast.error('Failed to preview sync changes');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestConfirmation = async () => {
    setLoading(true);
    try {
      const result = await syncApi.requestBulkConfirmation(entity, operation, recordCount);
      setConfirmation(result);
      setStep('confirm');
    } catch (error) {
      console.error('Failed to request confirmation:', error);
      toast.error('Failed to request bulk operation confirmation');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmation) return;
    
    setConfirming(true);
    try {
      await syncApi.confirmBulkOperation(confirmation.token);
      toast.success('Bulk operation confirmed and started');
      onConfirm();
    } catch (error) {
      console.error('Failed to confirm operation:', error);
      toast.error('Failed to confirm bulk operation');
    } finally {
      setConfirming(false);
    }
  };

  const formatExpiresAt = (expiresAt: string) => {
    const date = new Date(expiresAt);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    return `${diffMins} minutes`;
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-6 h-6 text-warning-400" />
          <h2 className="text-xl font-semibold text-text-primary">Bulk Sync Confirmation</h2>
        </div>

        {step === 'preview' && (
          <>
            <div className="bg-warning-500/10 border border-warning-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning-400 mt-0.5" />
                <div>
                  <p className="text-warning-400 font-medium">
                    You are about to perform a bulk {operation} operation
                  </p>
                  <p className="text-text-secondary text-sm mt-1">
                    This will affect approximately {recordCount.toLocaleString()} records in {entity}.
                    Please review the changes before proceeding.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-surface-base rounded-lg">
                <div className="text-sm text-text-tertiary">Entity</div>
                <div className="text-lg font-medium text-text-primary capitalize mt-1">{entity}</div>
              </div>
              <div className="p-4 bg-surface-base rounded-lg">
                <div className="text-sm text-text-tertiary">Operation</div>
                <div className="text-lg font-medium text-text-primary capitalize mt-1">{operation}</div>
              </div>
              <div className="p-4 bg-surface-base rounded-lg">
                <div className="text-sm text-text-tertiary">Records</div>
                <div className="text-lg font-medium text-text-primary mt-1">{recordCount.toLocaleString()}</div>
              </div>
            </div>

            {/* Dry Run Results */}
            {dryRunResult && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-text-primary mb-3">Preview Results</h3>
                <div className="bg-surface-base rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-text-tertiary text-sm">Records to Process:</span>
                      <span className="text-text-primary ml-2">{dryRunResult.recordsToProcess}</span>
                    </div>
                    <div>
                      <span className="text-text-tertiary text-sm">Estimated Duration:</span>
                      <span className="text-text-primary ml-2">{Math.round(dryRunResult.estimatedDuration / 1000)}s</span>
                    </div>
                  </div>
                  
                  {dryRunResult.changes.length > 0 && (
                    <div>
                      <div className="text-sm text-text-tertiary mb-2">Sample Changes (first 5):</div>
                      <div className="space-y-2 max-h-48 overflow-auto">
                        {dryRunResult.changes.slice(0, 5).map((change, idx) => (
                          <div key={idx} className="text-xs bg-surface-elevated rounded p-2">
                            <span className="text-primary-400">{change.operation}</span>
                            <span className="text-text-tertiary mx-2">→</span>
                            <span className="text-text-secondary">{change.sourceId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              {!dryRunResult && (
                <Button
                  variant="secondary"
                  onClick={handleDryRun}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4" />
                  )}
                  Preview Changes
                </Button>
              )}
              <Button
                variant="primary"
                onClick={handleRequestConfirmation}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Proceed to Confirmation
              </Button>
            </div>
          </>
        )}

        {step === 'confirm' && confirmation && (
          <>
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary-400 mt-0.5" />
                <div>
                  <p className="text-primary-400 font-medium">
                    Confirmation token generated
                  </p>
                  <p className="text-text-secondary text-sm mt-1">
                    This token expires in {formatExpiresAt(confirmation.expiresAt)}.
                    Click confirm to execute the bulk operation.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-surface-base rounded-lg">
                <div className="text-sm text-text-tertiary">Entity</div>
                <div className="text-lg font-medium text-text-primary capitalize mt-1">{confirmation.entity}</div>
              </div>
              <div className="p-4 bg-surface-base rounded-lg">
                <div className="text-sm text-text-tertiary">Records</div>
                <div className="text-lg font-medium text-text-primary mt-1">{confirmation.recordCount.toLocaleString()}</div>
              </div>
            </div>

            <div className="p-4 bg-surface-base rounded-lg mb-6">
              <div className="text-sm text-text-tertiary mb-1">Confirmation Token</div>
              <code className="text-xs text-text-secondary break-all">{confirmation.token}</code>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={confirming}
                className="flex items-center gap-2"
              >
                {confirming ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Confirm & Execute
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

// Hook for using bulk sync confirmation in other components
export const useBulkSyncConfirmation = () => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationProps, setConfirmationProps] = useState<{
    entity: string;
    operation: string;
    recordCount: number;
  } | null>(null);

  const requestConfirmation = (entity: string, operation: string, recordCount: number) => {
    setConfirmationProps({ entity, operation, recordCount });
    setShowConfirmation(true);
  };

  const closeConfirmation = () => {
    setShowConfirmation(false);
    setConfirmationProps(null);
  };

  return {
    showConfirmation,
    confirmationProps,
    requestConfirmation,
    closeConfirmation,
  };
};
