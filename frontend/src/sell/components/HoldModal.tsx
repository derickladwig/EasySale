/**
 * HoldModal Component
 * 
 * Modal for holding/suspending transactions and resuming held ones.
 */

import { useState } from 'react';
import { X, Pause, Play, Trash2, Clock, User, ShoppingCart } from 'lucide-react';
import { cn } from '@common/utils/classNames';
import { Customer } from '@domains/customer';
import { Product } from '@domains/product';

interface CartItem {
  product: Product;
  quantity: number;
}

interface HeldTransaction {
  id: string;
  cart: CartItem[];
  customer: Customer | null;
  discount: number;
  couponCode: string | null;
  heldAt: Date;
  note: string;
}

interface HoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHold: (note: string) => void;
  onResume: (heldId: string) => void;
  onDelete: (heldId: string) => void;
  heldTransactions: HeldTransaction[];
  currentCartHasItems: boolean;
  formatCurrency: (amount: number) => string;
}

export function HoldModal({
  isOpen,
  onClose,
  onHold,
  onResume,
  onDelete,
  heldTransactions,
  currentCartHasItems,
  formatCurrency,
}: HoldModalProps) {
  const [holdNote, setHoldNote] = useState('');
  const [activeTab, setActiveTab] = useState<'hold' | 'resume'>(
    currentCartHasItems ? 'hold' : 'resume'
  );

  if (!isOpen) return null;

  const handleHold = () => {
    onHold(holdNote || 'No note');
    setHoldNote('');
  };

  const getCartTotal = (cart: CartItem[]) => {
    return cart.reduce((sum, item) => sum + (item.product.unitPrice || 0) * item.quantity, 0);
  };

  const getItemCount = (cart: CartItem[]) => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 'var(--z-modal)' }}>
      <div className="absolute inset-0 bg-black/50" style={{ zIndex: 'var(--z-modal-backdrop)' }} onClick={onClose} />

      <div className="relative bg-surface-1 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-text-primary">Hold / Resume</h2>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('hold')}
            disabled={!currentCartHasItems}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2',
              activeTab === 'hold'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary',
              !currentCartHasItems && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Pause size={16} />
            Hold Current
          </button>
          <button
            onClick={() => setActiveTab('resume')}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2',
              activeTab === 'resume'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <Play size={16} />
            Resume ({heldTransactions.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'hold' ? (
            <div className="space-y-4">
              <p className="text-text-secondary text-sm">
                Hold the current transaction to serve another customer. You can resume it later.
              </p>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={holdNote}
                  onChange={(e) => setHoldNote(e.target.value)}
                  placeholder="e.g., Customer name, reason..."
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  autoFocus
                />
              </div>
              <button
                onClick={handleHold}
                disabled={!currentCartHasItems}
                className="w-full py-3 bg-warning hover:bg-warning/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Pause size={18} />
                Hold Transaction
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {heldTransactions.length === 0 ? (
                <div className="text-center py-8 text-text-tertiary">
                  <Clock size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No held transactions</p>
                </div>
              ) : (
                heldTransactions.map((held) => (
                  <div
                    key={held.id}
                    className="bg-surface-2 rounded-lg p-4 border border-border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-text-primary font-medium">
                          <ShoppingCart size={16} />
                          {getItemCount(held.cart)} items
                        </div>
                        <div className="text-lg font-bold text-accent">
                          {formatCurrency(getCartTotal(held.cart))}
                        </div>
                      </div>
                      <button
                        onClick={() => onDelete(held.id)}
                        className="p-2 text-text-tertiary hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    {held.customer && (
                      <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
                        <User size={14} />
                        {held.customer.name}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-text-tertiary mb-3">
                      <Clock size={12} />
                      {held.heldAt.toLocaleString()}
                      {held.note && ` • ${held.note}`}
                    </div>
                    
                    <button
                      onClick={() => onResume(held.id)}
                      className="w-full py-2 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Play size={16} />
                      Resume
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
