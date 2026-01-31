/**
 * SyncHistoryPage - Dedicated page for viewing sync history
 * 
 * Provides a full-page view of sync history with:
 * - Scope selector for multi-store filtering
 * - Enhanced filters (entity, status, date range)
 * - Paginated history table
 * - Details modal for individual sync entries
 * 
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { Input } from '@common/components/atoms/Input';
import { toast } from '@common/components/molecules/Toast';
import { ScopeSelector } from '@common/components/molecules/ScopeSelector';
import { StatusChip } from '@common/components/atoms/StatusChip';
import {
  Download,
  Filter,
  RefreshCw,
  Calendar,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { syncApi } from '../../services/syncApi';
import { SyncDetailsModal, useSyncDetailsModal } from '../components/SyncDetailsModal';
import { useStores } from '../../admin/hooks/useStores';
import { useCapabilities } from '@common/contexts';

interface SyncHistoryEntry {
  syncId: string;
  entity: string;
  operation: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'skipped';
  recordsProcessed: number;
  recordsFailed: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export const SyncHistoryPage: React.FC = () => {
  // Store scope selection
  const { stores, isLoading: storesLoading } = useStores();
  const [selectedScope, setSelectedScope] = useState<'all' | string>('all');
  
  // Capability check
  const { capabilities } = useCapabilities();
  const hasSyncCapability = capabilities?.features?.sync ?? true;

  // Data state
  const [entries, setEntries] = useState<SyncHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [filterEntity, setFilterEntity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination state
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Details modal
  const { selectedSyncId, openDetails, closeDetails, isOpen: isDetailsOpen } = useSyncDetailsModal();

  /**
   * Load sync history with current filters
   * Validates: Requirements 3.1, 3.4, 3.5, 3.6
   */
  const loadHistory = useCallback(async () => {
    try {
      const { entries: historyEntries, total: totalCount } = await syncApi.getSyncHistory({
        entity: filterEntity || undefined,
        status: filterStatus || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: pageSize,
        offset: page * pageSize,
      });

      setEntries(
        historyEntries.map((entry) => ({
          syncId: entry.syncId,
          entity: entry.entity,
          operation: entry.operation || 'sync',
          status: entry.status as SyncHistoryEntry['status'],
          recordsProcessed: entry.recordsProcessed,
          recordsFailed: entry.recordsFailed,
          startedAt: entry.startedAt,
          completedAt: entry.completedAt,
          errorMessage: entry.errorMessage,
        }))
      );
      setTotal(totalCount);
    } catch (error) {
      console.error('Failed to load sync history:', error);
      toast.error('Failed to load sync history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterEntity, filterStatus, startDate, endDate, page]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const handleClearFilters = () => {
    setFilterEntity('');
    setFilterStatus('');
    setStartDate('');
    setEndDate('');
    setPage(0);
  };

  /**
   * Export history to CSV
   * Validates: Requirements 3.1
   */
  const handleExport = () => {
    const csv = [
      ['Sync ID', 'Entity', 'Operation', 'Status', 'Started', 'Completed', 'Processed', 'Failed', 'Error'].join(','),
      ...entries.map((entry) =>
        [
          entry.syncId,
          entry.entity,
          entry.operation,
          entry.status,
          entry.startedAt,
          entry.completedAt || '',
          entry.recordsProcessed,
          entry.recordsFailed,
          entry.errorMessage ? `"${entry.errorMessage.replace(/"/g, '""')}"` : '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Sync history exported');
  };

  const totalPages = Math.ceil(total / pageSize);
  const hasFilters = filterEntity || filterStatus || startDate || endDate;

  // Gate with sync capability
  if (!hasSyncCapability) {
    return (
      <div className="h-full flex items-center justify-center bg-background-primary p-6">
        <Card>
          <div className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-warning-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">Sync Not Enabled</h2>
            <p className="text-text-secondary">
              The sync capability is not enabled for this tenant. Contact your administrator to enable it.
            </p>
          </div>
        </Card>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-text-primary">Sync History</h1>
            <p className="text-text-secondary mt-2">View and audit past synchronization operations</p>
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
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
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

        {/* Filters */}
        {/* Validates: Requirements 3.4, 3.5, 3.6 */}
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-text-tertiary" />
              <span className="text-sm font-medium text-text-secondary">Filters</span>
              {hasFilters && (
                <Button
                  onClick={handleClearFilters}
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Entity Filter */}
              <Input
                value={filterEntity}
                onChange={(e) => {
                  setFilterEntity(e.target.value);
                  setPage(0);
                }}
                placeholder="Filter by entity..."
                size="sm"
              />
              
              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(0);
                }}
                className="px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All statuses</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
                <option value="queued">Queued</option>
                <option value="skipped">Skipped</option>
              </select>

              {/* Start Date */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(0);
                  }}
                  className="w-full pl-10 pr-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Start date"
                />
              </div>

              {/* End Date */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(0);
                  }}
                  className="w-full pl-10 pr-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="End date"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* History Table */}
        {/* Validates: Requirements 3.1, 3.2, 3.3 */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Operation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Records
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-text-tertiary">
                      {hasFilters ? 'No sync history matches your filters' : 'No sync history found'}
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const duration = entry.completedAt
                      ? Math.round((new Date(entry.completedAt).getTime() - new Date(entry.startedAt).getTime()) / 1000)
                      : null;

                    return (
                      <tr
                        key={entry.syncId}
                        className="hover:bg-surface-base/50 cursor-pointer transition-colors"
                        onClick={() => openDetails(entry.syncId)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium text-text-primary capitalize">
                            {entry.entity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-text-secondary capitalize">
                            {entry.operation}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusChip status={entry.status} size="sm" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <span className="text-text-secondary">{entry.recordsProcessed}</span>
                            {entry.recordsFailed > 0 && (
                              <span className="text-error-400 ml-2">
                                ({entry.recordsFailed} failed)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-text-secondary">
                            {new Date(entry.startedAt).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-text-secondary">
                            {duration !== null ? `${duration}s` : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetails(entry.syncId);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-sm text-text-tertiary">
                Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} entries
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                  variant="outline"
                  size="sm"
                >
                  First
                </Button>
                <Button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                <span className="px-3 py-2 text-sm text-text-secondary">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
                <Button
                  onClick={() => setPage(totalPages - 1)}
                  disabled={page >= totalPages - 1}
                  variant="outline"
                  size="sm"
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Sync Details Modal */}
      {/* Validates: Requirements 3.3, 3.7 */}
      {isDetailsOpen && selectedSyncId && (
        <SyncDetailsModal syncId={selectedSyncId} onClose={closeDetails} />
      )}
    </div>
  );
};

export default SyncHistoryPage;
