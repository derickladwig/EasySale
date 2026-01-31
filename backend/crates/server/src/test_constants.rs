//! Test constants for use across all test modules
//! These should NEVER contain business-specific values

/// Default tenant ID for tests and development - uses environment variable or generic default
/// This MUST match the tenant_id used in create_first_admin and seed data
pub const TEST_TENANT_ID: &str = "default";

/// Default store ID for tests
pub const TEST_STORE_ID: &str = "test-store-1";

/// Get tenant ID from environment or use test default
#[allow(dead_code)]
pub fn get_test_tenant_id() -> String {
    std::env::var("TEST_TENANT_ID").unwrap_or_else(|_| TEST_TENANT_ID.to_string())
}

/// Get store ID from environment or use test default
#[allow(dead_code)]
pub fn get_test_store_id() -> String {
    std::env::var("TEST_STORE_ID").unwrap_or_else(|_| TEST_STORE_ID.to_string())
}
