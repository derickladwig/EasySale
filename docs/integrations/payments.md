# Payment Integration Guide

This guide covers integrating payment terminals with EasySale.

## Supported Payment Providers

EasySale supports the following payment terminal integrations:

| Provider | Terminal Types | Status |
|----------|---------------|--------|
| Stripe Terminal | BBPOS, Verifone P400 | Supported |
| Square Terminal | Square Terminal | Supported |
| Clover | Clover Mini, Flex | Planned |

## Stripe Terminal Setup

### Prerequisites

1. Stripe account with Terminal enabled
2. Stripe API keys (publishable and secret)
3. Compatible terminal hardware

### Configuration

1. Navigate to **Admin → Payment Settings → Stripe**
2. Enter your Stripe API credentials:
   - Publishable Key: `pk_live_...` or `pk_test_...`
   - Secret Key: `sk_live_...` or `sk_test_...`
3. Register your terminal device
4. Test with a small transaction

### Environment Variables

```bash
STRIPE_PUBLISHABLE_KEY=pk_live_your_key
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_TERMINAL_LOCATION=tml_your_location_id
```

For detailed Stripe setup, see [Stripe Connect Setup](./stripe-connect-setup.md).

## Square Terminal Setup

### Prerequisites

1. Square Developer account
2. Square application credentials
3. Square Terminal hardware

### Configuration

1. Navigate to **Admin → Payment Settings → Square**
2. Connect your Square account via OAuth
3. Select your location
4. Pair your terminal device

For detailed Square setup, see [Square Setup](./square-setup.md).

## Payment Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   POS UI    │────▶│  Backend    │────▶│  Terminal   │
│  (Checkout) │     │  (API)      │     │  (Payment)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
  User selects      Creates payment      Customer taps/
  payment method    intent/session       inserts card
```

## Offline Payments

EasySale supports offline payment processing:

1. **Store and Forward**: Transactions are queued locally
2. **Sync on Connect**: Payments process when connectivity returns
3. **Fallback Options**: Cash, check, or manual card entry

## Security Considerations

- Never store full card numbers locally
- Use tokenization for recurring payments
- All payment data encrypted in transit (TLS 1.3)
- PCI DSS compliance via certified terminals

## Troubleshooting

### Terminal Not Connecting

1. Check network connectivity
2. Verify terminal is powered on
3. Confirm API credentials are correct
4. Check terminal firmware is up to date

### Payment Declined

1. Verify card details
2. Check for sufficient funds
3. Confirm terminal is online
4. Review Stripe/Square dashboard for details

## API Reference

### Create Payment Intent

```bash
POST /api/payments/intent
Content-Type: application/json
Authorization: Bearer <token>

{
  "amount": 2500,
  "currency": "usd",
  "payment_method_types": ["card_present"]
}
```

### Capture Payment

```bash
POST /api/payments/:id/capture
Authorization: Bearer <token>
```

### Refund Payment

```bash
POST /api/payments/:id/refund
Content-Type: application/json
Authorization: Bearer <token>

{
  "amount": 1000,
  "reason": "customer_request"
}
```

## Related Documentation

- [Stripe Connect Setup](./stripe-connect-setup.md)
- [Square Setup](./square-setup.md)
- [Clover Setup](./clover-setup.md)
