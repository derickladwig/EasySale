use actix_web::{post, web, HttpResponse};
use sqlx::SqlitePool;
use serde::Deserialize;

use crate::models::ApiError;
use crate::services::credential_service::{CredentialService, PlatformCredentials};
use crate::connectors::supabase::client::{SupabaseClient, SupabaseConfig};

#[derive(Debug, Deserialize)]
pub struct UpsertRequest {
    pub tenant_id: String,
    pub table: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct BulkUpsertRequest {
    pub tenant_id: String,
    pub table: String,
    pub records: Vec<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRequest {
    pub tenant_id: String,
    pub table: String,
    pub filter: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct DeleteRequest {
    pub tenant_id: String,
    pub table: String,
    pub filter: String,
}

/// POST /api/supabase/upsert
/// Upsert a record to Supabase
#[post("/api/supabase/upsert")]
pub async fn upsert_record(
    pool: web::Data<SqlitePool>,
    req: web::Json<UpsertRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    // Get Supabase credentials
    let credentials = credential_service.get_credentials(&req.tenant_id, "supabase").await?;
    
    let (project_url, service_role_key) = match credentials {
        Some(PlatformCredentials::Supabase(creds)) => (creds.project_url.clone(), creds.service_role_key.clone()),
        _ => return Err(ApiError::internal("Invalid Supabase credentials")),
    };
    
    // Create Supabase client
    let config = SupabaseConfig::new(project_url, service_role_key);
    let client = SupabaseClient::new(config)?;
    
    // Upsert record
    let response = client.post(&req.table, &req.data).await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(ApiError::internal(format!("Supabase upsert failed: {}", error_text)));
    }
    
    let body = response.text().await
        .map_err(|e| ApiError::internal(format!("Failed to read response: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "data": serde_json::from_str::<serde_json::Value>(&body).ok()
    })))
}

/// POST /api/supabase/bulk-upsert
/// Bulk upsert records to Supabase
#[post("/api/supabase/bulk-upsert")]
pub async fn bulk_upsert_records(
    pool: web::Data<SqlitePool>,
    req: web::Json<BulkUpsertRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    // Get Supabase credentials
    let credentials = credential_service.get_credentials(&req.tenant_id, "supabase").await?;
    
    let (project_url, service_role_key) = match credentials {
        Some(PlatformCredentials::Supabase(creds)) => (creds.project_url.clone(), creds.service_role_key.clone()),
        _ => return Err(ApiError::internal("Invalid Supabase credentials")),
    };
    
    // Create Supabase client
    let config = SupabaseConfig::new(project_url, service_role_key);
    let client = SupabaseClient::new(config)?;
    
    // Bulk upsert records
    let response = client.post(&req.table, &req.records).await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(ApiError::internal(format!("Supabase bulk upsert failed: {}", error_text)));
    }
    
    let body = response.text().await
        .map_err(|e| ApiError::internal(format!("Failed to read response: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "records_count": req.records.len(),
        "data": serde_json::from_str::<serde_json::Value>(&body).ok()
    })))
}

/// POST /api/supabase/update
/// Update record in Supabase using PATCH
#[post("/api/supabase/update")]
pub async fn update_record(
    pool: web::Data<SqlitePool>,
    req: web::Json<UpdateRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    // Get Supabase credentials
    let credentials = credential_service.get_credentials(&req.tenant_id, "supabase").await?;
    
    let (project_url, service_role_key) = match credentials {
        Some(PlatformCredentials::Supabase(creds)) => (creds.project_url.clone(), creds.service_role_key.clone()),
        _ => return Err(ApiError::internal("Invalid Supabase credentials")),
    };
    
    // Create Supabase client
    let config = SupabaseConfig::new(project_url, service_role_key);
    let client = SupabaseClient::new(config)?;
    
    // Update record using PATCH
    let endpoint = format!("{}?{}", req.table, req.filter);
    let response = client.patch(&endpoint, &req.data).await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(ApiError::internal(format!("Supabase update failed: {}", error_text)));
    }
    
    let body = response.text().await
        .map_err(|e| ApiError::internal(format!("Failed to read response: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "data": serde_json::from_str::<serde_json::Value>(&body).ok()
    })))
}

/// POST /api/supabase/delete
/// Delete record from Supabase
#[post("/api/supabase/delete")]
pub async fn delete_record(
    pool: web::Data<SqlitePool>,
    req: web::Json<DeleteRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    // Get Supabase credentials
    let credentials = credential_service.get_credentials(&req.tenant_id, "supabase").await?;
    
    let (project_url, service_role_key) = match credentials {
        Some(PlatformCredentials::Supabase(creds)) => (creds.project_url.clone(), creds.service_role_key.clone()),
        _ => return Err(ApiError::internal("Invalid Supabase credentials")),
    };
    
    // Create Supabase client
    let config = SupabaseConfig::new(project_url, service_role_key);
    let client = SupabaseClient::new(config)?;
    
    // Delete record
    let endpoint = format!("{}?{}", req.table, req.filter);
    let response = client.delete(&endpoint).await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(ApiError::internal(format!("Supabase delete failed: {}", error_text)));
    }
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": "Record deleted successfully"
    })))
}

/// Configure Supabase operations routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(upsert_record)
        .service(bulk_upsert_records)
        .service(update_record)
        .service(delete_record);
}
