use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpMessage,
};
use futures_util::future::LocalBoxFuture;
use std::future::{ready, Ready};

/// Middleware to validate store assignment for POS operations
pub struct PosValidation;

impl<S, B> Transform<S, ServiceRequest> for PosValidation
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + Clone + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = PosValidationMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(PosValidationMiddleware { service }))
    }
}

pub struct PosValidationMiddleware<S> {
    service: S,
}

impl<S, B> Service<ServiceRequest> for PosValidationMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static + Clone,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = self.service.clone();

        Box::pin(async move {
            // Extract user context from request extensions
            let context = req.extensions().get::<crate::models::UserContext>().cloned();
            
            // Check if user context exists
            if let Some(user_context) = context {
                // Validate store assignment for POS operations
                if user_context.requires_store() && user_context.store_id.is_none() {
                    return Err(actix_web::error::ErrorForbidden(serde_json::json!({
                        "error": "Store assignment required for POS operations",
                        "code": "STORE_REQUIRED",
                        "message": "Your user account must be assigned to a store to perform POS operations. Please contact your administrator."
                    }).to_string()));
                }

                // Validate station assignment if required
                if user_context.requires_station() && user_context.station_id.is_none() {
                    return Err(actix_web::error::ErrorForbidden(serde_json::json!({
                        "error": "Station assignment required for POS operations",
                        "code": "STATION_REQUIRED",
                        "message": "Your user account requires a specific station assignment. Please contact your administrator."
                    }).to_string()));
                }
            }

            service.call(req).await
        })
    }
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::UserContext;

    #[test]
    fn test_requires_store() {
        let context = UserContext {
            user_id: "1".to_string(),
            username: "cashier1".to_string(),
            role: "cashier".to_string(),
            tenant_id: "test-tenant".to_string(),
            store_id: None,
            station_id: None,
            permissions: vec![],
        };
        assert!(context.requires_store());

        let context = UserContext {
            user_id: "1".to_string(),
            username: "admin".to_string(),
            role: "admin".to_string(),
            tenant_id: "test-tenant".to_string(),
            store_id: None,
            station_id: None,
            permissions: vec![],
        };
        assert!(!context.requires_store());
    }

    #[test]
    fn test_requires_station() {
        let context = UserContext {
            user_id: "1".to_string(),
            username: "cashier1".to_string(),
            role: "cashier".to_string(),
            tenant_id: "test-tenant".to_string(),
            store_id: Some("1".to_string()),
            station_id: None,
            permissions: vec![],
        };
        assert!(context.requires_station());

        let context = UserContext {
            user_id: "1".to_string(),
            username: "manager1".to_string(),
            role: "manager".to_string(),
            tenant_id: "test-tenant".to_string(),
            store_id: Some("1".to_string()),
            station_id: None,
            permissions: vec![],
        };
        assert!(!context.requires_station());
    }

    #[test]
    fn test_validate_pos_access() {
        // Valid: cashier with store
        let context = UserContext {
            user_id: "1".to_string(),
            username: "cashier1".to_string(),
            role: "cashier".to_string(),
            tenant_id: "test-tenant".to_string(),
            store_id: Some("1".to_string()),
            station_id: None,
            permissions: vec![],
        };
        assert!(context.validate().is_ok());

        // Invalid: cashier without store
        let context = UserContext {
            user_id: "1".to_string(),
            username: "cashier1".to_string(),
            role: "cashier".to_string(),
            tenant_id: "test-tenant".to_string(),
            store_id: None,
            station_id: None,
            permissions: vec![],
        };
        assert!(context.validate().is_err());

        // Valid: admin without store (not required)
        let context = UserContext {
            user_id: "1".to_string(),
            username: "admin".to_string(),
            role: "admin".to_string(),
            tenant_id: "test-tenant".to_string(),
            store_id: None,
            station_id: None,
            permissions: vec![],
        };
        assert!(context.validate().is_ok());
    }
}
