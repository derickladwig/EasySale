/**
 * IntegrationLogsDrawer Component
 * 
 * Slide-out drawer displaying integration logs with filtering and pagination.
 * Uses semantic tokens for styling (no hardcoded colors).
 * 
 * Requirements: 9.3
 */

import { useState, useEffect } from 'react';
import { syncApi } from '../../services/syncApi';

interface LogEntry {
  id: string;
  level: string;
  event: string;
  message: string;
  details: string;
  timestamp: string;
}

interface IntegrationLogsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  platform: 'stripe' | 'square' | 'clover' | 'woocommerce' | 'quickbooks' | 'supabase';
  title?: string;
}

type LogLevel = 'all' | 'info' | 'warning' | 'error';

export function IntegrationLogsDrawer({ 
  isOpen, 
  onClose, 
  platform,
  title 
}: IntegrationLogsDrawerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<LogLevel>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, platform]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      let response: { logs: LogEntry[] };
      switch (platform) {
        case 'stripe':
          response = await syncApi.getStripeLogs();
          break;
        case 'square':
          response = await syncApi.getSquareLogs();
          break;
        case 'clover':
          response = await syncApi.getCloverLogs();
          break;
        default:
          response = { logs: [] };
      }
      setLogs(response.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    levelFilter === 'all' || log.level === levelFilter
  );

  const paginatedLogs = filteredLogs.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'info':
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md">
          <div className="flex h-full flex-col bg-surface shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-default px-4 py-3">
              <h2 className="text-lg font-semibold text-primary">
                {title || `${platform.charAt(0).toUpperCase() + platform.slice(1)} Logs`}
              </h2>
              <button
                onClick={onClose}
                className="rounded-md p-2 text-secondary hover:bg-surface-hover hover:text-primary"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filter */}
            <div className="border-b border-default px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-secondary">Filter:</span>
                <select
                  value={levelFilter}
                  onChange={(e) => {
                    setLevelFilter(e.target.value as LogLevel);
                    setPage(1);
                  }}
                  className="rounded-md border border-default bg-surface px-2 py-1 text-sm text-primary"
                >
                  <option value="all">All Levels</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
                <button
                  onClick={fetchLogs}
                  className="ml-auto rounded-md px-2 py-1 text-sm text-accent hover:bg-surface-hover"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                </div>
              ) : error ? (
                <div className="rounded-md bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              ) : paginatedLogs.length === 0 ? (
                <div className="py-8 text-center text-secondary">
                  No logs found
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-md border border-default bg-surface-secondary p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getLevelBadgeClass(log.level)}`}>
                          {log.level}
                        </span>
                        <span className="text-xs text-tertiary">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-sm font-medium text-primary">{log.event}</span>
                        <p className="mt-1 text-sm text-secondary">{log.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-default px-4 py-3">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-md px-3 py-1 text-sm text-primary hover:bg-surface-hover disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-secondary">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-md px-3 py-1 text-sm text-primary hover:bg-surface-hover disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default IntegrationLogsDrawer;
