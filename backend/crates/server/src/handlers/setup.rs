use actix_web::{post, web, HttpResponse, Responder};
use serde::Deserialize;
use sqlx::SqlitePool;
use crate::auth::hash_password;

/// Request body for system initialization
#[derive(Debug, Deserialize)]
pub struct InitializeRequest {
    /// Admin username (defaults to "admin" if not provided)
    pub username: Option<String>,
    /// Admin email (defaults to "admin@easysale.local" if not provided)
    pub email: Option<String>,
    /// Admin password - REQUIRED, must be at least 8 characters
    pub password: String,
}

/// POST /setup/init
/// Initialize the system with a default admin user
/// This endpoint can only be called once - if an admin already exists, it returns an error
#[post("/setup/init")]
pub async fn initialize_system(
    pool: web::Data<SqlitePool>,
    body: web::Json<InitializeRequest>,
) -> impl Responder {
    // Validate password strength
    if body.password.len() < 8 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Password too weak",
            "message": "Password must be at least 8 characters"
        }));
    }

    // Check if any users exist
    let user_count: (i64,) = match sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(pool.get_ref())
        .await
    {
        Ok(count) => count,
        Err(e) => {
            tracing::error!("Failed to check user count: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database error"
            }));
        }
    };

    if user_count.0 > 0 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "System already initialized",
            "message": "Users already exist in the system"
        }));
    }

    // Hash the provided password
    let password_hash = match hash_password(&body.password) {
        Ok(hash) => hash,
        Err(e) => {
            tracing::error!("Failed to hash password: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to hash password"
            }));
        }
    };

    let username = body.username.as_deref().unwrap_or("admin");
    let email = body.email.as_deref().unwrap_or("admin@easysale.local");

    let result = sqlx::query(
        r#"
        INSERT INTO users (
            id, username, email, password_hash, role, 
            first_name, last_name, store_id, station_policy, 
            station_id, is_active, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        "#
    )
    .bind("admin-default")
    .bind(username)
    .bind(email)
    .bind(&password_hash)
    .bind("admin")
    .bind("System")
    .bind("Administrator")
    .bind(Option::<String>::None)
    .bind("none")
    .bind(Option::<String>::None)
    .bind(1)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            tracing::info!("Admin user '{}' created successfully", username);
            HttpResponse::Ok().json(serde_json::json!({
                "message": "System initialized successfully",
                "username": username
            }))
        }
        Err(e) => {
            tracing::error!("Failed to create admin user: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create admin user"
            }))
        }
    }
}
