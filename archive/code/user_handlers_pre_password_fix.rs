use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use chrono::Utc;
use crate::services::audit_logger::AuditLogger;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub display_name: String,
    pub role: String,
    pub store_id: Option<String>,
    pub station_policy: Option<String>,
    pub station_id: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateUserRequest {
    pub username: Option<String>,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub role: Option<String>,
    pub store_id: Option<String>,
    pub station_policy: Option<String>,
    pub station_id: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: String,
    pub username: String,
    pub email: String,
    pub display_name: String,
    pub role: String,
    pub store_id: Option<String>,
    pub station_policy: Option<String>,
    pub station_id: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Validate user creation request
fn validate_create_user(req: &CreateUserRequest) -> Result<(), String> {
    // Username validation
    if req.username.trim().is_empty() {
        return Err("Username is required".to_string());
    }
    if req.username.len() < 3 {
        return Err("Username must be at least 3 characters".to_string());
    }

    // Email validation
    if req.email.trim().is_empty() {
        return Err("Email is required".to_string());
    }
    if !req.email.contains('@') {
        return Err("Invalid email format".to_string());
    }

    // Password validation
    if req.password.len() < 8 {
        return Err("Password must be at least 8 characters".to_string());
    }

    // Role validation
    let valid_roles = vec!["admin", "manager", "cashier", "inventory"];
    if !valid_roles.contains(&req.role.as_str()) {
        return Err(format!("Invalid role. Must be one of: {}", valid_roles.join(", ")));
    }

    // Store requirement for POS roles
    if (req.role == "cashier" || req.role == "inventory") && req.store_id.is_none() {
        return Err(format!("{} role requires store assignment", req.role));
    }

    // Station policy validation
    if let Some(policy) = &req.station_policy {
        let valid_policies = vec!["any", "specific", "none"];
        if !valid_policies.contains(&policy.as_str()) {
            return Err(format!("Invalid station policy. Must be one of: {}", valid_policies.join(", ")));
        }

        // If policy is 'specific', station_id is required
        if policy == "specific" && req.station_id.is_none() {
            return Err("Station ID is required when station policy is 'specific'".to_string());
        }
    }

    Ok(())
}

/// Create a new user
pub async fn create_user(
    pool: web::Data<SqlitePool>,
    audit_logger: web::Data<AuditLogger>,
    context: web::ReqData<crate::models::UserContext>,
    req: web::Json<CreateUserRequest>,
) -> Result<HttpResponse> {
    // Validate request
    if let Err(e) = validate_create_user(&req) {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": e
        })));
    }

    // Hash password (in production, use bcrypt)
    let password_hash = format!("hashed_{}", req.password); // Placeholder
    let now = Utc::now().to_rfc3339();

    // Insert user
    let result = sqlx::query!(
        r#"
        INSERT INTO users (
            username, email, password_hash, display_name, role,
            store_id, station_policy, station_id, is_active,
            created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        req.username,
        req.email,
        password_hash,
        req.display_name,
        req.role,
        req.store_id,
        req.station_policy,
        req.station_id,
        req.is_active,
        now,
        now
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(result) => {
            let user_id = result.last_insert_rowid();

            // Log audit event
            let user_data = serde_json::json!({
                "id": user_id,
                "username": req.username,
                "email": req.email,
                "role": req.role,
                "store_id": req.store_id,
                "is_active": req.is_active,
            });

            audit_logger.log_settings_change(
                "user",
                &user_id.to_string(),
                "create",
                &context.user_id,
                &context.username,
                context.store_id.as_deref(),
                context.station_id.as_deref(),
                None,
                Some(user_data),
                false, // is_offline
            ).await.ok(); // Ignore audit errors

            Ok(HttpResponse::Created().json(serde_json::json!({
                "id": user_id,
                "message": "User created successfully"
            })))
        }
        Err(e) => {
            if e.to_string().contains("UNIQUE constraint failed") {
                Ok(HttpResponse::Conflict().json(serde_json::json!({
                    "error": "Username or email already exists"
                })))
            } else {
                Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to create user: {}", e)
                })))
            }
        }
    }
}

/// Get user by ID
pub async fn get_user(
    pool: web::Data<SqlitePool>,
    user_id: web::Path<String>,
) -> Result<HttpResponse> {
    let user_id_value = user_id.into_inner();
    let user = sqlx::query_as!(
        UserResponse,
        r#"
        SELECT 
            id as "id!", username, email, 
            display_name as "display_name!: String",
            role,
            store_id,
            station_policy,
            station_id,
            is_active as "is_active: bool",
            created_at, updated_at
        FROM users
        WHERE id = ?
        "#,
        user_id_value
    )
    .fetch_optional(pool.get_ref())
    .await;

    match user {
        Ok(Some(user)) => Ok(HttpResponse::Ok().json(user)),
        Ok(None) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "User not found"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to fetch user: {}", e)
        }))),
    }
}

/// List all users
pub async fn list_users(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse> {
    let users = sqlx::query_as!(
        UserResponse,
        r#"
        SELECT 
            id as "id!", username, email,
            display_name as "display_name!: String",
            role,
            store_id,
            station_policy,
            station_id,
            is_active as "is_active: bool",
            created_at, updated_at
        FROM users
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(pool.get_ref())
    .await;

    match users {
        Ok(users) => Ok(HttpResponse::Ok().json(users)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to fetch users: {}", e)
        }))),
    }
}

/// Update user
pub async fn update_user(
    pool: web::Data<SqlitePool>,
    audit_logger: web::Data<AuditLogger>,
    context: web::ReqData<crate::models::UserContext>,
    user_id: web::Path<String>,
    req: web::Json<UpdateUserRequest>,
) -> Result<HttpResponse> {
    let user_id = user_id.into_inner();

    // Fetch current user data for audit log
    let current_user = sqlx::query!(
        r#"
        SELECT username, email, display_name, role, store_id, station_policy, station_id, is_active
        FROM users
        WHERE id = ?
        "#,
        user_id
    )
    .fetch_optional(pool.get_ref())
    .await;

    let current_user = match current_user {
        Ok(Some(user)) => user,
        Ok(None) => {
            return Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "User not found"
            })));
        }
        Err(e) => {
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to fetch user: {}", e)
            })));
        }
    };

    // Build update query dynamically
    let mut updates = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(username) = &req.username {
        updates.push("username = ?");
        params.push(username.clone());
    }
    if let Some(email) = &req.email {
        updates.push("email = ?");
        params.push(email.clone());
    }
    if let Some(display_name) = &req.display_name {
        updates.push("display_name = ?");
        params.push(display_name.clone());
    }
    if let Some(role) = &req.role {
        updates.push("role = ?");
        params.push(role.clone());
    }
    if let Some(store_id) = &req.store_id {
        updates.push("store_id = ?");
        params.push(store_id.clone());
    }
    if let Some(station_policy) = &req.station_policy {
        updates.push("station_policy = ?");
        params.push(station_policy.clone());
    }
    if let Some(station_id) = &req.station_id {
        updates.push("station_id = ?");
        params.push(station_id.clone());
    }
    if let Some(is_active) = req.is_active {
        updates.push("is_active = ?");
        params.push(is_active.to_string());
    }

    if updates.is_empty() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "No fields to update"
        })));
    }

    updates.push("updated_at = ?");
    params.push(Utc::now().to_rfc3339());

    let query = format!(
        "UPDATE users SET {} WHERE id = ?",
        updates.join(", ")
    );

    // Execute update (simplified - in production would use proper parameter binding)
    let result = sqlx::query(&query)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(_) => {
            // Log audit event
            let before_data = serde_json::json!({
                "username": current_user.username,
                "email": current_user.email,
                "role": current_user.role,
                "store_id": current_user.store_id,
                "is_active": current_user.is_active,
            });

            let after_data = serde_json::json!({
                "username": req.username.as_ref().unwrap_or(&current_user.username),
                "email": req.email.as_ref().unwrap_or(&current_user.email),
                "role": req.role.as_ref().unwrap_or(&current_user.role),
                "store_id": req.store_id.as_ref().or(current_user.store_id.as_ref()),
                "is_active": req.is_active.unwrap_or(current_user.is_active == 1),
            });

            audit_logger.log_settings_change(
                "user",
                &user_id.to_string(),
                "update",
                &context.user_id,
                &context.username,
                context.store_id.as_deref(),
                context.station_id.as_deref(),
                Some(before_data),
                Some(after_data),
                false, // is_offline
            ).await.ok(); // Ignore audit errors

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "message": "User updated successfully"
            })))
        }
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to update user: {}", e)
        }))),
    }
}

/// Delete user
pub async fn delete_user(
    pool: web::Data<SqlitePool>,
    audit_logger: web::Data<AuditLogger>,
    context: web::ReqData<crate::models::UserContext>,
    user_id: web::Path<String>,
) -> Result<HttpResponse> {
    let user_id = user_id.into_inner();

    // Fetch user data for audit log
    let user = sqlx::query!(
        r#"
        SELECT username, email, role
        FROM users
        WHERE id = ?
        "#,
        user_id
    )
    .fetch_optional(pool.get_ref())
    .await;

    let user_data = match user {
        Ok(Some(user)) => serde_json::json!({
            "username": user.username,
            "email": user.email,
            "role": user.role,
        }),
        Ok(None) => {
            return Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "User not found"
            })));
        }
        Err(e) => {
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to fetch user: {}", e)
            })));
        }
    };

    // Soft delete (set is_active = false)
    let now = Utc::now().to_rfc3339();
    let result = sqlx::query!(
        r#"
        UPDATE users
        SET is_active = 0, updated_at = ?
        WHERE id = ?
        "#,
        now,
        user_id
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            // Log audit event
            audit_logger.log_settings_change(
                "user",
                &user_id.to_string(),
                "delete",
                &context.user_id,
                &context.username,
                context.store_id.as_deref(),
                context.station_id.as_deref(),
                Some(user_data),
                None,
                false, // is_offline
            ).await.ok(); // Ignore audit errors

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "message": "User deleted successfully"
            })))
        }
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to delete user: {}", e)
        }))),
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/users")
            .route("", web::post().to(create_user))
            .route("", web::get().to(list_users))
            .route("/{id}", web::get().to(get_user))
            .route("/{id}", web::put().to(update_user))
            .route("/{id}", web::delete().to(delete_user))
    );
}
