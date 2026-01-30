# Clover Integration Setup Guide

This guide explains how to set up Clover integration for EasySale.

## Overview

EasySale integrates with Clover using OAuth 2.0. This allows:
- Secure authorization without sharing credentials
- Access to merchant information
- Future: Payment processing and inventory sync

## Prerequisites

1. A Clover developer account (create one at [clover.com/developers](https://www.clover.com/developers))
2. A Clover merchant account for testing
3. EasySale backend running with environment variables configured

## Step 1: Create a Clover App

1. Log in to the [Clover Developer Dashboard](https://www.clover.com/developers)
2. Click **Create App**
3. Fill in the app details:
   - **App Name**: EasySale Integration
   - **App Type**: Web App
   - **Description**: Point of Sale integration
4. Click **Create**

## Step 2: Configure App Settings

### Permissions

1. Go to your app's **Settings** → **Requested Permissions**
2. Enable the following permissions:
   - `MERCHANT_R` - Read merchant information
   - `ORDERS_R` - Read orders (if needed)
   - `INVENTORY_R` - Read inventory (if needed)

### OAuth Settings

1. Go to **Settings** → **REST Configuration**
2. Add your OAuth redirect URI:
   - Development: `http://localhost:8923/api/integrations/clover/callback`
   - Production: `https://your-domain.com/api/integrations/clover/callback`

## Step 3: Get App Credentials

1. Go to your app's **Settings** → **App Credentials**
2. Copy the following:
   - **App ID**: Your application ID
   - **App Secret**: Your application secret

## Step 4: Set Environment Variables

Add the following to your `.env` file:

```bash
# Clover App Credentials
CLOVER_APP_ID=your_app_id
CLOVER_APP_SECRET=your_app_secret

# OAuth Redirect URI (must match Clover Dashboard)
CLOVER_REDIRECT_URI=https://your-domain.com/api/integrations/clover/callback

# Clover Environment
CLOVER_ENVIRONMENT=sandbox  # or 'production'
```

## Step 5: Connect Your Merchant Account

1. In EasySale, go to **Settings** → **Integrations**
2. Click **Connect with Clover**
3. You'll be redirected to Clover to authorize the connection
4. Log in with your Clover merchant credentials
5. Approve the requested permissions
6. You'll be redirected back to EasySale

## Step 6: Test the Connection

1. After connecting, click **Test Connection**
2. If successful, you'll see your merchant details:
   - Merchant name
   - Address

## Clover Environments

Clover has different environments for development and production:

| Environment | Base URL | Use Case |
|-------------|----------|----------|
| Sandbox | `sandbox.dev.clover.com` | Development and testing |
| Production (US) | `api.clover.com` | Live US merchants |
| Production (EU) | `api.eu.clover.com` | Live EU merchants |

## Troubleshooting

### OAuth Error: Invalid redirect_uri

- Ensure the redirect URI in your `.env` matches exactly what's configured in Clover Dashboard
- Check for trailing slashes or protocol mismatches

### Authorization Failed

- Verify your App ID and App Secret are correct
- Ensure the app has the required permissions
- Check that the merchant account is active

### Token Refresh Failed

- Clover tokens expire after a period of inactivity
- The integration will automatically refresh tokens
- If refresh fails, the user may need to reconnect

### Connection Test Failed

- Verify the merchant account is active
- Check Clover's API status
- Review the error message for specific details

## Security Considerations

- OAuth tokens are stored encrypted in EasySale
- Never commit credentials to version control
- Use sandbox environment for testing
- Monitor integration logs for suspicious activity

## Related Documentation

- [Clover Developer Documentation](https://docs.clover.com)
- [Clover OAuth Documentation](https://docs.clover.com/docs/oauth-intro)
- [Clover REST API Reference](https://docs.clover.com/reference)
- [Clover Sandbox Testing](https://docs.clover.com/docs/sandbox-overview)
