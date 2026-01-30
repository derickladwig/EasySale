use actix_web::{web, HttpResponse};
use actix_multipart::Multipart;
use futures_util::StreamExt;
use serde::Serialize;
use sqlx::SqlitePool;
use std::fs;
use std::io::{Write, Read};
use std::path::PathBuf;
use sha2::Digest;
use crate::services::RestoreService;

/// Check if this is a fresh install (empty or missing database)
#[derive(Debug, Serialize)]
pub struct FreshInstallCheckResponse {
    pub is_fresh_install: bool,
    pub reason: Option<String>,
}

/// Check if database is empty or missing
pub async fn check_fresh_install(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, actix_web::Error> {
    // Check if database has any data
    let user_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(pool.get_ref())
        .await
        .unwrap_or(0);
    
    let product_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM products")
        .fetch_one(pool.get_ref())
        .await
        .unwrap_or(0);
    
    let is_fresh = user_count == 0 && product_count == 0;
    
    let response = FreshInstallCheckResponse {
        is_fresh_install: is_fresh,
        reason: if is_fresh {
            Some("Database is empty - no users or products found".to_string())
        } else {
            None
        },
    };
    
    Ok(HttpResponse::Ok().json(response))
}

/// Upload and restore backup on fresh install
#[derive(Debug, Serialize)]
pub struct UploadRestoreResponse {
    pub success: bool,
    pub message: String,
    pub restore_job_id: Option<String>,
}

/// Handle multipart file upload and restore
pub async fn upload_and_restore(
    pool: web::Data<SqlitePool>,
    mut payload: Multipart,
) -> Result<HttpResponse, actix_web::Error> {
    // Get configuration from environment
    let backup_dir = std::env::var("BACKUP_ROOT")
        .unwrap_or_else(|_| "data/backups".to_string());
    let db_path = std::env::var("DATABASE_PATH")
        .unwrap_or_else(|_| "data/store_local.db".to_string());
    let files_dir = std::env::var("UPLOADS_DIR")
        .unwrap_or_else(|_| "data/uploads".to_string());
    
    // Create temporary directory for uploaded file
    let temp_dir = std::env::temp_dir();
    let upload_filename = format!("restore_{}.zip", chrono::Utc::now().timestamp());
    let upload_path = temp_dir.join(&upload_filename);
    
    // Read multipart data
    let mut file_data = Vec::new();
    
    while let Some(item) = payload.next().await {
        let mut field = item.map_err(|e| {
            eprintln!("Failed to read multipart field: {}", e);
            actix_web::error::ErrorBadRequest("Invalid multipart data")
        })?;
        
        // Read field data
        while let Some(chunk) = field.next().await {
            let data = chunk.map_err(|e| {
                eprintln!("Failed to read chunk: {}", e);
                actix_web::error::ErrorBadRequest("Failed to read file data")
            })?;
            file_data.extend_from_slice(&data);
        }
    }
    
    if file_data.is_empty() {
        return Ok(HttpResponse::BadRequest().json(UploadRestoreResponse {
            success: false,
            message: "No file data received".to_string(),
            restore_job_id: None,
        }));
    }
    
    // Write to temporary file
    let mut file = fs::File::create(&upload_path).map_err(|e| {
        eprintln!("Failed to create temp file: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to save uploaded file")
    })?;
    
    file.write_all(&file_data).map_err(|e| {
        eprintln!("Failed to write file data: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to save uploaded file")
    })?;
    
    // Create a backup job record for the uploaded file
    let backup_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    
    // Calculate checksum of uploaded file
    let checksum = {
        let mut file = fs::File::open(&upload_path).map_err(|e| {
            eprintln!("Failed to open uploaded file for checksum: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to validate uploaded file")
        })?;
        let mut hasher = sha2::Sha256::new();
        let mut buffer = [0u8; 8192];
        loop {
            let n = file.read(&mut buffer).map_err(|e| {
                eprintln!("Failed to read file for checksum: {}", e);
                actix_web::error::ErrorInternalServerError("Failed to validate uploaded file")
            })?;
            if n == 0 {
                break;
            }
            hasher.update(&buffer[..n]);
        }
        format!("{:x}", hasher.finalize())
    };
    
    // Copy uploaded file to backup directory
    let backup_path = PathBuf::from(&backup_dir).join(&upload_filename);
    fs::create_dir_all(&backup_dir).map_err(|e| {
        eprintln!("Failed to create backup directory: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to save backup")
    })?;
    
    fs::copy(&upload_path, &backup_path).map_err(|e| {
        eprintln!("Failed to copy backup to directory: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to save backup")
    })?;
    
    // Insert backup job record
    sqlx::query(
        "INSERT INTO backup_jobs (id, backup_type, status, started_at, completed_at, archive_path, checksum, created_at, updated_at, created_by)
         VALUES (?, 'full', 'completed', ?, ?, ?, ?, ?, ?, 'system')"
    )
    .bind(&backup_id)
    .bind(&now)
    .bind(&now)
    .bind(&upload_filename)
    .bind(&checksum)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to create backup job record: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to save backup metadata")
    })?;
    
    // Validate and restore
    let restore_service = RestoreService::new(pool.get_ref().clone(), &backup_dir);
    
    // Validate archive
    if let Err(e) = restore_service.validate_archive(&backup_id).await {
        // Clean up temp file
        let _ = fs::remove_file(&upload_path);
        let _ = fs::remove_file(&backup_path);
        
        return Ok(HttpResponse::BadRequest().json(UploadRestoreResponse {
            success: false,
            message: format!("Archive validation failed: {}", e),
            restore_job_id: None,
        }));
    }
    
    // Perform restore
    match restore_service.restore_backup(
        &backup_id,
        "default", // store_id
        "default", // tenant_id
        &db_path,
        &files_dir,
        false, // create_pre_restore_snapshot (not needed for fresh install)
        false, // strict_delete
        Some("system"),
    ).await {
        Ok(restore_job) => {
            // Clean up temp file
            let _ = fs::remove_file(&upload_path);
            
            Ok(HttpResponse::Ok().json(UploadRestoreResponse {
                success: true,
                message: "Restore completed successfully".to_string(),
                restore_job_id: Some(restore_job.id),
            }))
        }
        Err(e) => {
            // Clean up temp file
            let _ = fs::remove_file(&upload_path);
            
            Ok(HttpResponse::InternalServerError().json(UploadRestoreResponse {
                success: false,
                message: format!("Restore failed: {}", e),
                restore_job_id: None,
            }))
        }
    }
}

/// Get restore progress for fresh install
#[derive(Debug, Serialize)]
pub struct RestoreProgressResponse {
    pub status: String,
    pub progress_percent: i32,
    pub message: String,
    pub completed_at: Option<String>,
    pub error_message: Option<String>,
}

pub async fn get_restore_progress(
    pool: web::Data<SqlitePool>,
    restore_job_id: web::Path<String>,
) -> Result<HttpResponse, actix_web::Error> {
    let job_id = restore_job_id.into_inner();
    
    // Fetch restore job using query_as to avoid compile-time checking
    let job = sqlx::query_as::<_, (String, Option<String>, Option<String>)>(
        "SELECT status, completed_at, error_message FROM restore_jobs WHERE id = ?"
    )
    .bind(&job_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch restore job: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to fetch restore progress")
    })?;
    
    match job {
        Some((status, completed_at, error_message)) => {
            let progress = match status.as_str() {
                "pending" => 0,
                "validating" => 10,
                "creating_snapshot" => 20,
                "restoring_database" => 50,
                "restoring_files" => 75,
                "completed" => 100,
                "failed" => 0,
                _ => 0,
            };
            
            let message = match status.as_str() {
                "pending" => "Restore queued",
                "validating" => "Validating backup archive",
                "creating_snapshot" => "Creating pre-restore snapshot",
                "restoring_database" => "Restoring database",
                "restoring_files" => "Restoring files",
                "completed" => "Restore completed successfully",
                "failed" => "Restore failed",
                _ => "Unknown status",
            };
            
            Ok(HttpResponse::Ok().json(RestoreProgressResponse {
                status,
                progress_percent: progress,
                message: message.to_string(),
                completed_at,
                error_message,
            }))
        }
        None => {
            Ok(HttpResponse::NotFound().json(RestoreProgressResponse {
                status: "not_found".to_string(),
                progress_percent: 0,
                message: "Restore job not found".to_string(),
                completed_at: None,
                error_message: None,
            }))
        }
    }
}
