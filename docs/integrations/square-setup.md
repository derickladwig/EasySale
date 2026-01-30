# Square Integration Setup Guide

This guide explains how to set up Square integration for EasySale.

## Overview

EasySale integrates with Square using API credentials. This allows:
- Viewing location information
- Testing connectivity
- Future: Payment processing and inventory sync

## Prerequisites

1. A Square account (create one at [squareup.com](https://squareup.com))
2. Access to the Square Developer Dashboard
3. EasySale backend running

## Step 1: Create a Square Application

1. Log in to the [Square Developer Dashboard](https://developer.squareup.com)
2. Click **Create Application**
3. Enter an application name (e.g., "EasySale Integration")
4. Click **Save**

## Step 2: Get API Credentials

### Access Token

1. In your application, go to **Credentials**
2. For testing, use the **Sandbox Access Token**
3. For production, use the **Production Access Token**

The access token starts with:
- Sandbox: `EAAAxxxxxxxx`
- Production: `sq0atp-xxxxxxxx`

### Location ID

1. Go to **Locations** in the Square Dashboard
2. Select your location
3. Copy the **Location ID** from the URL or settings

## Step 3: Configure in EasySale

1. Go to **Settings** → **Integrations**
2. Find the **Square** card
3. Enter your credentials:
   - **Access Token**: Your Square access token
   - **Location ID**: Your Square location ID
4. Click **Connect**

## Step 4: Test the Connection

1. After connecting, click **Test Connection**
2. If successful, you'll see your location details:
   - Location name
   - Address
   - Capabilities

## Environment Variables (Optional)

For server-side configuration, you can set:

```bash
# Square API (optional - credentials stored per-tenant)
SQUARE_ENVIRONMENT=sandbox  # or 'production'
```

## Troubleshooting

### Invalid Access Token

- Ensure you're using the correct token for your environment (sandbox vs production)
- Check that the token hasn't been revoked
- Verify the token has the required permissions

### Location Not Found

- Verify the Location ID is correct
- Ensure the location is active in your Square account
- Check that the access token has access to the location

### Connection Test Failed

- Check your internet connection
- Verify Square's API status at [status.squareup.com](https://status.squareup.com)
- Review the error message for specific details

## Security Considerations

- Access tokens are stored encrypted in EasySale
- Never share your access tokens
- Use sandbox tokens for testing
- Rotate production tokens periodically

## Related Documentation

- [Square Developer Documentation](https://developer.squareup.com/docs)
- [Square API Reference](https://developer.squareup.com/reference/square)
- [Square Sandbox Testing](https://developer.squareup.com/docs/devtools/sandbox/overview)
