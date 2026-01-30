# Production Startup Validator Implementation

## Overview

This document describes the implementation of task 4.2: Production startup validator with aggregated error checking.

## Changes Made

### 1. Enhanced Config Struct (`app_config.rs`)

Added new fields to support production readiness validation:

```rust
pub struct Config {
    // ... existing fields ...
    
    // OAuth configuration
    pub quickbooks_redirect_uri: Option<String>,
    pub google_drive_redirect_uri: Option<String>,
    
    // Feature flags
    pub enable_dev_endpoints: bool,
    pub enable_demo: bool,
    
    // Integration flags
    pub integrations_enabled: bool,
}
```

These fields are loaded from environment variables:
- `QUICKBOOKS_REDIRECT_URI`
- `GOOGLE_DRIVE_REDIRECT_URI`
- `ENABLE_DEV_ENDPOINTS`
- `ENABLE_DEMO`
- `INTEGRATIONS_ENABLED`

### 2. Enhanced ProfileManager Validation (`profile.rs`)

Expanded the `validate()` method to implement comprehensive production readiness checks:

#### Production Profile Checks

When `RUNTIME_PROFILE=prod`, the following validations are enforced:

1. **Required Fields**
   - `DATABASE_PATH` must be set
   - `STORE_ID` must be set
   - `JWT_SECRET` must be set

2. **Placeholder Secret Detection**
   - Rejects secrets containing: `CHANGE_ME`, `secret123`, `password123`, `test-secret`, `your-secret-key`, `change-in-production`
   - Error message includes the placeholder value found

3. **Demo Mode Rejection**
   - Blocks startup if `ENABLE_DEMO=true` in prod profile
   - Error: "Demo mode (ENABLE_DEMO=true) is not allowed in prod profile"

4. **Dev Endpoints Rejection**
   - Blocks startup if `ENABLE_DEV_ENDPOINTS=true` in prod profile
   - Error: "Dev endpoints (ENABLE_DEV_ENDPOINTS=true) are not allowed in prod profile"

5. **Localhost OAuth Rejection**
   - When `INTEGRATIONS_ENABLED=true`, checks OAuth redirect URIs
   - Rejects URIs containing `localhost` or `127.0.0.1`
   - Checks both QuickBooks and Google Drive redirect URIs
   - Error includes the specific integration and URI value

#### Error Aggregation

All validation errors are collected into a `Vec<String>` and returned as a single aggregated error message:

```
Configuration validation failed for profile 'prod':
  - DATABASE_PATH is required in prod profile
  - JWT_SECRET contains placeholder value 'CHANGE_ME' in prod profile
  - Demo mode (ENABLE_DEMO=true) is not allowed in prod profile
  - Dev endpoints (ENABLE_DEV_ENDPOINTS=true) are not allowed in prod profile
```

This ensures operators see ALL configuration issues at once, not just the first error.

### 3. Demo Profile Behavior

When `RUNTIME_PROFILE=demo`:
- Placeholder secrets generate warnings (not errors)
- Warns if `ENABLE_DEMO=false` (suggests enabling demo mode)
- Allows all defaults for development convenience

### 4. Dev Profile Behavior

When `RUNTIME_PROFILE=dev`:
- Minimal validation
- All defaults and placeholders allowed
- No restrictions on dev endpoints or demo mode

## Unit Tests

Added comprehensive unit tests in `profile.rs`:

1. `test_prod_validation_requires_database_path` - Verifies DATABASE_PATH requirement
2. `test_prod_validation_rejects_placeholder_secrets` - Verifies placeholder detection
3. `test_prod_validation_rejects_demo_mode` - Verifies demo mode rejection
4. `test_prod_validation_rejects_dev_endpoints` - Verifies dev endpoints rejection
5. `test_prod_validation_rejects_localhost_oauth` - Verifies localhost OAuth rejection
6. `test_prod_validation_aggregates_multiple_errors` - Verifies error aggregation
7. `test_prod_validation_passes_with_valid_config` - Verifies valid config passes

All tests use environment variables to simulate different configuration scenarios and verify the correct validation behavior.

## Integration with Startup

The validation is automatically executed during server startup in `main.rs`:

```rust
let profile_manager = config::ProfileManager::load()
    .expect("Failed to load configuration with runtime profile");
```

If validation fails, the server will not start and will display the aggregated error message.

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **Requirement 4.2**: Configuration validation with clear error messages for missing/invalid keys
- **Requirement 4.3**: Placeholder secret rejection in prod profile
- **Requirement 4.4**: Dev endpoint gating in prod profile
- **Requirement 4.8**: Aggregate all validation errors into single startup failure message
- **Requirement 10.5**: Clear error messages indicating missing/invalid keys and active profile

## Design Alignment

This implementation follows the design specified in `design.md`:

```rust
pub struct ConfigValidator {
    profile: RuntimeProfile,
}

impl ConfigValidator {
    pub fn validate(&self, config: &Config) -> Result<(), ValidationError> {
        let mut errors = Vec::new();
        
        if self.profile == RuntimeProfile::Prod {
            // Check for placeholder secrets
            // Check for localhost OAuth redirect
            // Check for demo mode
            // Check for dev endpoints
            // Check for required fields
        }
        
        if errors.is_empty() {
            Ok(())
        } else {
            Err(ValidationError::Multiple(errors))
        }
    }
}
```

The implementation is integrated directly into `ProfileManager` rather than as a separate struct, which provides better encapsulation and simpler API.

## Next Steps

The following tasks build on this implementation:

- **Task 4.3**: Standardize DATABASE_PATH (already partially implemented)
- **Task 4.4**: Create configuration file templates
- **Task 4.5-4.8**: Property-based tests and unit tests for validation logic

## Testing

To test the validator:

```bash
# Test with missing DATABASE_PATH (should fail)
RUNTIME_PROFILE=prod STORE_ID=test JWT_SECRET=secure-key cargo run

# Test with placeholder secret (should fail)
RUNTIME_PROFILE=prod DATABASE_PATH=test.db STORE_ID=test JWT_SECRET=CHANGE_ME cargo run

# Test with demo mode enabled (should fail)
RUNTIME_PROFILE=prod DATABASE_PATH=test.db STORE_ID=test JWT_SECRET=secure-key ENABLE_DEMO=true cargo run

# Test with valid config (should succeed)
RUNTIME_PROFILE=prod DATABASE_PATH=test.db STORE_ID=test JWT_SECRET=secure-random-key-12345 cargo run
```

## Notes

- The validator checks are only enforced in production profile
- Demo and dev profiles have relaxed validation for development convenience
- All errors are aggregated and reported together for better operator experience
- The implementation is backward compatible with existing configuration
