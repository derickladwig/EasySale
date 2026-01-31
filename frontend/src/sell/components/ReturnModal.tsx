/**
 * ReturnModal Component
 * 
 * Modal for processing returns/refunds from past transactions.
 */

import { useState } from 'react';
import { X, Search, RotateCcw, Check, Loader2, AlertTriangle } from 'lucide-react';
import { useConfig } from '../../config';
import { useSalesList } from '../hooks/useSales';
import { Sale } from '../api/salesApi';
import { apiClient } from '@common/api/client';
import { toast } from '@common/utils/toast';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function ReturnModal({ isOpen, onClose, onComplete }: ReturnModalProps) {
  const { formatCurrency } = useConfig();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data, isLoading } = useSalesList({ limit: 50, offset: 0 });
  const sales = data?.sales?.filter(s => s.status === 'completed') ?? [];

  if (!isOpen) return null;

  // Filter sales by transaction number
  const filteredSales = sales.filter((sale) => {
    if (!searchQuery) return true;
    return sale.transaction_number.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleProcessReturn = async () => {
    if (!selectedSale || !returnReason.trim()) return;

    setIsProcessing(true);
    try {
      await apiClient.post(`/api/sales/${selectedSale.id}/return`, {
        reason: returnReason,
        refund_method: selectedSale.payment_method,
      });
      toast.success(`Return processed for ${selectedSale.transaction_number}`);
      onComplete();
      onClose();
    } catch {
      toast.error('Failed to process return');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 'var(--z-modal)' }}>
      <div className="absolute inset-0 bg-black/50" style={{ zIndex: 'var(--z-modal-backdrop)' }} onClick={onClose} />

      <div className="relative bg-surface-1 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-text-primary">Process Return</h2>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {!selectedSale ? (
          <>
            {/* Search */}
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by transaction #..."
                  className="w-full pl-10 pr-4 py-2 bg-surface-2 border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  autoFocus
                />
              </div>
            </div>

            {/* Sales list */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-text-tertiary" size={32} />
                </div>
              ) : filteredSales.length === 0 ? (
                <div className="text-center py-8 text-text-tertiary">
                  <RotateCcw size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No completed transactions found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSales.slice(0, 20).map((sale) => (
                    <button
                      key={sale.id}
                      onClick={() => setSelectedSale(sale)}
                      className="w-full flex items-center justify-between p-3 bg-surface-2 rounded-lg hover:bg-surface-3 transition-colors text-left"
                    >
                      <div>
                        <div className="font-mono text-text-primary">{sale.transaction_number}</div>
                        <div className="text-xs text-text-secondary">
                          {new Date(sale.created_at).toLocaleString()} • {sale.items_count} items
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-text-primary">{formatCurrency(sale.total_amount)}</div>
                        <div className="text-xs text-text-secondary uppercase">{sale.payment_method}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Selected sale details */}
            <div className="p-4 border-b border-border bg-surface-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-text-primary">{selectedSale.transaction_number}</span>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="text-sm text-accent hover:underline"
                >
                  Change
                </button>
              </div>
              <div className="text-sm text-text-secondary">
                {new Date(selectedSale.created_at).toLocaleString()} • {formatCurrency(selectedSale.total_amount)}
              </div>
            </div>

            {/* Return form */}
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                <AlertTriangle className="text-warning flex-shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-text-secondary">
                  Processing a return will restore inventory and issue a refund via {selectedSale.payment_method}.
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Reason for return *
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Enter reason..."
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="bg-surface-2 rounded-lg p-3">
                <div className="flex justify-between text-text-secondary mb-1">
                  <span>Refund Amount</span>
                  <span className="font-medium text-text-primary">{formatCurrency(selectedSale.total_amount)}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Refund Method</span>
                  <span className="uppercase">{selectedSale.payment_method}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-surface-2 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-surface-3 hover:bg-surface-3/80 text-text-primary font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessReturn}
                disabled={!returnReason.trim() || isProcessing}
                className="flex-1 py-3 bg-error hover:bg-error/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Check size={18} />
                )}
                Process Return
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
