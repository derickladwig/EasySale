/**
 * PaymentModal Component
 * 
 * Modal for completing a sale with payment method selection.
 */

import { useState } from 'react';
import { X, Banknote, CreditCard, Receipt, Check, Loader2 } from 'lucide-react';
import { cn } from '@common/utils/classNames';

interface CartItem {
  product: {
    id: string;
    name: string;
    unitPrice: number;
  };
  quantity: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (paymentMethod: 'cash' | 'card' | 'other', amountTendered?: number) => void;
  cart: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  formatCurrency: (amount: number) => string;
  isProcessing?: boolean;
}

export function PaymentModal({
  isOpen,
  onClose,
  onComplete,
  cart,
  subtotal,
  tax,
  total,
  formatCurrency,
  isProcessing = false,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'card' | 'other' | null>(null);
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [step, setStep] = useState<'method' | 'cash-amount'>('method');

  if (!isOpen) return null;

  const handleMethodSelect = (method: 'cash' | 'card' | 'other') => {
    setSelectedMethod(method);
    if (method === 'cash') {
      setStep('cash-amount');
      setAmountTendered(total.toFixed(2));
    } else {
      // Card and other payments complete immediately
      onComplete(method);
    }
  };

  const handleCashComplete = () => {
    const tendered = parseFloat(amountTendered) || 0;
    if (tendered < total) {
      return; // Don't allow insufficient payment
    }
    onComplete('cash', tendered);
  };

  const change = (parseFloat(amountTendered) || 0) - total;

  const quickAmounts = [
    Math.ceil(total),
    Math.ceil(total / 5) * 5,
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 20) * 20,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= total).slice(0, 4);

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 'var(--z-modal)' }}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        style={{ zIndex: 'var(--z-modal-backdrop)' }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-surface-1 rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-text-primary">
            {step === 'method' ? 'Select Payment Method' : 'Cash Payment'}
          </h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {step === 'method' ? (
            <>
              {/* Order Summary */}
              <div className="mb-6 p-4 bg-surface-2 rounded-lg">
                <div className="text-sm text-text-secondary mb-2">
                  {cart.length} item{cart.length !== 1 ? 's' : ''}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-text-secondary">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Tax</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-text-primary pt-2 border-t border-border-subtle">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleMethodSelect('cash')}
                  disabled={isProcessing}
                  className={cn(
                    'flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all',
                    'hover:border-success hover:bg-success/10',
                    'border-border bg-surface-2',
                    isProcessing && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Banknote size={32} className="text-success" />
                  <span className="font-medium text-text-primary">Cash</span>
                </button>

                <button
                  onClick={() => handleMethodSelect('card')}
                  disabled={isProcessing}
                  className={cn(
                    'flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all',
                    'hover:border-accent hover:bg-accent/10',
                    'border-border bg-surface-2',
                    isProcessing && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isProcessing && selectedMethod === 'card' ? (
                    <Loader2 size={32} className="text-accent animate-spin" />
                  ) : (
                    <CreditCard size={32} className="text-accent" />
                  )}
                  <span className="font-medium text-text-primary">Card</span>
                </button>

                <button
                  onClick={() => handleMethodSelect('other')}
                  disabled={isProcessing}
                  className={cn(
                    'flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all',
                    'hover:border-text-secondary hover:bg-surface-3',
                    'border-border bg-surface-2',
                    isProcessing && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isProcessing && selectedMethod === 'other' ? (
                    <Loader2 size={32} className="text-text-secondary animate-spin" />
                  ) : (
                    <Receipt size={32} className="text-text-secondary" />
                  )}
                  <span className="font-medium text-text-primary">Other</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Cash Payment */}
              <div className="space-y-4">
                {/* Total Due */}
                <div className="text-center p-4 bg-surface-2 rounded-lg">
                  <div className="text-sm text-text-secondary">Total Due</div>
                  <div className="text-3xl font-bold text-text-primary">
                    {formatCurrency(total)}
                  </div>
                </div>

                {/* Amount Tendered Input */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Amount Tendered
                  </label>
                  <input
                    type="number"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    className="w-full px-4 py-3 text-2xl text-center bg-surface-2 border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    min={0}
                    step={0.01}
                    autoFocus
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setAmountTendered(amount.toFixed(2))}
                      className="py-2 px-3 bg-surface-2 hover:bg-surface-3 border border-border rounded-lg text-text-primary font-medium transition-colors"
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
                </div>

                {/* Change Due */}
                {change >= 0 && (
                  <div className="text-center p-4 bg-success/10 border border-success/30 rounded-lg">
                    <div className="text-sm text-success">Change Due</div>
                    <div className="text-2xl font-bold text-success">
                      {formatCurrency(change)}
                    </div>
                  </div>
                )}

                {change < 0 && (
                  <div className="text-center p-4 bg-error/10 border border-error/30 rounded-lg">
                    <div className="text-sm text-error">Insufficient Amount</div>
                    <div className="text-lg text-error">
                      Need {formatCurrency(Math.abs(change))} more
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-2">
          {step === 'method' ? (
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-full py-3 bg-surface-3 hover:bg-surface-3/80 text-text-primary font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('method');
                  setSelectedMethod(null);
                }}
                disabled={isProcessing}
                className="flex-1 py-3 bg-surface-3 hover:bg-surface-3/80 text-text-primary font-medium rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCashComplete}
                disabled={isProcessing || change < 0}
                className={cn(
                  'flex-1 py-3 font-medium rounded-lg transition-colors flex items-center justify-center gap-2',
                  change >= 0
                    ? 'bg-success hover:bg-success/90 text-white'
                    : 'bg-surface-3 text-text-muted cursor-not-allowed'
                )}
              >
                {isProcessing ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Check size={20} />
                )}
                Complete Sale
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
