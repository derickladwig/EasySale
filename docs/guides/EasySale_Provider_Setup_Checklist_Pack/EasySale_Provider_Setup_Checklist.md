# EasySale External Integrations — Provider Setup Checklist

Version 1.0 · Generated 2026-01-30

## Purpose
This checklist is the operator/developer setup you (EasySale) do once, plus the merchant/tenant setup each store does (usually just clicking “Connect” and approving OAuth).

## 0) One-time prerequisites (all providers)
- Public HTTPS base URL (not localhost), e.g. `https://pos.easysale.app`
- Callback routes implemented: `/api/integrations/{provider}/callback`
- Webhook routes: `/api/webhooks/{provider}`
- Secrets in environment variables (never in git)
- Local dev: use a tunnel (ngrok/cloudflared) and register that domain for OAuth callbacks

## 1) Stripe — Connect (recommended for multi-tenant)
### EasySale (platform) one-time setup
- Create/verify Stripe account (use Test mode first)
- Enable **Stripe Connect**: Settings → Connect → Get started
- Add OAuth redirect URI: `https://YOUR_DOMAIN/api/integrations/stripe/callback`
- Create webhook endpoint: `https://YOUR_DOMAIN/api/webhooks/stripe`
  - For payments (Phase 2): `checkout.session.completed`, `payment_intent.succeeded`, `account.updated`
- Set backend env vars:
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

### Merchant/tenant steps
- In EasySale: Settings → Integrations → Stripe → **Connect Stripe**
- Complete Stripe onboarding (OAuth)
- Back in EasySale: Status = Connected → Test Connection → Disconnect works

## 2) Square — OAuth app (multi-tenant)
### EasySale one-time setup
- Create Square Developer account → create **Application**
- Set redirect URL: `https://YOUR_DOMAIN/api/integrations/square/callback`
- Minimum scopes for connection test: `MERCHANT_PROFILE_READ`, `LOCATIONS_READ`
- Env vars: `SQUARE_APPLICATION_ID`, `SQUARE_APPLICATION_SECRET`

### Merchant/tenant steps
- In EasySale: Settings → Integrations → Square → **Connect Square**
- Approve OAuth → Status = Connected

## 3) Clover — OAuth app (multi-tenant)
### EasySale one-time setup
- Create Clover Developer account → create **App**
- Set redirect URL: `https://YOUR_DOMAIN/api/integrations/clover/callback`
- Env vars: `CLOVER_APP_ID`, `CLOVER_APP_SECRET`, `CLOVER_REDIRECT_URI`

### Merchant/tenant steps
- In EasySale: Settings → Integrations → Clover → **Connect Clover**
- Approve OAuth → Status = Connected

## 4) WooCommerce — REST API keys (per merchant store)
### Merchant/tenant steps
- WooCommerce → Settings → Advanced → REST API → **Add key**
- Permissions: Read/Write (or Read-only if you only pull)
- Copy Consumer Key/Secret into EasySale Woo integration
- Ensure HTTPS + permalinks enabled

## 5) Supabase Hub
- Create Supabase project
- Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Ensure every table includes `tenant_id` and all queries filter by tenant

## Environment variable summary
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SQUARE_APPLICATION_ID=sq0idp-...
SQUARE_APPLICATION_SECRET=sq0csp-...
CLOVER_APP_ID=...
CLOVER_APP_SECRET=...
CLOVER_REDIRECT_URI=https://YOUR_DOMAIN/api/integrations/clover/callback
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
PUBLIC_BASE_URL=https://YOUR_DOMAIN
```
