/**
 * TransactionHistoryPage
 * 
 * View past sales transactions with search, filter, and receipt printing.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Receipt,
  Printer,
  Mail,
  Eye,
  RotateCcw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@common/utils/classNames';
import { useConfig } from '../../config';
import { Button } from '@common/components/atoms/Button';
import { LoadingSpinner } from '@common/components/organisms/LoadingSpinner';
import { EmptyState } from '@common/components/molecules/EmptyState';
import { useSalesList, useVoidSale } from '../../sell/hooks/useSales';
import { Sale } from '../../sell/api/salesApi';
import { apiClient } from '@common/api/client';
import { toast } from '@common/utils/toast';

export function TransactionHistoryPage() {
  const navigate = useNavigate();
  const { formatCurrency } = useConfig();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'voided'>('all');
  const [page, setPage] = useState(0);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const pageSize = 20;
  const { data, isLoading, error } = useSalesList({ limit: pageSize, offset: page * pageSize });
  const voidSale = useVoidSale();

  const sales = data?.sales ?? [];
  const totalSales = data?.total ?? 0;
  const totalPages = Math.ceil(totalSales / pageSize);

  // Filter sales
  const filteredSales = sales.filter((sale) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!sale.transaction_number.toLowerCase().includes(query)) {
        return false;
      }
    }
    // Status filter
    if (statusFilter !== 'all' && sale.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const handleVoid = async () => {
    if (!selectedSale || !voidReason.trim()) return;
    
    try {
      await voidSale.mutateAsync({ id: selectedSale.id, reason: voidReason });
      toast.success('Transaction voided successfully');
      setShowVoidModal(false);
      setSelectedSale(null);
      setVoidReason('');
    } catch {
      toast.error('Failed to void transaction');
    }
  };

  const handlePrintReceipt = (sale: Sale) => {
    // Open print dialog with receipt content
    const receiptWindow = window.open('', '_blank', 'width=400,height=600');
    if (receiptWindow) {
      receiptWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${sale.transaction_number}</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .line { border-top: 1px dashed #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-weight: bold; font-size: 1.2em; }
            .footer { text-align: center; margin-top: 20px; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>EasySale</h2>
            <p>Transaction: ${sale.transaction_number}</p>
            <p>${new Date(sale.created_at).toLocaleString()}</p>
          </div>
          <div class="line"></div>
          <div class="row"><span>Items:</span><span>${sale.items_count}</span></div>
          <div class="row"><span>Subtotal:</span><span>${formatCurrency(sale.subtotal)}</span></div>
          ${sale.discount_amount > 0 ? `<div class="row"><span>Discount:</span><span>-${formatCurrency(sale.discount_amount)}</span></div>` : ''}
          <div class="row"><span>Tax:</span><span>${formatCurrency(sale.tax_amount)}</span></div>
          <div class="line"></div>
          <div class="row total"><span>TOTAL:</span><span>${formatCurrency(sale.total_amount)}</span></div>
          <div class="line"></div>
          <div class="row"><span>Payment:</span><span>${sale.payment_method.toUpperCase()}</span></div>
          <div class="footer">
            <p>Thank you for your purchase!</p>
            ${sale.status === 'voided' ? '<p style="color: red;">*** VOIDED ***</p>' : ''}
          </div>
          <script>window.print();</script>
        </body>
        </html>
      `);
      receiptWindow.document.close();
    }
  };

  const handleEmailReceipt = async (sale: Sale) => {
    // Prompt for email if customer doesn't have one
    const email = prompt('Enter email address for receipt:');
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    try {
      await apiClient.post(`/api/sales/${sale.id}/email-receipt`, { email });
      toast.success(`Receipt sent to ${email}`);
    } catch {
      toast.error('Failed to send email receipt');
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Transaction History</h1>
            <p className="text-text-tertiary text-sm">View and manage past sales</p>
          </div>
          <Button
            variant="primary"
            leftIcon={<Receipt size={18} />}
            onClick={() => navigate('/sell')}
          >
            New Sale
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by transaction #..."
              className="w-full pl-10 pr-4 py-2 bg-surface border border-border-strong rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Date filter */}
          <div className="flex gap-1 bg-surface rounded-lg p-1">
            {(['today', 'week', 'month', 'all'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={cn(
                  'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                  dateFilter === filter
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                {filter === 'today' ? 'Today' : filter === 'week' ? 'Week' : filter === 'month' ? 'Month' : 'All'}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 bg-surface border border-border-strong rounded-lg text-text-primary"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="voided">Voided</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" text="Loading transactions..." centered />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <EmptyState
              title="Failed to load transactions"
              description="Please try again"
              icon={<AlertTriangle size={48} className="text-error-400" />}
            />
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <EmptyState
              title="No transactions found"
              description={searchQuery ? 'Try adjusting your search' : 'Complete a sale to see it here'}
              icon={<Receipt size={48} className="opacity-50" />}
              primaryAction={{
                label: 'New Sale',
                onClick: () => navigate('/sell'),
              }}
            />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-surface sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary">Transaction #</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary hidden md:table-cell">Date</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-text-tertiary">Items</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-text-tertiary">Total</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-text-tertiary hidden sm:table-cell">Payment</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-text-tertiary">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-text-tertiary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-surface/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-text-primary">{sale.transaction_number}</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-sm hidden md:table-cell">
                    {new Date(sale.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center text-text-primary">{sale.items_count}</td>
                  <td className="px-4 py-3 text-right font-medium text-text-primary">
                    {formatCurrency(sale.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className="px-2 py-1 bg-surface-secondary rounded text-xs text-text-secondary uppercase">
                      {sale.payment_method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        sale.status === 'completed' && 'bg-success-500/20 text-success-400',
                        sale.status === 'voided' && 'bg-error-500/20 text-error-400'
                      )}
                    >
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handlePrintReceipt(sale)}
                        className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors"
                        title="Print Receipt"
                      >
                        <Printer size={16} />
                      </button>
                      <button
                        onClick={() => handleEmailReceipt(sale)}
                        className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors"
                        title="Email Receipt"
                      >
                        <Mail size={16} />
                      </button>
                      {sale.status === 'completed' && (
                        <button
                          onClick={() => {
                            setSelectedSale(sale);
                            setShowVoidModal(true);
                          }}
                          className="p-2 text-text-tertiary hover:text-error-400 hover:bg-error-500/10 rounded-lg transition-colors"
                          title="Void Transaction"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-border flex items-center justify-between">
          <span className="text-sm text-text-tertiary">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalSales)} of {totalSales}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ChevronLeft size={16} />}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              rightIcon={<ChevronRight size={16} />}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {showVoidModal && selectedSale && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 'var(--z-modal)' }}>
          <div className="absolute inset-0 bg-black/50" style={{ zIndex: 'var(--z-modal-backdrop)' }} onClick={() => setShowVoidModal(false)} />
          <div className="relative bg-surface-1 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-text-primary mb-4">Void Transaction</h2>
            <p className="text-text-secondary mb-4">
              Are you sure you want to void transaction <strong>{selectedSale.transaction_number}</strong>?
              This will restore inventory and cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Reason for voiding *
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Enter reason..."
                rows={3}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder-text-tertiary resize-none"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  setShowVoidModal(false);
                  setVoidReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={handleVoid}
                disabled={!voidReason.trim() || voidSale.isPending}
                loading={voidSale.isPending}
                className="bg-error-500 hover:bg-error-600"
              >
                Void Transaction
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
