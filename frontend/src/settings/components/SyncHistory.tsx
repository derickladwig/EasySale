import React, { useState, useEffect } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { Input } from '@common/components/atoms/Input';
import { toast } from '@common/components/molecules/Toast';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { syncApi, SyncStatus } from '../../services/syncApi';

export const SyncHistory: React.FC = () => {
  const [syncs, setSyncs] = useState<SyncStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterEntity, setFilterEntity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadSyncs();
  }, [filterEntity, filterStatus, page]);

  const loadSyncs = async () => {
    try {
      const { entries, total: totalCount } = await syncApi.getSyncHistory({
        entity: filterEntity || undefined,
        status: filterStatus || undefined,
        limit: pageSize,
        offset: page * pageSize,
      });

      // Convert history entries to SyncStatus format
      setSyncs(
        entries.map((entry) => ({
          syncId: entry.syncId,
          entity: entry.entity,
          mode: 'incremental' as const,
          status: entry.status as 'pending' | 'running' | 'completed' | 'failed',
          startedAt: entry.startedAt,
          completedAt: entry.completedAt,
          recordsProcessed: entry.recordsProcessed,
          recordsFailed: entry.recordsFailed,
          errors: entry.errorMessage ? [entry.errorMessage] : undefined,
        }))
      );
      setTotal(totalCount);
    } catch (error) {
      console.error('Failed to load sync history:', error);
      toast.error('Failed to load sync history');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Sync ID', 'Entity', 'Mode', 'Status', 'Started', 'Completed', 'Processed', 'Failed'].join(
        ','
      ),
      ...filteredSyncs.map((sync) =>
        [
          sync.syncId,
          sync.entity,
          sync.mode,
          sync.status,
          sync.startedAt,
          sync.completedAt || '',
          sync.recordsProcessed,
          sync.recordsFailed,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync-history-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Sync history exported');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-error-400" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-primary-400 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-text-disabled" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded';
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-success-500/20 text-success-400`;
      case 'failed':
        return `${baseClasses} bg-error-500/20 text-error-400`;
      case 'running':
        return `${baseClasses} bg-primary-500/20 text-primary-400`;
      default:
        return `${baseClasses} bg-surface-elevated text-text-tertiary`;
    }
  };

  const filteredSyncs = syncs.filter((sync) => {
    if (filterEntity && !sync.entity.toLowerCase().includes(filterEntity.toLowerCase())) {
      return false;
    }
    if (filterStatus && sync.status !== filterStatus) {
      return false;
    }
    return true;
  });

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
          <h2 className="text-xl font-semibold text-text-primary">Sync History</h2>
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-text-tertiary" />
          <Input
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            placeholder="Filter by entity..."
            size="sm"
            className="flex-1"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Sync List */}
        <div className="space-y-2">
          {syncs.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary">No sync history found</div>
          ) : (
            syncs.map((sync) => (
              <div key={sync.syncId} className="border border-border rounded-lg">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-base/50"
                  onClick={() => setExpandedId(expandedId === sync.syncId ? null : sync.syncId)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    {getStatusIcon(sync.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary capitalize">{sync.entity}</span>
                        <span className={getStatusBadge(sync.status)}>{sync.status}</span>
                        <span className="text-xs text-text-tertiary">
                          {sync.mode === 'full' ? 'Full' : 'Incremental'}
                        </span>
                      </div>
                      <div className="text-sm text-text-tertiary mt-1">
                        Started: {new Date(sync.startedAt).toLocaleString()}
                        {sync.completedAt &&
                          ` • Completed: ${new Date(sync.completedAt).toLocaleString()}`}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-text-secondary">{sync.recordsProcessed} processed</div>
                      {sync.recordsFailed > 0 && (
                        <div className="text-error-400">{sync.recordsFailed} failed</div>
                      )}
                    </div>
                  </div>
                  {expandedId === sync.syncId ? (
                    <ChevronUp className="w-5 h-5 text-text-tertiary ml-2" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-text-tertiary ml-2" />
                  )}
                </div>

                {/* Expanded Details */}
                {expandedId === sync.syncId && (
                  <div className="border-t border-border p-4 bg-surface-base/30">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Sync ID:</span>
                        <span className="text-text-secondary font-mono">{sync.syncId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Entity:</span>
                        <span className="text-text-secondary capitalize">{sync.entity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Mode:</span>
                        <span className="text-text-secondary capitalize">{sync.mode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Records Processed:</span>
                        <span className="text-text-secondary">{sync.recordsProcessed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Records Failed:</span>
                        <span className="text-text-secondary">{sync.recordsFailed}</span>
                      </div>
                      {sync.errors && sync.errors.length > 0 && (
                        <div className="mt-3">
                          <div className="text-text-tertiary mb-2">Errors:</div>
                          <div className="space-y-1">
                            {sync.errors.map((error: string, index: number) => (
                              <div
                                key={index}
                                className="p-2 bg-error-500/10 border border-error-500/20 rounded text-error-400 text-xs"
                              >
                                {error}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="text-sm text-text-tertiary">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total}{' '}
              syncs
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <Button
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * pageSize >= total}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
