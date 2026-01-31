import React, { useState, useEffect } from 'react';
import { QueueFilters } from './QueueFilters';

interface QueueCase {
  case_id: string;
  state: string;
  confidence: number;
  vendor_name: string;
  invoice_number: string;
  total: number;
  created_at: string;
  has_flags: boolean;
}

interface QueueStats {
  total_cases: number;
  pending: number;
  in_review: number;
  approved: number;
  rejected: number;
  avg_confidence: number;
}

interface ReviewQueueProps {
  onSelectCase: (caseId: string) => void;
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({ onSelectCase }) => {
  const [cases, setCases] = useState<QueueCase[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    state: 'pending',
    vendor: '',
    min_confidence: 0,
    max_confidence: 100,
  });
  const [sortField, setSortField] = useState('priority');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadQueue();
    loadStats();
  }, [filters, sortField, sortOrder, page]);

  const loadQueue = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        state: filters.state,
        min_confidence: filters.min_confidence.toString(),
        max_confidence: filters.max_confidence.toString(),
        sort: sortField,
        order: sortOrder,
        page: page.toString(),
        per_page: '20',
      });

      if (filters.vendor) {
        params.append('vendor', filters.vendor);
      }

      const response = await fetch(`/api/cases?${params}`);
      const data = await response.json();
      setCases(data.cases);
      setTotalPages(data.total_pages);
    } catch (error) {
      console.error('Failed to load queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/queue/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-success-600';
    if (confidence >= 70) return 'text-warning-600';
    return 'text-error-600';
  };

  const getStateColor = (state: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-warning-100 text-warning-800',
      in_review: 'bg-info-100 text-info-dark',
      approved: 'bg-success-100 text-success-800',
      rejected: 'bg-error-100 text-error-800',
    };
    return colors[state] || 'bg-surface-base text-text-secondary';
  };

  return (
    <div className="flex h-screen bg-background-secondary">
      {/* Sidebar - Filters & Stats */}
      <div className="w-80 bg-surface-base border-r border-border overflow-y-auto">
        {/* Stats */}
        {stats && (
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-3">Queue Statistics</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Cases:</span>
                <span className="font-semibold">{stats.total_cases}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pending:</span>
                <span className="font-semibold text-warning-600">{stats.pending}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>In Review:</span>
                <span className="font-semibold text-accent">{stats.in_review}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Approved:</span>
                <span className="font-semibold text-success-600">{stats.approved}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Rejected:</span>
                <span className="font-semibold text-error-600">{stats.rejected}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t">
                <span>Avg Confidence:</span>
                <span className="font-semibold">{stats.avg_confidence.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <QueueFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Main Content - Queue List */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-surface-base border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Review Queue</h2>
            <button
              onClick={loadQueue}
              className="px-3 py-1 bg-accent text-white rounded hover:bg-accent-hover text-sm"
            >
              🔄 Refresh
            </button>
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="px-3 py-1 border border-border rounded text-sm bg-surface-base"
            >
              <option value="priority">Priority (Low Confidence First)</option>
              <option value="created_at">Date Created</option>
              <option value="updated_at">Date Updated</option>
              <option value="confidence">Confidence</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-1 border border-border rounded text-sm bg-surface-base"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-text-secondary">Loading...</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-text-secondary">No cases found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cases.map((c) => (
                <div
                  key={c.case_id}
                  onClick={() => onSelectCase(c.case_id)}
                  className="bg-surface-base p-4 rounded-lg shadow-sm border border-border hover:border-accent cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{c.invoice_number}</h3>
                      <p className="text-sm text-text-secondary">{c.vendor_name}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getConfidenceColor(c.confidence)}`}>
                        {c.confidence}%
                      </p>
                      <span className={`text-xs px-2 py-1 rounded ${getStateColor(c.state)}`}>
                        {c.state}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">
                      Total: ${c.total.toFixed(2)}
                    </span>
                    <span className="text-text-tertiary">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {c.has_flags && (
                    <div className="mt-2 text-xs bg-warning-50 text-warning-700 px-2 py-1 rounded">
                      ⚠️ Has validation warnings
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 bg-surface-base border-t border-border">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-4 py-2 bg-secondary-600 text-white rounded hover:bg-secondary-700 disabled:bg-secondary-300 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-text-secondary">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 bg-secondary-600 text-white rounded hover:bg-secondary-700 disabled:bg-secondary-300 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
