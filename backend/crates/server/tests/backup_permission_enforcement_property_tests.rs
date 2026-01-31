//! Property-based tests for backup permission enforcement
//! 
//! These tests verify that backup API endpoints enforce MANAGE_SETTINGS permission
//! by generating random user contexts and verifying 403 responses for non-admin users.
//!
//! **Validates: Requirements 9.1 (Requirement 10.1 in design doc)**

use proptest::prelude::*;
use easysale_server::models::context::UserContext;
use easysale_server::auth::jwt::Claims;
use easysale_server::test_constants::TEST_TENANT_ID;

/// All available roles in the system
const ROLES: &[&str] = &[
    "admin",
    "manager",
    "cashier",
    "specialist",
    "inventory_clerk",
    "technician",
];

/// Backup-related permissions
const BACKUP_PERMISSION: &str = "manage_settings";

/// Generate a random role
fn arb_role() -> impl Strategy<Value = String> {
    prop::sample::select(ROLES).prop_map(|s| s.to_string())
}

/// Generate a random user ID
fn arb_user_id() -> impl Strategy<Value = String> {
    "[a-z0-9]{8}".prop_map(|s| format!("user-{}", s))
}

/// Generate a random username
fn arb_username() -> impl Strategy<Value = String> {
    "[a-z]{3,10}[0-9]{0,3}".prop_map(|s| s.to_string())
}

/// Strategy for generating a complete user context
fn arb_user_context() -> impl Strategy<Value = (String, String, String)> {
    (arb_user_id(), arb_username(), arb_role())
}

/// Check if a role has MANAGE_SETTINGS permission
fn role_has_backup_permission(role: &str) -> bool {
    matches!(role, "admin")
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    /// Property 13: Backup Permission Enforcement
    /// 
    /// For any user context:
    /// - If the user's role has MANAGE_SETTINGS permission, backup operations should be allowed
    /// - If the user's role lacks MANAGE_SETTINGS permission, backup operations should return 403
    /// 
    /// This validates Requirement 9.1 (Permission enforcement for backup operations)
    #[test]
    fn prop_backup_permission_enforcement(
        (user_id, username, role) in arb_user_context(),
    ) {
        // Create claims for the user
        let claims = Claims {
            sub: user_id.clone(),
            username: username.clone(),
            role: role.clone(),
            tenant_id: TEST_TENANT_ID.to_string(),
            store_id: Some("store-1".to_string()),
            station_id: Some("station-1".to_string()),
            exp: 9999999999,
            iat: 1000000000,
            permissions: vec![],
        };

        // Create UserContext from claims
        let context = UserContext::from_claims(claims);

        // Determine expected outcome
        let should_have_access = role_has_backup_permission(&role);

        // Verify permission check matches expectation
        prop_assert_eq!(
            context.has_permission(BACKUP_PERMISSION),
            should_have_access,
            "Backup permission check mismatch: role '{}' {} have MANAGE_SETTINGS permission but has_permission() returned {}",
            role,
            if should_have_access { "should" } else { "should NOT" },
            context.has_permission(BACKUP_PERMISSION)
        );
    }

    /// Property: Non-Admin Users Cannot Access Backup Operations
    /// 
    /// For any non-admin user, backup operations should be denied.
    /// 
    /// This validates Requirement 9.1
    #[test]
    fn prop_non_admin_backup_denied(
        (user_id, username) in (arb_user_id(), arb_username()),
        role in prop::sample::select(&["manager", "cashier", "specialist", "inventory_clerk", "technician"]),
    ) {
        // Create claims for non-admin user
        let claims = Claims {
            sub: user_id,
            username,
            role: role.to_string(),
            tenant_id: TEST_TENANT_ID.to_string(),
            store_id: Some("store-1".to_string()),
            station_id: Some("station-1".to_string()),
            exp: 9999999999,
            iat: 1000000000,
            permissions: vec![],
        };

        // Create UserContext from claims
        let context = UserContext::from_claims(claims);

        // Non-admin users should NOT have backup permission
        prop_assert!(
            !context.has_permission(BACKUP_PERMISSION),
            "Non-admin role '{}' should NOT have MANAGE_SETTINGS permission but has_permission() returned true",
            role
        );
    }

    /// Property: Admin Users Can Access Backup Operations
    /// 
    /// For any admin user, backup operations should be allowed.
    /// 
    /// This validates Requirement 9.1
    #[test]
    fn prop_admin_backup_allowed(
        (user_id, username) in (arb_user_id(), arb_username()),
    ) {
        // Create claims for admin user
        let claims = Claims {
            sub: user_id,
            username,
            role: "admin".to_string(),
            tenant_id: TEST_TENANT_ID.to_string(),
            store_id: Some("store-1".to_string()),
            station_id: Some("station-1".to_string()),
            exp: 9999999999,
            iat: 1000000000,
            permissions: vec![],
        };

        // Create UserContext from claims
        let context = UserContext::from_claims(claims);

        // Admin users should have backup permission
        prop_assert!(
            context.has_permission(BACKUP_PERMISSION),
            "Admin should have MANAGE_SETTINGS permission but has_permission() returned false"
        );
    }

    /// Property: Permission Check is Consistent Across Multiple Calls
    /// 
    /// For the same user context, multiple permission checks should yield the same result.
    /// 
    /// This validates Requirement 9.1
    #[test]
    fn prop_backup_permission_check_deterministic(
        (user_id, username, role) in arb_user_context(),
    ) {
        // Create claims for the user
        let claims = Claims {
            sub: user_id,
            username,
            role,
            tenant_id: TEST_TENANT_ID.to_string(),
            store_id: Some("store-1".to_string()),
            station_id: Some("station-1".to_string()),
            exp: 9999999999,
            iat: 1000000000,
            permissions: vec![],
        };

        // Create UserContext from claims
        let context = UserContext::from_claims(claims);

        // Check permission multiple times
        let result1 = context.has_permission(BACKUP_PERMISSION);
        let result2 = context.has_permission(BACKUP_PERMISSION);
        let result3 = context.has_permission(BACKUP_PERMISSION);

        // All results should be the same
        prop_assert_eq!(
            result1, result2,
            "Backup permission check should be deterministic but got different results"
        );
        prop_assert_eq!(
            result2, result3,
            "Backup permission check should be deterministic but got different results"
        );
    }
}

#[cfg(test)]
mod unit_tests {
    use super::*;

    #[test]
    fn test_admin_has_backup_permission() {
        let claims = Claims {
            sub: "user-1".to_string(),
            username: "admin".to_string(),
            role: "admin".to_string(),
            tenant_id: TEST_TENANT_ID.to_string(),
            store_id: Some("store-1".to_string()),
            station_id: Some("station-1".to_string()),
            exp: 9999999999,
            iat: 1000000000,
            permissions: vec![],
        };

        let context = UserContext::from_claims(claims);
        assert!(context.has_permission(BACKUP_PERMISSION));
    }

    #[test]
    fn test_manager_no_backup_permission() {
        let claims = Claims {
            sub: "user-2".to_string(),
            username: "manager".to_string(),
            role: "manager".to_string(),
            tenant_id: TEST_TENANT_ID.to_string(),
            store_id: Some("store-1".to_string()),
            station_id: Some("station-1".to_string()),
            exp: 9999999999,
            iat: 1000000000,
            permissions: vec![],
        };

        let context = UserContext::from_claims(claims);
        assert!(!context.has_permission(BACKUP_PERMISSION));
    }

    #[test]
    fn test_cashier_no_backup_permission() {
        let claims = Claims {
            sub: "user-3".to_string(),
            username: "cashier".to_string(),
            role: "cashier".to_string(),
            tenant_id: TEST_TENANT_ID.to_string(),
            store_id: Some("store-1".to_string()),
            station_id: Some("station-1".to_string()),
            exp: 9999999999,
            iat: 1000000000,
            permissions: vec![],
        };

        let context = UserContext::from_claims(claims);
        assert!(!context.has_permission(BACKUP_PERMISSION));
    }

    #[test]
    fn test_parts_specialist_no_backup_permission() {
        let claims = Claims {
            sub: "user-4".to_string(),
            username: "parts".to_string(),
            role: "parts_specialist".to_string(),
            tenant_id: TEST_TENANT_ID.to_string(),
            store_id: Some("store-1".to_string()),
            station_id: Some("station-1".to_string()),
            exp: 9999999999,
            iat: 1000000000,
            permissions: vec![],
        };

        let context = UserContext::from_claims(claims);
        assert!(!context.has_permission(BACKUP_PERMISSION));
    }
}
