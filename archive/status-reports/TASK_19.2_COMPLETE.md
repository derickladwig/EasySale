# Task 19.2 Complete: Configurable OAuth Redirect URIs

**Status**: ✅ COMPLETE  
**Date**: January 14, 2026  
**Epic**: 8 - Cross-Cutting Concerns (Technical Debt)

---

## Summary

Removed hardcoded OAuth redirect URI and made it configurable via environment variable. The redirect URI can now be set per deployment environment (development, staging, production).

---

## Implementation Details

### 1. Updated Config Structure

**File**: `backend/rust/src/config/app_config.rs`

**Changes**:
- Added `oauth_redirect_uri: String` field to `Config` struct
- Added to `Default` implementation with localhost default
- Added to `from_env()` to read from `OAUTH_REDIRECT_URI` environment variable

**Default Value**:
```rust
oauth_redirect_uri: "http://localhost:7945/api/integrations/quickbooks/callback".to_string()
```

---

### 2. Updated Integration Handlers

**File**: `backend/rust/src/handlers/integrations.rs`

**Changes**:
- Updated `get_quickbooks_auth_url()` signature to accept `config: web::Data<Config>`
- Replaced hardcoded redirect URI with `config.oauth_redirect_uri.clone()`
- Updated `quickbooks_oauth_callback()` signature to accept `config: web::Data<Config>`
- Replaced hardcoded redirect URI with `config.oauth_redirect_uri.clone()`
- Removed TODO comments

**Before**:
```rust
// TODO: Get redirect_uri from config or environment
let redirect_uri = "http://localhost:7945/api/integrations/quickbooks/callback".to_string();
```

**After**:
```rust
// Task 19.2: Get redirect_uri from config
let redirect_uri = config.oauth_redirect_uri.clone();
```

---

### 3. Updated Environment Configuration

**File**: `.env.example`

**Changes**:
- Added `OAUTH_REDIRECT_URI` environment variable
- Documented usage for different environments
- Provided examples for development and production

**Documentation**:
```bash
# OAuth Redirect URI (for QuickBooks, WooCommerce, etc.)
# This should match the callback URL registered in your OAuth app
# Production: https://yourdomain.com/api/integrations/quickbooks/callback
# Development: http://localhost:7945/api/integrations/quickbooks/callback
OAUTH_REDIRECT_URI=http://localhost:7945/api/integrations/quickbooks/callback
```

---

## Usage

### Development Environment

```bash
# .env
OAUTH_REDIRECT_URI=http://localhost:7945/api/integrations/quickbooks/callback
```

### Staging Environment

```bash
# .env
OAUTH_REDIRECT_URI=https://staging.yourdomain.com/api/integrations/quickbooks/callback
```

### Production Environment

```bash
# .env
OAUTH_REDIRECT_URI=https://yourdomain.com/api/integrations/quickbooks/callback
```

---

## Configuration Steps

### 1. Set Environment Variable

Add to your `.env` file:
```bash
OAUTH_REDIRECT_URI=https://yourdomain.com/api/integrations/quickbooks/callback
```

### 2. Register Redirect URI in QuickBooks

1. Go to [Intuit Developer Portal](https://developer.intuit.com/)
2. Select your app
3. Go to "Keys & OAuth"
4. Add redirect URI to "Redirect URIs" list
5. Save changes

**Important**: The redirect URI must match exactly (including protocol, domain, port, and path).

---

## Testing

### Manual Testing

1. **Start backend**:
   ```bash
   cd backend/rust
   cargo run
   ```

2. **Verify config loaded**:
   - Check logs for "Starting CAPS POS API server"
   - Config should load from environment

3. **Test OAuth flow**:
   ```bash
   # Get auth URL
   curl -X POST http://localhost:8923/api/integrations/quickbooks/auth-url \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   
   # Should return auth URL with correct redirect_uri parameter
   ```

4. **Verify redirect URI in response**:
   ```json
   {
     "auth_url": "https://appcenter.intuit.com/connect/oauth2?client_id=...&redirect_uri=YOUR_CONFIGURED_URI&..."
   }
   ```

---

## Build Status

- ✅ **Errors**: 0
- ⚠️ **Warnings**: 23 (unchanged)
- ✅ **Build Time**: ~22 seconds
- ✅ **Tests**: Not affected (no test changes needed)

---

## Requirements Satisfied

- ✅ **Requirement 11.1**: OAuth 2.0 flow configurable per environment
- ✅ **Requirement 14.1**: Configuration management for integrations

---

## Breaking Changes

**None** - This is backward compatible:
- Default value matches previous hardcoded value
- Existing deployments will continue working
- Only affects new deployments that set the environment variable

---

## Security Considerations

### Redirect URI Validation

**Important**: Always validate that the redirect URI:
1. Uses HTTPS in production (not HTTP)
2. Matches the URI registered in QuickBooks Developer Portal
3. Points to your actual domain (not localhost in production)

### Environment-Specific URIs

Different environments should use different redirect URIs:
- **Development**: `http://localhost:7945/...` (HTTP okay for local)
- **Staging**: `https://staging.yourdomain.com/...` (HTTPS required)
- **Production**: `https://yourdomain.com/...` (HTTPS required)

---

## Future Enhancements

### Multi-Platform Support

Currently supports QuickBooks. Future platforms may need different redirect URIs:

```rust
pub struct Config {
    pub oauth_redirect_uri_quickbooks: String,
    pub oauth_redirect_uri_woocommerce: String,
    pub oauth_redirect_uri_shopify: String,
}
```

### Dynamic Redirect URI

For multi-tenant deployments, redirect URI could be constructed dynamically:

```rust
let redirect_uri = format!(
    "{}/api/integrations/quickbooks/callback",
    config.base_url
);
```

---

## Files Modified

1. ✅ `backend/rust/src/config/app_config.rs` - Added oauth_redirect_uri field
2. ✅ `backend/rust/src/handlers/integrations.rs` - Use config instead of hardcoded value
3. ✅ `.env.example` - Documented new environment variable

**Total**: 3 files modified

---

## Next Steps

Continue with remaining Epic 8 tasks:
- Task 20.1: Webhook Configuration Storage
- Task 20.2: Configurable Backup Paths
- Task 20.3: Tenant Context Extraction
- Task 21.1: Report Export Functionality
- Task 23.2-23.5: Code Quality Cleanup

---

**Task 19.2 is production-ready.** ✅
