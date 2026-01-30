# Hardcoded Business Values Cleanup

**Date:** 2026-01-11  
**Priority:** P1 - Required for true white-label platform

---

## Issue

There are **82 occurrences** of hardcoded 'caps-automotive' across the codebase, primarily in:
- Test fixtures (SQL DEFAULT clauses)
- Test INSERT statements  
- Test model initializations

This violates the white-label principle - NO business-specific values should be hardcoded.

---

## Solution Created

### 1. Test Constants Module ✅
Created `src/test_constants.rs` with:
```rust
pub const TEST_TENANT_ID: &str = "test-tenant";
pub const TEST_STORE_ID: &str = "test-store-1";

pub fn get_test_tenant_id() -> String {
    std::env::var("TEST_TENANT_ID")
        .unwrap_or_else(|_| TEST_TENANT_ID.to_string())
}
```

### 2. Required Replacements

**Files with hardcoded values (82 total):**
- `src/services/backup_service.rs` - Test fixtures
- `src/services/retention_service.rs` - Test fixtures  
- `src/services/scheduler_service.rs` - Test fixtures
- `src/models/backup.rs` - Test cases
- `src/models/context.rs` - Test cases
- `src/models/session.rs` - Test cases
- `src/models/station.rs` - Test cases
- `src/models/store.rs` - Test cases
- `src/handlers/auth.rs` - Test cases
- `src/handlers/config.rs` - Test cases

**Replacement Pattern:**
```rust
// OLD (hardcoded):
DEFAULT 'caps-automotive'
'caps-automotive'
"caps-automotive"

// NEW (using constant):
DEFAULT 'test-tenant'
crate::test_constants::TEST_TENANT_ID
crate::test_constants::TEST_TENANT_ID
```

---

## Migration Script

```powershell
# Run from backend/rust directory
$files = Get-ChildItem -Path src -Recurse -Include *.rs

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Replace SQL DEFAULT clauses
    $content = $content -replace "DEFAULT 'caps-automotive'", "DEFAULT 'test-tenant'"
    
    # Replace string literals in Rust
    $content = $content -replace "'caps-automotive'", "crate::test_constants::TEST_TENANT_ID"
    $content = $content -replace '"caps-automotive"', 'crate::test_constants::TEST_TENANT_ID'
    
    Set-Content $file.FullName -Value $content -NoNewline
}
```

---

## Production Code Status

**IMPORTANT:** The production code (non-test) already uses proper tenant isolation:
- ✅ Tenant ID comes from environment variable `TENANT_ID`
- ✅ Default is configurable (currently "caps-automotive" but can be changed)
- ✅ All queries filter by tenant_id from context
- ✅ No hardcoded business values in production paths

**The issue is ONLY in test code**, which should use generic test values.

---

## Impact

**Current State:**
- Production code: ✅ WHITE-LABEL READY
- Test code: 🔴 Contains hardcoded 'caps-automotive' (82 occurrences)
- Test failures: 25 tests failing due to malformed SQL from previous fixes

**After Cleanup:**
- All tests will use generic "test-tenant" value
- Tests can be run with any tenant by setting `TEST_TENANT_ID` env var
- True white-label compliance achieved

---

## Recommended Action

1. Run the migration script above to replace all 82 occurrences
2. Fix the 4 malformed INSERT statements in retention_service.rs (use bind parameters)
3. Run `cargo test --lib` to verify all tests pass
4. Update migration 008 to use generic default instead of 'caps-automotive'

---

## Alternative: Keep Current Approach

If you want to keep 'caps-automotive' as the default tenant for the CAPS business:

1. Move it to environment variable with default
2. Update `.env.example` to document it
3. Keep test code using the same default
4. Document that this is the "reference implementation" tenant

This is acceptable IF documented as "the default tenant for the reference implementation" rather than a hardcoded business requirement.
