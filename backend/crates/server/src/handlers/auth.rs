use actix_web::{cookie::{Cookie, SameSite}, get, post, web, HttpRequest, HttpResponse, Responder};
use chrono::{Duration, Utc};
use sqlx::SqlitePool;
use std::sync::Arc;
use uuid::Uuid;

use crate::auth::{generate_token, verify_password};
use crate::config::Config;
use crate::middleware::{get_current_tenant_id, generate_csrf_token, create_csrf_cookie, clear_csrf_cookie};
use crate::models::{LoginRequest, LoginResponse, User, UserResponse};
use crate::services::ThreatMonitor;

/// Cookie name for auth token
const AUTH_COOKIE_NAME: &str = "auth_token";

// Rate limiting with automatic cleanup
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};

static RATE_LIMITER: Lazy<Mutex<HashMap<String, (i32, chrono::DateTime<Utc>)>>> = 
    Lazy::new(|| Mutex::new(HashMap::new()));

// Track cleanup to prevent memory leaks
static LAST_CLEANUP: AtomicU64 = AtomicU64::new(0);
const CLEANUP_INTERVAL_SECS: u64 = 300; // Cleanup every 5 minutes

const MAX_LOGIN_ATTEMPTS: i32 = 5;
const RATE_LIMIT_WINDOW_MINUTES: i64 = 15;

#[derive(Debug)]
pub enum AuthError {
    InvalidCredentials,
    UserNotFound,
    DatabaseError,
    TokenGenerationError,
    RateLimited,
}

impl std::fmt::Display for AuthError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AuthError::InvalidCredentials => write!(f, "Invalid username or password"),
            AuthError::UserNotFound => write!(f, "User not found"),
            AuthError::DatabaseError => write!(f, "Database error"),
            AuthError::TokenGenerationError => write!(f, "Failed to generate token"),
            AuthError::RateLimited => write!(f, "Too many login attempts. Please try again later"),
        }
    }
}

impl std::error::Error for AuthError {}

/// Cleanup expired rate limit entries to prevent memory leaks
fn cleanup_rate_limiter(limiter: &mut HashMap<String, (i32, chrono::DateTime<Utc>)>) {
    let now = Utc::now();
    let now_secs = now.timestamp() as u64;
    let last_cleanup = LAST_CLEANUP.load(Ordering::Relaxed);
    
    // Only cleanup if enough time has passed
    if now_secs - last_cleanup < CLEANUP_INTERVAL_SECS {
        return;
    }
    
    // Update last cleanup time
    LAST_CLEANUP.store(now_secs, Ordering::Relaxed);
    
    let window_start = now - chrono::Duration::minutes(RATE_LIMIT_WINDOW_MINUTES);
    
    // Remove entries older than the rate limit window
    limiter.retain(|_, (_, last_attempt)| *last_attempt > window_start);
    
    tracing::debug!("Rate limiter cleanup: {} entries remaining", limiter.len());
}

/// Check if IP is rate limited
fn check_rate_limit(ip: &str) -> Result<(), AuthError> {
    let mut limiter = RATE_LIMITER.lock().unwrap();
    let now = Utc::now();
    let window_start = now - chrono::Duration::minutes(RATE_LIMIT_WINDOW_MINUTES);
    
    // Periodic cleanup to prevent memory leaks
    cleanup_rate_limiter(&mut limiter);
    
    // Copy values out to avoid borrow issues
    let existing = limiter.get(ip).map(|(a, t)| (*a, *t));
    
    match existing {
        Some((attempts, last_attempt)) => {
            if last_attempt > window_start && attempts >= MAX_LOGIN_ATTEMPTS {
                return Err(AuthError::RateLimited);
            }
            
            if last_attempt <= window_start {
                // Reset counter if outside window
                limiter.insert(ip.to_string(), (1, now));
            } else {
                // Increment counter
                limiter.insert(ip.to_string(), (attempts + 1, now));
            }
        }
        None => {
            // First attempt
            limiter.insert(ip.to_string(), (1, now));
        }
    }
    
    Ok(())
}

/// POST /auth/login
/// Authenticate a user and return a JWT token
#[post("/auth/login")]
pub async fn login(
    pool: web::Data<SqlitePool>,
    config: web::Data<Config>,
    threat_monitor: Option<web::Data<Arc<ThreatMonitor>>>,
    req: web::Json<LoginRequest>,
    http_req: HttpRequest,
) -> impl Responder {
    tracing::info!("Login attempt for username: {}", req.username);
    
    // Get client IP for rate limiting
    let client_ip = http_req
        .connection_info()
        .realip_remote_addr()
        .unwrap_or("unknown")
        .to_string();
    
    // Get user agent for session tracking
    let user_agent = http_req
        .headers()
        .get("User-Agent")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());
    
    // Check if IP is blocked by ThreatMonitor
    if let Some(ref monitor) = threat_monitor {
        if monitor.is_blocked(&client_ip).await {
            tracing::warn!("Login blocked: IP {} is blocked", client_ip);
            return HttpResponse::Forbidden().json(serde_json::json!({
                "error": "Access denied. Your IP has been temporarily blocked due to suspicious activity."
            }));
        }
    }
    
    // Check rate limit
    if let Err(e) = check_rate_limit(&client_ip) {
        tracing::warn!("Rate limit exceeded for IP: {}", client_ip);
        return HttpResponse::TooManyRequests().json(serde_json::json!({
            "error": e.to_string()
        }));
    }
    
    // Find user by username
    let user_result = sqlx::query_as::<_, User>(
        "SELECT id, tenant_id, username, email, password_hash, display_name, role, first_name, last_name, 
         store_id, station_policy, station_id, is_active, created_at, updated_at 
         FROM users 
         WHERE username = ? AND is_active = 1 AND tenant_id = ?"
    )
    .bind(&req.username)
    .bind(get_current_tenant_id())
    .fetch_optional(pool.get_ref())
    .await;

    let user = match user_result {
        Ok(Some(user)) => user,
        Ok(None) => {
            tracing::warn!("Login failed: user not found - {}", req.username);
            
            // Record failed login attempt in ThreatMonitor
            if let Some(ref monitor) = threat_monitor {
                let blocked = monitor.record_failed_login(&client_ip, Some(&req.username)).await;
                if blocked {
                    tracing::warn!("IP {} has been auto-blocked after too many failed login attempts", client_ip);
                }
            }
            
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Invalid username or password"
            }));
        }
        Err(e) => {
            tracing::error!("Database error during login: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database error"
            }));
        }
    };

    // Verify password
    match verify_password(&req.password, &user.password_hash) {
        Ok(true) => {}
        Ok(false) => {
            tracing::warn!("Login failed: invalid password for user {}", req.username);
            
            // Record failed login attempt in ThreatMonitor
            if let Some(ref monitor) = threat_monitor {
                let blocked = monitor.record_failed_login(&client_ip, Some(&req.username)).await;
                if blocked {
                    tracing::warn!("IP {} has been auto-blocked after too many failed login attempts", client_ip);
                }
            }
            
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Invalid username or password"
            }));
        }
        Err(e) => {
            tracing::error!("Password verification error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Password verification error"
            }));
        }
    }

    // Validate station requirements (Task 9.2)
    // Check if user's station policy requires a specific station
    if user.station_policy == "specific" && user.station_id.is_none() {
        tracing::warn!(
            "Login failed: user '{}' has 'specific' station policy but no station assigned",
            user.username
        );
        return HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Station assignment required",
            "message": "Your account requires a specific station assignment. Please contact your administrator."
        }));
    }

    // Validate store requirements for POS roles (Task 9.1)
    use crate::models::user::role_requires_store;
    if role_requires_store(&user.role) && user.store_id.is_none() {
        tracing::warn!(
            "Login failed: user '{}' with role '{}' requires store assignment",
            user.username,
            user.role
        );
        return HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Store assignment required",
            "message": format!("Your role '{}' requires a store assignment. Please contact your administrator.", user.role)
        }));
    }

    // Generate JWT token with user context
    let token = match generate_token(
        &user.id,
        &user.username,
        &user.role,
        &user.tenant_id,
        user.store_id.clone(),
        user.station_id.clone(),
        &config.jwt_secret,
        config.jwt_expiration_hours as i64,
    ) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Token generation error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to generate token"
            }));
        }
    };

    // Create session
    let session_id = Uuid::new_v4().to_string();
    let expires_at = Utc::now() + Duration::hours(config.jwt_expiration_hours as i64);
    let expires_at_str = expires_at.to_rfc3339();

    let session_result = sqlx::query(
        "INSERT INTO sessions (id, tenant_id, user_id, token, expires_at) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&session_id)
    .bind(get_current_tenant_id())
    .bind(&user.id)
    .bind(&token)
    .bind(&expires_at_str)
    .execute(pool.get_ref())
    .await;

    if let Err(e) = session_result {
        tracing::error!("Failed to create session: {:?}", e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to create session"
        }));
    }

    // Update last_login_at timestamp
    let now = Utc::now().to_rfc3339();
    if let Err(e) = sqlx::query("UPDATE users SET last_login_at = ? WHERE id = ? AND tenant_id = ?")
        .bind(&now)
        .bind(&user.id)
        .bind(get_current_tenant_id())
        .execute(pool.get_ref())
        .await
    {
        tracing::warn!("Failed to update last_login_at for user {}: {:?}", user.id, e);
        // Don't fail login if this update fails - it's not critical
    }

    // Register session with ThreatMonitor for tracking
    if let Some(ref monitor) = threat_monitor {
        // Hash the token for storage (don't store raw tokens)
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(token.as_bytes());
        let token_hash = format!("{:x}", hasher.finalize());
        
        monitor.register_session(
            &token_hash,
            &user.id,
            Some(&user.username),
            &client_ip,
            user_agent.as_deref(),
        ).await;
    }

    tracing::info!("Login successful for user: {} ({})", user.username, user.id);

    // Determine if we're in production (use Secure flag)
    let is_production = cfg!(not(debug_assertions)) || std::env::var("ENVIRONMENT").unwrap_or_default() == "production";
    
    // Build httpOnly cookie for secure token storage
    let cookie = Cookie::build(AUTH_COOKIE_NAME, token.clone())
        .path("/")
        .http_only(true)  // Prevents JavaScript access - XSS protection
        .secure(is_production)  // Only send over HTTPS in production
        .same_site(SameSite::Lax)  // Lax allows cookie on top-level navigations, Strict was too restrictive
        .max_age(actix_web::cookie::time::Duration::hours(config.jwt_expiration_hours as i64))
        .finish();

    // Generate CSRF token and create cookie (readable by JavaScript for double-submit pattern)
    let csrf_token = generate_csrf_token();
    let csrf_cookie = create_csrf_cookie(&csrf_token, is_production);

    // Return response with user info (token is in cookie, not body for security)
    // We still include token in response for backward compatibility during migration
    let response = LoginResponse {
        token: token.clone(),
        user: UserResponse::from(user),
        expires_at,
    };

    HttpResponse::Ok()
        .cookie(cookie)
        .cookie(csrf_cookie)
        .json(response)
}

/// POST /auth/logout
/// Invalidate a user's session
#[post("/auth/logout")]
pub async fn logout(
    pool: web::Data<SqlitePool>,
    threat_monitor: Option<web::Data<Arc<ThreatMonitor>>>,
    req: HttpRequest,
) -> impl Responder {
    // Extract token from cookie first, then fall back to Authorization header
    let token = req.cookie(AUTH_COOKIE_NAME)
        .map(|c| c.value().to_string())
        .or_else(|| {
            req.headers().get("Authorization").and_then(|header_value| {
                header_value.to_str().ok().map(|value| {
                    if value.starts_with("Bearer ") {
                        value[7..].to_string()
                    } else {
                        value.to_string()
                    }
                })
            })
        });

    let token = match token {
        Some(t) => t,
        None => {
            tracing::warn!("Logout attempt without token");
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Missing authentication token"
            }));
        }
    };

    // Remove session from ThreatMonitor
    if let Some(ref monitor) = threat_monitor {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(token.as_bytes());
        let token_hash = format!("{:x}", hasher.finalize());
        monitor.remove_session(&token_hash).await;
    }

    // Delete session by token
    let result = sqlx::query("DELETE FROM sessions WHERE token = ? AND tenant_id = ?")
        .bind(&token)
        .bind(get_current_tenant_id())
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                tracing::info!("User logged out successfully");
            } else {
                tracing::warn!("Logout attempt with invalid token");
            }
            
            // Clear the auth cookie
            let clear_cookie = Cookie::build(AUTH_COOKIE_NAME, "")
                .path("/")
                .http_only(true)
                .max_age(actix_web::cookie::time::Duration::ZERO)
                .finish();
            
            // Clear the CSRF cookie
            let clear_csrf = clear_csrf_cookie();
            
            HttpResponse::Ok()
                .cookie(clear_cookie)
                .cookie(clear_csrf)
                .json(serde_json::json!({
                    "message": "Logged out successfully"
                }))
        }
        Err(e) => {
            tracing::error!("Failed to logout: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to logout"
            }))
        }
    }
}

/// GET /auth/me
/// Get current user information from token
#[get("/auth/me")]
pub async fn get_current_user(
    pool: web::Data<SqlitePool>,
    config: web::Data<Config>,
    req: HttpRequest,
) -> impl Responder {
    // Extract token from cookie first, then fall back to Authorization header
    let token = req.cookie(AUTH_COOKIE_NAME)
        .map(|c| c.value().to_string())
        .or_else(|| {
            req.headers().get("Authorization").and_then(|header_value| {
                header_value.to_str().ok().map(|value| {
                    if value.starts_with("Bearer ") {
                        value[7..].to_string()
                    } else {
                        value.to_string()
                    }
                })
            })
        });

    let token = match token {
        Some(t) => t,
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Missing authentication token"
            }));
        }
    };

    // Validate token
    let claims = match crate::auth::validate_token(&token, &config.jwt_secret) {
        Ok(claims) => claims,
        Err(_) => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Invalid or expired token"
            }));
        }
    };

    // Fetch user from database
    let user_result = sqlx::query_as::<_, User>(
        "SELECT id, tenant_id, username, email, password_hash, display_name, role, first_name, last_name, 
         store_id, station_policy, station_id, is_active, created_at, updated_at 
         FROM users 
         WHERE id = ? AND is_active = 1 AND tenant_id = ?"
    )
    .bind(&claims.sub)
    .bind(get_current_tenant_id())
    .fetch_optional(pool.get_ref())
    .await;

    match user_result {
        Ok(Some(user)) => HttpResponse::Ok().json(UserResponse::from(user)),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "User not found"
        })),
        Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Database error"
        })),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};
    use crate::test_utils::create_test_db;

    #[actix_web::test]
    async fn test_login_requires_store_for_pos_roles() {
        let pool = create_test_db().await.unwrap();
        let config = Config {
            jwt_secret: "test-secret".to_string(),
            jwt_expiration_hours: 8,
            ..Default::default()
        };

        // Create a cashier without store assignment
        let password_hash = bcrypt::hash("password123", bcrypt::DEFAULT_COST).unwrap();
        sqlx::query(
            "INSERT INTO users (id, tenant_id, username, email, password_hash, role, store_id, station_policy, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, datetime('now'), datetime('now'))"
        )
        .bind("user-1")
        .bind(crate::test_constants::TEST_TENANT_ID)
        .bind("cashier1")
        .bind("cashier@test.com")
        .bind(&password_hash)
        .bind("cashier")
        .bind("any")
        .bind(1)
        .execute(&pool)
        .await
        .unwrap();

        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(pool.clone()))
                .app_data(web::Data::new(config.clone()))
                .service(login),
        )
        .await;

        let req = test::TestRequest::post()
            .uri("/auth/login")
            .set_json(serde_json::json!({
                "username": "cashier1",
                "password": "password123"
            }))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 403);

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["error"], "Store assignment required");
    }

    #[actix_web::test]
    async fn test_login_requires_station_for_specific_policy() {
        let pool = create_test_db().await.unwrap();
        let config = Config {
            jwt_secret: "test-secret".to_string(),
            jwt_expiration_hours: 8,
            ..Default::default()
        };

        // Create store first (required for foreign key)
        sqlx::query(
            "INSERT INTO stores (id, name, timezone, currency, created_at, updated_at)
             VALUES ('store-1', 'Test Store', 'UTC', 'USD', datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Create a cashier with 'specific' station policy but no station assigned
        let password_hash = bcrypt::hash("password123", bcrypt::DEFAULT_COST).unwrap();
        sqlx::query(
            "INSERT INTO users (id, tenant_id, username, email, password_hash, role, store_id, station_policy, station_id, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, datetime('now'), datetime('now'))"
        )
        .bind("user-2")
        .bind(crate::test_constants::TEST_TENANT_ID)
        .bind("cashier2")
        .bind("cashier2@test.com")
        .bind(&password_hash)
        .bind("cashier")
        .bind("store-1")
        .bind("specific")
        .bind(1)
        .execute(&pool)
        .await
        .unwrap();

        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(pool.clone()))
                .app_data(web::Data::new(config.clone()))
                .service(login),
        )
        .await;

        let req = test::TestRequest::post()
            .uri("/auth/login")
            .set_json(serde_json::json!({
                "username": "cashier2",
                "password": "password123"
            }))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 403);

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["error"], "Station assignment required");
    }

    #[actix_web::test]
    async fn test_login_succeeds_with_proper_assignments() {
        let pool = create_test_db().await.unwrap();
        let config = Config {
            jwt_secret: "test-secret".to_string(),
            jwt_expiration_hours: 8,
            ..Default::default()
        };

        // Create store first (required for foreign key)
        sqlx::query(
            "INSERT INTO stores (id, name, timezone, currency, created_at, updated_at)
             VALUES ('store-1', 'Test Store', 'UTC', 'USD', datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Create station (required for foreign key)
        sqlx::query(
            "INSERT INTO stations (id, store_id, name, ip_address, is_active, created_at, updated_at)
             VALUES ('station-1', 'store-1', 'Test Station', '192.168.1.100', 1, datetime('now'), datetime('now'))"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Create a cashier with proper store and station assignments
        let password_hash = bcrypt::hash("password123", bcrypt::DEFAULT_COST).unwrap();
        sqlx::query(
            "INSERT INTO users (id, tenant_id, username, email, password_hash, role, store_id, station_policy, station_id, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
        )
        .bind("user-3")
        .bind(crate::test_constants::TEST_TENANT_ID)
        .bind("cashier3")
        .bind("cashier3@test.com")
        .bind(&password_hash)
        .bind("cashier")
        .bind("store-1")
        .bind("specific")
        .bind("station-1")
        .bind(1)
        .execute(&pool)
        .await
        .unwrap();

        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(pool.clone()))
                .app_data(web::Data::new(config.clone()))
                .service(login),
        )
        .await;

        let req = test::TestRequest::post()
            .uri("/auth/login")
            .set_json(serde_json::json!({
                "username": "cashier3",
                "password": "password123"
            }))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 200);

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert!(body["token"].is_string());
        assert_eq!(body["user"]["username"], "cashier3");
    }

    #[actix_web::test]
    async fn test_login_admin_without_store_succeeds() {
        let pool = create_test_db().await.unwrap();
        let config = Config {
            jwt_secret: "test-secret".to_string(),
            jwt_expiration_hours: 8,
            ..Default::default()
        };

        // Create an admin without store assignment (admins don't require stores)
        let password_hash = bcrypt::hash("password123", bcrypt::DEFAULT_COST).unwrap();
        sqlx::query(
            "INSERT INTO users (id, tenant_id, username, email, password_hash, role, store_id, station_policy, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, datetime('now'), datetime('now'))"
        )
        .bind("user-4")
        .bind(crate::test_constants::TEST_TENANT_ID)
        .bind("admin1")
        .bind("admin@test.com")
        .bind(&password_hash)
        .bind("admin")
        .bind("none")
        .bind(1)
        .execute(&pool)
        .await
        .unwrap();

        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(pool.clone()))
                .app_data(web::Data::new(config.clone()))
                .service(login),
        )
        .await;

        let req = test::TestRequest::post()
            .uri("/auth/login")
            .set_json(serde_json::json!({
                "username": "admin1",
                "password": "password123"
            }))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 200);

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert!(body["token"].is_string());
        assert_eq!(body["user"]["username"], "admin1");
    }
}


