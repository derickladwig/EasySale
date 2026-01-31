use actix_web::{web, HttpResponse, Result, HttpMessage};
use actix_multipart::Multipart;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::io::Write;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize)]
pub struct CompanyInfo {
    pub name: String,
    pub address: String,
    pub city: String,
    pub state: String,
    pub zip: String,
    pub country: String,
    pub phone: String,
    pub email: String,
    pub website: String,
    pub logo_url: Option<String>,
}

/// GET /api/company/info
/// Get company information from settings
pub async fn get_company_info(
    pool: web::Data<SqlitePool>,
    req: actix_web::HttpRequest,
) -> Result<HttpResponse> {
    let tenant_id = req.extensions()
        .get::<crate::models::UserContext>()
        .map(|ctx| ctx.tenant_id.clone())
        .unwrap_or_else(|| "default".to_string());

    // Try to get company info from settings
    let result: Option<(String,)> = sqlx::query_as(
        "SELECT value FROM settings WHERE tenant_id = ? AND key = 'company_info'"
    )
    .bind(&tenant_id)
    .fetch_optional(pool.get_ref())
    .await
    .ok()
    .flatten();

    match result {
        Some((json_value,)) => {
            match serde_json::from_str::<CompanyInfo>(&json_value) {
                Ok(info) => Ok(HttpResponse::Ok().json(info)),
                Err(_) => Ok(HttpResponse::Ok().json(CompanyInfo::default())),
            }
        }
        None => {
            // Return default/empty company info
            Ok(HttpResponse::Ok().json(CompanyInfo::default()))
        }
    }
}

/// PUT /api/company/info
/// Update company information
pub async fn update_company_info(
    pool: web::Data<SqlitePool>,
    req: actix_web::HttpRequest,
    body: web::Json<CompanyInfo>,
) -> Result<HttpResponse> {
    let tenant_id = req.extensions()
        .get::<crate::models::UserContext>()
        .map(|ctx| ctx.tenant_id.clone())
        .unwrap_or_else(|| "default".to_string());

    let json_value = serde_json::to_string(&body.into_inner())
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let now = Utc::now().to_rfc3339();

    // Upsert company info in settings
    sqlx::query(
        r#"
        INSERT INTO settings (tenant_id, key, value, updated_at)
        VALUES (?, 'company_info', ?, ?)
        ON CONFLICT(tenant_id, key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
        "#
    )
    .bind(&tenant_id)
    .bind(&json_value)
    .bind(&now)
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Company information updated successfully"
    })))
}

/// POST /api/company/logo
/// Upload company logo
pub async fn upload_company_logo(
    pool: web::Data<SqlitePool>,
    req: actix_web::HttpRequest,
    mut payload: Multipart,
) -> Result<HttpResponse> {
    let tenant_id = req.extensions()
        .get::<crate::models::UserContext>()
        .map(|ctx| ctx.tenant_id.clone())
        .unwrap_or_else(|| "default".to_string());

    // Create uploads directory if it doesn't exist
    let upload_dir = std::path::Path::new("./data/uploads/logos");
    if !upload_dir.exists() {
        std::fs::create_dir_all(upload_dir)
            .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
    }

    let mut logo_url: Option<String> = None;

    // Process multipart form
    while let Some(item) = payload.next().await {
        let mut field = item.map_err(|e| actix_web::error::ErrorBadRequest(e))?;
        
        let content_disposition = field.content_disposition();
        let filename = content_disposition
            .get_filename()
            .map(|f| f.to_string())
            .unwrap_or_else(|| format!("logo_{}.png", tenant_id));

        // Generate unique filename
        let ext = std::path::Path::new(&filename)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("png");
        let unique_filename = format!("{}_{}.{}", tenant_id, Utc::now().timestamp(), ext);
        let filepath = upload_dir.join(&unique_filename);

        // Write file
        let mut file = std::fs::File::create(&filepath)
            .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

        while let Some(chunk) = field.next().await {
            let data = chunk.map_err(|e| actix_web::error::ErrorBadRequest(e))?;
            file.write_all(&data)
                .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
        }

        // Generate URL for the logo
        logo_url = Some(format!("/uploads/logos/{}", unique_filename));
    }

    match logo_url {
        Some(url) => {
            // Update company info with new logo URL
            let now = Utc::now().to_rfc3339();
            
            // Get existing company info
            let existing: Option<(String,)> = sqlx::query_as(
                "SELECT value FROM settings WHERE tenant_id = ? AND key = 'company_info'"
            )
            .bind(&tenant_id)
            .fetch_optional(pool.get_ref())
            .await
            .ok()
            .flatten();

            let mut info = existing
                .and_then(|(json,)| serde_json::from_str::<CompanyInfo>(&json).ok())
                .unwrap_or_default();
            
            info.logo_url = Some(url.clone());

            let json_value = serde_json::to_string(&info)
                .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

            sqlx::query(
                r#"
                INSERT INTO settings (tenant_id, key, value, updated_at)
                VALUES (?, 'company_info', ?, ?)
                ON CONFLICT(tenant_id, key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = excluded.updated_at
                "#
            )
            .bind(&tenant_id)
            .bind(&json_value)
            .bind(&now)
            .execute(pool.get_ref())
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "url": url,
                "message": "Logo uploaded successfully"
            })))
        }
        None => {
            Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": "No logo file provided"
            })))
        }
    }
}

impl Default for CompanyInfo {
    fn default() -> Self {
        Self {
            name: String::new(),
            address: String::new(),
            city: String::new(),
            state: String::new(),
            zip: String::new(),
            country: String::new(),
            phone: String::new(),
            email: String::new(),
            website: String::new(),
            logo_url: None,
        }
    }
}
