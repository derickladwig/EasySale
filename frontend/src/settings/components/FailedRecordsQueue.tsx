import React, { useState, useEffect } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { toast } from '@common/components/molecules/Toast';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { syncApi, FailedRecord } from '../../services/syncApi';

export const FailedRecordsQueue: React.FC = () => {
  const [records, setRecords] = useState<FailedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadFailedRecords();
  }, []);

  const loadFailedRecords = async () => {
    try {
      const data = await syncApi.getFailedRecords();
      setRecords(data);
    } catch (error) {
      console.error('Failed to load failed records:', error);
      toast.error('Failed to load failed records');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryOne = async (id: number) => {
    setRetrying(id);
    try {
      await syncApi.retrySingleRecord(id);
      toast.success('Record retry triggered');
      setTimeout(loadFailedRecords, 2000);
    } catch (error) {
      console.error('Failed to retry record:', error);
      toast.error('Failed to retry record');
    } finally {
      setRetrying(null);
    }
  };

  const handleRetryAll = async () => {
    try {
      await syncApi.retryFailedRecords();
      toast.success('All records retry triggered');
      setTimeout(loadFailedRecords, 2000);
    } catch (error) {
      console.error('Failed to retry records:', error);
      toast.error('Failed to retry records');
    }
  };

  const handleRetrySelected = async () => {
    if (selectedIds.size === 0) {
      toast.warning('No records selected');
      return;
    }

    try {
      await syncApi.retryFailedRecords(Array.from(selectedIds));
      toast.success(`${selectedIds.size} records retry triggered`);
      setSelectedIds(new Set());
      setTimeout(loadFailedRecords, 2000);
    } catch (error) {
      console.error('Failed to retry selected records:', error);
      toast.error('Failed to retry selected records');
    }
  };

  const handleToggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map((r) => r.id)));
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="p-6 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-primary-400 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-error-400" />
            <h2 className="text-xl font-semibold text-text-primary">Failed Records Queue</h2>
            {records.length > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-error-500/20 text-error-400 rounded">
                {records.length} failed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                onClick={handleRetrySelected}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Selected ({selectedIds.size})
              </Button>
            )}
            {records.length > 0 && (
              <Button
                onClick={handleRetryAll}
                variant="primary"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry All
              </Button>
            )}
          </div>
        </div>

        {/* Records List */}
        {records.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary">No failed records in queue</div>
        ) : (
          <div className="space-y-2">
            {/* Select All */}
            <div className="flex items-center gap-2 p-3 bg-surface-base rounded-lg">
              <input
                type="checkbox"
                checked={selectedIds.size === records.length}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-border bg-surface-elevated text-primary-600 focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-sm text-text-secondary">Select All ({records.length})</span>
            </div>

            {/* Records */}
            {records.map((record) => (
              <div key={record.id} className="flex items-center gap-4 p-4 bg-surface-base rounded-lg">
                <input
                  type="checkbox"
                  checked={selectedIds.has(record.id)}
                  onChange={() => handleToggleSelect(record.id)}
                  className="w-4 h-4 rounded border-border bg-surface-elevated text-primary-600 focus:ring-2 focus:ring-primary-500"
                />

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-text-primary capitalize">{record.entity}</span>
                    <span className="text-xs text-text-tertiary">ID: {record.sourceId}</span>
                    <span className="px-2 py-0.5 text-xs bg-surface-elevated text-text-secondary rounded">
                      Retry: {record.retryCount}
                    </span>
                  </div>
                  <div className="text-sm text-error-400">{record.errorMessage}</div>
                  <div className="text-xs text-text-disabled mt-1">
                    Failed: {new Date(record.createdAt).toLocaleString()}
                  </div>
                </div>

                <Button
                  onClick={() => handleRetryOne(record.id)}
                  variant="outline"
                  size="sm"
                  disabled={retrying === record.id}
                  className="flex items-center gap-2"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${retrying === record.id ? 'animate-spin' : ''}`}
                  />
                  Retry
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Help Text */}
        {records.length > 0 && (
          <div className="text-xs text-text-tertiary p-3 bg-surface-base rounded-lg">
            <strong>Note:</strong> Failed records will be automatically retried with exponential
            backoff. Manual retry will attempt immediate synchronization.
          </div>
        )}
      </div>
    </Card>
  );
};
