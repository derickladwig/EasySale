use actix_web::HttpRequest;

/// Get the tenant ID for the current request
/// 
/// PRODUCTION: Requires TENANT_ID environment variable to be set.
/// TESTS: Falls back to TEST_TENANT_ID if not set (for test convenience).
/// 
/// In a true multi-tenant deployment, this would:
/// - Extract from subdomain (tenant1.example.com)
/// - Extract from HTTP header (X-Tenant-ID)
/// - Extract from path prefix (/tenant1/api/...)
/// - Look up from authenticated user's tenant association
///
/// This is a temporary implementation for Phase 4 of the multi-tenant migration.
/// The full tenant identification strategy will be implemented in a future phase.
pub fn get_tenant_id(_req: &HttpRequest) -> String {
    std::env::var("TENANT_ID")
        .unwrap_or_else(|_| {
            #[cfg(test)]
            {
                crate::test_constants::TEST_TENANT_ID.to_string()
            }
            #[cfg(not(test))]
            {
                panic!("TENANT_ID environment variable must be set in production")
            }
        })
}

/// Get the tenant ID for use in database queries
/// 
/// PRODUCTION: Requires TENANT_ID environment variable to be set.
/// TESTS: Falls back to TEST_TENANT_ID if not set (for test convenience).
pub fn get_current_tenant_id() -> String {
    std::env::var("TENANT_ID")
        .unwrap_or_else(|_| {
            #[cfg(test)]
            {
                crate::test_constants::TEST_TENANT_ID.to_string()
            }
            #[cfg(not(test))]
            {
                panic!("TENANT_ID environment variable must be set in production")
            }
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::test;

    #[actix_web::test]
    async fn test_get_tenant_id_default() {
        // Clear environment variable
        std::env::remove_var("TENANT_ID");
        
        let req = test::TestRequest::default().to_http_request();
        let tenant_id = get_tenant_id(&req);
        
        assert_eq!(tenant_id, crate::test_constants::TEST_TENANT_ID);
    }

    #[actix_web::test]
    async fn test_get_tenant_id_from_env() {
        std::env::set_var("TENANT_ID", "test-tenant");
        
        let req = test::TestRequest::default().to_http_request();
        let tenant_id = get_tenant_id(&req);
        
        assert_eq!(tenant_id, "test-tenant");
        
        // Clean up
        std::env::remove_var("TENANT_ID");
    }

    #[actix_web::test]
    async fn test_get_current_tenant_id_default() {
        // Ensure environment variable is cleared
        std::env::remove_var("TENANT_ID");
        
        let tenant_id = get_current_tenant_id();
        
        assert_eq!(tenant_id, crate::test_constants::TEST_TENANT_ID);
    }

    #[actix_web::test]
    async fn test_get_current_tenant_id_from_env() {
        std::env::set_var("TENANT_ID", "test-tenant");
        
        let tenant_id = get_current_tenant_id();
        
        assert_eq!(tenant_id, "test-tenant");
        
        // Clean up
        std::env::remove_var("TENANT_ID");
    }
}


