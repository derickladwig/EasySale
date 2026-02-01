use actix_web::{web, HttpResponse, Result, HttpMessage};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use chrono::Utc;
use crate::services::audit_logger::AuditLogger;
use crate::models::errors::ApiError;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub display_name: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
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
    pub first_name: Option<String>,
    pub last_name: Option<String>,
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
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub role: String,
    pub store_id: Option<String>,
    pub station_policy: Option<String>,
    pub station_id: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    pub last_login_at: Option<String>,
}

/// Query parameters for listing users
#[derive(Debug, Deserialize)]
pub struct ListUsersQuery {
    pub never_logged_in: Option<bool>,
    pub role: Option<String>,
    pub store_id: Option<String>,
    pub is_active: Option<bool>,
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

    // Role validation - support both frontend and backend role names
    let valid_roles = vec!["admin", "manager", "cashier", "inventory", "inventory_clerk", "specialist", "technician"];
    if !valid_roles.contains(&req.role.as_str()) {
        return Err(format!("Invalid role. Must be one of: {}", valid_roles.join(", ")));
    }

    // Store requirement for POS roles (including inventory_clerk alias)
    let pos_roles = vec!["cashier", "inventory", "inventory_clerk", "specialist", "technician"];
    if pos_roles.contains(&req.role.as_str()) && req.store_id.is_none() {
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
    let password_hash = crate::services::PasswordService::hash_password(&req.password)
        .map_err(|_| ApiError::internal("Password hashing failed"))?; // Secure bcrypt hashing
    let now = Utc::now().to_rfc3339();
    
    // Use tenant_id from context or default
    let tenant_id = context.tenant_id.clone().unwrap_or_else(|| "default".to_string());

    // Insert user with tenant_id
    let result = sqlx::query!(
        r#"
        INSERT INTO users (
            username, email, password_hash, display_name, role,
            store_id, station_policy, station_id, is_active,
            tenant_id, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        tenant_id,
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
    let user_row: Result<Option<(String, String, String, String, String, Option<String>, Option<String>, Option<String>, i32, String, String, Option<String>)>, _> = sqlx::query_as(
        r#"
        SELECT 
            id, username, email, 
            display_name,
            role,
            store_id,
            station_policy,
            station_id,
            is_active,
            created_at, updated_at,
            last_login_at
        FROM users
        WHERE id = ?
        "#
    )
    .bind(&user_id_value)
    .fetch_optional(pool.get_ref())
    .await;

    match user_row {
        Ok(Some((id, username, email, display_name, role, store_id, station_policy, station_id, is_active, created_at, updated_at, last_login_at))) => {
            Ok(HttpResponse::Ok().json(UserResponse {
                id,
                username,
                email,
                display_name,
                role,
                store_id,
                station_policy,
                station_id,
                is_active: is_active == 1,
                created_at,
                updated_at,
                last_login_at,
            }))
        },
        Ok(None) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "User not found"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to fetch user: {}", e)
        }))),
    }
}

/// List all users with optional filtering
pub async fn list_users(
    pool: web::Data<SqlitePool>,
    query: web::Query<ListUsersQuery>,
) -> Result<HttpResponse> {
    // Use parameterized queries to prevent SQL injection
    // Build conditions and parameters separately
    let mut conditions = Vec::new();
    let mut bind_values: Vec<String> = Vec::new();
    
    if query.never_logged_in == Some(true) {
        conditions.push("last_login_at IS NULL");
    }
    if let Some(ref role) = query.role {
        conditions.push("role = ?");
        bind_values.push(role.clone());
    }
    if let Some(ref store_id) = query.store_id {
        conditions.push("store_id = ?");
        bind_values.push(store_id.clone());
    }
    if let Some(is_active) = query.is_active {
        conditions.push("is_active = ?");
        bind_values.push(if is_active { "1".to_string() } else { "0".to_string() });
    }
    
    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!(" AND {}", conditions.join(" AND "))
    };
    
    let sql = format!(
        r#"
        SELECT 
            id, username, email,
            display_name,
            first_name,
            last_name,
            role,
            store_id,
            station_policy,
            station_id,
            is_active,
            created_at, updated_at,
            last_login_at
        FROM users
        WHERE 1=1 {}
        ORDER BY created_at DESC
        "#,
        where_clause
    );
    
    // Build query with proper parameter binding
    let mut query_builder = sqlx::query_as::<_, (String, String, String, String, Option<String>, Option<String>, String, Option<String>, Option<String>, Option<String>, i32, String, String, Option<String>)>(&sql);
    
    for value in bind_values {
        query_builder = query_builder.bind(value);
    }
    
    let users = query_builder.fetch_all(pool.get_ref()).await;

    match users {
        Ok(rows) => {
            let users: Vec<UserResponse> = rows.into_iter().map(|(id, username, email, display_name, first_name, last_name, role, store_id, station_policy, station_id, is_active, created_at, updated_at, last_login_at)| {
                UserResponse {
                    id,
                    username,
                    email,
                    display_name,
                    first_name,
                    last_name,
                    role,
                    store_id,
                    station_policy,
                    station_id,
                    is_active: is_active == 1,
                    created_at,
                    updated_at,
                    last_login_at,
                }
            }).collect();
            Ok(HttpResponse::Ok().json(users))
        }
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
    if let Some(first_name) = &req.first_name {
        updates.push("first_name = ?");
        params.push(first_name.clone());
    }
    if let Some(last_name) = &req.last_name {
        updates.push("last_name = ?");
        params.push(last_name.clone());
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
    
    // Add user_id as the last parameter for WHERE clause
    params.push(user_id.clone());

    let query = format!(
        "UPDATE users SET {} WHERE id = ?",
        updates.join(", ")
    );

    // Execute update with proper parameter binding
    let mut query_builder = sqlx::query(&query);
    for param in &params {
        query_builder = query_builder.bind(param);
    }
    
    let result = query_builder.execute(pool.get_ref()).await;

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


// ============================================================================
// First Admin Creation (No Auth Required - Fresh Install Only)
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct CreateFirstAdminRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub display_name: Option<String>,
}

/// Create the first admin user during fresh install
/// This endpoint does NOT require authentication but will fail if any admin already exists
pub async fn create_first_admin(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateFirstAdminRequest>,
) -> Result<HttpResponse> {
    // Check if any admin user already exists
    let existing_admin = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = 1"
    )
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    if existing_admin > 0 {
        return Ok(HttpResponse::Conflict().json(serde_json::json!({
            "error": "An admin user already exists. Use the regular user creation endpoint."
        })));
    }

    // Validate request
    if req.username.len() < 3 {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Username must be at least 3 characters"
        })));
    }

    if req.password.len() < 8 {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Password must be at least 8 characters"
        })));
    }

    if !req.email.contains('@') {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Invalid email address"
        })));
    }

    // Hash password
    let password_hash = crate::services::PasswordService::hash_password(&req.password)
        .map_err(|_| ApiError::internal("Password hashing failed"))?;
    
    let now = Utc::now().to_rfc3339();
    let display_name = req.display_name.clone().unwrap_or_else(|| req.username.clone());
    let user_id = uuid::Uuid::new_v4().to_string();
    let tenant_id = "default"; // First admin gets default tenant - must match TEST_TENANT_ID

    // Insert admin user
    let result = sqlx::query(
        r#"
        INSERT INTO users (
            id, tenant_id, username, email, password_hash, display_name, role,
            is_active, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'admin', 1, ?, ?)
        "#
    )
    .bind(&user_id)
    .bind(tenant_id)
    .bind(&req.username)
    .bind(&req.email)
    .bind(&password_hash)
    .bind(&display_name)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            tracing::info!("First admin user created: {}", req.username);
            Ok(HttpResponse::Created().json(serde_json::json!({
                "id": user_id,
                "username": req.username,
                "email": req.email,
                "role": "admin",
                "message": "First admin user created successfully"
            })))
        }
        Err(e) => {
            if e.to_string().contains("UNIQUE constraint failed") {
                Ok(HttpResponse::Conflict().json(serde_json::json!({
                    "error": "Username or email already exists"
                })))
            } else {
                tracing::error!("Failed to create first admin: {}", e);
                Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to create admin user: {}", e)
                })))
            }
        }
    }
}

/// Request body for password change
#[derive(Debug, Deserialize)]
pub struct PasswordChangeRequest {
    pub current_password: String,
    pub new_password: String,
}

/// PUT /api/users/password
/// Change the current user's password
pub async fn change_password(
    pool: web::Data<SqlitePool>,
    req: actix_web::HttpRequest,
    body: web::Json<PasswordChangeRequest>,
) -> Result<HttpResponse> {
    // Get current user from context
    let user_ctx = req.extensions()
        .get::<crate::models::UserContext>()
        .cloned();
    
    let user_id = match user_ctx {
        Some(ctx) => ctx.user_id,
        None => {
            return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Not authenticated"
            })));
        }
    };

    // Validate new password
    if body.new_password.len() < 8 {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "New password must be at least 8 characters"
        })));
    }

    // Get current password hash
    let user: Option<(String,)> = sqlx::query_as(
        "SELECT password_hash FROM users WHERE id = ?"
    )
    .bind(&user_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?;

    let current_hash = match user {
        Some((hash,)) => hash,
        None => {
            return Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "User not found"
            })));
        }
    };

    // Verify current password
    let is_valid = crate::services::PasswordService::verify_password(&body.current_password, &current_hash)
        .unwrap_or(false);

    if !is_valid {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Current password is incorrect"
        })));
    }

    // Hash new password
    let new_hash = crate::services::PasswordService::hash_password(&body.new_password)
        .map_err(|_| ApiError::internal("Password hashing failed"))?;

    // Update password
    let now = Utc::now().to_rfc3339();
    sqlx::query("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
        .bind(&new_hash)
        .bind(&now)
        .bind(&user_id)
        .execute(pool.get_ref())
        .await
        .map_err(|e| ApiError::internal(format!("Failed to update password: {}", e)))?;

    tracing::info!("Password changed for user: {}", user_id);
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Password changed successfully"
    })))
}

/// Request body for admin password reset
#[derive(Debug, Deserialize)]
pub struct AdminPasswordResetRequest {
    pub new_password: String,
}

/// POST /api/users/{id}/reset-password
/// Admin endpoint to reset another user's password
pub async fn reset_user_password(
    pool: web::Data<SqlitePool>,
    audit_logger: web::Data<AuditLogger>,
    context: web::ReqData<crate::models::UserContext>,
    user_id: web::Path<String>,
    body: web::Json<AdminPasswordResetRequest>,
) -> Result<HttpResponse> {
    let target_user_id = user_id.into_inner();
    
    // Validate new password
    if body.new_password.len() < 8 {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "New password must be at least 8 characters"
        })));
    }

    // Check if target user exists
    let user_exists: Option<(String,)> = sqlx::query_as(
        "SELECT username FROM users WHERE id = ?"
    )
    .bind(&target_user_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?;

    let target_username = match user_exists {
        Some((username,)) => username,
        None => {
            return Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "User not found"
            })));
        }
    };

    // Hash new password
    let new_hash = crate::services::PasswordService::hash_password(&body.new_password)
        .map_err(|_| ApiError::internal("Password hashing failed"))?;

    // Update password
    let now = Utc::now().to_rfc3339();
    sqlx::query("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
        .bind(&new_hash)
        .bind(&now)
        .bind(&target_user_id)
        .execute(pool.get_ref())
        .await
        .map_err(|e| ApiError::internal(format!("Failed to reset password: {}", e)))?;

    // Log audit event
    audit_logger.log_settings_change(
        "user",
        &target_user_id,
        "password_reset",
        &context.user_id,
        &context.username,
        context.store_id.as_deref(),
        context.station_id.as_deref(),
        None,
        Some(serde_json::json!({
            "target_user": target_username,
            "reset_by": context.username
        })),
        false,
    ).await.ok();

    tracing::info!("Password reset for user {} by admin {}", target_user_id, context.username);
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Password reset successfully"
    })))
}
