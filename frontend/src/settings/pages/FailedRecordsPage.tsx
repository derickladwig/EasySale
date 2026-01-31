import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { toast } from '@common/components/molecules/Toast';
import { ScopeSelector } from '@common/components/molecules/ScopeSelector';
import { ConfirmDialog } from '@common/components/molecules/ConfirmDialog';
import {
  RefreshCw,
  AlertTriangle,
  Eye,
  CheckCircle,
  XCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
} from 'lucide-react';
import { syncApi, FailedRecord } from '../../services/syncApi';
import { useStores } from '../../admin/hooks/useStores';
import { useCapabilities } from '@common/contexts/CapabilitiesContext';
import { PayloadDetailsModal } from '../components/PayloadDetailsModal';

/**
 * FailedRecordsPage - Dedicated page for managing failed sync records
 * 
 * Validates: Requirements 4.1, 12.1, 12.2, 12.3
 */
export const FailedRecordsPage: React.FC = () => {
  // Store scope selection for multi-store support
  const { stores, isLoading: storesLoading } = useStores();
  const [selectedScope, setSelectedScope] = useState<'all' | string>('all');
  const { capabilities } = useCapabilities();
  const canManageSync = capabilities?.features?.sync ?? false;

  // Records state
  const [records, setRecords] = useState<FailedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selection state
  // Validates: Requirements 12.1
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Retry state
  const [retrying, setRetrying] = useState<number | null>(null);
  const [bulkRetrying, setBulkRetrying] = useState(false);
  const [bulkAcknowledging, setBulkAcknowledging] = useState(false);

  // Filter state
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Confirmation dialogs
  const [showRetryAllConfirm, setShowRetryAllConfirm] = useState(false);
  const [showAcknowledgeConfirm, setShowAcknowledgeConfirm] = useState(false);

  // Details modal state
  // Validates: Requirements 12.4
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);

  // Load failed records
  const loadFailedRecords = useCallback(async () => {
    try {
      const data = await syncApi.getFailedRecords();
      setRecords(data);
    } catch (error) {
      console.error('Failed to load failed records:', error);
      toast.error('Failed to load failed records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFailedRecords();
    // Refresh every 30 seconds
    const interval = setInterval(loadFailedRecords, 30000);
    return () => clearInterval(interval);
  }, [loadFailedRecords]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadFailedRecords();
  };

  // Handle retry single record
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

  // Handle retry all records
  const handleRetryAll = async () => {
    setBulkRetrying(true);
    try {
      await syncApi.retryFailedRecords();
      toast.success('All records retry triggered');
      setShowRetryAllConfirm(false);
      setTimeout(loadFailedRecords, 2000);
    } catch (error) {
      console.error('Failed to retry records:', error);
      toast.error('Failed to retry records');
    } finally {
      setBulkRetrying(false);
    }
  };

  // Handle retry selected records
  // Validates: Requirements 12.2
  const handleRetrySelected = async () => {
    if (selectedIds.size === 0) {
      toast.warning('No records selected');
      return;
    }

    setBulkRetrying(true);
    try {
      await syncApi.retryFailedRecords(Array.from(selectedIds));
      toast.success(`${selectedIds.size} records retry triggered`);
      setSelectedIds(new Set());
      setTimeout(loadFailedRecords, 2000);
    } catch (error) {
      console.error('Failed to retry selected records:', error);
      toast.error('Failed to retry selected records');
    } finally {
      setBulkRetrying(false);
    }
  };

  // Handle acknowledge selected records
  // Validates: Requirements 12.3
  const handleAcknowledgeSelected = async () => {
    if (selectedIds.size === 0) {
      toast.warning('No records selected');
      return;
    }

    setBulkAcknowledging(true);
    try {
      await syncApi.acknowledgeFailedRecords(Array.from(selectedIds));
      toast.success(`${selectedIds.size} records acknowledged`);
      setSelectedIds(new Set());
      setShowAcknowledgeConfirm(false);
      setTimeout(loadFailedRecords, 2000);
    } catch (error) {
      console.error('Failed to acknowledge records:', error);
      toast.error('Failed to acknowledge records');
    } finally {
      setBulkAcknowledging(false);
    }
  };

  // Toggle selection for a single record
  const handleToggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all visible records
  const handleSelectAll = () => {
    const visibleRecords = filteredRecords;
    if (selectedIds.size === visibleRecords.length && visibleRecords.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleRecords.map((r) => r.id)));
    }
  };

  // Get unique entity types for filter
  const entityTypes = Array.from(new Set(records.map((r) => r.entity)));

  // Filter records
  const filteredRecords = records.filter((record) => {
    if (entityFilter !== 'all' && record.entity !== entityFilter) {
      return false;
    }
    return true;
  });

  // Check if max retries exceeded (assuming max is 5)
  const isMaxRetriesExceeded = (retryCount: number) => retryCount >= 5;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background-primary">
        <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background-primary p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Failed Records</h1>
            <p className="text-text-secondary mt-2">
              Manage and retry failed synchronization records
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Scope Selector */}
            {!storesLoading && stores.length > 1 && (
              <ScopeSelector
                value={selectedScope}
                onChange={setSelectedScope}
                stores={stores}
              />
            )}
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-4">
              <div className="text-sm text-text-tertiary">Total Failed</div>
              <div className="text-2xl font-bold text-error-400 mt-1">{records.length}</div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="text-sm text-text-tertiary">Max Retries Exceeded</div>
              <div className="text-2xl font-bold text-warning-400 mt-1">
                {records.filter((r) => isMaxRetriesExceeded(r.retryCount)).length}
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="text-sm text-text-tertiary">Entity Types</div>
              <div className="text-2xl font-bold text-text-primary mt-1">{entityTypes.length}</div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="text-sm text-text-tertiary">Selected</div>
              <div className="text-2xl font-bold text-primary-400 mt-1">{selectedIds.size}</div>
            </div>
          </Card>
        </div>

        {/* Bulk Actions Bar */}
        {/* Validates: Requirements 12.2, 12.3 */}
        {selectedIds.size > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-primary-400" />
              <span className="font-medium text-text-primary">
                {selectedIds.size} record{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRetrySelected}
                variant="outline"
                size="sm"
                disabled={bulkRetrying || !canManageSync}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${bulkRetrying ? 'animate-spin' : ''}`} />
                Retry Selected
              </Button>
              <Button
                onClick={() => setShowAcknowledgeConfirm(true)}
                variant="outline"
                size="sm"
                disabled={bulkAcknowledging || !canManageSync}
                className="flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Acknowledge Selected
              </Button>
              <Button
                onClick={() => setSelectedIds(new Set())}
                variant="ghost"
                size="sm"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Main Content Card */}
        <Card>
          <div className="p-6 space-y-4">
            {/* Header with filters */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-error-400" />
                <h2 className="text-xl font-semibold text-text-primary">Failed Records Queue</h2>
                {records.length > 0 && (
                  <span className="px-2 py-1 text-xs font-medium bg-error-500/20 text-error-400 rounded">
                    {filteredRecords.length} of {records.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {showFilters ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
                {records.length > 0 && canManageSync && (
                  <Button
                    onClick={() => setShowRetryAllConfirm(true)}
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

            {/* Filters */}
            {showFilters && (
              <div className="p-4 bg-surface-base rounded-lg border border-border-default">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Entity Type
                    </label>
                    <select
                      value={entityFilter}
                      onChange={(e) => setEntityFilter(e.target.value)}
                      className="px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="all">All Types</option>
                      {entityTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Records List */}
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-text-tertiary">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No failed records</p>
                <p className="text-sm mt-1">
                  {records.length > 0
                    ? 'No records match the current filters'
                    : 'All sync operations completed successfully'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Select All Header */}
                <div className="flex items-center gap-2 p-3 bg-surface-base rounded-lg border border-border-default">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === filteredRecords.length && filteredRecords.length > 0
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-border bg-surface-elevated text-primary-600 focus:ring-2 focus:ring-primary-500"
                    aria-label="Select all records"
                  />
                  <span className="text-sm text-text-secondary">
                    Select All ({filteredRecords.length})
                  </span>
                </div>

                {/* Records */}
                {filteredRecords.map((record) => (
                  <div
                    key={record.id}
                    className={`flex items-center gap-4 p-4 bg-surface-base rounded-lg border ${
                      selectedIds.has(record.id)
                        ? 'border-primary-500/50'
                        : 'border-border-default'
                    } hover:border-border-hover transition-colors`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.has(record.id)}
                      onChange={() => handleToggleSelect(record.id)}
                      className="w-4 h-4 rounded border-border bg-surface-elevated text-primary-600 focus:ring-2 focus:ring-primary-500"
                      aria-label={`Select record ${record.id}`}
                    />

                    {/* Record Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-text-primary capitalize">
                          {record.entity}
                        </span>
                        <span className="text-xs text-text-tertiary">ID: {record.sourceId}</span>
                        <span className="px-2 py-0.5 text-xs bg-surface-elevated text-text-secondary rounded">
                          Retry: {record.retryCount}
                        </span>
                        {/* Max Retries Exceeded Badge */}
                        {/* Validates: Requirements 4.7, 12.6 */}
                        {isMaxRetriesExceeded(record.retryCount) && (
                          <span className="px-2 py-0.5 text-xs bg-warning-500/20 text-warning-400 rounded flex items-center gap-1">
                            <AlertOctagon className="w-3 h-3" />
                            Max Retries Exceeded
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-error-400 truncate">{record.errorMessage}</div>
                      <div className="text-xs text-text-disabled mt-1">
                        Failed: {new Date(record.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setSelectedRecordId(record.id)}
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleRetryOne(record.id)}
                        variant="outline"
                        size="sm"
                        disabled={retrying === record.id || !canManageSync}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${retrying === record.id ? 'animate-spin' : ''}`}
                        />
                        Retry
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Help Text */}
            {records.length > 0 && (
              <div className="text-xs text-text-tertiary p-3 bg-surface-base rounded-lg border border-border-default">
                <strong>Note:</strong> Failed records will be automatically retried with exponential
                backoff. Manual retry will attempt immediate synchronization. Records that exceed
                the maximum retry count (5) require manual intervention.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Retry All Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRetryAllConfirm}
        onClose={() => setShowRetryAllConfirm(false)}
        onConfirm={handleRetryAll}
        title="Retry All Failed Records"
        message={`Are you sure you want to retry all ${records.length} failed records? This will trigger immediate synchronization attempts for all records.`}
        confirmText="Retry All"
        cancelText="Cancel"
        variant="warning"
        isLoading={bulkRetrying}
      />

      {/* Acknowledge Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showAcknowledgeConfirm}
        onClose={() => setShowAcknowledgeConfirm(false)}
        onConfirm={handleAcknowledgeSelected}
        title="Acknowledge Selected Records"
        message={`Are you sure you want to acknowledge ${selectedIds.size} selected records? This will remove them from the queue without retrying. This action cannot be undone.`}
        confirmText="Acknowledge"
        cancelText="Cancel"
        variant="danger"
        isLoading={bulkAcknowledging}
      />

      {/* Payload Details Modal */}
      {/* Validates: Requirements 12.4 */}
      {selectedRecordId !== null && (
        <PayloadDetailsModal
          recordId={selectedRecordId}
          onClose={() => setSelectedRecordId(null)}
        />
      )}
    </div>
  );
};

export default FailedRecordsPage;
