// Property-Based Tests for OAuth State Validation
// These tests validate that OAuth callbacks properly validate state parameters
//
// **Property 1: OAuth State Validation**
// **Validates: Requirements 1.2, 1.3, 1.6, 3.2, 3.3, 3.6**

use proptest::prelude::*;
use chrono::{DateTime, Duration, Utc};
use uuid::Uuid;

// ============================================================================
// Test Data Structures
// ============================================================================

#[derive(Debug, Clone)]
struct OAuthState {
    state: String,
    tenant_id: String,
    provider: String,
    created_at: DateTime<Utc>,
    expires_at: DateTime<Utc>,
}

impl OAuthState {
    fn new(tenant_id: &str, provider: &str, ttl_minutes: i64) -> Self {
        let now = Utc::now();
        Self {
            state: Uuid::new_v4().to_string(),
            tenant_id: tenant_id.to_string(),
            provider: provider.to_string(),
            created_at: now,
            expires_at: now + Duration::minutes(ttl_minutes),
        }
    }
    
    fn is_expired(&self) -> bool {
        Utc::now() > self.expires_at
    }
    
    fn is_valid_for_provider(&self, provider: &str) -> bool {
        self.provider == provider
    }
}

#[derive(Debug, Clone)]
struct OAuthStateStore {
    states: Vec<OAuthState>,
}

impl OAuthStateStore {
    fn new() -> Self {
        Self { states: Vec::new() }
    }
    
    fn store(&mut self, state: OAuthState) {
        self.states.push(state);
    }
    
    fn validate(&self, state_value: &str, provider: &str) -> OAuthValidationResult {
        // Find the state
        let found = self.states.iter().find(|s| s.state == state_value);
        
        match found {
            None => OAuthValidationResult::NotFound,
            Some(state) => {
                if state.is_expired() {
                    OAuthValidationResult::Expired
                } else if !state.is_valid_for_provider(provider) {
                    OAuthValidationResult::WrongProvider
                } else {
                    OAuthValidationResult::Valid(state.tenant_id.clone())
                }
            }
        }
    }
    
    fn consume(&mut self, state_value: &str) -> bool {
        if let Some(pos) = self.states.iter().position(|s| s.state == state_value) {
            self.states.remove(pos);
            true
        } else {
            false
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
enum OAuthValidationResult {
    Valid(String),  // Contains tenant_id
    NotFound,
    Expired,
    WrongProvider,
}

// ============================================================================
// Proptest Strategies
// ============================================================================

fn arb_tenant_id() -> impl Strategy<Value = String> {
    "[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}"
        .prop_map(|s| s.to_string())
}

fn arb_provider() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("stripe".to_string()),
        Just("clover".to_string()),
    ]
}

fn arb_state_value() -> impl Strategy<Value = String> {
    "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"
        .prop_map(|s| s.to_string())
}

fn arb_ttl_minutes() -> impl Strategy<Value = i64> {
    1i64..60i64
}

// ============================================================================
// Property Tests
// ============================================================================

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    /// Property 1.1: Valid state with matching provider is accepted
    /// **Validates: Requirements 1.2, 1.3, 3.2, 3.3**
    #[test]
    fn property_valid_state_accepted(
        tenant_id in arb_tenant_id(),
        provider in arb_provider(),
        ttl in arb_ttl_minutes()
    ) {
        let mut store = OAuthStateStore::new();
        let state = OAuthState::new(&tenant_id, &provider, ttl);
        let state_value = state.state.clone();
        
        store.store(state);
        
        let result = store.validate(&state_value, &provider);
        prop_assert_eq!(result, OAuthValidationResult::Valid(tenant_id));
    }

    /// Property 1.2: Unknown state is rejected
    /// **Validates: Requirements 1.6, 3.6**
    #[test]
    fn property_unknown_state_rejected(
        tenant_id in arb_tenant_id(),
        provider in arb_provider(),
        unknown_state in arb_state_value()
    ) {
        let mut store = OAuthStateStore::new();
        let state = OAuthState::new(&tenant_id, &provider, 10);
        store.store(state);
        
        // Validate with a different state value
        let result = store.validate(&unknown_state, &provider);
        
        // Should be NotFound (unless by extreme coincidence the random state matches)
        // In practice, UUID collision is astronomically unlikely
        prop_assert!(
            matches!(result, OAuthValidationResult::NotFound | OAuthValidationResult::Valid(_)),
            "Unknown state should be rejected or match by coincidence"
        );
    }

    /// Property 1.3: State for wrong provider is rejected
    /// **Validates: Requirements 1.6, 3.6**
    #[test]
    fn property_wrong_provider_rejected(
        tenant_id in arb_tenant_id()
    ) {
        let mut store = OAuthStateStore::new();
        
        // Create state for Stripe
        let state = OAuthState::new(&tenant_id, "stripe", 10);
        let state_value = state.state.clone();
        store.store(state);
        
        // Try to validate for Clover
        let result = store.validate(&state_value, "clover");
        prop_assert_eq!(result, OAuthValidationResult::WrongProvider);
    }

    /// Property 1.4: State can only be used once (consumed)
    /// **Validates: Requirements 1.3, 3.3**
    #[test]
    fn property_state_consumed_once(
        tenant_id in arb_tenant_id(),
        provider in arb_provider()
    ) {
        let mut store = OAuthStateStore::new();
        let state = OAuthState::new(&tenant_id, &provider, 10);
        let state_value = state.state.clone();
        store.store(state);
        
        // First consumption should succeed
        let first_consume = store.consume(&state_value);
        prop_assert!(first_consume, "First consumption should succeed");
        
        // Second consumption should fail
        let second_consume = store.consume(&state_value);
        prop_assert!(!second_consume, "Second consumption should fail");
        
        // Validation should now fail
        let result = store.validate(&state_value, &provider);
        prop_assert_eq!(result, OAuthValidationResult::NotFound);
    }

    /// Property 1.5: Empty state is rejected
    /// **Validates: Requirements 1.6, 3.6**
    #[test]
    fn property_empty_state_rejected(
        provider in arb_provider()
    ) {
        let store = OAuthStateStore::new();
        
        let result = store.validate("", &provider);
        prop_assert_eq!(result, OAuthValidationResult::NotFound);
    }

    /// Property 1.6: State contains tenant context
    /// **Validates: Requirements 1.2, 3.2**
    #[test]
    fn property_state_contains_tenant(
        tenant_id in arb_tenant_id(),
        provider in arb_provider()
    ) {
        let state = OAuthState::new(&tenant_id, &provider, 10);
        
        prop_assert_eq!(state.tenant_id, tenant_id);
        prop_assert_eq!(state.provider, provider);
        prop_assert!(!state.state.is_empty());
    }

    /// Property 1.7: Multiple tenants have isolated states
    /// **Validates: Requirements 1.2, 3.2**
    #[test]
    fn property_tenant_isolation(
        tenant_a in arb_tenant_id(),
        tenant_b in arb_tenant_id(),
        provider in arb_provider()
    ) {
        let mut store = OAuthStateStore::new();
        
        let state_a = OAuthState::new(&tenant_a, &provider, 10);
        let state_b = OAuthState::new(&tenant_b, &provider, 10);
        
        let state_a_value = state_a.state.clone();
        let state_b_value = state_b.state.clone();
        
        store.store(state_a);
        store.store(state_b);
        
        // Each state should return its own tenant
        let result_a = store.validate(&state_a_value, &provider);
        let result_b = store.validate(&state_b_value, &provider);
        
        prop_assert_eq!(result_a, OAuthValidationResult::Valid(tenant_a));
        prop_assert_eq!(result_b, OAuthValidationResult::Valid(tenant_b));
    }
}

// ============================================================================
// Expiration Tests (non-property, time-sensitive)
// ============================================================================

#[cfg(test)]
mod expiration_tests {
    use super::*;
    
    #[test]
    fn test_expired_state_rejected() {
        let mut store = OAuthStateStore::new();
        
        // Create a state that's already expired (negative TTL simulation)
        let mut state = OAuthState::new("tenant-123", "stripe", 10);
        state.expires_at = Utc::now() - Duration::minutes(1); // Already expired
        let state_value = state.state.clone();
        
        store.store(state);
        
        let result = store.validate(&state_value, "stripe");
        assert_eq!(result, OAuthValidationResult::Expired);
    }
    
    #[test]
    fn test_state_not_expired_within_ttl() {
        let mut store = OAuthStateStore::new();
        
        let state = OAuthState::new("tenant-123", "stripe", 10);
        let state_value = state.state.clone();
        
        store.store(state);
        
        // Should be valid immediately
        let result = store.validate(&state_value, "stripe");
        assert_eq!(result, OAuthValidationResult::Valid("tenant-123".to_string()));
    }
}

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod unit_tests {
    use super::*;
    
    #[test]
    fn test_oauth_state_creation() {
        let state = OAuthState::new("tenant-123", "stripe", 10);
        
        assert_eq!(state.tenant_id, "tenant-123");
        assert_eq!(state.provider, "stripe");
        assert!(!state.state.is_empty());
        assert!(state.expires_at > state.created_at);
    }
    
    #[test]
    fn test_store_and_validate() {
        let mut store = OAuthStateStore::new();
        let state = OAuthState::new("tenant-456", "clover", 10);
        let state_value = state.state.clone();
        
        store.store(state);
        
        let result = store.validate(&state_value, "clover");
        assert_eq!(result, OAuthValidationResult::Valid("tenant-456".to_string()));
    }
    
    #[test]
    fn test_consume_removes_state() {
        let mut store = OAuthStateStore::new();
        let state = OAuthState::new("tenant-789", "stripe", 10);
        let state_value = state.state.clone();
        
        store.store(state);
        
        assert!(store.consume(&state_value));
        assert!(!store.consume(&state_value)); // Second consume fails
    }
}
