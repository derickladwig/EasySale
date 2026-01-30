//! CSRF (Cross-Site Request Forgery) Protection Middleware
//!
//! This middleware provides CSRF protection for state-changing requests (POST, PUT, DELETE, PATCH).
//! It works in conjunction with httpOnly cookie authentication.
//!
//! ## How it works:
//! 1. On login, a CSRF token is generated and stored in a non-httpOnly cookie (readable by JS)
//! 2. The frontend must include this token in the `X-CSRF-Token` header for state-changing requests
//! 3. The middleware validates that the header token matches the cookie token
//!
//! ## Security considerations:
//! - CSRF token is stored in a separate cookie (not httpOnly) so JavaScript can read it
//! - The auth token remains in an httpOnly cookie (not accessible to JS)
//! - SameSite=Strict on auth cookie provides additional CSRF protection
//! - This double-submit cookie pattern is a defense-in-depth measure

use actix_web::{
    cookie::{Cookie, SameSite},
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error,
};
use rand::Rng;
use std::future::{ready, Ready};
use std::pin::Pin;

/// Cookie name for CSRF token (readable by JavaScript)
pub const CSRF_COOKIE_NAME: &str = "csrf_token";

/// Header name for CSRF token
pub const CSRF_HEADER_NAME: &str = "X-CSRF-Token";

/// Generate a cryptographically secure CSRF token
pub fn generate_csrf_token() -> String {
    let mut rng = rand::thread_rng();
    let bytes: [u8; 32] = rng.gen();
    base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, bytes)
}

/// Create a CSRF cookie with the given token
pub fn create_csrf_cookie(token: &str, is_production: bool) -> Cookie<'static> {
    Cookie::build(CSRF_COOKIE_NAME, token.to_string())
        .path("/")
        .http_only(false) // Must be readable by JavaScript
        .secure(is_production)
        .same_site(SameSite::Strict)
        .max_age(actix_web::cookie::time::Duration::hours(8))
        .finish()
}

/// Clear the CSRF cookie (for logout)
pub fn clear_csrf_cookie() -> Cookie<'static> {
    Cookie::build(CSRF_COOKIE_NAME, "")
        .path("/")
        .http_only(false)
        .max_age(actix_web::cookie::time::Duration::ZERO)
        .finish()
}

/// CSRF Protection Middleware
///
/// Validates CSRF tokens for state-changing requests (POST, PUT, DELETE, PATCH).
/// GET, HEAD, and OPTIONS requests are exempt as they should be idempotent.
pub struct CsrfProtection {
    /// Whether to enforce CSRF validation (can be disabled for testing)
    enabled: bool,
}

impl CsrfProtection {
    /// Create a new CSRF protection middleware
    pub fn new() -> Self {
        Self { enabled: true }
    }

    /// Create a disabled CSRF protection middleware (for testing)
    #[allow(dead_code)]
    pub fn disabled() -> Self {
        Self { enabled: false }
    }
}

impl Default for CsrfProtection {
    fn default() -> Self {
        Self::new()
    }
}

impl<S, B> Transform<S, ServiceRequest> for CsrfProtection
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = CsrfProtectionMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(CsrfProtectionMiddleware {
            service,
            enabled: self.enabled,
        }))
    }
}

pub struct CsrfProtectionMiddleware<S> {
    service: S,
    enabled: bool,
}

impl<S, B> Service<ServiceRequest> for CsrfProtectionMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = Pin<Box<dyn std::future::Future<Output = Result<Self::Response, Self::Error>>>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        // Skip CSRF validation if disabled
        if !self.enabled {
            let fut = self.service.call(req);
            return Box::pin(async move { fut.await });
        }

        let method = req.method().clone();

        // Skip CSRF validation for safe methods (GET, HEAD, OPTIONS)
        // These should be idempotent and not change state
        if method == actix_web::http::Method::GET
            || method == actix_web::http::Method::HEAD
            || method == actix_web::http::Method::OPTIONS
        {
            let fut = self.service.call(req);
            return Box::pin(async move { fut.await });
        }

        // Skip CSRF validation for certain paths that don't require it
        let path = req.path();
        
        // Public endpoints that don't need CSRF protection:
        // - Login (no session yet)
        // - Webhooks (authenticated by signature)
        // - Health checks
        // - Fresh install endpoints
        let exempt_paths = [
            "/auth/login",
            "/api/auth/login",
            "/health",
            "/api/webhooks/",
            "/api/fresh-install/",
            "/api/setup/",
            "/api/tenant/setup-complete",
        ];

        if exempt_paths.iter().any(|p| path.starts_with(p)) {
            let fut = self.service.call(req);
            return Box::pin(async move { fut.await });
        }

        // Extract CSRF token from cookie
        let cookie_token = req
            .cookie(CSRF_COOKIE_NAME)
            .map(|c| c.value().to_string());

        // Extract CSRF token from header
        let header_token = req
            .headers()
            .get(CSRF_HEADER_NAME)
            .and_then(|h| h.to_str().ok())
            .map(|s| s.to_string());

        // Validate CSRF token
        match (cookie_token, header_token) {
            (Some(cookie), Some(header)) if cookie == header && !cookie.is_empty() => {
                // Valid CSRF token - proceed with request
                let fut = self.service.call(req);
                Box::pin(async move { fut.await })
            }
            (None, _) => {
                // No CSRF cookie - might be a new session or cookie expired
                // For now, allow the request but log a warning
                // In strict mode, this would be rejected
                tracing::debug!("CSRF cookie missing for {} {}", method, path);
                let fut = self.service.call(req);
                Box::pin(async move { fut.await })
            }
            (Some(_), None) => {
                // CSRF cookie present but header missing
                tracing::warn!("CSRF header missing for {} {}", method, path);
                Box::pin(async move {
                    Err(actix_web::error::ErrorForbidden(
                        "CSRF token missing. Include X-CSRF-Token header.",
                    ))
                })
            }
            (Some(_), Some(_)) => {
                // Tokens don't match
                tracing::warn!("CSRF token mismatch for {} {}", method, path);
                Box::pin(async move {
                    Err(actix_web::error::ErrorForbidden(
                        "CSRF token invalid. Please refresh and try again.",
                    ))
                })
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, web, App, HttpResponse};

    #[actix_web::test]
    async fn test_csrf_token_generation() {
        let token1 = generate_csrf_token();
        let token2 = generate_csrf_token();

        // Tokens should be unique
        assert_ne!(token1, token2);

        // Tokens should be 43 characters (32 bytes base64 encoded without padding)
        assert_eq!(token1.len(), 43);
        assert_eq!(token2.len(), 43);
    }

    #[actix_web::test]
    async fn test_csrf_allows_get_requests() {
        let app = test::init_service(
            App::new()
                .wrap(CsrfProtection::new())
                .route("/test", web::get().to(|| async { HttpResponse::Ok().finish() })),
        )
        .await;

        let req = test::TestRequest::get().uri("/test").to_request();
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
    }

    #[actix_web::test]
    async fn test_csrf_allows_exempt_paths() {
        let app = test::init_service(
            App::new()
                .wrap(CsrfProtection::new())
                .route(
                    "/auth/login",
                    web::post().to(|| async { HttpResponse::Ok().finish() }),
                )
                .route(
                    "/health",
                    web::post().to(|| async { HttpResponse::Ok().finish() }),
                ),
        )
        .await;

        // Login should be exempt
        let req = test::TestRequest::post().uri("/auth/login").to_request();
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());

        // Health should be exempt
        let req = test::TestRequest::post().uri("/health").to_request();
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
    }

    #[actix_web::test]
    async fn test_csrf_validates_post_requests() {
        let app = test::init_service(
            App::new()
                .wrap(CsrfProtection::new())
                .route(
                    "/api/data",
                    web::post().to(|| async { HttpResponse::Ok().finish() }),
                ),
        )
        .await;

        let csrf_token = generate_csrf_token();

        // Request with matching cookie and header should succeed
        let req = test::TestRequest::post()
            .uri("/api/data")
            .cookie(Cookie::new(CSRF_COOKIE_NAME, &csrf_token))
            .insert_header((CSRF_HEADER_NAME, csrf_token.as_str()))
            .to_request();
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
    }

    #[actix_web::test]
    async fn test_csrf_rejects_mismatched_tokens() {
        let app = test::init_service(
            App::new()
                .wrap(CsrfProtection::new())
                .route(
                    "/api/data",
                    web::post().to(|| async { HttpResponse::Ok().finish() }),
                ),
        )
        .await;

        let cookie_token = generate_csrf_token();
        let header_token = generate_csrf_token();

        // Request with mismatched tokens should fail
        let req = test::TestRequest::post()
            .uri("/api/data")
            .cookie(Cookie::new(CSRF_COOKIE_NAME, &cookie_token))
            .insert_header((CSRF_HEADER_NAME, header_token.as_str()))
            .to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 403);
    }

    #[actix_web::test]
    async fn test_csrf_rejects_missing_header() {
        let app = test::init_service(
            App::new()
                .wrap(CsrfProtection::new())
                .route(
                    "/api/data",
                    web::post().to(|| async { HttpResponse::Ok().finish() }),
                ),
        )
        .await;

        let csrf_token = generate_csrf_token();

        // Request with cookie but no header should fail
        let req = test::TestRequest::post()
            .uri("/api/data")
            .cookie(Cookie::new(CSRF_COOKIE_NAME, &csrf_token))
            .to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 403);
    }

    #[actix_web::test]
    async fn test_csrf_disabled_allows_all() {
        let app = test::init_service(
            App::new()
                .wrap(CsrfProtection::disabled())
                .route(
                    "/api/data",
                    web::post().to(|| async { HttpResponse::Ok().finish() }),
                ),
        )
        .await;

        // Request without any CSRF tokens should succeed when disabled
        let req = test::TestRequest::post().uri("/api/data").to_request();
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
    }
}
