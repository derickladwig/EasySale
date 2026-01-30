# Endpoint Gating Implementation (Task 9.4)

## Overview

This document describes the implementation of dev/debug/setup endpoint gating based on runtime profile, as specified in Task 9.4 of the production-readiness-windows-installer spec.

## Requirements

**Requirement 4.4**: When the runtime profile is prod, THE System SHALL disable development-only endpoints and tools or require explicit internal permission.

## Implementation Approach

We chose **Option A: Don't register dev endpoints in prod profile** for the following reasons:

1. **Simplicity**: Not registering endpoints is simpler than registering them with complex permission checks
2. **Security**: Endpoints that don't exist can't be exploited
3. **Performance**: No runtime permission checks needed for every request
4. **Clarity**: Clear separation between dev and prod behavior

## Gated Endpoints

### Dev-Only Endpoints (Not Registered in Prod)

These endpoints are only registered when `profile.is_prod()` returns `false`:

1. **`POST /api/sync/dry-run`**
   - Purpose: Preview sync changes without execution
   - Handler: `handlers::sync_operations::execute_dry_run`
   - Available in: Dev, Demo
   - Blocked in: Prod

2. **`GET /api/settings/sandbox`**
   - Purpose: Get sandbox mode status and configuration
   - Handler: `handlers::sync_operations::get_sandbox_status`
   - Available in: Dev, Demo
   - Blocked in: Prod

3. **`POST /api/settings/sandbox`**
   - Purpose: Toggle sandbox mode for testing
   - Handler: `handlers::sync_operations::set_sandbox_mode`
   - Available in: Dev, Demo
   - Blocked in: Prod

### Setup Endpoints (Gated by ProfileGate Middleware)

These endpoints use the `ProfileGate` middleware for more nuanced control:

1. **`/api/setup/*`**
   - Purpose: Initial system configuration
   - Middleware: `ProfileGate::new()`
   - Behavior:
     - **Prod**: Blocked (403 Forbidden)
     - **Dev/Demo**: Allowed

2. **`/api/fresh-install/*`**
   - Purpose: Fresh installation and database restore
   - Middleware: `ProfileGate::new()`
   - Behavior:
     - **Prod**: Allowed only if database is empty
     - **Dev/Demo**: Always allowed

## Code Implementation

### Route Registration (main.rs)

```rust
// Sync operations endpoints
.service(handlers::sync_operations::trigger_sync)
// ... other sync endpoints ...
.service(handlers::sync_operations::execute_confirmed_operation)
// Dev-only endpoints (gated by profile - not registered in prod)
// Task 9.4: Dev/debug/setup endpoint gating
// Option A: Don't register dev endpoints in prod profile
.configure(|cfg| {
    if !profile.is_prod() {
        // /api/sync/dry-run - preview sync changes without execution
        cfg.service(handlers::sync_operations::execute_dry_run);
        // /api/settings/sandbox - toggle sandbox mode for testing
        cfg.service(handlers::sync_operations::get_sandbox_status);
        cfg.service(handlers::sync_operations::set_sandbox_mode);
    }
})
```

### ProfileGate Middleware (middleware/profile_gate.rs)

The `ProfileGate` middleware provides more sophisticated gating for setup endpoints:

```rust
pub struct ProfileGate {
    blocked_patterns: Vec<String>,
}

impl ProfileGate {
    pub fn new() -> Self {
        Self {
            blocked_patterns: vec![
                "/api/setup/".to_string(),
                "/api/debug/".to_string(),
                "/api/dev/".to_string(),
            ],
        }
    }
}
```

The middleware checks the runtime profile and blocks access to setup/debug endpoints in production mode, with an exception for fresh-install endpoints when the database is empty.

## Testing

### Property Tests

Property tests are implemented in `backend/crates/server/tests/properties/endpoint_gating_tests.rs`:

1. **`test_dev_endpoints_blocked_in_prod`**
   - Validates that dev endpoints return 404 in prod profile
   - Tests: `/api/sync/dry-run`, `/api/settings/sandbox`

2. **`test_dev_endpoints_available_in_dev`**
   - Validates that dev endpoints are available in dev profile
   - Tests: `/api/sync/dry-run`, `/api/settings/sandbox`

3. **`test_dev_endpoints_available_in_demo`**
   - Validates that dev endpoints are available in demo profile
   - Tests: `/api/sync/dry-run`, `/api/settings/sandbox`

4. **`test_setup_endpoints_blocked_in_prod`**
   - Validates that setup endpoints return 403 in prod profile
   - Tests: `/api/setup/initialize`

5. **`test_setup_endpoints_available_in_dev`**
   - Validates that setup endpoints are available in dev profile
   - Tests: `/api/setup/initialize`

### Running Tests

```bash
# Run all property tests
cargo test --test properties

# Run only endpoint gating tests
cargo test --test properties endpoint_gating
```

## Acceptance Criteria

✅ **Prod requests to dev endpoints return 404/403**
- Dev-only endpoints return 404 (not registered)
- Setup endpoints return 403 (blocked by ProfileGate)

✅ **Dev/Demo profiles allow dev endpoints**
- All dev endpoints are registered and accessible

✅ **Setup endpoints disabled in prod**
- Blocked by ProfileGate middleware
- Exception: fresh-install endpoints allowed if database is empty

## Security Considerations

1. **Defense in Depth**: Using both route registration gating and middleware provides multiple layers of protection

2. **No Information Leakage**: 404 responses don't reveal that the endpoint exists in other profiles

3. **Clear Logging**: ProfileGate middleware logs blocked access attempts for security monitoring

4. **Fresh Install Exception**: Fresh-install endpoints have their own validation logic to ensure they're only accessible when appropriate

## Future Enhancements

If **Option B** (register but require internal-only permission + audit logging) is needed in the future:

1. Create an `InternalOnly` permission level
2. Add audit logging for all dev endpoint access
3. Implement policy configuration for which endpoints require internal permission
4. Update ProfileGate to support permission-based access instead of blocking

## Related Documentation

- [Runtime Profile Management](../backend/crates/server/src/config/profile.rs)
- [ProfileGate Middleware](../backend/crates/server/src/middleware/profile_gate.rs)
- [Production Readiness Spec](.kiro/specs/production-readiness-windows-installer/)
