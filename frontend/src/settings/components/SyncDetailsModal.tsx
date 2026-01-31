import React, { useState, useEffect } from 'react';
import { Button } from '@common/components/atoms/Button';
import { toast } from '@common/components/molecules/Toast';
import { 
  X, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  Database,
  ArrowRight
} from 'lucide-react';
import { syncApi, SyncStatus } from '../../services/syncApi';

interface SyncDetailsModalProps {
  syncId: string;
  onClose: () => void;
}

export const SyncDetailsModal: React.FC<SyncDetailsModalProps> = ({ syncId, onClose }) => {
  const [details, setDetails] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const data = await syncApi.getSyncDetails(syncId);
        setDetails(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load sync details:', err);
        setError('Failed to load sync details');
        toast.error('Failed to load sync details');
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
    
    // Auto-refresh if sync is running
    const interval = setInterval(() => {
      if (details?.status === 'running') {
        loadDetails();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [syncId, details?.status]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-success-400" />;
      case 'failed':
        return <XCircle className="w-6 h-6 text-error-400" />;
      case 'running':
        return <RefreshCw className="w-6 h-6 text-primary-400 animate-spin" />;
      default:
        return <Clock className="w-6 h-6 text-text-disabled" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success-500/20 text-success-400';
      case 'failed':
        return 'bg-error-500/20 text-error-400';
      case 'running':
        return 'bg-primary-500/20 text-primary-400';
      default:
        return 'bg-surface-elevated text-text-tertiary';
    }
  };

  const formatDuration = (start: string, end?: string) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffMs = endDate.getTime() - startDate.getTime();
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 'var(--z-modal)' }}>
      <div className="bg-background-primary rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden" style={{ boxShadow: 'var(--shadow-modal)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-text-primary">Sync Details</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <XCircle className="w-12 h-12 text-error-400 mx-auto mb-3" />
              <p className="text-error-400">{error}</p>
            </div>
          ) : details ? (
            <div className="space-y-6">
              {/* Status Header */}
              <div className="flex items-center gap-4">
                {getStatusIcon(details.status)}
                <div>
                  <h3 className="text-xl font-semibold text-text-primary capitalize">
                    {details.entity} Sync
                  </h3>
                  <span className={`inline-block px-3 py-1 text-sm rounded mt-1 ${getStatusColor(details.status)}`}>
                    {details.status}
                  </span>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-surface-base rounded-lg">
                  <div className="text-sm text-text-tertiary">Sync ID</div>
                  <div className="text-text-primary font-mono text-sm mt-1 break-all">{details.syncId}</div>
                </div>
                <div className="p-4 bg-surface-base rounded-lg">
                  <div className="text-sm text-text-tertiary">Mode</div>
                  <div className="text-text-primary capitalize mt-1">{details.mode}</div>
                </div>
                <div className="p-4 bg-surface-base rounded-lg">
                  <div className="text-sm text-text-tertiary">Started At</div>
                  <div className="text-text-primary mt-1">{new Date(details.startedAt).toLocaleString()}</div>
                </div>
                <div className="p-4 bg-surface-base rounded-lg">
                  <div className="text-sm text-text-tertiary">Duration</div>
                  <div className="text-text-primary mt-1">
                    {formatDuration(details.startedAt, details.completedAt)}
                    {details.status === 'running' && ' (in progress)'}
                  </div>
                </div>
              </div>

              {/* Progress Stats */}
              <div className="p-4 bg-surface-base rounded-lg">
                <h4 className="text-sm font-medium text-text-secondary mb-3">Progress</h4>
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success-400" />
                    <div>
                      <div className="text-2xl font-bold text-success-400">
                        {details.recordsProcessed}
                      </div>
                      <div className="text-xs text-text-tertiary">Processed</div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-text-disabled" />
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-error-400" />
                    <div>
                      <div className="text-2xl font-bold text-error-400">
                        {details.recordsFailed}
                      </div>
                      <div className="text-xs text-text-tertiary">Failed</div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                {details.recordsProcessed > 0 && (
                  <div className="mt-4">
                    <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success-500 transition-all duration-300"
                        style={{
                          width: `${(details.recordsProcessed / (details.recordsProcessed + details.recordsFailed)) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-text-tertiary mt-1 text-right">
                      {Math.round((details.recordsProcessed / (details.recordsProcessed + details.recordsFailed)) * 100)}% success rate
                    </div>
                  </div>
                )}
              </div>

              {/* Errors */}
              {details.errors && details.errors.length > 0 && (
                <div className="p-4 bg-error-500/10 border border-error-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-error-400" />
                    <h4 className="text-sm font-medium text-error-400">Errors ({details.errors.length})</h4>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {details.errors.map((error, idx) => (
                      <div key={idx} className="text-sm text-error-300 bg-surface-base rounded p-2">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

// Hook for managing sync details modal
export const useSyncDetailsModal = () => {
  const [selectedSyncId, setSelectedSyncId] = useState<string | null>(null);

  const openDetails = (syncId: string) => setSelectedSyncId(syncId);
  const closeDetails = () => setSelectedSyncId(null);

  return {
    selectedSyncId,
    openDetails,
    closeDetails,
    isOpen: selectedSyncId !== null,
  };
};
