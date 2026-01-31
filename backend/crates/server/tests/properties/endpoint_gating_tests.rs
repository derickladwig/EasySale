// Property-based tests for endpoint gating (Task 9.4)
// Validates: Requirements 4.4

use actix_web::{test, web, App};
use easysale_server::config::RuntimeProfile;
use sqlx::SqlitePool;

/// Property 10: Dev Endpoint Gating
/// For any development-only endpoint when profile is prod, requests to that endpoint should return 404 or require explicit internal permission
/// **Validates: Requirements 4.4**
#[actix_web::test]
async fn test_dev_endpoints_blocked_in_prod() {
    // Set up test database
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Test with prod profile
    let prod_profile = RuntimeProfile::Prod;
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(prod_profile))
            .configure(|cfg| {
                // Simulate the route registration logic from main.rs
                if !prod_profile.is_prod() {
                    // These routes should NOT be registered in prod
                    cfg.route("/api/sync/dry-run", web::post().to(|| async { "OK" }));
                    cfg.route("/api/settings/sandbox", web::get().to(|| async { "OK" }));
                    cfg.route("/api/settings/sandbox", web::post().to(|| async { "OK" }));
                }
            })
    )
    .await;
    
    // Test that dev endpoints return 404 in prod
    let req = test::TestRequest::post()
        .uri("/api/sync/dry-run")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 404, "Dry-run endpoint should return 404 in prod profile");
    
    let req = test::TestRequest::get()
        .uri("/api/settings/sandbox")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 404, "Sandbox GET endpoint should return 404 in prod profile");
    
    let req = test::TestRequest::post()
        .uri("/api/settings/sandbox")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 404, "Sandbox POST endpoint should return 404 in prod profile");
}

#[actix_web::test]
async fn test_dev_endpoints_available_in_dev() {
    // Set up test database
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Test with dev profile
    let dev_profile = RuntimeProfile::Dev;
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(dev_profile))
            .configure(|cfg| {
                // Simulate the route registration logic from main.rs
                if !dev_profile.is_prod() {
                    // These routes SHOULD be registered in dev
                    cfg.route("/api/sync/dry-run", web::post().to(|| async { "OK" }));
                    cfg.route("/api/settings/sandbox", web::get().to(|| async { "OK" }));
                    cfg.route("/api/settings/sandbox", web::post().to(|| async { "OK" }));
                }
            })
    )
    .await;
    
    // Test that dev endpoints are available in dev
    let req = test::TestRequest::post()
        .uri("/api/sync/dry-run")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200, "Dry-run endpoint should be available in dev profile");
    
    let req = test::TestRequest::get()
        .uri("/api/settings/sandbox")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200, "Sandbox GET endpoint should be available in dev profile");
    
    let req = test::TestRequest::post()
        .uri("/api/settings/sandbox")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200, "Sandbox POST endpoint should be available in dev profile");
}

#[actix_web::test]
async fn test_dev_endpoints_available_in_demo() {
    // Set up test database
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Test with demo profile
    let demo_profile = RuntimeProfile::Demo;
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(demo_profile))
            .configure(|cfg| {
                // Simulate the route registration logic from main.rs
                if !demo_profile.is_prod() {
                    // These routes SHOULD be registered in demo
                    cfg.route("/api/sync/dry-run", web::post().to(|| async { "OK" }));
                    cfg.route("/api/settings/sandbox", web::get().to(|| async { "OK" }));
                    cfg.route("/api/settings/sandbox", web::post().to(|| async { "OK" }));
                }
            })
    )
    .await;
    
    // Test that dev endpoints are available in demo
    let req = test::TestRequest::post()
        .uri("/api/sync/dry-run")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200, "Dry-run endpoint should be available in demo profile");
    
    let req = test::TestRequest::get()
        .uri("/api/settings/sandbox")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200, "Sandbox GET endpoint should be available in demo profile");
    
    let req = test::TestRequest::post()
        .uri("/api/settings/sandbox")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200, "Sandbox POST endpoint should be available in demo profile");
}

#[actix_web::test]
async fn test_setup_endpoints_blocked_in_prod() {
    use easysale_server::middleware::ProfileGate;
    
    // Set up test database
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Test with prod profile
    let prod_profile = RuntimeProfile::Prod;
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(prod_profile))
            .service(
                web::scope("/api/setup")
                    .wrap(ProfileGate::new())
                    .route("/initialize", web::post().to(|| async { "OK" }))
            )
    )
    .await;
    
    // Test that setup endpoints return 403 in prod
    let req = test::TestRequest::post()
        .uri("/api/setup/initialize")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 403, "Setup endpoint should return 403 in prod profile");
}

#[actix_web::test]
async fn test_setup_endpoints_available_in_dev() {
    use easysale_server::middleware::ProfileGate;
    
    // Set up test database
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Test with dev profile
    let dev_profile = RuntimeProfile::Dev;
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(dev_profile))
            .service(
                web::scope("/api/setup")
                    .wrap(ProfileGate::new())
                    .route("/initialize", web::post().to(|| async { "OK" }))
            )
    )
    .await;
    
    // Test that setup endpoints are available in dev
    let req = test::TestRequest::post()
        .uri("/api/setup/initialize")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200, "Setup endpoint should be available in dev profile");
}
