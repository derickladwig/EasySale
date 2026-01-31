/**
 * DiscountModal Component
 * 
 * Modal for applying discounts to a sale.
 */

import { useState } from 'react';
import { X, Percent, DollarSign } from 'lucide-react';
import { cn } from '@common/utils/classNames';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (amount: number, type: 'percentage' | 'fixed') => void;
  subtotal: number;
  formatCurrency: (amount: number) => string;
}

export function DiscountModal({
  isOpen,
  onClose,
  onApply,
  subtotal,
  formatCurrency,
}: DiscountModalProps) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('');

  if (!isOpen) return null;

  const calculatedDiscount = discountType === 'percentage'
    ? (subtotal * (parseFloat(discountValue) || 0)) / 100
    : parseFloat(discountValue) || 0;

  const handleApply = () => {
    if (calculatedDiscount > 0 && calculatedDiscount <= subtotal) {
      onApply(calculatedDiscount, discountType);
      onClose();
    }
  };

  const quickPercentages = [5, 10, 15, 20, 25];

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 'var(--z-modal)' }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" style={{ zIndex: 'var(--z-modal-backdrop)' }} onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-surface-1 rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-text-primary">Apply Discount</h2>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Discount Type Toggle */}
          <div className="flex gap-2 p-1 bg-surface-2 rounded-lg">
            <button
              onClick={() => {
                setDiscountType('percentage');
                setDiscountValue('');
              }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-medium transition-colors',
                discountType === 'percentage'
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Percent size={18} />
              Percentage
            </button>
            <button
              onClick={() => {
                setDiscountType('fixed');
                setDiscountValue('');
              }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-medium transition-colors',
                discountType === 'fixed'
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <DollarSign size={18} />
              Fixed Amount
            </button>
          </div>

          {/* Input */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              {discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
            </label>
            <div className="relative">
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? '0' : '0.00'}
                className="w-full px-4 py-3 text-xl bg-surface-2 border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                min={0}
                max={discountType === 'percentage' ? 100 : subtotal}
                step={discountType === 'percentage' ? 1 : 0.01}
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary">
                {discountType === 'percentage' ? '%' : '$'}
              </span>
            </div>
          </div>

          {/* Quick Percentages */}
          {discountType === 'percentage' && (
            <div className="grid grid-cols-5 gap-2">
              {quickPercentages.map((pct) => (
                <button
                  key={pct}
                  onClick={() => setDiscountValue(String(pct))}
                  className={cn(
                    'py-2 rounded-lg font-medium transition-colors',
                    discountValue === String(pct)
                      ? 'bg-accent text-white'
                      : 'bg-surface-2 hover:bg-surface-3 text-text-primary border border-border'
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}

          {/* Preview */}
          {calculatedDiscount > 0 && (
            <div className="p-4 bg-surface-2 rounded-lg">
              <div className="flex justify-between text-text-secondary mb-1">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-error mb-1">
                <span>Discount</span>
                <span>-{formatCurrency(calculatedDiscount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-text-primary pt-2 border-t border-border-subtle">
                <span>New Subtotal</span>
                <span>{formatCurrency(subtotal - calculatedDiscount)}</span>
              </div>
            </div>
          )}
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
            onClick={handleApply}
            disabled={calculatedDiscount <= 0 || calculatedDiscount > subtotal}
            className={cn(
              'flex-1 py-3 font-medium rounded-lg transition-colors',
              calculatedDiscount > 0 && calculatedDiscount <= subtotal
                ? 'bg-accent hover:bg-accent-hover text-white'
                : 'bg-surface-3 text-text-muted cursor-not-allowed'
            )}
          >
            Apply Discount
          </button>
        </div>
      </div>
    </div>
  );
}
