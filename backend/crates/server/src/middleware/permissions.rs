use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpMessage,
};
use std::future::{ready, Ready};
use std::pin::Pin;
use std::rc::Rc;

use crate::models::UserContext;

/// Middleware to check if user has required permission
pub struct RequirePermission {
    permission: String,
}

impl RequirePermission {
    pub fn new(permission: impl Into<String>) -> Self {
        Self {
            permission: permission.into(),
        }
    }
}

impl<S, B> Transform<S, ServiceRequest> for RequirePermission
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = RequirePermissionMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(RequirePermissionMiddleware {
            service: Rc::new(service),
            permission: self.permission.clone(),
        }))
    }
}

pub struct RequirePermissionMiddleware<S> {
    service: Rc<S>,
    permission: String,
}

impl<S, B> Service<ServiceRequest> for RequirePermissionMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = Pin<Box<dyn std::future::Future<Output = Result<Self::Response, Self::Error>>>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let permission = self.permission.clone();
        let service = self.service.clone();

        Box::pin(async move {
            // Extract UserContext from request extensions
            let context = req.extensions().get::<UserContext>().cloned();

            match context {
                Some(ctx) => {
                    // Check if user has the required permission
                    if ctx.has_permission(&permission) {
                        tracing::debug!(
                            "Permission check passed: user '{}' has permission '{}'",
                            ctx.username,
                            permission
                        );
                        service.call(req).await
                    } else {
                        tracing::warn!(
                            "Permission denied: user '{}' (role: '{}') lacks permission '{}'",
                            ctx.username,
                            ctx.role,
                            permission
                        );
                        
                        // Log permission denial for audit
                        // TODO: Add to audit log service
                        
                        Err(actix_web::error::ErrorForbidden(format!(
                            "Permission denied: '{}' required",
                            permission
                        )))
                    }
                }
                None => {
                    tracing::warn!(
                        "Permission check failed: no user context found (permission: '{}')",
                        permission
                    );
                    Err(actix_web::error::ErrorUnauthorized(
                        "Authentication required",
                    ))
                }
            }
        })
    }
}

/// Helper function to create permission middleware
pub fn require_permission(permission: impl Into<String>) -> RequirePermission {
    RequirePermission::new(permission)
}

/// Convenience macro for wrapping routes with permission checks
/// Usage: protected_route!(handler_fn, "permission_name")
#[macro_export]
macro_rules! protected_route {
    ($handler:expr, $permission:expr) => {
        $handler.wrap($crate::middleware::permissions::require_permission($permission))
    };
}

// ============================================================================
// TIER-BASED PERMISSION HELPERS (Ported from POS)
// ============================================================================

/// Role tier levels (from POS project)
/// Higher tier = more permissions
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum RoleTier {
    Cashier = 1,
    SalesRep = 2,
    CounterManager = 3,
    ArApSpecialist = 4,
    InventoryManager = 5,
    StoreManager = 6,
    Admin = 7,
}

impl RoleTier {
    /// Get tier from role name
    pub fn from_role(role: &str) -> Self {
        match role.to_lowercase().as_str() {
            "admin" => RoleTier::Admin,
            "store_manager" | "manager" => RoleTier::StoreManager,
            "inventory_manager" => RoleTier::InventoryManager,
            "ar_ap_specialist" | "specialist" => RoleTier::ArApSpecialist,
            "counter_manager" => RoleTier::CounterManager,
            "sales_rep" | "sales" => RoleTier::SalesRep,
            _ => RoleTier::Cashier,
        }
    }

    /// Get tier number
    pub fn as_u8(&self) -> u8 {
        *self as u8
    }

    /// Get tier label
    pub fn label(&self) -> &'static str {
        match self {
            RoleTier::Cashier => "Cashier",
            RoleTier::SalesRep => "Sales Rep",
            RoleTier::CounterManager => "Counter Manager",
            RoleTier::ArApSpecialist => "AR/AP Specialist",
            RoleTier::InventoryManager => "Inventory Manager",
            RoleTier::StoreManager => "Store Manager",
            RoleTier::Admin => "Admin",
        }
    }
}

/// Middleware to check if user has minimum tier level
pub struct RequireTier {
    min_tier: RoleTier,
}

impl RequireTier {
    pub fn new(min_tier: RoleTier) -> Self {
        Self { min_tier }
    }
}

impl<S, B> Transform<S, ServiceRequest> for RequireTier
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = RequireTierMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(RequireTierMiddleware {
            service: Rc::new(service),
            min_tier: self.min_tier,
        }))
    }
}

pub struct RequireTierMiddleware<S> {
    service: Rc<S>,
    min_tier: RoleTier,
}

impl<S, B> Service<ServiceRequest> for RequireTierMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = Pin<Box<dyn std::future::Future<Output = Result<Self::Response, Self::Error>>>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let min_tier = self.min_tier;
        let service = self.service.clone();

        Box::pin(async move {
            let context = req.extensions().get::<UserContext>().cloned();

            match context {
                Some(ctx) => {
                    let user_tier = RoleTier::from_role(&ctx.role);
                    
                    if user_tier >= min_tier {
                        tracing::debug!(
                            "Tier check passed: user '{}' has tier {} (required: {})",
                            ctx.username,
                            user_tier.label(),
                            min_tier.label()
                        );
                        service.call(req).await
                    } else {
                        tracing::warn!(
                            "Tier denied: user '{}' has tier {} but {} required",
                            ctx.username,
                            user_tier.label(),
                            min_tier.label()
                        );
                        Err(actix_web::error::ErrorForbidden(format!(
                            "{} access or higher required",
                            min_tier.label()
                        )))
                    }
                }
                None => {
                    Err(actix_web::error::ErrorUnauthorized("Authentication required"))
                }
            }
        })
    }
}

/// Helper function to create tier middleware
pub fn require_tier(min_tier: RoleTier) -> RequireTier {
    RequireTier::new(min_tier)
}

/// Convenience functions for common tier requirements
pub fn require_cashier() -> RequireTier {
    require_tier(RoleTier::Cashier)
}

pub fn require_sales_rep() -> RequireTier {
    require_tier(RoleTier::SalesRep)
}

pub fn require_counter_manager() -> RequireTier {
    require_tier(RoleTier::CounterManager)
}

pub fn require_inventory_manager() -> RequireTier {
    require_tier(RoleTier::InventoryManager)
}

pub fn require_store_manager() -> RequireTier {
    require_tier(RoleTier::StoreManager)
}

pub fn require_admin() -> RequireTier {
    require_tier(RoleTier::Admin)
}

// ============================================================================
// MULTI-PERMISSION HELPERS
// ============================================================================

/// Middleware to check if user has ANY of the specified permissions
pub struct RequireAnyPermission {
    permissions: Vec<String>,
}

impl RequireAnyPermission {
    pub fn new(permissions: Vec<String>) -> Self {
        Self { permissions }
    }
}

impl<S, B> Transform<S, ServiceRequest> for RequireAnyPermission
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = RequireAnyPermissionMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(RequireAnyPermissionMiddleware {
            service: Rc::new(service),
            permissions: self.permissions.clone(),
        }))
    }
}

pub struct RequireAnyPermissionMiddleware<S> {
    service: Rc<S>,
    permissions: Vec<String>,
}

impl<S, B> Service<ServiceRequest> for RequireAnyPermissionMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = Pin<Box<dyn std::future::Future<Output = Result<Self::Response, Self::Error>>>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let permissions = self.permissions.clone();
        let service = self.service.clone();

        Box::pin(async move {
            let context = req.extensions().get::<UserContext>().cloned();

            match context {
                Some(ctx) => {
                    // Admin has all permissions
                    let user_tier = RoleTier::from_role(&ctx.role);
                    if user_tier >= RoleTier::Admin {
                        return service.call(req).await;
                    }

                    // Check if user has any of the required permissions
                    let has_any = permissions.iter().any(|p| ctx.has_permission(p));
                    
                    if has_any {
                        service.call(req).await
                    } else {
                        Err(actix_web::error::ErrorForbidden(format!(
                            "One of these permissions required: {}",
                            permissions.join(", ")
                        )))
                    }
                }
                None => {
                    Err(actix_web::error::ErrorUnauthorized("Authentication required"))
                }
            }
        })
    }
}

/// Helper function to create any-permission middleware
pub fn require_any_permission(permissions: &[&str]) -> RequireAnyPermission {
    RequireAnyPermission::new(permissions.iter().map(|s| s.to_string()).collect())
}

/// Middleware to check if user has ALL of the specified permissions
pub struct RequireAllPermissions {
    permissions: Vec<String>,
}

impl RequireAllPermissions {
    pub fn new(permissions: Vec<String>) -> Self {
        Self { permissions }
    }
}

impl<S, B> Transform<S, ServiceRequest> for RequireAllPermissions
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = RequireAllPermissionsMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(RequireAllPermissionsMiddleware {
            service: Rc::new(service),
            permissions: self.permissions.clone(),
        }))
    }
}

pub struct RequireAllPermissionsMiddleware<S> {
    service: Rc<S>,
    permissions: Vec<String>,
}

impl<S, B> Service<ServiceRequest> for RequireAllPermissionsMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = Pin<Box<dyn std::future::Future<Output = Result<Self::Response, Self::Error>>>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let permissions = self.permissions.clone();
        let service = self.service.clone();

        Box::pin(async move {
            let context = req.extensions().get::<UserContext>().cloned();

            match context {
                Some(ctx) => {
                    // Admin has all permissions
                    let user_tier = RoleTier::from_role(&ctx.role);
                    if user_tier >= RoleTier::Admin {
                        return service.call(req).await;
                    }

                    // Check if user has all required permissions
                    let missing: Vec<&String> = permissions
                        .iter()
                        .filter(|p| !ctx.has_permission(p))
                        .collect();
                    
                    if missing.is_empty() {
                        service.call(req).await
                    } else {
                        Err(actix_web::error::ErrorForbidden(format!(
                            "Missing required permissions: {}",
                            missing.iter().map(|s| s.as_str()).collect::<Vec<_>>().join(", ")
                        )))
                    }
                }
                None => {
                    Err(actix_web::error::ErrorUnauthorized("Authentication required"))
                }
            }
        })
    }
}

/// Helper function to create all-permissions middleware
pub fn require_all_permissions(permissions: &[&str]) -> RequireAllPermissions {
    RequireAllPermissions::new(permissions.iter().map(|s| s.to_string()).collect())
}

/// Middleware to check if user is assigned to a store
pub struct RequireStoreAssignment;

impl<S, B> Transform<S, ServiceRequest> for RequireStoreAssignment
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = RequireStoreAssignmentMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(RequireStoreAssignmentMiddleware {
            service: Rc::new(service),
        }))
    }
}

pub struct RequireStoreAssignmentMiddleware<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for RequireStoreAssignmentMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = Pin<Box<dyn std::future::Future<Output = Result<Self::Response, Self::Error>>>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = self.service.clone();

        Box::pin(async move {
            let context = req.extensions().get::<UserContext>().cloned();

            match context {
                Some(ctx) => {
                    if ctx.store_id.is_some() {
                        service.call(req).await
                    } else {
                        Err(actix_web::error::ErrorBadRequest(
                            "User must be assigned to a store to perform this action"
                        ))
                    }
                }
                None => {
                    Err(actix_web::error::ErrorUnauthorized("Authentication required"))
                }
            }
        })
    }
}

/// Helper function to create store assignment middleware
pub fn require_store_assignment() -> RequireStoreAssignment {
    RequireStoreAssignment
}

// Re-export for convenience

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, web, App, HttpResponse};
    use crate::auth::jwt::generate_token;
    use crate::config::Config;
    use crate::middleware::context::ContextExtractor;

    #[actix_web::test]
    async fn test_permission_check_with_valid_permission() {
        let config = Config {
            jwt_secret: "test-secret".to_string(),
            jwt_expiration_hours: 8,
            ..Default::default()
        };

        // Generate token for admin (has manage_users permission)
        let token = generate_token(
            "user-1",
            "admin",
            "admin",
            crate::test_constants::TEST_TENANT_ID,
            None,
            None,
            &config.jwt_secret,
            8,
        )
        .unwrap();

        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(config))
                .wrap(ContextExtractor)
                .route(
                    "/test",
                    web::get()
                        .to(|| async { HttpResponse::Ok().json(serde_json::json!({"success": true})) })
                        .wrap(require_permission("manage_users")),
                ),
        )
        .await;

        let req = test::TestRequest::get()
            .uri("/test")
            .insert_header(("Authorization", format!("Bearer {}", token)))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 200);
    }

    #[actix_web::test]
    async fn test_permission_check_without_permission() {
        let config = Config {
            jwt_secret: "test-secret".to_string(),
            jwt_expiration_hours: 8,
            ..Default::default()
        };

        // Generate token for cashier (does not have manage_users permission)
        let token = generate_token(
            "user-2",
            "cashier1",
            "cashier",
            crate::test_constants::TEST_TENANT_ID,
            Some("store-1".to_string()),
            Some("station-1".to_string()),
            &config.jwt_secret,
            8,
        )
        .unwrap();

        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(config))
                .wrap(ContextExtractor)
                .route(
                    "/test",
                    web::get()
                        .to(|| async { HttpResponse::Ok().finish() })
                        .wrap(require_permission("manage_users")),
                ),
        )
        .await;

        let req = test::TestRequest::get()
            .uri("/test")
            .insert_header(("Authorization", format!("Bearer {}", token)))
            .to_request();

        let resp = test::try_call_service(&app, req).await;
        assert!(resp.is_err()); // Should return error
    }

    #[actix_web::test]
    async fn test_permission_check_without_authentication() {
        let config = Config {
            jwt_secret: "test-secret".to_string(),
            jwt_expiration_hours: 8,
            ..Default::default()
        };

        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(config))
                .wrap(ContextExtractor)
                .route(
                    "/test",
                    web::get()
                        .to(|| async { HttpResponse::Ok().finish() })
                        .wrap(require_permission("manage_users")),
                ),
        )
        .await;

        let req = test::TestRequest::get().uri("/test").to_request();

        let resp = test::try_call_service(&app, req).await;
        assert!(resp.is_err()); // Should return error
    }

    #[actix_web::test]
    async fn test_permission_check_manager_has_access_sell() {
        let config = Config {
            jwt_secret: "test-secret".to_string(),
            jwt_expiration_hours: 8,
            ..Default::default()
        };

        // Generate token for manager (has access_sell permission)
        let token = generate_token(
            "user-3",
            "manager1",
            "manager",
            crate::test_constants::TEST_TENANT_ID,
            Some("store-1".to_string()),
            None,
            &config.jwt_secret,
            8,
        )
        .unwrap();

        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(config))
                .wrap(ContextExtractor)
                .route(
                    "/test",
                    web::get()
                        .to(|| async { HttpResponse::Ok().finish() })
                        .wrap(require_permission("access_sell")),
                ),
        )
        .await;

        let req = test::TestRequest::get()
            .uri("/test")
            .insert_header(("Authorization", format!("Bearer {}", token)))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 200);
    }

    #[actix_web::test]
    async fn test_permission_check_cashier_no_manage_settings() {
        let config = Config {
            jwt_secret: "test-secret".to_string(),
            jwt_expiration_hours: 8,
            ..Default::default()
        };

        // Generate token for cashier (does not have manage_settings permission)
        let token = generate_token(
            "user-4",
            "cashier2",
            "cashier",
            crate::test_constants::TEST_TENANT_ID,
            Some("store-1".to_string()),
            Some("station-1".to_string()),
            &config.jwt_secret,
            8,
        )
        .unwrap();

        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(config))
                .wrap(ContextExtractor)
                .route(
                    "/test",
                    web::get()
                        .to(|| async { HttpResponse::Ok().finish() })
                        .wrap(require_permission("manage_settings")),
                ),
        )
        .await;

        let req = test::TestRequest::get()
            .uri("/test")
            .insert_header(("Authorization", format!("Bearer {}", token)))
            .to_request();

        let resp = test::try_call_service(&app, req).await;
        assert!(resp.is_err()); // Should return error
    }
}


