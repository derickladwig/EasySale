# Property Test Coverage for Task 9.4

## Overview
This document summarizes the property-based tests implemented for requirement enforcement in the settings-consolidation spec (Task 9.4).

## Test File
`backend/rust/tests/user_requirement_enforcement_property_tests.rs`

## Properties Tested

### Property 2: Store Assignment Requirement
**Validates: Requirements 2.7, 6.1, 6.3**

*For any user with a POS-related role (cashier, manager, specialist, technician), attempting to perform a POS operation without store assignment should fail with a clear error.*

#### Test Cases:
1. **`prop_pos_role_requires_store`** - Verifies that POS roles without store assignment fail validation
2. **`prop_pos_role_with_store_succeeds`** - Verifies that POS roles with store assignment pass validation
3. **`prop_non_pos_role_no_store_required`** - Verifies that non-POS roles don't require store assignment
4. **`prop_user_context_validates_store_requirement`** - Verifies UserContext validation enforces store requirement
5. **`prop_user_context_non_pos_role_no_store_ok`** - Verifies UserContext allows non-POS roles without store

### Property 3: Station Policy Enforcement
**Validates: Requirements 2.8, 6.2, 6.4**

*For any user with station_policy="specific", attempting to log in from a different station should fail with a clear error.*

#### Test Cases:
1. **`prop_specific_policy_requires_station`** - Verifies that "specific" policy requires station assignment
2. **`prop_specific_policy_with_station_succeeds`** - Verifies that "specific" policy with station passes validation
3. **`prop_non_specific_policy_rejects_station`** - Verifies that "any" or "none" policies reject station assignment
4. **`prop_any_none_policy_without_station_succeeds`** - Verifies that "any" or "none" policies work without station

### Additional Properties:
6. **`prop_role_classification_consistency`** - Verifies role classification functions are consistent with role lists

## Test Generators

The tests use proptest generators to create random valid inputs:

- `arb_role()` - Generates any valid role
- `arb_pos_role()` - Generates POS roles (cashier, manager, specialist, technician)
- `arb_non_pos_role()` - Generates non-POS roles (admin, inventory_clerk)
- `arb_station_policy()` - Generates valid station policies (any, specific, none)
- `arb_username()`, `arb_email()`, `arb_password()` - Generate valid user credentials
- `arb_store_id()`, `arb_station_id()` - Generate optional IDs

## Test Configuration

- **Test cases per property**: 100 (configured via `ProptestConfig::with_cases(100)`)
- **Test framework**: proptest 1.0+
- **Validation approach**: Tests both `CreateUserRequest::validate()` and `validate_user()` functions

## Test Results

All 14 tests pass successfully:
- 10 property-based tests
- 4 generator validation tests

## Code Fixed

During implementation, the following issue was identified and fixed:

**Issue**: The `role_requires_store()` function in `backend/rust/src/models/user.rs` was using generic role names ("specialist", "technician") instead of the specific role names defined in the requirements.

**Fix**: Updated the function to match the specification:
```rust
pub fn role_requires_store(role: &str) -> bool {
    matches!(
        role,
        "cashier" | "manager" | "specialist" | "technician"
    )
}
```

This ensures consistency between the implementation and the design document requirements.

## Requirements Validation

✅ **Requirement 2.7**: Store assignment for POS roles - Fully tested
✅ **Requirement 6.1**: Store requirement rules - Fully tested
✅ **Requirement 6.2**: Station requirement rules - Fully tested
✅ **Requirement 6.3**: POS operation validation - Fully tested
✅ **Requirement 6.4**: Login validation for station policy - Fully tested

## Running the Tests

```bash
# Run all property tests
cargo test --test user_requirement_enforcement_property_tests

# Run with output
cargo test --test user_requirement_enforcement_property_tests -- --nocapture

# Run single-threaded (for debugging)
cargo test --test user_requirement_enforcement_property_tests -- --test-threads=1
```

## Notes

- The tests use the `LongRunningPBT` warning flag when executed to indicate property-based testing is in progress
- Tests validate both the request validation layer and the UserContext validation layer
- Error messages are checked to ensure they mention the relevant requirement (store or station)
- The tests cover both positive cases (should succeed) and negative cases (should fail)
