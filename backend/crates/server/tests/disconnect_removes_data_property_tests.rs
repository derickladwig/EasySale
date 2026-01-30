// Property-Based Tests for Disconnect Removes Data
// These tests validate that disconnecting an integration removes all stored credentials
//
// **Property 4: Disconnect Removes Data**
// **Validates: Requirements 1.5, 2.5, 3.5, 6.3**

use proptest::prelude::*;
use uuid::Uuid;

// ============================================================================
// Test Data Structures
// ============================================================================

#[derive(Debug, Clone)]
struct MockCredentialStore {
    credentials: std::collections::HashMap<(String, String), String>, // (tenant_id, platform) -> encrypted_creds
}

impl MockCredentialStore {
    fn new() -> Self {
        Self {
            credentials: std::collections::HashMap::new(),
        }
    }
    
    fn store(&mut self, tenant_id: &str, platform: &str, encrypted_creds: &str) {
        self.credentials.insert(
            (tenant_id.to_string(), platform.to_string()),
            encrypted_creds.to_string(),
        );
    }
    
    fn get(&self, tenant_id: &str, platform: &str) -> Option<&String> {
        self.credentials.get(&(tenant_id.to_string(), platform.to_string()))
    }
    
    fn delete(&mut self, tenant_id: &str, platform: &str) -> bool {
        self.credentials.remove(&(tenant_id.to_string(), platform.to_string())).is_some()
    }
    
    fn has_credentials(&self, tenant_id: &str, platform: &str) -> bool {
        self.credentials.contains_key(&(tenant_id.to_string(), platform.to_string()))
    }
}

#[derive(Debug, Clone)]
struct MockConnectionStatus {
    statuses: std::collections::HashMap<(String, String), bool>, // (tenant_id, platform) -> is_connected
}

impl MockConnectionStatus {
    fn new() -> Self {
        Self {
            statuses: std::collections::HashMap::new(),
        }
    }
    
    fn set_connected(&mut self, tenant_id: &str, platform: &str) {
        self.statuses.insert(
            (tenant_id.to_string(), platform.to_string()),
            true,
        );
    }
    
    fn set_disconnected(&mut self, tenant_id: &str, platform: &str) {
        self.statuses.insert(
            (tenant_id.to_string(), platform.to_string()),
            false,
        );
    }
    
    fn is_connected(&self, tenant_id: &str, platform: &str) -> bool {
        *self.statuses.get(&(tenant_id.to_string(), platform.to_string())).unwrap_or(&false)
    }
}

/// Simulates the disconnect operation
fn disconnect_integration(
    cred_store: &mut MockCredentialStore,
    status_store: &mut MockConnectionStatus,
    tenant_id: &str,
    platform: &str,
) -> bool {
    // Delete credentials
    let deleted = cred_store.delete(tenant_id, platform);
    
    // Update status to disconnected
    status_store.set_disconnected(tenant_id, platform);
    
    deleted
}

// ============================================================================
// Proptest Strategies
// ============================================================================

fn arb_tenant_id() -> impl Strategy<Value = String> {
    "[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}"
        .prop_map(|s| s.to_string())
}

fn arb_platform() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("stripe".to_string()),
        Just("square".to_string()),
        Just("clover".to_string()),
        Just("woocommerce".to_string()),
        Just("quickbooks".to_string()),
        Just("supabase".to_string()),
    ]
}

fn arb_encrypted_creds() -> impl Strategy<Value = String> {
    "[a-zA-Z0-9+/]{32,64}={0,2}".prop_map(|s| s.to_string())
}

// ============================================================================
// Property Tests
// ============================================================================

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    /// Property 4.1: After disconnect, credentials are not retrievable
    /// **Validates: Requirements 1.5, 2.5, 3.5, 6.3**
    #[test]
    fn property_disconnect_removes_credentials(
        tenant_id in arb_tenant_id(),
        platform in arb_platform(),
        encrypted_creds in arb_encrypted_creds()
    ) {
        let mut cred_store = MockCredentialStore::new();
        let mut status_store = MockConnectionStatus::new();
        
        // Store credentials and mark as connected
        cred_store.store(&tenant_id, &platform, &encrypted_creds);
        status_store.set_connected(&tenant_id, &platform);
        
        // Verify credentials exist before disconnect
        prop_assert!(cred_store.has_credentials(&tenant_id, &platform));
        prop_assert!(status_store.is_connected(&tenant_id, &platform));
        
        // Disconnect
        let result = disconnect_integration(&mut cred_store, &mut status_store, &tenant_id, &platform);
        
        // Verify credentials are removed
        prop_assert!(result, "Disconnect should return true when credentials existed");
        prop_assert!(!cred_store.has_credentials(&tenant_id, &platform), "Credentials should be removed after disconnect");
        prop_assert!(cred_store.get(&tenant_id, &platform).is_none(), "Get should return None after disconnect");
    }

    /// Property 4.2: After disconnect, status is "disconnected"
    /// **Validates: Requirements 1.5, 2.5, 3.5**
    #[test]
    fn property_disconnect_updates_status(
        tenant_id in arb_tenant_id(),
        platform in arb_platform(),
        encrypted_creds in arb_encrypted_creds()
    ) {
        let mut cred_store = MockCredentialStore::new();
        let mut status_store = MockConnectionStatus::new();
        
        // Store credentials and mark as connected
        cred_store.store(&tenant_id, &platform, &encrypted_creds);
        status_store.set_connected(&tenant_id, &platform);
        
        // Disconnect
        disconnect_integration(&mut cred_store, &mut status_store, &tenant_id, &platform);
        
        // Verify status is disconnected
        prop_assert!(!status_store.is_connected(&tenant_id, &platform), "Status should be disconnected after disconnect");
    }

    /// Property 4.3: Disconnect is idempotent (calling twice doesn't error)
    /// **Validates: Requirements 6.3**
    #[test]
    fn property_disconnect_idempotent(
        tenant_id in arb_tenant_id(),
        platform in arb_platform(),
        encrypted_creds in arb_encrypted_creds()
    ) {
        let mut cred_store = MockCredentialStore::new();
        let mut status_store = MockConnectionStatus::new();
        
        // Store credentials
        cred_store.store(&tenant_id, &platform, &encrypted_creds);
        status_store.set_connected(&tenant_id, &platform);
        
        // First disconnect
        let first_result = disconnect_integration(&mut cred_store, &mut status_store, &tenant_id, &platform);
        prop_assert!(first_result, "First disconnect should succeed");
        
        // Second disconnect (should not error, just return false)
        let second_result = disconnect_integration(&mut cred_store, &mut status_store, &tenant_id, &platform);
        prop_assert!(!second_result, "Second disconnect should return false (nothing to delete)");
        
        // Status should still be disconnected
        prop_assert!(!status_store.is_connected(&tenant_id, &platform));
    }

    /// Property 4.4: Disconnect only affects the specified tenant
    /// **Validates: Requirements 6.3**
    #[test]
    fn property_disconnect_tenant_isolation(
        tenant_a in arb_tenant_id(),
        tenant_b in arb_tenant_id(),
        platform in arb_platform(),
        creds_a in arb_encrypted_creds(),
        creds_b in arb_encrypted_creds()
    ) {
        // Skip if tenants are the same (unlikely but possible)
        prop_assume!(tenant_a != tenant_b);
        
        let mut cred_store = MockCredentialStore::new();
        let mut status_store = MockConnectionStatus::new();
        
        // Store credentials for both tenants
        cred_store.store(&tenant_a, &platform, &creds_a);
        cred_store.store(&tenant_b, &platform, &creds_b);
        status_store.set_connected(&tenant_a, &platform);
        status_store.set_connected(&tenant_b, &platform);
        
        // Disconnect tenant A
        disconnect_integration(&mut cred_store, &mut status_store, &tenant_a, &platform);
        
        // Tenant A should be disconnected
        prop_assert!(!cred_store.has_credentials(&tenant_a, &platform));
        prop_assert!(!status_store.is_connected(&tenant_a, &platform));
        
        // Tenant B should still be connected
        prop_assert!(cred_store.has_credentials(&tenant_b, &platform));
        prop_assert!(status_store.is_connected(&tenant_b, &platform));
    }

    /// Property 4.5: Disconnect only affects the specified platform
    /// **Validates: Requirements 6.3**
    #[test]
    fn property_disconnect_platform_isolation(
        tenant_id in arb_tenant_id(),
        creds_stripe in arb_encrypted_creds(),
        creds_square in arb_encrypted_creds()
    ) {
        let mut cred_store = MockCredentialStore::new();
        let mut status_store = MockConnectionStatus::new();
        
        // Store credentials for multiple platforms
        cred_store.store(&tenant_id, "stripe", &creds_stripe);
        cred_store.store(&tenant_id, "square", &creds_square);
        status_store.set_connected(&tenant_id, "stripe");
        status_store.set_connected(&tenant_id, "square");
        
        // Disconnect Stripe only
        disconnect_integration(&mut cred_store, &mut status_store, &tenant_id, "stripe");
        
        // Stripe should be disconnected
        prop_assert!(!cred_store.has_credentials(&tenant_id, "stripe"));
        prop_assert!(!status_store.is_connected(&tenant_id, "stripe"));
        
        // Square should still be connected
        prop_assert!(cred_store.has_credentials(&tenant_id, "square"));
        prop_assert!(status_store.is_connected(&tenant_id, "square"));
    }
}

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod unit_tests {
    use super::*;
    
    #[test]
    fn test_store_and_retrieve() {
        let mut store = MockCredentialStore::new();
        store.store("tenant-123", "stripe", "encrypted_data");
        
        assert!(store.has_credentials("tenant-123", "stripe"));
        assert_eq!(store.get("tenant-123", "stripe"), Some(&"encrypted_data".to_string()));
    }
    
    #[test]
    fn test_delete_removes_credentials() {
        let mut store = MockCredentialStore::new();
        store.store("tenant-123", "stripe", "encrypted_data");
        
        let deleted = store.delete("tenant-123", "stripe");
        
        assert!(deleted);
        assert!(!store.has_credentials("tenant-123", "stripe"));
        assert!(store.get("tenant-123", "stripe").is_none());
    }
    
    #[test]
    fn test_delete_nonexistent_returns_false() {
        let mut store = MockCredentialStore::new();
        
        let deleted = store.delete("tenant-123", "stripe");
        
        assert!(!deleted);
    }
    
    #[test]
    fn test_status_transitions() {
        let mut status = MockConnectionStatus::new();
        
        // Initially not connected
        assert!(!status.is_connected("tenant-123", "stripe"));
        
        // Set connected
        status.set_connected("tenant-123", "stripe");
        assert!(status.is_connected("tenant-123", "stripe"));
        
        // Set disconnected
        status.set_disconnected("tenant-123", "stripe");
        assert!(!status.is_connected("tenant-123", "stripe"));
    }
}
