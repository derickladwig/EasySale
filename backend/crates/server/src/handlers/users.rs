use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub username: String,
    pub name: String,
    pub email: String,
    pub role: String,
    pub status: String,
    pub last_login: String,
}

pub async fn get_users(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse> {
    let users = sqlx::query_as!(
        User,
        r#"
        SELECT 
            id as "id!",
            username as "username!",
            COALESCE(display_name, username) as "name!",
            email as "email!",
            role as "role!",
            CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END as "status!",
            datetime('now') as "last_login!"
        FROM users
        WHERE is_active IN (0, 1)
        ORDER BY username
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    Ok(HttpResponse::Ok().json(users))
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub name: String,
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

pub async fn update_profile(
    pool: web::Data<SqlitePool>,
    user_id: web::Path<String>,
    req: web::Json<UpdateProfileRequest>,
) -> Result<HttpResponse> {
    let result = sqlx::query(
        "UPDATE users SET display_name = ?, email = ? WHERE id = ?"
    )
    .bind(&req.name)
    .bind(&req.email)
    .bind(user_id.as_str())
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "message": "Profile updated successfully"
        }))),
        Err(_) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to update profile"
        })))
    }
}

pub async fn change_password(
    pool: web::Data<SqlitePool>,
    user_id: web::Path<String>,
    req: web::Json<ChangePasswordRequest>,
) -> Result<HttpResponse> {
    // Get current password hash
    let user = sqlx::query_as::<_, (Option<String>,)>(
        "SELECT password_hash FROM users WHERE id = ?"
    )
    .bind(user_id.as_str())
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Database error"))?;

    let password_hash = match user {
        Some((hash,)) => hash.unwrap_or_default(),
        None => return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "User not found"
        })))
    };

    // Verify current password using bcrypt
    if !bcrypt::verify(&req.current_password, &password_hash).unwrap_or(false) {
        return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "Current password is incorrect"
        })));
    }

    // Hash new password using bcrypt
    let new_hash = match bcrypt::hash(&req.new_password, bcrypt::DEFAULT_COST) {
        Ok(hash) => hash,
        Err(_) => return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to hash password"
        }))),
    };

    // Update password
    let result = sqlx::query(
        "UPDATE users SET password_hash = ? WHERE id = ?"
    )
    .bind(&new_hash)
    .bind(user_id.as_str())
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "message": "Password changed successfully"
        }))),
        Err(_) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to change password"
        })))
    }
}
