/**
 * Inventory Count Page
 *
 * Page for managing inventory counting sessions:
 * - Create and manage count sessions
 * - Record counts for products
 * - View discrepancies and reconciliation
 * - Approval workflow
 *
 * Ported from POS project's inventory counting feature.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  Plus,
  Play,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  RefreshCw,
  Search,
  Filter,
  ChevronRight,
  Barcode,
} from 'lucide-react';

// Types
interface CountSession {
  id: string;
  tenant_id: string;
  store_id: string;
  count_type: string;
  status: string;
  category_filter?: string;
  bin_filter?: string;
  started_by_user_id?: string;
  started_at?: string;
  submitted_by_user_id?: string;
  submitted_at?: string;
  approved_by_user_id?: string;
  approved_at?: string;
  total_items_expected: number;
  total_items_counted: number;
  total_variance_items: number;
  total_variance_qty: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CountItem {
  id: string;
  session_id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  expected_qty: number;
  counted_qty?: number;
  variance: number;
  counted_by_user_id?: string;
  counted_at?: string;
  bin_location?: string;
  recount_requested: boolean;
  notes?: string;
}

interface DiscrepancyItem {
  product_id: string;
  product_name: string;
  product_sku: string;
  expected_qty: number;
  counted_qty: number;
  variance: number;
  variance_value: number;
  bin_location?: string;
}

interface ReconciliationResponse {
  session_id: string;
  total_items: number;
  items_with_variance: number;
  total_variance_qty: number;
  total_variance_value: number;
  discrepancies: DiscrepancyItem[];
}

// API functions
const countApi = {
  listSessions: async (filters: Record<string, string>): Promise<CountSession[]> => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`/api/inventory/counts?${params}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch sessions');
    return response.json();
  },

  getSession: async (id: string): Promise<CountSession> => {
    const response = await fetch(`/api/inventory/counts/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch session');
    return response.json();
  },

  createSession: async (data: {
    store_id: string;
    count_type?: string;
    category_filter?: string;
    bin_filter?: string;
    notes?: string;
  }) => {
    const response = await fetch('/api/inventory/counts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create session');
    return response.json();
  },

  startSession: async (id: string) => {
    const response = await fetch(`/api/inventory/counts/${id}/start`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to start session');
    return response.json();
  },

  submitSession: async (id: string) => {
    const response = await fetch(`/api/inventory/counts/${id}/submit`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to submit session');
    return response.json();
  },

  approveSession: async (id: string) => {
    const response = await fetch(`/api/inventory/counts/${id}/approve`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to approve session');
    return response.json();
  },

  getItems: async (sessionId: string): Promise<CountItem[]> => {
    const response = await fetch(`/api/inventory/counts/${sessionId}/items`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch items');
    return response.json();
  },

  recordCount: async (sessionId: string, data: { product_id: string; counted_qty: number; notes?: string }) => {
    const response = await fetch(`/api/inventory/counts/${sessionId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to record count');
    return response.json();
  },

  getDiscrepancies: async (sessionId: string): Promise<ReconciliationResponse> => {
    const response = await fetch(`/api/inventory/counts/${sessionId}/discrepancies`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch discrepancies');
    return response.json();
  },
};

// Status badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    draft: 'bg-surface-secondary text-text-primary dark:bg-surface-tertiary dark:text-text-tertiary',
    in_progress: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300',
    submitted: 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-300',
    approved: 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-300',
    cancelled: 'bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-300',
  };

  const labels: Record<string, string> = {
    draft: 'Draft',
    in_progress: 'In Progress',
    submitted: 'Submitted',
    approved: 'Approved',
    cancelled: 'Cancelled',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || colors.draft}`}>
      {labels[status] || status}
    </span>
  );
};

// Main component
export const InventoryCountPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'count' | 'reconcile'>('list');
  const [createModal, setCreateModal] = useState(false);
  const [newSession, setNewSession] = useState({
    store_id: 'default',
    count_type: 'cycle',
    notes: '',
  });
  const [countInput, setCountInput] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Queries
  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['count-sessions', statusFilter],
    queryFn: () => countApi.listSessions(statusFilter ? { status: statusFilter } : {}),
  });

  const { data: currentSession, isLoading: sessionLoading } = useQuery({
    queryKey: ['count-session', selectedSession],
    queryFn: () => countApi.getSession(selectedSession!),
    enabled: !!selectedSession,
  });

  const { data: items, isLoading: itemsLoading, refetch: refetchItems } = useQuery({
    queryKey: ['count-items', selectedSession],
    queryFn: () => countApi.getItems(selectedSession!),
    enabled: !!selectedSession && view === 'count',
  });

  const { data: discrepancies, isLoading: discrepanciesLoading } = useQuery({
    queryKey: ['count-discrepancies', selectedSession],
    queryFn: () => countApi.getDiscrepancies(selectedSession!),
    enabled: !!selectedSession && view === 'reconcile',
  });

  // Mutations
  const createSessionMutation = useMutation({
    mutationFn: countApi.createSession,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['count-sessions'] });
      setCreateModal(false);
      setSelectedSession(data.id);
      setNewSession({ store_id: 'default', count_type: 'cycle', notes: '' });
    },
  });

  const startSessionMutation = useMutation({
    mutationFn: countApi.startSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['count-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['count-session', selectedSession] });
      setView('count');
    },
  });

  const submitSessionMutation = useMutation({
    mutationFn: countApi.submitSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['count-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['count-session', selectedSession] });
      setView('reconcile');
    },
  });

  const approveSessionMutation = useMutation({
    mutationFn: countApi.approveSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['count-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['count-session', selectedSession] });
      setSelectedSession(null);
      setView('list');
    },
  });

  const recordCountMutation = useMutation({
    mutationFn: ({ productId, qty }: { productId: string; qty: number }) =>
      countApi.recordCount(selectedSession!, { product_id: productId, counted_qty: qty }),
    onSuccess: () => {
      refetchItems();
      queryClient.invalidateQueries({ queryKey: ['count-session', selectedSession] });
    },
  });

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const filteredItems = items?.filter(
    (item) =>
      !searchTerm ||
      item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product_sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCountSubmit = (productId: string) => {
    const qty = countInput[productId];
    if (qty !== undefined && qty >= 0) {
      recordCountMutation.mutate({ productId, qty });
      setCountInput((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-brand-primary" />
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Inventory Counting</h1>
            <p className="text-text-secondary">Manage cycle counts and inventory reconciliation</p>
          </div>
        </div>
        {view === 'list' && (
          <button
            onClick={() => setCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Count Session
          </button>
        )}
        {view !== 'list' && (
          <button
            onClick={() => {
              setSelectedSession(null);
              setView('list');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-surface-secondary hover:bg-surface-tertiary rounded-lg transition-colors"
          >
            Back to Sessions
          </button>
        )}
      </div>

      {/* Session List View */}
      {view === 'list' && (
        <div className="bg-surface-primary rounded-lg border border-border-primary">
          {/* Filters */}
          <div className="p-4 border-b border-border-primary flex items-center gap-4">
            <Filter className="w-5 h-5 text-text-secondary" />
            <select
              className="px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
            </select>
            <button
              onClick={() => refetchSessions()}
              className="flex items-center gap-2 px-3 py-2 bg-surface-secondary hover:bg-surface-tertiary rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Sessions Table */}
          {sessionsLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-text-secondary" />
            </div>
          ) : sessions?.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No count sessions found</p>
              <button
                onClick={() => setCreateModal(true)}
                className="mt-4 text-brand-primary hover:underline"
              >
                Create your first count session
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-primary">
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Created</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Progress</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Variance</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions?.map((session) => (
                    <tr
                      key={session.id}
                      className="border-b border-border-secondary hover:bg-surface-secondary cursor-pointer"
                      onClick={() => {
                        setSelectedSession(session.id);
                        setView(session.status === 'in_progress' ? 'count' : 'reconcile');
                      }}
                    >
                      <td className="py-3 px-4 text-sm text-text-secondary">
                        {formatTimestamp(session.created_at)}
                      </td>
                      <td className="py-3 px-4 text-sm text-text-primary capitalize">{session.count_type}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={session.status} />
                      </td>
                      <td className="py-3 px-4 text-sm text-text-primary">
                        {session.total_items_counted} / {session.total_items_expected}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {session.total_variance_items > 0 ? (
                          <span className="text-error-500">
                            {session.total_variance_items} items ({session.total_variance_qty} units)
                          </span>
                        ) : (
                          <span className="text-success-500">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <ChevronRight className="w-5 h-5 text-text-secondary" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Count View */}
      {view === 'count' && selectedSession && (
        <div className="space-y-4">
          {/* Session Info */}
          {currentSession && (
            <div className="bg-surface-primary rounded-lg border border-border-primary p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <StatusBadge status={currentSession.status} />
                  <span className="text-text-secondary">
                    Progress: {currentSession.total_items_counted} / {currentSession.total_items_expected} items
                  </span>
                </div>
                <div className="flex gap-2">
                  {currentSession.status === 'draft' && (
                    <button
                      onClick={() => startSessionMutation.mutate(selectedSession)}
                      disabled={startSessionMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      Start Counting
                    </button>
                  )}
                  {currentSession.status === 'in_progress' && (
                    <button
                      onClick={() => submitSessionMutation.mutate(selectedSession)}
                      disabled={submitSessionMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-warning-600 hover:bg-warning-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      Submit for Approval
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="text"
                placeholder="Search by product name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
              />
            </div>
            <button
              onClick={() => refetchItems()}
              className="flex items-center gap-2 px-3 py-2 bg-surface-secondary hover:bg-surface-tertiary rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Items List */}
          <div className="bg-surface-primary rounded-lg border border-border-primary">
            {itemsLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-text-secondary" />
              </div>
            ) : (
              <div className="divide-y divide-border-secondary">
                {filteredItems?.map((item) => (
                  <div key={item.id} className="p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-text-secondary" />
                        <span className="font-medium text-text-primary">{item.product_name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Barcode className="w-4 h-4" />
                          {item.product_sku || item.product_id}
                        </span>
                        {item.bin_location && <span>Bin: {item.bin_location}</span>}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-sm text-text-secondary">Expected</div>
                      <div className="text-lg font-semibold text-text-primary">{item.expected_qty}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Count"
                        value={countInput[item.product_id] ?? item.counted_qty ?? ''}
                        onChange={(e) =>
                          setCountInput((prev) => ({
                            ...prev,
                            [item.product_id]: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-24 px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary text-center"
                      />
                      <button
                        onClick={() => handleCountSubmit(item.product_id)}
                        disabled={
                          countInput[item.product_id] === undefined || recordCountMutation.isPending
                        }
                        className="px-3 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    </div>

                    {item.counted_qty !== null && item.counted_qty !== undefined && (
                      <div className="text-center min-w-[80px]">
                        <div className="text-sm text-text-secondary">Variance</div>
                        <div
                          className={`text-lg font-semibold ${
                            item.variance === 0
                              ? 'text-success-500'
                              : item.variance > 0
                              ? 'text-primary-500'
                              : 'text-error-500'
                          }`}
                        >
                          {item.variance > 0 ? '+' : ''}
                          {item.variance}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reconciliation View */}
      {view === 'reconcile' && selectedSession && (
        <div className="space-y-4">
          {/* Session Info */}
          {currentSession && (
            <div className="bg-surface-primary rounded-lg border border-border-primary p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <StatusBadge status={currentSession.status} />
                  <span className="text-text-secondary">
                    {currentSession.total_variance_items} items with variance
                  </span>
                </div>
                {currentSession.status === 'submitted' && (
                  <button
                    onClick={() => approveSessionMutation.mutate(selectedSession)}
                    disabled={approveSessionMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-success-600 hover:bg-success-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve & Apply Adjustments
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          {discrepancies && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-surface-primary rounded-lg border border-border-primary p-4">
                <div className="text-sm text-text-secondary">Total Items</div>
                <div className="text-2xl font-semibold text-text-primary">{discrepancies.total_items}</div>
              </div>
              <div className="bg-surface-primary rounded-lg border border-border-primary p-4">
                <div className="text-sm text-text-secondary">Items with Variance</div>
                <div className="text-2xl font-semibold text-warning-500">{discrepancies.items_with_variance}</div>
              </div>
              <div className="bg-surface-primary rounded-lg border border-border-primary p-4">
                <div className="text-sm text-text-secondary">Total Variance (Units)</div>
                <div className="text-2xl font-semibold text-error-500">{discrepancies.total_variance_qty}</div>
              </div>
              <div className="bg-surface-primary rounded-lg border border-border-primary p-4">
                <div className="text-sm text-text-secondary">Variance Value</div>
                <div className="text-2xl font-semibold text-error-500">
                  ${discrepancies.total_variance_value.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Discrepancies Table */}
          <div className="bg-surface-primary rounded-lg border border-border-primary">
            <div className="p-4 border-b border-border-primary">
              <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning-500" />
                Discrepancies
              </h3>
            </div>

            {discrepanciesLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-text-secondary" />
              </div>
            ) : discrepancies?.discrepancies.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success-500" />
                <p>No discrepancies found - counts match expected quantities</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-primary">
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Product</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">SKU</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Expected</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Counted</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Variance</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discrepancies?.discrepancies.map((item) => (
                      <tr key={item.product_id} className="border-b border-border-secondary">
                        <td className="py-3 px-4 text-sm text-text-primary">{item.product_name}</td>
                        <td className="py-3 px-4 text-sm font-mono text-text-secondary">{item.product_sku}</td>
                        <td className="py-3 px-4 text-sm text-right text-text-primary">{item.expected_qty}</td>
                        <td className="py-3 px-4 text-sm text-right text-text-primary">{item.counted_qty}</td>
                        <td
                          className={`py-3 px-4 text-sm text-right font-semibold ${
                            item.variance > 0 ? 'text-primary-500' : 'text-error-500'
                          }`}
                        >
                          {item.variance > 0 ? '+' : ''}
                          {item.variance}
                        </td>
                        <td
                          className={`py-3 px-4 text-sm text-right ${
                            item.variance_value >= 0 ? 'text-primary-500' : 'text-error-500'
                          }`}
                        >
                          ${Math.abs(item.variance_value).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-primary rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Create Count Session</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Count Type</label>
                <select
                  value={newSession.count_type}
                  onChange={(e) => setNewSession({ ...newSession, count_type: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                >
                  <option value="cycle">Cycle Count</option>
                  <option value="full">Full Count</option>
                  <option value="spot">Spot Check</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
                <textarea
                  value={newSession.notes}
                  onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                  placeholder="Optional notes..."
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setCreateModal(false)}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createSessionMutation.mutate(newSession)}
                disabled={createSessionMutation.isPending}
                className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Create Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryCountPage;
