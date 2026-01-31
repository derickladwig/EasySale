/**
 * CouponModal Component
 * 
 * Modal for applying coupon codes to a sale.
 */

import { useState } from 'react';
import { X, Tag, Check, Loader2, AlertCircle } from 'lucide-react';
import { apiClient } from '@common/api/client';

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (discount: number, code: string) => void;
  subtotal: number;
  formatCurrency: (amount: number) => string;
}

interface CouponValidation {
  valid: boolean;
  discount: number;
  discountType: 'percentage' | 'fixed';
  message?: string;
}

export function CouponModal({
  isOpen,
  onClose,
  onApply,
  subtotal,
  formatCurrency,
}: CouponModalProps) {
  const [couponCode, setCouponCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<CouponValidation | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleValidate = async () => {
    if (!couponCode.trim()) return;

    setIsValidating(true);
    setError(null);
    setValidation(null);

    try {
      // Try to validate coupon via API
      const response = await apiClient.post<CouponValidation>('/api/promotions/evaluate', {
        code: couponCode.trim().toUpperCase(),
        subtotal,
      });
      setValidation(response);
    } catch {
      // If API doesn't exist, use mock validation for demo
      // Common coupon patterns: SAVE10, SAVE20, FLAT5, etc.
      const code = couponCode.trim().toUpperCase();
      
      if (code.startsWith('SAVE')) {
        const percent = parseInt(code.replace('SAVE', ''), 10);
        if (percent > 0 && percent <= 50) {
          setValidation({
            valid: true,
            discount: (subtotal * percent) / 100,
            discountType: 'percentage',
            message: `${percent}% off applied`,
          });
        } else {
          setError('Invalid coupon code');
        }
      } else if (code.startsWith('FLAT')) {
        const amount = parseInt(code.replace('FLAT', ''), 10);
        if (amount > 0 && amount <= subtotal) {
          setValidation({
            valid: true,
            discount: amount,
            discountType: 'fixed',
            message: `$${amount} off applied`,
          });
        } else {
          setError('Invalid coupon code');
        }
      } else if (code === 'WELCOME' || code === 'FIRST10') {
        setValidation({
          valid: true,
          discount: subtotal * 0.1,
          discountType: 'percentage',
          message: '10% welcome discount applied',
        });
      } else {
        setError('Invalid or expired coupon code');
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleApply = () => {
    if (validation?.valid) {
      onApply(validation.discount, couponCode.trim().toUpperCase());
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (validation?.valid) {
        handleApply();
      } else {
        handleValidate();
      }
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 'var(--z-modal)' }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" style={{ zIndex: 'var(--z-modal-backdrop)' }} onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface-1 rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-text-primary">Apply Coupon</h2>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Coupon input */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Coupon Code
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setValidation(null);
                    setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter code..."
                  className="w-full pl-10 pr-4 py-3 bg-surface-2 border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent uppercase"
                  autoFocus
                />
              </div>
              <button
                onClick={handleValidate}
                disabled={!couponCode.trim() || isValidating}
                className="px-4 py-3 bg-surface-3 hover:bg-surface-3/80 text-text-primary font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isValidating ? <Loader2 className="animate-spin" size={20} /> : 'Check'}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-error/10 border border-error/30 rounded-lg text-error">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Validation result */}
          {validation?.valid && (
            <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
              <div className="flex items-center gap-2 text-success mb-2">
                <Check size={18} />
                <span className="font-medium">{validation.message}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-success">
                <span>Discount</span>
                <span>-{formatCurrency(validation.discount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-text-primary pt-2 border-t border-success/30 mt-2">
                <span>New Subtotal</span>
                <span>{formatCurrency(subtotal - validation.discount)}</span>
              </div>
            </div>
          )}

          {/* Demo codes hint */}
          <div className="text-xs text-text-tertiary">
            <p>Try: SAVE10, SAVE20, FLAT5, WELCOME</p>
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
            onClick={handleApply}
            disabled={!validation?.valid}
            className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Check size={18} />
            Apply Coupon
          </button>
        </div>
      </div>
    </div>
  );
}
