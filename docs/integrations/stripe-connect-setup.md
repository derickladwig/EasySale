# Stripe Connect Setup Guide

This guide explains how to set up Stripe Connect for EasySale payment processing.

## Overview

EasySale uses Stripe Connect to enable payment processing for each tenant. This allows:
- Each business to have their own Stripe account
- Payments to go directly to the connected account
- Platform fees to be collected (if configured)

## Prerequisites

1. A Stripe account (create one at [stripe.com](https://stripe.com))
2. Access to the Stripe Dashboard
3. EasySale backend running with environment variables configured

## Step 1: Create a Stripe Connect Platform

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Connect** → **Settings**
3. Enable Connect for your account
4. Choose **Standard** or **Express** account type (Standard recommended for full control)

## Step 2: Get Platform Credentials

### Client ID
1. Go to **Connect** → **Settings** → **Integration**
2. Copy the **Client ID** (starts with `ca_`)

### Secret Key
1. Go to **Developers** → **API keys**
2. Copy the **Secret key** (starts with `sk_live_` or `sk_test_`)

## Step 3: Configure OAuth Redirect URI

1. Go to **Connect** → **Settings** → **Integration**
2. Under **Redirects**, add your OAuth callback URL:
   - Development: `http://localhost:8923/api/integrations/stripe/callback`
   - Production: `https://your-domain.com/api/integrations/stripe/callback`

## Step 4: Set Environment Variables

Add the following to your `.env` file:

```bash
# Stripe Connect Platform Credentials
STRIPE_CLIENT_ID=ca_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx

# OAuth Redirect URI (must match Stripe Dashboard)
STRIPE_REDIRECT_URI=https://your-domain.com/api/integrations/stripe/callback
```

## Step 5: Create Webhook Endpoint

For payment status updates, you need to configure a webhook:

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   - Development: `http://localhost:8923/api/payments/webhooks/stripe`
   - Production: `https://your-domain.com/api/payments/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `checkout.session.expired`
5. Copy the **Signing secret** (starts with `whsec_`)

Add the webhook secret to your `.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

## Step 6: Test the Integration

### Connect a Test Account

1. In EasySale, go to **Settings** → **Integrations**
2. Click **Connect with Stripe**
3. You'll be redirected to Stripe to authorize the connection
4. After authorization, you'll be redirected back to EasySale

### Test a Payment

1. Create a test order in EasySale
2. Click **Pay with Stripe**
3. Complete the checkout using Stripe's test card: `4242 4242 4242 4242`
4. Verify the payment status updates to "completed"

## Troubleshooting

### OAuth Error: Invalid redirect_uri

- Ensure the redirect URI in your `.env` matches exactly what's configured in Stripe Dashboard
- Check for trailing slashes or protocol mismatches (http vs https)

### Webhook Signature Verification Failed

- Ensure `STRIPE_WEBHOOK_SECRET` is set correctly
- Check that the webhook URL is accessible from the internet
- Verify the timestamp tolerance (webhooks older than 5 minutes are rejected)

### Payment Not Updating

- Check webhook logs in Stripe Dashboard
- Verify the webhook endpoint is receiving events
- Check EasySale logs for webhook processing errors

## Security Considerations

- Never commit credentials to version control
- Use environment variables for all secrets
- Rotate API keys periodically
- Monitor webhook logs for suspicious activity
- Use HTTPS in production

## Related Documentation

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
