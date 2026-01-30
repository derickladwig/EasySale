# Setup Wizard Network and Health Fixes

**Date**: 2026-01-29

## Issues Fixed

### 1. `/api/health/status` returning 500 Internal Server Error

**Root Cause**: Type mismatch in handler signature. The `HealthCheckService` was registered as `Arc<HealthCheckService>` but handlers expected `web::Data<HealthCheckService>`.

**Fix**: Updated all health check handlers to expect `web::Data<std::sync::Arc<HealthCheckService>>`:
- `get_system_health`
- `check_all_connectivity`
- `check_platform_connectivity`
- `clear_health_cache`

### 2. `/api/network/interfaces` and `/api/network/config` returning 401 Unauthorized

**Root Cause**: Network routes were registered AFTER the `ContextExtractor` middleware, which requires JWT authentication. During the setup wizard, users aren't authenticated yet.

**Fix**: Moved network routes to be registered BEFORE `ContextExtractor`:
```rust
// Network configuration endpoints (public - no auth required for setup wizard)
.service(
    web::scope("/api/network")
        .route("/interfaces", web::get().to(handlers::network::get_interfaces))
        .route("/config", web::get().to(handlers::network::get_config))
        .route("/config", web::post().to(handlers::network::save_config))
)
.wrap(ContextExtractor) // Auth middleware applied AFTER network routes
```

### 3. Additional Type Mismatches Fixed

Found and fixed the same `Arc` type mismatch pattern in other handlers:

**TenantResolver** (registered as `Arc<TenantResolver>`):
- `cache.rs` - `clear_tenant_cache`
- `webhooks.rs` - `handle_woocommerce_webhook`, `handle_quickbooks_webhook`, `handle_quickbooks_cloudevents`, `handle_cloudevents_format`

**SyncOrchestrator** (registered as `Arc<SyncOrchestrator>`):
- `sync_operations.rs` - `trigger_sync`, `sync_woocommerce_orders`, `sync_woocommerce_products`, `sync_woocommerce_customers`, `retry_failed_records`, `retry_single_failure`, `execute_confirmed_operation`

## Files Modified

- `backend/crates/server/src/handlers/health_check.rs` - Fixed `HealthCheckService` type
- `backend/crates/server/src/handlers/cache.rs` - Fixed `TenantResolver` type
- `backend/crates/server/src/handlers/webhooks.rs` - Fixed `TenantResolver` type (4 handlers)
- `backend/crates/server/src/handlers/sync_operations.rs` - Fixed `SyncOrchestrator` type (7 handlers)
- `backend/crates/server/src/main.rs` - Moved network routes before `ContextExtractor`

## Public Endpoints (No Auth Required)

These endpoints are now accessible without authentication for the setup wizard:
- `GET /health` - Basic health check
- `GET /api/capabilities` - System capabilities
- `GET /api/tenant/setup-status` - Check if setup is complete
- `POST /api/tenant/setup-complete` - Mark setup as complete
- `GET /api/login-theme/version` - Login theme version
- `GET /api/health/status` - System health status
- `GET /api/network/interfaces` - Detect network interfaces
- `GET /api/network/config` - Get network configuration
- `POST /api/network/config` - Save network configuration

## Testing

After rebuilding, the setup wizard should now:
1. Successfully detect network interfaces
2. Allow saving network configuration
3. Show proper health status (200 OK with "degraded" status when external services aren't configured)
4. All sync and webhook operations should work without 500 errors

## Notes

- The `/auth/me` endpoint correctly returns 401 when not authenticated - this is expected behavior
- Network settings are saved to `runtime/network-config.json` (gitignored)
- Docker compose override is generated at `runtime/docker-compose.override.yml`
