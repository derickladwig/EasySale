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


