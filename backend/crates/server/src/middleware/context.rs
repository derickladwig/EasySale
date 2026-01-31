use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpMessage,
};
use std::future::{ready, Ready};
use std::pin::Pin;

use crate::auth::jwt::{validate_token, JwtError};
use crate::config::Config;
use crate::models::UserContext;

/// Middleware to extract and validate user context from JWT token
pub struct ContextExtractor;

impl<S, B> Transform<S, ServiceRequest> for ContextExtractor
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = ContextExtractorMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(ContextExtractorMiddleware { service }))
    }
}

pub struct ContextExtractorMiddleware<S> {
    service: S,
}

impl<S, B> Service<ServiceRequest> for ContextExtractorMiddleware<S>
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
        // Extract token from cookie first (httpOnly cookie for security)
        let cookie_token = req.cookie("auth_token").map(|c| c.value().to_string());
        
        // Fall back to Authorization header if no cookie
        let auth_header = req.headers().get("Authorization").and_then(|h| h.to_str().ok());
        let header_token = auth_header.and_then(|h| {
            if h.starts_with("Bearer ") {
                Some(h[7..].to_string())
            } else {
                None
            }
        });

        // Prefer cookie token over header token
        let token = cookie_token.or(header_token);

        // If no token, continue without context (public endpoints)
        let token = match token {
            Some(t) => t,
            None => {
                let fut = self.service.call(req);
                return Box::pin(async move {
                    let res = fut.await?;
                    Ok(res)
                });
            }
        };

        // Get JWT secret from app data
        let config = match req.app_data::<actix_web::web::Data<Config>>() {
            Some(c) => c.clone(),
            None => {
                tracing::error!("Config not found in app data");
                return Box::pin(async move {
                    Err(actix_web::error::ErrorInternalServerError(
                        "Configuration error",
                    ))
                });
            }
        };

        // Validate token and extract claims
        let claims = match validate_token(&token, &config.jwt_secret) {
            Ok(claims) => claims,
            Err(JwtError::ExpiredToken) => {
                tracing::warn!("Expired token in request");
                return Box::pin(async move {
                    Err(actix_web::error::ErrorUnauthorized("Token has expired"))
                });
            }
            Err(_) => {
                tracing::warn!("Invalid token in request");
                return Box::pin(async move {
                    Err(actix_web::error::ErrorUnauthorized("Invalid token"))
                });
            }
        };

        // Create UserContext from claims
        let context = UserContext::from_claims(claims);

        // Validate context (e.g., check store assignment for POS roles)
        if let Err(e) = context.validate() {
            tracing::warn!("Context validation failed: {}", e);
            return Box::pin(async move {
                Err(actix_web::error::ErrorForbidden(e))
            });
        }

        // Inject context into request extensions
        req.extensions_mut().insert(context);

        let fut = self.service.call(req);
        Box::pin(async move {
            let res = fut.await?;
            Ok(res)
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, web, App, HttpResponse};
    use crate::auth::jwt::generate_token;

    #[actix_web::test]
    async fn test_context_extraction_with_valid_token() {
        let config = Config {
            jwt_secret: "test-secret".to_string(),
            jwt_expiration_hours: 8,
            ..Default::default()
        };

        let token = generate_token(
            "user-1",
            "testuser",
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
                    web::get().to(|req: actix_web::HttpRequest| async move {
                        let context = req.extensions().get::<UserContext>().cloned();
                        match context {
                            Some(ctx) => HttpResponse::Ok().json(serde_json::json!({
                                "user_id": ctx.user_id,
                                "username": ctx.username,
                                "role": ctx.role,
                            })),
                            None => HttpResponse::InternalServerError().finish(),
                        }
                    }),
                ),
        )
        .await;

        let req = test::TestRequest::get()
            .uri("/test")
            .insert_header(("Authorization", format!("Bearer {}", token)))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
    }

    #[actix_web::test]
    async fn test_context_extraction_without_token() {
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
                    web::get().to(|req: actix_web::HttpRequest| async move {
                        let context = req.extensions().get::<UserContext>().cloned();
                        match context {
                            Some(_) => HttpResponse::Ok().finish(),
                            None => HttpResponse::Ok().json(serde_json::json!({
                                "message": "No context"
                            })),
                        }
                    }),
                ),
        )
        .await;

        let req = test::TestRequest::get().uri("/test").to_request();

        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
    }

    #[actix_web::test]
    async fn test_context_extraction_with_invalid_token() {
        let config = Config {
            jwt_secret: "test-secret".to_string(),
            jwt_expiration_hours: 8,
            ..Default::default()
        };

        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(config))
                .wrap(ContextExtractor)
                .default_service(web::to(|| async { HttpResponse::Ok().finish() })),
        )
        .await;

        let req = test::TestRequest::get()
            .uri("/test")
            .insert_header(("Authorization", "Bearer invalid.token.here"))
            .to_request();

        let resp = test::try_call_service(&app, req).await;
        match resp {
            Ok(response) => {
                assert_eq!(response.status(), 401);
            }
            Err(e) => {
                // Middleware returned an error, check if it's the expected unauthorized error
                let error_response = e.as_response_error();
                assert_eq!(error_response.status_code(), 401);
            }
        }
    }

    #[actix_web::test]
    async fn test_context_extraction_with_expired_token() {
        let config = Config {
            jwt_secret: "test-secret".to_string(),
            jwt_expiration_hours: 8,
            ..Default::default()
        };

        // Generate expired token (-1 hours)
        let token = generate_token(
            "user-1",
            "testuser",
            "admin",
            crate::test_constants::TEST_TENANT_ID,
            None,
            None,
            &config.jwt_secret,
            -1,
        )
        .unwrap();

        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(config))
                .wrap(ContextExtractor)
                .default_service(web::to(|| async { HttpResponse::Ok().finish() })),
        )
        .await;

        let req = test::TestRequest::get()
            .uri("/test")
            .insert_header(("Authorization", format!("Bearer {}", token)))
            .to_request();

        let resp = test::try_call_service(&app, req).await;
        match resp {
            Ok(response) => {
                assert_eq!(response.status(), 401);
            }
            Err(e) => {
                // Middleware returned an error, check if it's the expected unauthorized error
                let error_response = e.as_response_error();
                assert_eq!(error_response.status_code(), 401);
            }
        }
    }

    #[actix_web::test]
    async fn test_context_validation_cashier_without_store() {
        let config = Config {
            jwt_secret: "test-secret".to_string(),
            jwt_expiration_hours: 8,
            ..Default::default()
        };

        // Generate token for cashier without store
        let token = generate_token(
            "user-1",
            "cashier1",
            "cashier",
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
                .default_service(web::to(|| async { HttpResponse::Ok().finish() })),
        )
        .await;

        let req = test::TestRequest::get()
            .uri("/test")
            .insert_header(("Authorization", format!("Bearer {}", token)))
            .to_request();

        let resp = test::try_call_service(&app, req).await;
        match resp {
            Ok(response) => {
                assert_eq!(response.status(), 403); // Forbidden due to missing store
            }
            Err(e) => {
                // Middleware returned an error, check if it's the expected forbidden error
                let error_response = e.as_response_error();
                assert_eq!(error_response.status_code(), 403);
            }
        }
    }

    #[actix_web::test]
    async fn test_context_extraction_with_store_and_station() {
        let config = Config {
            jwt_secret: "test-secret".to_string(),
            jwt_expiration_hours: 8,
            ..Default::default()
        };

        // Generate token with store and station context
        let token = generate_token(
            "user-2",
            "cashier1",
            "cashier",
            crate::test_constants::TEST_TENANT_ID,
            Some("store-123".to_string()),
            Some("station-456".to_string()),
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
                    web::get().to(|req: actix_web::HttpRequest| async move {
                        let context = req.extensions().get::<UserContext>().cloned();
                        match context {
                            Some(ctx) => HttpResponse::Ok().json(serde_json::json!({
                                "user_id": ctx.user_id,
                                "username": ctx.username,
                                "role": ctx.role,
                                "store_id": ctx.store_id,
                                "station_id": ctx.station_id,
                            })),
                            None => HttpResponse::InternalServerError().finish(),
                        }
                    }),
                ),
        )
        .await;

        let req = test::TestRequest::get()
            .uri("/test")
            .insert_header(("Authorization", format!("Bearer {}", token)))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());

        let body = test::read_body(resp).await;
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        
        assert_eq!(json["user_id"], "user-2");
        assert_eq!(json["username"], "cashier1");
        assert_eq!(json["role"], "cashier");
        assert_eq!(json["store_id"], "store-123");
        assert_eq!(json["station_id"], "station-456");
    }

    #[actix_web::test]
    async fn test_context_extraction_with_malformed_bearer_token() {
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
                    web::get().to(|req: actix_web::HttpRequest| async move {
                        let context = req.extensions().get::<UserContext>().cloned();
                        match context {
                            Some(_) => HttpResponse::Ok().finish(),
                            None => HttpResponse::Ok().json(serde_json::json!({
                                "message": "No context"
                            })),
                        }
                    }),
                ),
        )
        .await;

        // Test with "Bearer" but no token
        let req = test::TestRequest::get()
            .uri("/test")
            .insert_header(("Authorization", "Bearer"))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
        
        let body = test::read_body(resp).await;
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["message"], "No context");
    }

    #[actix_web::test]
    async fn test_context_extraction_without_bearer_prefix() {
        let config = Config {
            jwt_secret: "test-secret".to_string(),
            jwt_expiration_hours: 8,
            ..Default::default()
        };

        let token = generate_token(
            "user-1",
            "testuser",
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
                    web::get().to(|req: actix_web::HttpRequest| async move {
                        let context = req.extensions().get::<UserContext>().cloned();
                        match context {
                            Some(_) => HttpResponse::Ok().finish(),
                            None => HttpResponse::Ok().json(serde_json::json!({
                                "message": "No context"
                            })),
                        }
                    }),
                ),
        )
        .await;

        // Test with token but without "Bearer " prefix
        let req = test::TestRequest::get()
            .uri("/test")
            .insert_header(("Authorization", token))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
        
        let body = test::read_body(resp).await;
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["message"], "No context");
    }

    #[actix_web::test]
    async fn test_context_extraction_permissions_included() {
        let config = Config {
            jwt_secret: "test-secret".to_string(),
            jwt_expiration_hours: 8,
            ..Default::default()
        };

        let token = generate_token(
            "user-1",
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
                    web::get().to(|req: actix_web::HttpRequest| async move {
                        let context = req.extensions().get::<UserContext>().cloned();
                        match context {
                            Some(ctx) => HttpResponse::Ok().json(serde_json::json!({
                                "permissions": ctx.permissions,
                            })),
                            None => HttpResponse::InternalServerError().finish(),
                        }
                    }),
                ),
        )
        .await;

        let req = test::TestRequest::get()
            .uri("/test")
            .insert_header(("Authorization", format!("Bearer {}", token)))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());

        let body = test::read_body(resp).await;
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        
        // Verify permissions are populated from role
        let permissions = json["permissions"].as_array().unwrap();
        assert!(!permissions.is_empty());
        assert!(permissions.iter().any(|p| p == "adjust_inventory"));
    }
}


