/// Profile-based endpoint gating middleware
/// 
/// This middleware restricts access to development and setup endpoints based on the runtime profile.
/// In production mode, setup and debug endpoints are blocked unless specific conditions are met.

use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error,
};
use std::future::{ready, Ready};
use std::pin::Pin;
use std::rc::Rc;

/// Middleware factory for profile-based endpoint gating
pub struct ProfileGate {
    /// Endpoints that should be blocked in production
    blocked_patterns: Vec<String>,
}

impl ProfileGate {
    /// Create a new ProfileGate middleware
    pub fn new() -> Self {
        Self {
            blocked_patterns: vec![
                "/api/setup/".to_string(),
                "/api/debug/".to_string(),
                "/api/dev/".to_string(),
            ],
        }
    }
}

impl Default for ProfileGate {
    fn default() -> Self {
        Self::new()
    }
}

impl<S, B> Transform<S, ServiceRequest> for ProfileGate
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = ProfileGateMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(ProfileGateMiddleware {
            service: Rc::new(service),
            blocked_patterns: self.blocked_patterns.clone(),
        }))
    }
}

pub struct ProfileGateMiddleware<S> {
    service: Rc<S>,
    blocked_patterns: Vec<String>,
}

impl<S, B> Service<ServiceRequest> for ProfileGateMiddleware<S>
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
        let path = req.path().to_string();
        let service = self.service.clone();
        
        // Check if this is a blocked endpoint
        let is_blocked = self.blocked_patterns.iter().any(|pattern| path.starts_with(pattern));
        
        Box::pin(async move {
            if !is_blocked {
                // Not a blocked endpoint, proceed normally
                return service.call(req).await;
            }

            // This is a blocked endpoint - check runtime profile
            let profile = req.app_data::<actix_web::web::Data<crate::config::RuntimeProfile>>();
            
            match profile {
                Some(profile_data) => {
                    match profile_data.as_ref() {
                        crate::config::RuntimeProfile::Prod => {
                            // In production, block setup/debug endpoints
                            // Exception: fresh-install endpoints are allowed if database is empty
                            if path.starts_with("/api/fresh-install/") {
                                // Allow fresh install endpoints - they have their own checks
                                return service.call(req).await;
                            }
                            
                            // Block all other setup/debug endpoints in production
                            tracing::warn!(
                                "Blocked access to {} in production mode",
                                path
                            );
                            
                            Err(actix_web::error::ErrorForbidden(
                                "Endpoint not available in production mode"
                            ))
                        }
                        crate::config::RuntimeProfile::Dev | crate::config::RuntimeProfile::Demo => {
                            // In dev/demo mode, allow all endpoints
                            service.call(req).await
                        }
                    }
                }
                None => {
                    // No profile data available - default to blocking for safety
                    tracing::error!("Runtime profile not configured - blocking access to {}", path);
                    Err(actix_web::error::ErrorInternalServerError(
                        "Runtime profile not configured"
                    ))
                }
            }
        })
    }
}
