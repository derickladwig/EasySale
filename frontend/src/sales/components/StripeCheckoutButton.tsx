/**
 * Stripe Checkout Button Component
 * 
 * Renders a "Pay with Stripe" button that creates a Checkout Session
 * and redirects the customer to Stripe's hosted checkout page.
 * 
 * Requirements: 12.1, 12.2, 14.3
 */

import { useState, useCallback } from 'react';
import { CreditCard, ExternalLink, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { syncApi } from '../../services/syncApi';
import { useHasPayments } from '../../common/contexts/CapabilitiesContext';

interface StripeCheckoutButtonProps {
  /** Order ID for idempotency */
  orderId: string;
  /** Amount in cents */
  amountCents: number;
  /** Currency code (e.g., "usd") */
  currency?: string;
  /** Description for the line item */
  description?: string;
  /** Success URL after payment (defaults to current page with success param) */
  successUrl?: string;
  /** Cancel URL if customer cancels (defaults to current page) */
  cancelUrl?: string;
  /** Callback when checkout session is created */
  onSessionCreated?: (sessionId: string, checkoutUrl: string) => void;
  /** Callback when payment status changes */
  onStatusChange?: (status: string) => void;
  /** Whether to show as compact button */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

type CheckoutState = 'idle' | 'creating' | 'ready' | 'polling' | 'completed' | 'expired' | 'error';

export function StripeCheckoutButton({
  orderId,
  amountCents,
  currency = 'usd',
  description = 'Order Payment',
  successUrl,
  cancelUrl,
  onSessionCreated,
  onStatusChange,
  compact = false,
  className = '',
}: StripeCheckoutButtonProps) {
  const hasPayments = useHasPayments();
  const [state, setState] = useState<CheckoutState>('idle');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate default URLs based on current location
  const defaultSuccessUrl = successUrl || `${window.location.origin}${window.location.pathname}?payment=success&order=${orderId}`;
  const defaultCancelUrl = cancelUrl || `${window.location.origin}${window.location.pathname}?payment=cancelled&order=${orderId}`;

  const createCheckoutSession = useCallback(async () => {
    setState('creating');
    setError(null);

    try {
      const response = await syncApi.createCheckoutSession({
        order_id: orderId,
        amount_cents: amountCents,
        currency,
        description,
        success_url: defaultSuccessUrl,
        cancel_url: defaultCancelUrl,
      });

      setCheckoutUrl(response.checkout_url);
      setState('ready');
      onSessionCreated?.(response.session_id, response.checkout_url);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to create checkout session');
    }
  }, [orderId, amountCents, currency, description, defaultSuccessUrl, defaultCancelUrl, onSessionCreated]);

  const pollPaymentStatus = useCallback(async () => {
    setState('polling');

    try {
      const status = await syncApi.getPaymentStatus(orderId);
      
      if (status.status === 'completed') {
        setState('completed');
        onStatusChange?.('completed');
      } else if (status.status === 'expired') {
        setState('expired');
        onStatusChange?.('expired');
      } else {
        // Still pending, keep polling
        setTimeout(pollPaymentStatus, 3000);
      }
    } catch {
      // Payment not found or error, stop polling
      setState('ready');
    }
  }, [orderId, onStatusChange]);

  const openCheckout = useCallback(() => {
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank');
      // Start polling for payment status
      pollPaymentStatus();
    }
  }, [checkoutUrl, pollPaymentStatus]);

  // Don't render if payments feature is not available
  if (!hasPayments) {
    return null;
  }

  // Format amount for display
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);

  // Render based on state
  if (state === 'completed') {
    return (
      <div className={`flex items-center gap-2 text-success ${className}`}>
        <CheckCircle className="w-5 h-5" />
        <span>Payment completed</span>
      </div>
    );
  }

  if (state === 'expired') {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex items-center gap-2 text-warning">
          <XCircle className="w-5 h-5" />
          <span>Session expired</span>
        </div>
        <button
          onClick={createCheckoutSession}
          className="px-4 py-2 bg-accent text-on-accent rounded-md hover:bg-accent-hover transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex items-center gap-2 text-error">
          <XCircle className="w-5 h-5" />
          <span>{error || 'An error occurred'}</span>
        </div>
        <button
          onClick={createCheckoutSession}
          className="px-4 py-2 bg-accent text-on-accent rounded-md hover:bg-accent-hover transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (state === 'ready' && checkoutUrl) {
    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        <button
          onClick={openCheckout}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-accent text-on-accent rounded-md hover:bg-accent-hover transition-colors"
        >
          <ExternalLink className="w-5 h-5" />
          <span>Open Stripe Checkout</span>
        </button>
        {state === 'polling' && (
          <div className="flex items-center gap-2 text-muted text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Waiting for payment...</span>
          </div>
        )}
      </div>
    );
  }

  // Idle or creating state - show main button
  return (
    <button
      onClick={createCheckoutSession}
      disabled={state === 'creating'}
      className={`
        flex items-center justify-center gap-2
        ${compact ? 'px-3 py-2 text-sm' : 'px-4 py-3'}
        bg-accent text-on-accent rounded-md
        hover:bg-accent-hover transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {state === 'creating' ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Creating session...</span>
        </>
      ) : (
        <>
          <CreditCard className="w-5 h-5" />
          <span>Pay with Stripe {!compact && formattedAmount}</span>
        </>
      )}
    </button>
  );
}

export default StripeCheckoutButton;
