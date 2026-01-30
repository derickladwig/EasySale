use actix_web::{HttpRequest, HttpResponse, Responder};
use serde::Serialize;
use std::time::SystemTime;

#[derive(Serialize)]
pub struct HealthResponse {
    status: String,
    timestamp: u64,
    version: String,
}

pub async fn health_check(req: HttpRequest) -> impl Responder {
    let timestamp = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let response = HealthResponse {
        status: "healthy".to_string(),
        timestamp,
        version: env!("CARGO_PKG_VERSION").to_string(),
    };

    // Support both GET and HEAD requests
    if req.method() == actix_web::http::Method::HEAD {
        HttpResponse::Ok().finish()
    } else {
        HttpResponse::Ok().json(response)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, web, App};

    #[actix_web::test]
    async fn test_health_check_get() {
        let app = test::init_service(
            App::new().route("/health", web::get().to(health_check))
        ).await;
        let req = test::TestRequest::get().uri("/health").to_request();
        let resp = test::call_service(&app, req).await;

        assert!(resp.status().is_success());
    }

    #[actix_web::test]
    async fn test_health_check_head() {
        let app = test::init_service(
            App::new().route("/health", web::head().to(health_check))
        ).await;
        let req = test::TestRequest::with_uri("/health")
            .method(actix_web::http::Method::HEAD)
            .to_request();
        let resp = test::call_service(&app, req).await;

        assert!(resp.status().is_success());
    }
}
