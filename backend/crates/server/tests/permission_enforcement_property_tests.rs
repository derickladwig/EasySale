//! Property-based tests for permission enforcement
//! 
//! These tests verify that permission enforcement is consistent across all scenarios
//! by generating random user contexts and checking permissions.
//!
//! **Validates: Requirements 5.1, 5.2, 5.3**

use proptest::prelude::*;
use EasySale_server::UserContext;
use EasySale_server::Claims;
use EasySale_server::test_constants::TEST_TENANT_ID;

/// All available roles in the system (matching actual implementation)
const ROLES: &[&str] = &[
    "admin",
    "manager",
    "cashier",
    "specialist",
    "inventory_clerk",
    "technician",
];

/// All available permissions in the system
const PERMISSIONS: &[&str] = &[
    "access_sell",
    "access_warehouse",
    "access_admin",
    "apply_discount",
    "override_price",
    "process_return",
    "receive_stock",
    "adjust_inventory",
    "manage_users",
    "manage_settings",
    "view_audit_logs",
];

/// Generate a random role
fn arb_role() -> impl Strategy<Value = String> {
    prop::sample::select(ROLES).prop_map(|s| s.to_string())
}

/// Generate a random permission
fn arb_permission() -> impl Strategy<Value = String> {
    prop::sample::select(PERMISSIONS).prop_map(|s| s.to_string())
}

/// Generate a random user ID
fn arb_user_id() -> impl Strategy<Value = String> {
    "[a-z0-9]{8}".prop_map(|s| format!("user-{}", s))
}

/// Generate a random username
fn arb_username() -> impl Strategy<Value = String> {
    "[a-z]{3,10}[0-9]{0,3}".prop_map(|s| s.to_string())
}

/// Generate optional store ID
fn arb_store_id() -> impl Strategy<Value = Option<String>> {
    prop::option::of("[a-z0-9]{8}".prop_map(|s| format!("store-{}", s)))
}

/// Generate optional station ID
fn arb_station_id() -> impl Strategy<Value = Option<String>> {
    prop::option::of("[a-z0-9]{8}".prop_map(|s| format!("station-{}", s)))
}

/// Strategy for generating a complete user context
fn arb_user_context() -> impl Strategy<Value = (String, String, String, Option<String>, Option<String>)> {
    (
        arb_user_id(),
        arb_username(),
        arb_role(),
        arb_store_id(),
        arb_station_id(),
    )
}

/// Get the actual permissions for a role (must match the implementation)
fn get_role_permissions(role: &str) -> Vec<&str> {
    match role {
        "admin" => vec![
            "access_sell",
            "access_warehouse",
            "access_admin",
            "apply_discount",
            "override_price",
            "process_return",
            "receive_stock",
            "adjust_inventory",
            "manage_users",
            "manage_settings",
            "view_audit_logs",
        ],
        "manager" => vec![
            "access_sell",
            "access_warehouse",
            "apply_discount",
            "override_price",
            "process_return",
            "receive_stock",
            "adjust_inventory",
            "view_audit_logs",
        ],
        "cashier" => vec!["access_sell", "process_return"],
        "specialist" => vec!["access_sell", "access_warehouse", "receive_stock"],
        "inventory_clerk" => vec!["access_warehouse", "receive_stock", "adjust_inventory"],
        "technician" => vec!["access_sell"],
        _ => vec![],
    }
}

/// Check if a role has a specific permission
fn role_has_permission(role: &str, permission: &str) -> bool {
    get_role_permissions(role).contains(&permission)
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    /// Property 1: Permission Enforcement Consistency
    /// 
    /// For any user context and required permission:
    /// - If the user's role has the permission, has_permission() should return true
    /// - If the user's role lacks the permission, has_permission() should return false
    /// 
    /// This validates Requirements 5.1, 5.2, 5.3
    #[test]
    fn prop_permission_enforcement_consistency(
        (user_id, username, role, store_id, station_id) in arb_user_context(),
        required_permission in arb_permission(),
    ) {
        // Create claims for the user
        let claims = Claims {
            sub: user_id.clone(),
            username: username.clone(),
            role: role.clone(),
            tenant_id: TEST_TENANT_ID.to_string(),
            store_id: store_id.clone(),
            station_id: station_id.clone(),
            exp: 9999999999,
            iat: 1000000000,
            permissions: vec![],
        };

        // Create UserContext from claims
        let context = UserContext::from_claims(claims);

        // Determine expected outcome
        let should_have_permission = role_has_permission(&role, &required_permission);

        // Verify permission check matches expectation
        prop_assert_eq!(
            context.has_permission(&required_permission),
            should_have_permission,
            "Permission check mismatch: role '{}' {} have permission '{}' but has_permission() returned {}",
            role,
            if should_have_permission { "should" } else { "should NOT" },
            required_permission,
            context.has_permission(&required_permission)
        );
    }

    /// Property 2: Admin Role Has All Permissions
    /// 
    /// For any permission, an admin user should always have access.
    /// 
    /// This validates Requirements 5.1, 5.2
    #[test]
    fn prop_admin_has_all_permissions(
        required_permission in arb_permission(),
        (user_id, username, store_id, station_id) in (
            arb_user_id(),
            arb_username(),
            arb_store_id(),
            arb_station_id(),
        ),
    ) {
        // Create claims for admin user
        let claims = Claims {
            sub: user_id,
            username,
            role: "admin".to_string(),
            tenant_id: TEST_TENANT_ID.to_string(),
            store_id,
            station_id,
            exp: 9999999999,
            iat: 1000000000,
            permissions: vec![],
        };

        // Create UserContext from claims
        let context = UserContext::from_claims(claims);

        // Admin should have all permissions
        prop_assert!(
            context.has_permission(&required_permission),
            "Admin should have permission '{}' but has_permission() returned false",
            required_permission
        );
    }

    /// Property 3: Permission Check is Deterministic
    /// 
    /// For the same user context and permission, multiple checks should yield the same result.
    /// 
    /// This validates Requirements 5.1, 5.2, 5.3
    #[test]
    fn prop_permission_check_deterministic(
        (user_id, username, role, store_id, station_id) in arb_user_context(),
        required_permission in arb_permission(),
    ) {
        // Create claims for the user
        let claims = Claims {
            sub: user_id,
            username,
            role,
            tenant_id: TEST_TENANT_ID.to_string(),
            store_id,
            station_id,
            exp: 9999999999,
            iat: 1000000000,
            permissions: vec![],
        };

        // Create UserContext from claims
        let context = UserContext::from_claims(claims);

        // Check permission multiple times
        let result1 = context.has_permission(&required_permission);
        let result2 = context.has_permission(&required_permission);
        let result3 = context.has_permission(&required_permission);

        // All results should be the same
        prop_assert_eq!(
            result1, result2,
            "Permission check should be deterministic but got different results"
        );
        prop_assert_eq!(
            result2, result3,
            "Permission check should be deterministic but got different results"
        );
    }

    /// Property 4: Context Derivation Consistency
    /// 
    /// For any claims, the UserContext should correctly derive permissions from the role.
    /// 
    /// This validates Requirements 5.4
    #[test]
    fn prop_context_derivation_consistency(
        (user_id, username, role, store_id, station_id) in arb_user_context(),
    ) {
        // Create claims for the user
        let claims = Claims {
            sub: user_id.clone(),
            username: username.clone(),
            role: role.clone(),
            tenant_id: TEST_TENANT_ID.to_string(),
            store_id: store_id.clone(),
            station_id: station_id.clone(),
            exp: 9999999999,
            iat: 1000000000,
            permissions: vec![],
        };

        // Create UserContext from claims
        let context = UserContext::from_claims(claims);

        // Verify context fields match claims
        prop_assert_eq!(&context.user_id, &user_id, "User ID mismatch");
        prop_assert_eq!(&context.username, &username, "Username mismatch");
        prop_assert_eq!(&context.role, &role, "Role mismatch");
        prop_assert_eq!(&context.tenant_id, TEST_TENANT_ID, "Tenant ID mismatch");
        prop_assert_eq!(&context.store_id, &store_id, "Store ID mismatch");
        prop_assert_eq!(&context.station_id, &station_id, "Station ID mismatch");

        // Verify permissions match role
        let expected_perms = get_role_permissions(&context.role);
        for perm in expected_perms {
            prop_assert!(
                context.has_permission(perm),
                "Context should have permission '{}' for role '{}' but doesn't",
                perm,
                context.role
            );
        }
    }
}

#[cfg(test)]
mod unit_tests {
    use super::{ROLES, PERMISSIONS, get_role_permissions};
    use EasySale_server::get_permissions_for_role as impl_get_permissions_for_role;

    #[test]
    fn test_role_permissions_match_implementation() {
        // Verify our test helper matches the actual implementation
        for role in ROLES {
            let test_perms = get_role_permissions(role);
            let impl_perms = impl_get_permissions_for_role(role);
            
            assert_eq!(
                test_perms.len(),
                impl_perms.len(),
                "Permission count mismatch for role '{}'",
                role
            );
            
            for perm in test_perms {
                assert!(
                    impl_perms.contains(&perm.to_string()),
                    "Role '{}' should have permission '{}' according to implementation",
                    role,
                    perm
                );
            }
        }
    }

    #[test]
    fn test_admin_has_all_permissions() {
        let admin_perms = get_role_permissions("admin");
        for perm in PERMISSIONS {
            assert!(
                admin_perms.contains(perm),
                "Admin should have permission '{}'",
                perm
            );
        }
    }

    #[test]
    fn test_cashier_limited_permissions() {
        let cashier_perms = get_role_permissions("cashier");
        assert!(cashier_perms.contains(&"access_sell"));
        assert!(!cashier_perms.contains(&"manage_users"));
        assert!(!cashier_perms.contains(&"manage_settings"));
    }
}
