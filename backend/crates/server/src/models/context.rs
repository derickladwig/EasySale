use serde::{Deserialize, Serialize};
use crate::auth::jwt::Claims;
use crate::models::user::{get_permissions_for_role, role_requires_store, role_requires_station};

/// User context extracted from JWT token
/// Contains all information needed for permission checks and audit logging
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserContext {
    pub user_id: String,
    pub username: String,
    pub role: String,
    pub tenant_id: String,
    pub store_id: Option<String>,
    pub station_id: Option<String>,
    pub permissions: Vec<String>,
}

impl UserContext {
    /// Create UserContext from JWT claims
    pub fn from_claims(claims: Claims) -> Self {
        let permissions = get_permissions_for_role(&claims.role);
        
        Self {
            user_id: claims.sub,
            username: claims.username,
            role: claims.role,
            tenant_id: claims.tenant_id,
            store_id: claims.store_id,
            station_id: claims.station_id,
            permissions,
        }
    }
    
    /// Check if user's role requires store assignment
    pub fn requires_store(&self) -> bool {
        role_requires_store(&self.role)
    }
    
    /// Check if user's role requires station assignment
    pub fn requires_station(&self) -> bool {
        role_requires_station(&self.role)
    }
    
    /// Check if user has a specific permission
    pub fn has_permission(&self, permission: &str) -> bool {
        self.permissions.iter().any(|p| p == permission)
    }
    
    /// Validate that user has required context for their role
    pub fn validate(&self) -> Result<(), String> {
        if self.requires_store() && self.store_id.is_none() {
            return Err(format!(
                "User '{}' with role '{}' requires store assignment",
                self.username, self.role
            ));
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn create_test_claims(
        user_id: &str,
        username: &str,
        role: &str,
        tenant_id: &str,
        store_id: Option<String>,
        station_id: Option<String>,
    ) -> Claims {
        Claims {
            sub: user_id.to_string(),
            username: username.to_string(),
            role: role.to_string(),
            tenant_id: tenant_id.to_string(),
            store_id,
            station_id,
            exp: 9999999999, // Far future
            iat: 1000000000,
            permissions: vec![],
        }
    }
    
    #[test]
    fn test_from_claims_admin() {
        let claims = create_test_claims("user-1", "admin", "admin", crate::test_constants::TEST_TENANT_ID, None, None);
        let context = UserContext::from_claims(claims);
        
        assert_eq!(context.user_id, "user-1");
        assert_eq!(context.username, "admin");
        assert_eq!(context.role, "admin");
        assert_eq!(context.tenant_id, crate::test_constants::TEST_TENANT_ID);
        assert_eq!(context.store_id, None);
        assert_eq!(context.station_id, None);
        assert!(context.permissions.contains(&"manage_users".to_string()));
    }
    
    #[test]
    fn test_from_claims_cashier_with_context() {
        let claims = create_test_claims(
            "user-2",
            "cashier1",
            "cashier",
            crate::test_constants::TEST_TENANT_ID,
            Some("store-1".to_string()),
            Some("station-1".to_string()),
        );
        let context = UserContext::from_claims(claims);
        
        assert_eq!(context.user_id, "user-2");
        assert_eq!(context.username, "cashier1");
        assert_eq!(context.role, "cashier");
        assert_eq!(context.tenant_id, crate::test_constants::TEST_TENANT_ID);
        assert_eq!(context.store_id, Some("store-1".to_string()));
        assert_eq!(context.station_id, Some("station-1".to_string()));
        assert!(context.permissions.contains(&"access_sell".to_string()));
    }
    
    #[test]
    fn test_requires_store() {
        let admin_claims = create_test_claims("user-1", "admin", "admin", crate::test_constants::TEST_TENANT_ID, None, None);
        let admin_context = UserContext::from_claims(admin_claims);
        assert!(!admin_context.requires_store());
        
        let cashier_claims = create_test_claims(
            "user-2",
            "cashier1",
            "cashier",
            crate::test_constants::TEST_TENANT_ID,
            Some("store-1".to_string()),
            None,
        );
        let cashier_context = UserContext::from_claims(cashier_claims);
        assert!(cashier_context.requires_store());
    }
    
    #[test]
    fn test_requires_station() {
        let manager_claims = create_test_claims(
            "user-1",
            "manager1",
            "manager",
            crate::test_constants::TEST_TENANT_ID,
            Some("store-1".to_string()),
            None,
        );
        let manager_context = UserContext::from_claims(manager_claims);
        assert!(!manager_context.requires_station());
        
        let cashier_claims = create_test_claims(
            "user-2",
            "cashier1",
            "cashier",
            crate::test_constants::TEST_TENANT_ID,
            Some("store-1".to_string()),
            Some("station-1".to_string()),
        );
        let cashier_context = UserContext::from_claims(cashier_claims);
        assert!(cashier_context.requires_station());
    }
    
    #[test]
    fn test_has_permission() {
        let claims = create_test_claims("user-1", "admin", "admin", crate::test_constants::TEST_TENANT_ID, None, None);
        let context = UserContext::from_claims(claims);
        
        assert!(context.has_permission("manage_users"));
        assert!(context.has_permission("manage_settings"));
        assert!(!context.has_permission("nonexistent_permission"));
    }
    
    #[test]
    fn test_validate_admin_without_store() {
        let claims = create_test_claims("user-1", "admin", "admin", crate::test_constants::TEST_TENANT_ID, None, None);
        let context = UserContext::from_claims(claims);
        
        assert!(context.validate().is_ok());
    }
    
    #[test]
    fn test_validate_cashier_without_store() {
        let claims = create_test_claims("user-2", "cashier1", "cashier", crate::test_constants::TEST_TENANT_ID, None, None);
        let context = UserContext::from_claims(claims);
        
        let result = context.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("requires store assignment"));
    }
    
    #[test]
    fn test_validate_cashier_with_store() {
        let claims = create_test_claims(
            "user-2",
            "cashier1",
            "cashier",
            crate::test_constants::TEST_TENANT_ID,
            Some("store-1".to_string()),
            Some("station-1".to_string()),
        );
        let context = UserContext::from_claims(claims);
        
        assert!(context.validate().is_ok());
    }
}


