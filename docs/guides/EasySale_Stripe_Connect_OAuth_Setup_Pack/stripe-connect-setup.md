# EasySale - Stripe Connect OAuth Setup (Developer Guide)

This guide assumes the **Full build** is compiled and the Stripe integration endpoints exist.
Lite build does not include integrations.

## Platform setup (do once)

1. Create/finish the EasySale Stripe account (platform).
2. Enable **Stripe Connect**.
3. Choose **Standard** connected accounts to start (fastest path).
4. Capture:
   - STRIPE_CLIENT_ID (ca_...)
   - STRIPE_SECRET_KEY (sk_...)
5. Register redirect URI:
   - `https://YOURDOMAIN/api/integrations/stripe/callback`
6. (Phase 2) Create webhook endpoint:
   - `https://YOURDOMAIN/api/payments/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.expired`
   - Capture `STRIPE_WEBHOOK_SECRET` (whsec_...)

## EasySale env vars

See `.env.example` in this pack.

## Tenant connect flow (in-app)

- User clicks **Connect Stripe**
- OAuth completes
- App shows Summary (business_name, country, default_currency, masked acct id)

## Security rules

- Never log or return tokens.
- Mask connected account id: `acct_...xxxx`
- Store secrets in env/secret store, not source.

Generated: 2026-01-30
