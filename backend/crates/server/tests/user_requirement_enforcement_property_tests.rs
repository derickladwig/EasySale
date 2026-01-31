//! Property-based tests for user requirement enforcement
//! 
//! These tests verify that store assignment requirements and station policy enforcement
//! work correctly across all valid user configurations.
//!
//! **Property 2: Store Assignment Requirement**
//! **Property 3: Station Policy Enforcement**
//! **Validates: Requirements 2.7, 6.1, 6.2, 6.3, 6.4**

use proptest::prelude::*;
use easysale_server::models::user::{
    CreateUserRequest, role_requires_store, role_requires_station, validate_user
};
use easysale_server::models::context::UserContext;
use easysale_server::auth::jwt::Claims;

const TEST_TENANT_ID: &str = "test-tenant";

// ============================================================================
// Property Test Generators
// ============================================================================

/// All available roles in the system
const ROLES: &[&str] = &[
    "admin",
    "manager",
    "cashier",
    "specialist",
    "inventory_clerk",
    "technician",
];

/// Roles that require store assignment for POS operations
const POS_ROLES: &[&str] = &[
    "cashier",
    "manager",
    "specialist",
    "technician",
];

/// Roles that do NOT require store assignment
const NON_POS_ROLES: &[&str] = &[
    "admin",
    "inventory_clerk",
];

/// Valid station policies
const STATION_POLICIES: &[&str] = &["any", "specific", "none"];

/// Generate a random role
fn arb_role() -> impl Strategy<Value = String> {
    prop::sample::select(ROLES).prop_map(|s| s.to_string())
}

/// Generate a POS role (requires store)
fn arb_pos_role() -> impl Strategy<Value = String> {
    prop::sample::select(POS_ROLES).prop_map(|s| s.to_string())
}

/// Generate a non-POS role (doesn't require store)
fn arb_non_pos_role() -> impl Strategy<Value = String> {
    prop::sample::select(NON_POS_ROLES).prop_map(|s| s.to_string())
}

/// Generate a random station policy
fn arb_station_policy() -> impl Strategy<Value = String> {
    prop::sample::select(STATION_POLICIES).prop_map(|s| s.to_string())
}

/// Generate a random user ID
fn arb_user_id() -> impl Strategy<Value = String> {
    "[a-z0-9]{8}".prop_map(|s| format!("user-{}", s))
}

/// Generate a random username (3-10 lowercase letters, optional digits)
fn arb_username() -> impl Strategy<Value = String> {
    "[a-z]{3,10}[0-9]{0,3}".prop_map(|s| s.to_string())
}

/// Generate a random email
fn arb_email() -> impl Strategy<Value = String> {
    "[a-z]{3,10}@[a-z]{3,10}\\.(com|org|net)".prop_map(|s| s.to_string())
}

/// Generate a random password (8-20 characters)
fn arb_password() -> impl Strategy<Value = String> {
    "[a-zA-Z0-9]{8,20}".prop_map(|s| s.to_string())
}

/// Generate optional store ID
fn arb_store_id() -> impl Strategy<Value = Option<String>> {
    prop::option::of("[a-z0-9]{8}".prop_map(|s| format!("store-{}", s)))
}

/// Generate optional station ID
fn arb_station_id() -> impl Strategy<Value = Option<String>> {
    prop::option::of("[a-z0-9]{8}".prop_map(|s| format!("station-{}", s)))
}

/// Generate a complete CreateUserRequest with random valid data
fn arb_create_user_request() -> impl Strategy<Value = CreateUserRequest> {
    (
        arb_username(),
        arb_email(),
        arb_password(),
        arb_role(),
        arb_store_id(),
        arb_station_policy(),
        arb_station_id(),
    ).prop_map(|(username, email, password, role, store_id, station_policy, station_id)| {
        CreateUserRequest {
            username,
            email,
            password,
            display_name: None,
            role,
            first_name: None,
            last_name: None,
            store_id,
            station_policy: Some(station_policy),
            station_id,
        }
    })
}

/// Generate a user context with random data
fn arb_user_context() -> impl Strategy<Value = (String, String, String, Option<String>, Option<String>)> {
    (
        arb_user_id(),
        arb_username(),
        arb_role(),
        arb_store_id(),
        arb_station_id(),
    )
}

// ============================================================================
// Property Tests
// ============================================================================

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    /// **Property 2: Store Assignment Requirement**
    /// 
    /// For any user with a POS-related role (cashier, manager, specialist, 
    /// technician), attempting to create/validate without store 
    /// assignment should fail with a clear error.
    /// 
    /// **Validates: Requirements 2.7, 6.1, 6.3**
    #[test]
    fn prop_pos_role_requires_store(
        pos_role in arb_pos_role(),
        username in arb_username(),
        email in arb_email(),
        password in arb_password(),
        station_policy in arb_station_policy(),
    ) {
        // Create user request with POS role but NO store assignment
        let request = CreateUserRequest {
            username,
            email,
            password,
            display_name: None,
            role: pos_role.clone(),
            first_name: None,
            last_name: None,
            store_id: None, // Missing store!
            station_policy: Some(station_policy.clone()),
            station_id: None,
        };

        // Validation should fail
        let result = request.validate();
        prop_assert!(
            result.is_err(),
            "POS role '{}' without store should fail validation",
            pos_role
        );

        // Error message should mention store requirement
        let error_msg = result.unwrap_err();
        prop_assert!(
            error_msg.contains("store") || error_msg.contains("Store"),
            "Error message should mention store requirement, got: {}",
            error_msg
        );

        // Also test the validate_user function directly
        let validate_result = validate_user(&pos_role, &None, &station_policy, &None);
        prop_assert!(
            validate_result.is_err(),
            "validate_user should fail for POS role '{}' without store",
            pos_role
        );
    }

    /// **Property 2b: Store Assignment Requirement - Valid Case**
    /// 
    /// For any user with a POS-related role WITH store assignment, 
    /// validation should succeed (assuming other fields are valid).
    /// 
    /// **Validates: Requirements 2.7, 6.1, 6.3**
    #[test]
    fn prop_pos_role_with_store_succeeds(
        pos_role in arb_pos_role(),
        username in arb_username(),
        email in arb_email(),
        password in arb_password(),
        store_id in "[a-z0-9]{8}".prop_map(|s| format!("store-{}", s)),
    ) {
        // Create user request with POS role AND store assignment
        let request = CreateUserRequest {
            username,
            email,
            password,
            display_name: None,
            role: pos_role.clone(),
            first_name: None,
            last_name: None,
            store_id: Some(store_id.clone()),
            station_policy: Some("any".to_string()), // Valid policy
            station_id: None,
        };

        // Validation should succeed
        let result = request.validate();
        prop_assert!(
            result.is_ok(),
            "POS role '{}' with store should pass validation, got error: {:?}",
            pos_role,
            result.err()
        );

        // Also test the validate_user function directly
        let validate_result = validate_user(&pos_role, &Some(store_id), "any", &None);
        prop_assert!(
            validate_result.is_ok(),
            "validate_user should succeed for POS role '{}' with store, got error: {:?}",
            pos_role,
            validate_result.err()
        );
    }

    /// **Property 2c: Non-POS Roles Don't Require Store**
    /// 
    /// For any user with a non-POS role (admin, inventory_clerk), 
    /// validation should succeed even without store assignment.
    /// 
    /// **Validates: Requirements 2.7, 6.1**
    #[test]
    fn prop_non_pos_role_no_store_required(
        non_pos_role in arb_non_pos_role(),
        username in arb_username(),
        email in arb_email(),
        password in arb_password(),
        station_policy in arb_station_policy(),
    ) {
        // Create user request with non-POS role and NO store
        let request = CreateUserRequest {
            username,
            email,
            password,
            display_name: None,
            role: non_pos_role.clone(),
            first_name: None,
            last_name: None,
            store_id: None, // No store, but that's OK for non-POS roles
            station_policy: Some(station_policy.clone()),
            station_id: None,
        };

        // Validation should succeed (assuming station policy is consistent)
        let result = request.validate();
        
        // Only fail if it's a station policy issue, not a store issue
        if result.is_err() {
            let error_msg = result.unwrap_err();
            prop_assert!(
                !error_msg.contains("store") && !error_msg.contains("Store"),
                "Non-POS role '{}' should not require store, but got error: {}",
                non_pos_role,
                error_msg
            );
        }
    }

    /// **Property 3: Station Policy Enforcement - Specific Policy Requires Station**
    /// 
    /// For any user with station_policy="specific", attempting to create/validate 
    /// without station assignment should fail with a clear error.
    /// 
    /// **Validates: Requirements 2.8, 6.2, 6.4**
    #[test]
    fn prop_specific_policy_requires_station(
        role in arb_role(),
        username in arb_username(),
        email in arb_email(),
        password in arb_password(),
    ) {
        // Ensure we have a store if the role requires it
        let store_id = if role_requires_store(&role) {
            Some(format!("store-{}", "test123"))
        } else {
            None
        };

        // Create user request with "specific" policy but NO station
        let request = CreateUserRequest {
            username,
            email,
            password,
            display_name: None,
            role: role.clone(),
            first_name: None,
            last_name: None,
            store_id: store_id.clone(),
            station_policy: Some("specific".to_string()),
            station_id: None, // Missing station!
        };

        // Validation should fail
        let result = request.validate();
        prop_assert!(
            result.is_err(),
            "Station policy 'specific' without station should fail validation"
        );

        // Error message should mention station requirement
        let error_msg = result.unwrap_err();
        prop_assert!(
            error_msg.contains("station") || error_msg.contains("Station"),
            "Error message should mention station requirement, got: {}",
            error_msg
        );

        // Also test the validate_user function directly
        let validate_result = validate_user(&role, &store_id, "specific", &None);
        prop_assert!(
            validate_result.is_err(),
            "validate_user should fail for 'specific' policy without station"
        );
    }

    /// **Property 3b: Station Policy Enforcement - Specific Policy With Station Succeeds**
    /// 
    /// For any user with station_policy="specific" AND station assignment, 
    /// validation should succeed (assuming other fields are valid).
    /// 
    /// **Validates: Requirements 2.8, 6.2, 6.4**
    #[test]
    fn prop_specific_policy_with_station_succeeds(
        role in arb_role(),
        username in arb_username(),
        email in arb_email(),
        password in arb_password(),
        store_id in arb_store_id(),
        station_id in "[a-z0-9]{8}".prop_map(|s| format!("station-{}", s)),
    ) {
        // Create user request with "specific" policy AND station
        let request = CreateUserRequest {
            username,
            email,
            password,
            display_name: None,
            role: role.clone(),
            first_name: None,
            last_name: None,
            store_id: store_id.clone(),
            station_policy: Some("specific".to_string()),
            station_id: Some(station_id.clone()),
        };

        // Validation should succeed (unless role requires store and it's missing)
        let result = request.validate();
        
        // If it fails, it should be due to store requirement, not station
        if result.is_err() {
            let error_msg = result.unwrap_err();
            if role_requires_store(&role) && store_id.is_none() {
                // Expected failure due to missing store
                prop_assert!(
                    error_msg.contains("store") || error_msg.contains("Store"),
                    "Should fail due to store requirement, got: {}",
                    error_msg
                );
            } else {
                // Unexpected failure
                prop_assert!(
                    false,
                    "Validation should succeed for 'specific' policy with station, got error: {}",
                    error_msg
                );
            }
        }
    }

    /// **Property 3c: Station Policy Enforcement - Non-Specific Policy Rejects Station**
    /// 
    /// For any user with station_policy != "specific" but WITH station assignment, 
    /// validation should fail with a clear error.
    /// 
    /// **Validates: Requirements 2.8, 6.2**
    #[test]
    fn prop_non_specific_policy_rejects_station(
        role in arb_role(),
        username in arb_username(),
        email in arb_email(),
        password in arb_password(),
        station_id in "[a-z0-9]{8}".prop_map(|s| format!("station-{}", s)),
        policy in prop::sample::select(&["any", "none"]),
    ) {
        // Ensure we have a store if the role requires it
        let store_id = if role_requires_store(&role) {
            Some(format!("store-{}", "test123"))
        } else {
            None
        };

        // Create user request with non-specific policy but WITH station
        let request = CreateUserRequest {
            username,
            email,
            password,
            display_name: None,
            role: role.clone(),
            first_name: None,
            last_name: None,
            store_id: store_id.clone(),
            station_policy: Some(policy.to_string()),
            station_id: Some(station_id.clone()), // Station assigned but policy doesn't allow it!
        };

        // Validation should fail
        let result = request.validate();
        prop_assert!(
            result.is_err(),
            "Station assignment with policy '{}' should fail validation",
            policy
        );

        // Error message should mention station policy
        let error_msg = result.unwrap_err();
        prop_assert!(
            error_msg.contains("station") || error_msg.contains("Station") || error_msg.contains("policy"),
            "Error message should mention station policy issue, got: {}",
            error_msg
        );

        // Also test the validate_user function directly
        let validate_result = validate_user(&role, &store_id, policy, &Some(station_id));
        prop_assert!(
            validate_result.is_err(),
            "validate_user should fail for policy '{}' with station assignment",
            policy
        );
    }

    /// **Property 3d: Station Policy Enforcement - Any/None Policies Without Station Succeed**
    /// 
    /// For any user with station_policy="any" or "none" WITHOUT station assignment, 
    /// validation should succeed (assuming other fields are valid).
    /// 
    /// **Validates: Requirements 2.8, 6.2, 6.5**
    #[test]
    fn prop_any_none_policy_without_station_succeeds(
        role in arb_role(),
        username in arb_username(),
        email in arb_email(),
        password in arb_password(),
        store_id in arb_store_id(),
        policy in prop::sample::select(&["any", "none"]),
    ) {
        // Create user request with "any" or "none" policy and NO station
        let request = CreateUserRequest {
            username,
            email,
            password,
            display_name: None,
            role: role.clone(),
            first_name: None,
            last_name: None,
            store_id: store_id.clone(),
            station_policy: Some(policy.to_string()),
            station_id: None, // No station, which is fine for "any" or "none"
        };

        // Validation should succeed (unless role requires store and it's missing)
        let result = request.validate();
        
        // If it fails, it should be due to store requirement, not station
        if result.is_err() {
            let error_msg = result.unwrap_err();
            if role_requires_store(&role) && store_id.is_none() {
                // Expected failure due to missing store
                prop_assert!(
                    error_msg.contains("store") || error_msg.contains("Store"),
                    "Should fail due to store requirement, got: {}",
                    error_msg
                );
            } else {
                // Unexpected failure
                prop_assert!(
                    false,
                    "Validation should succeed for policy '{}' without station, got error: {}",
                    policy,
                    error_msg
                );
            }
        }
    }

    /// **Property 4: UserContext Validation - Store Requirement**
    /// 
    /// For any UserContext with a POS role, validate() should fail if store_id is None.
    /// 
    /// **Validates: Requirements 6.1, 6.3**
    #[test]
    fn prop_user_context_validates_store_requirement(
        user_id in arb_user_id(),
        username in arb_username(),
        pos_role in arb_pos_role(),
        station_id in arb_station_id(),
    ) {
        // Create claims with POS role but no store
        let claims = Claims {
            sub: user_id,
            username,
            role: pos_role.clone(),
            tenant_id: TEST_TENANT_ID.to_string(),
            store_id: None, // Missing store!
            station_id,
            exp: 9999999999,
            iat: 1000000000,
            permissions: vec![],
        };

        // Create UserContext from claims
        let context = UserContext::from_claims(claims);

        // Validation should fail
        let result = context.validate();
        prop_assert!(
            result.is_err(),
            "UserContext with POS role '{}' and no store should fail validation",
            pos_role
        );

        // Error message should mention store requirement
        let error_msg = result.unwrap_err();
        prop_assert!(
            error_msg.contains("store") || error_msg.contains("Store"),
            "Error message should mention store requirement, got: {}",
            error_msg
        );
    }

    /// **Property 5: UserContext Validation - Non-POS Roles Don't Need Store**
    /// 
    /// For any UserContext with a non-POS role, validate() should succeed even without store.
    /// 
    /// **Validates: Requirements 6.1**
    #[test]
    fn prop_user_context_non_pos_role_no_store_ok(
        user_id in arb_user_id(),
        username in arb_username(),
        non_pos_role in arb_non_pos_role(),
        station_id in arb_station_id(),
    ) {
        // Create claims with non-POS role and no store
        let claims = Claims {
            sub: user_id,
            username,
            role: non_pos_role.clone(),
            tenant_id: TEST_TENANT_ID.to_string(),
            store_id: None, // No store, but that's OK
            station_id,
            exp: 9999999999,
            iat: 1000000000,
            permissions: vec![],
        };

        // Create UserContext from claims
        let context = UserContext::from_claims(claims);

        // Validation should succeed
        let result = context.validate();
        prop_assert!(
            result.is_ok(),
            "UserContext with non-POS role '{}' should not require store, got error: {:?}",
            non_pos_role,
            result.err()
        );
    }

    /// **Property 6: Role Classification Consistency**
    /// 
    /// For any role, role_requires_store() and role_requires_station() should be consistent
    /// with the defined POS_ROLES list.
    /// 
    /// **Validates: Requirements 2.7, 6.1, 6.2**
    #[test]
    fn prop_role_classification_consistency(role in arb_role()) {
        let requires_store = role_requires_store(&role);
        let is_pos_role = POS_ROLES.contains(&role.as_str());

        prop_assert_eq!(
            requires_store,
            is_pos_role,
            "role_requires_store('{}') should return {} but returned {}",
            role,
            is_pos_role,
            requires_store
        );

        // Only cashier requires station
        let requires_station = role_requires_station(&role);
        let should_require_station = role == "cashier";

        prop_assert_eq!(
            requires_station,
            should_require_station,
            "role_requires_station('{}') should return {} but returned {}",
            role,
            should_require_station,
            requires_station
        );
    }
}

// ============================================================================
// Unit Tests for Generators
// ============================================================================

#[cfg(test)]
mod generator_tests {
    use super::*;

    #[test]
    fn test_pos_roles_list_accuracy() {
        // Verify POS_ROLES list matches role_requires_store implementation
        for role in ROLES {
            let is_in_pos_list = POS_ROLES.contains(role);
            let requires_store = role_requires_store(role);
            assert_eq!(
                is_in_pos_list,
                requires_store,
                "POS_ROLES list inconsistent with role_requires_store for role '{}'",
                role
            );
        }
    }

    #[test]
    fn test_non_pos_roles_list_accuracy() {
        // Verify NON_POS_ROLES list matches role_requires_store implementation
        for role in ROLES {
            let is_in_non_pos_list = NON_POS_ROLES.contains(role);
            let requires_store = role_requires_store(role);
            assert_eq!(
                is_in_non_pos_list,
                !requires_store,
                "NON_POS_ROLES list inconsistent with role_requires_store for role '{}'",
                role
            );
        }
    }

    #[test]
    fn test_station_policies_complete() {
        // Verify all valid station policies are in the list
        assert_eq!(STATION_POLICIES.len(), 3);
        assert!(STATION_POLICIES.contains(&"any"));
        assert!(STATION_POLICIES.contains(&"specific"));
        assert!(STATION_POLICIES.contains(&"none"));
    }

    #[test]
    fn test_only_cashier_requires_station() {
        // Verify only cashier requires station
        for role in ROLES {
            let requires_station = role_requires_station(role);
            if *role == "cashier" {
                assert!(requires_station, "Cashier should require station");
            } else {
                assert!(!requires_station, "Role '{}' should not require station", role);
            }
        }
    }
}
