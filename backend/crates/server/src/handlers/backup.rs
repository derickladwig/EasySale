use crate::models::backup::{BackupJob, BackupSettings};
use crate::services::{BackupService, RetentionService, AuditLogger};
use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

/// Request to create a backup
#[derive(Debug, Deserialize)]
pub struct CreateBackupRequest {
    pub backup_type: String,  // 'db_full', 'db_incremental', 'file', 'full'
    pub store_id: String,
    pub tenant_id: String,
    pub created_by: Option<String>,
}

/// Response with backup job details
#[derive(Debug, Serialize)]
pub struct BackupJobResponse {
    pub id: String,
    pub backup_type: String,
    pub status: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub size_bytes: Option<i64>,
    pub checksum: Option<String>,
    pub archive_path: Option<String>,
    pub error_message: Option<String>,
    pub snapshot_method: Option<String>,
    pub files_included: i32,
    pub files_changed: i32,
    pub files_deleted: i32,
    pub backup_chain_id: Option<String>,
    pub is_base_backup: bool,
    pub incremental_number: i32,
    pub created_at: String,
}

impl From<BackupJob> for BackupJobResponse {
    fn from(job: BackupJob) -> Self {
        Self {
            id: job.id,
            backup_type: job.backup_type,
            status: job.status,
            started_at: job.started_at,
            completed_at: job.completed_at,
            size_bytes: job.size_bytes,
            checksum: job.checksum,
            archive_path: job.archive_path,
            error_message: job.error_message,
            snapshot_method: job.snapshot_method,
            files_included: job.files_included,
            files_changed: job.files_changed,
            files_deleted: job.files_deleted,
            backup_chain_id: job.backup_chain_id,
            is_base_backup: job.is_base_backup,
            incremental_number: job.incremental_number,
            created_at: job.created_at,
        }
    }
}

/// Backup overview response
#[derive(Debug, Serialize)]
pub struct BackupOverviewResponse {
    pub last_db_backup: Option<BackupJobResponse>,
    pub last_file_backup: Option<BackupJobResponse>,
    pub last_full_backup: Option<BackupJobResponse>,
    pub total_backups: i64,
    pub total_size_bytes: i64,
    pub settings: BackupSettings,
}

/// Get backup overview
pub async fn get_overview(
    pool: web::Data<SqlitePool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, actix_web::Error> {
    let store_id = query.get("store_id").map(|s| s.as_str()).unwrap_or("store-1");
    
    // Get last DB backup
    let last_db = sqlx::query_as::<_, BackupJob>(
        "SELECT * FROM backup_jobs 
         WHERE store_id = ? AND backup_type IN ('db_full', 'db_incremental') 
         AND status = 'completed'
         ORDER BY created_at DESC LIMIT 1"
    )
    .bind(store_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch last DB backup: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to fetch backup overview")
    })?;
    
    // Get last file backup
    let last_file = sqlx::query_as::<_, BackupJob>(
        "SELECT * FROM backup_jobs 
         WHERE store_id = ? AND backup_type = 'file' 
         AND status = 'completed'
         ORDER BY created_at DESC LIMIT 1"
    )
    .bind(store_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch last file backup: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to fetch backup overview")
    })?;
    
    // Get last full backup
    let last_full = sqlx::query_as::<_, BackupJob>(
        "SELECT * FROM backup_jobs 
         WHERE store_id = ? AND backup_type = 'full' 
         AND status = 'completed'
         ORDER BY created_at DESC LIMIT 1"
    )
    .bind(store_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch last full backup: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to fetch backup overview")
    })?;
    
    // Get total stats
    let (total_backups, total_size): (i64, Option<i64>) = sqlx::query_as(
        "SELECT COUNT(*), COALESCE(SUM(size_bytes), 0) 
         FROM backup_jobs 
         WHERE store_id = ? AND status = 'completed'"
    )
    .bind(store_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch backup stats: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to fetch backup overview")
    })?;
    
    // Get settings
    let settings = sqlx::query_as::<_, BackupSettings>(
        "SELECT * FROM backup_settings WHERE id = 1"
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch backup settings: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to fetch backup overview")
    })?;
    
    let response = BackupOverviewResponse {
        last_db_backup: last_db.map(|j| j.into()),
        last_file_backup: last_file.map(|j| j.into()),
        last_full_backup: last_full.map(|j| j.into()),
        total_backups,
        total_size_bytes: total_size.unwrap_or(0),
        settings,
    };
    
    Ok(HttpResponse::Ok().json(response))
}

/// Create a new backup
pub async fn create_backup(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateBackupRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    // Validate backup type
    match req.backup_type.as_str() {
        "db_full" | "db_incremental" | "file" | "full" => {}
        _ => {
            return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Invalid backup_type. Must be one of: db_full, db_incremental, file, full"
            })));
        }
    }
    
    // Create backup service
    let backup_service = BackupService::new(pool.get_ref().clone());
    
    // Create backup
    match backup_service
        .create_backup(&req.backup_type, &req.store_id, &req.tenant_id, req.created_by.clone())
        .await
    {
        Ok(job) => {
            // Log backup creation
            let audit_logger = AuditLogger::new(pool.get_ref().clone());
            let backup_data = serde_json::json!({
                "backup_id": &job.id,
                "backup_type": &job.backup_type,
                "store_id": &req.store_id,
            });
            
            let _ = audit_logger.log_create(
                "backup",
                &job.id,
                backup_data,
                req.created_by.as_deref(),
                false,
                &req.store_id,
            ).await;
            
            let response: BackupJobResponse = job.into();
            Ok(HttpResponse::Ok().json(response))
        }
        Err(e) => {
            eprintln!("Backup creation failed: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Backup creation failed: {}", e)
            })))
        }
    }
}

/// List all backups
pub async fn list_backups(
    pool: web::Data<SqlitePool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, actix_web::Error> {
    let store_id = query.get("store_id").map(|s| s.as_str()).unwrap_or("store-1");
    
    let jobs = sqlx::query_as::<_, BackupJob>(
        "SELECT * FROM backup_jobs WHERE store_id = ? ORDER BY created_at DESC LIMIT 100"
    )
    .bind(store_id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch backups: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to fetch backups")
    })?;
    
    let responses: Vec<BackupJobResponse> = jobs.into_iter().map(|j| j.into()).collect();
    Ok(HttpResponse::Ok().json(responses))
}

/// Get backup by ID
pub async fn get_backup(
    pool: web::Data<SqlitePool>,
    backup_id: web::Path<String>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, actix_web::Error> {
    let store_id = query.get("store_id").map(|s| s.as_str()).unwrap_or("store-1");
    
    let job = sqlx::query_as::<_, BackupJob>(
        "SELECT * FROM backup_jobs WHERE id = ? AND store_id = ?"
    )
    .bind(backup_id.as_str())
    .bind(store_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch backup: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to fetch backup")
    })?;
    
    match job {
        Some(job) => {
            let response: BackupJobResponse = job.into();
            Ok(HttpResponse::Ok().json(response))
        }
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Backup not found"
        }))),
    }
}

/// Delete backup by ID
pub async fn delete_backup(
    pool: web::Data<SqlitePool>,
    backup_id: web::Path<String>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, actix_web::Error> {
    let store_id = query.get("store_id").map(|s| s.as_str()).unwrap_or("store-1");
    let user_id = query.get("user_id").map(|s| s.as_str());
    
    // Get backup to check if it exists and get archive path
    let job = sqlx::query_as::<_, BackupJob>(
        "SELECT * FROM backup_jobs WHERE id = ? AND store_id = ?"
    )
    .bind(backup_id.as_str())
    .bind(store_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch backup: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to fetch backup")
    })?;
    
    let job = match job {
        Some(job) => job,
        None => {
            return Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "Backup not found"
            })));
        }
    };
    
    // Log backup deletion before deleting
    let audit_logger = AuditLogger::new(pool.get_ref().clone());
    let backup_data = serde_json::json!({
        "backup_id": &job.id,
        "backup_type": &job.backup_type,
        "created_at": &job.created_at,
        "size_bytes": job.size_bytes,
        "archive_path": &job.archive_path,
    });
    
    let _ = audit_logger.log_delete(
        "backup",
        &job.id,
        backup_data,
        user_id,
        false,
        store_id,
    ).await;
    
    // Delete archive file if it exists
    if let Some(archive_path) = &job.archive_path {
        if let Err(e) = std::fs::remove_file(archive_path) {
            eprintln!("Failed to delete archive file: {}", e);
            // Continue anyway - database record is more important
        }
    }
    
    // Delete from database (cascades to manifests and dest_objects)
    sqlx::query("DELETE FROM backup_jobs WHERE id = ?")
        .bind(backup_id.as_str())
        .execute(pool.get_ref())
        .await
        .map_err(|e| {
            eprintln!("Failed to delete backup: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to delete backup")
        })?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Backup deleted successfully"
    })))
}

/// Get backup settings
pub async fn get_settings(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, actix_web::Error> {
    let settings = sqlx::query_as::<_, BackupSettings>(
        "SELECT * FROM backup_settings WHERE id = 1"
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch backup settings: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to fetch backup settings")
    })?;
    
    Ok(HttpResponse::Ok().json(settings))
}

/// Update backup settings
pub async fn update_settings(
    pool: web::Data<SqlitePool>,
    settings: web::Json<BackupSettings>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, actix_web::Error> {
    let user_id = query.get("user_id").map(|s| s.as_str());
    
    // Validate settings
    if let Err(e) = settings.validate() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": e
        })));
    }
    
    // Get old settings for audit log
    let old_settings = sqlx::query_as::<_, BackupSettings>(
        "SELECT * FROM backup_settings WHERE id = 1"
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch old settings: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to fetch old settings")
    })?;
    
    // Update settings
    sqlx::query(
        "UPDATE backup_settings SET
            db_backup_enabled = ?, db_incremental_schedule = ?, db_full_schedule = ?,
            db_retention_daily = ?, db_retention_weekly = ?, db_retention_monthly = ?,
            db_max_incrementals = ?, file_backup_enabled = ?, file_schedule = ?,
            file_retention_count = ?, file_include_paths = ?, file_exclude_patterns = ?,
            full_backup_enabled = ?, full_schedule = ?, full_retention_count = ?,
            backup_directory = ?, compression_enabled = ?, auto_upload_enabled = ?,
            updated_at = ?, updated_by = ?
        WHERE id = 1"
    )
    .bind(settings.db_backup_enabled)
    .bind(&settings.db_incremental_schedule)
    .bind(&settings.db_full_schedule)
    .bind(settings.db_retention_daily)
    .bind(settings.db_retention_weekly)
    .bind(settings.db_retention_monthly)
    .bind(settings.db_max_incrementals)
    .bind(settings.file_backup_enabled)
    .bind(&settings.file_schedule)
    .bind(settings.file_retention_count)
    .bind(&settings.file_include_paths)
    .bind(&settings.file_exclude_patterns)
    .bind(settings.full_backup_enabled)
    .bind(&settings.full_schedule)
    .bind(settings.full_retention_count)
    .bind(&settings.backup_directory)
    .bind(settings.compression_enabled)
    .bind(settings.auto_upload_enabled)
    .bind(chrono::Utc::now().to_rfc3339())
    .bind(user_id)
    .execute(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to update backup settings: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to update backup settings")
    })?;
    
    // Log settings change
    let audit_logger = AuditLogger::new(pool.get_ref().clone());
    let old_data = serde_json::to_value(&old_settings).unwrap_or(serde_json::json!({}));
    let new_data = serde_json::to_value(&*settings).unwrap_or(serde_json::json!({}));
    
    let _ = audit_logger.log_update(
        "backup_settings",
        "1",
        old_data,
        new_data,
        user_id,
        false,
        "system",
    ).await;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Backup settings updated successfully"
    })))
}

/// Enforce retention policies manually
pub async fn enforce_retention(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, actix_web::Error> {
    // Get settings
    let settings = sqlx::query_as::<_, BackupSettings>(
        "SELECT * FROM backup_settings WHERE id = 1"
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch backup settings: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to fetch backup settings")
    })?;
    
    // Create retention service
    let retention_service = RetentionService::new(pool.get_ref().clone());
    
    // Enforce retention
    match retention_service.enforce_all_retention_policies(&settings).await {
        Ok(deleted_ids) => {
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "message": "Retention policies enforced successfully",
                "deleted_count": deleted_ids.len(),
                "deleted_ids": deleted_ids
            })))
        }
        Err(e) => {
            eprintln!("Failed to enforce retention: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to enforce retention: {}", e)
            })))
        }
    }
}

// ============================================================================
// RESTORE HANDLERS
// ============================================================================

use crate::models::backup::RestoreJob;
use crate::services::RestoreService;

/// Request to restore a backup
#[derive(Debug, Deserialize)]
pub struct RestoreBackupRequest {
    pub restore_type: String,  // 'full', 'database_only', 'files_only'
    pub create_snapshot: Option<bool>,  // Default: true
    pub strict_delete: Option<bool>,  // Default: false
    pub tenant_id: String,
    pub created_by: String,
}

/// Response with restore job details
#[derive(Debug, Serialize)]
pub struct RestoreJobResponse {
    pub id: String,
    pub backup_job_id: String,
    pub restore_type: String,
    pub status: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub files_restored: i32,
    pub error_message: Option<String>,
    pub restore_point: Option<String>,
    pub pre_restore_snapshot_id: Option<String>,
    pub created_at: String,
    pub created_by: String,
}

impl From<RestoreJob> for RestoreJobResponse {
    fn from(job: RestoreJob) -> Self {
        Self {
            id: job.id,
            backup_job_id: job.backup_job_id,
            restore_type: job.restore_type,
            status: job.status,
            started_at: job.started_at,
            completed_at: job.completed_at,
            files_restored: job.files_restored,
            error_message: job.error_message,
            restore_point: job.restore_point,
            pre_restore_snapshot_id: job.pre_restore_snapshot_id,
            created_at: job.created_at,
            created_by: job.created_by,
        }
    }
}

/// Restore a backup
/// POST /api/backups/{backup_id}/restore
pub async fn restore_backup(
    pool: web::Data<SqlitePool>,
    backup_id: web::Path<String>,
    req: web::Json<RestoreBackupRequest>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, actix_web::Error> {
    let store_id = query.get("store_id").map(|s| s.as_str()).unwrap_or("store-1");
    
    // Validate restore type
    match req.restore_type.as_str() {
        "full" | "database_only" | "files_only" => {}
        _ => {
            return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Invalid restore_type. Must be one of: full, database_only, files_only"
            })));
        }
    }
    
    // Get backup to verify it exists
    let backup = sqlx::query_as::<_, BackupJob>(
        "SELECT * FROM backup_jobs WHERE id = ? AND store_id = ?"
    )
    .bind(backup_id.as_str())
    .bind(store_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch backup: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to fetch backup")
    })?;
    
    let backup = match backup {
        Some(b) => b,
        None => {
            return Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "Backup not found"
            })));
        }
    };
    
    // Verify backup is completed
    if backup.status != "completed" {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Cannot restore from incomplete backup"
        })));
    }
    
    // Create restore service
    let restore_service = RestoreService::new(
        pool.get_ref().clone(),
        "data/backups"  // TODO: Get from settings
    );
    
    // Determine paths (TODO: Get from config)
    let db_path = "data/pos.db";
    let files_dir = "data/uploads";
    
    let create_snapshot = req.create_snapshot.unwrap_or(true);
    let strict_delete = req.strict_delete.unwrap_or(false);
    
    // Perform restore
    let result = if backup.backup_type == "db_incremental" {
        // Use incremental chain restore
        restore_service.restore_incremental_chain(
            backup_id.as_str(),
            store_id,
            &req.tenant_id,
            db_path,
            files_dir,
            strict_delete,
            Some(&req.created_by),
        ).await
    } else {
        // Use regular restore
        restore_service.restore_backup(
            backup_id.as_str(),
            store_id,
            &req.tenant_id,
            db_path,
            files_dir,
            create_snapshot,
            strict_delete,
            Some(&req.created_by),
        ).await
    };
    
    match result {
        Ok(job) => {
            // Log restore initiation
            let audit_logger = AuditLogger::new(pool.get_ref().clone());
            let restore_data = serde_json::json!({
                "restore_id": &job.id,
                "backup_id": backup_id.as_str(),
                "restore_type": &job.restore_type,
                "create_snapshot": create_snapshot,
                "strict_delete": strict_delete,
                "pre_restore_snapshot_id": &job.pre_restore_snapshot_id,
            });
            
            let _ = audit_logger.log_create(
                "restore",
                &job.id,
                restore_data,
                Some(&req.created_by),
                false,
                store_id,
            ).await;
            
            let response: RestoreJobResponse = job.into();
            Ok(HttpResponse::Ok().json(response))
        }
        Err(e) => {
            eprintln!("Restore failed: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Restore failed: {}", e)
            })))
        }
    }
}

/// Get restore job by ID
/// GET /api/backups/restore-jobs/{job_id}
pub async fn get_restore_job(
    pool: web::Data<SqlitePool>,
    job_id: web::Path<String>,
) -> Result<HttpResponse, actix_web::Error> {
    let job = sqlx::query_as::<_, RestoreJob>(
        "SELECT * FROM restore_jobs WHERE id = ?"
    )
    .bind(job_id.as_str())
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch restore job: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to fetch restore job")
    })?;
    
    match job {
        Some(job) => {
            let response: RestoreJobResponse = job.into();
            Ok(HttpResponse::Ok().json(response))
        }
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Restore job not found"
        }))),
    }
}

/// Get rollback instructions for a failed restore
/// GET /api/backups/restore-jobs/{job_id}/rollback-instructions
pub async fn get_rollback_instructions(
    pool: web::Data<SqlitePool>,
    job_id: web::Path<String>,
) -> Result<HttpResponse, actix_web::Error> {
    // Create restore service
    let restore_service = RestoreService::new(
        pool.get_ref().clone(),
        "data/backups"
    );
    
    match restore_service.get_rollback_instructions(job_id.as_str()).await {
        Ok(instructions) => {
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "instructions": instructions
            })))
        }
        Err(e) => {
            eprintln!("Failed to get rollback instructions: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get rollback instructions: {}", e)
            })))
        }
    }
}

/// List all restore jobs
/// GET /api/backups/restore-jobs
pub async fn list_restore_jobs(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, actix_web::Error> {
    let jobs = sqlx::query_as::<_, RestoreJob>(
        "SELECT * FROM restore_jobs ORDER BY created_at DESC LIMIT 100"
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch restore jobs: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to fetch restore jobs")
    })?;
    
    let responses: Vec<RestoreJobResponse> = jobs.into_iter().map(|j| j.into()).collect();
    Ok(HttpResponse::Ok().json(responses))
}

// ============================================================================
// SECURE DOWNLOAD HANDLERS
// ============================================================================

use crate::models::backup::DownloadToken;
use actix_files::NamedFile;
use std::path::PathBuf;

/// Generate a time-limited download token for a backup
/// POST /api/backups/{backup_id}/download-token
pub async fn generate_download_token(
    pool: web::Data<SqlitePool>,
    backup_id: web::Path<String>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, actix_web::Error> {
    let store_id = query.get("store_id").map(|s| s.as_str()).unwrap_or("store-1");
    let user_id = query.get("user_id").map(|s| s.to_string()).unwrap_or_else(|| "system".to_string());
    
    // Verify backup exists and is completed
    let backup = sqlx::query_as::<_, BackupJob>(
        "SELECT * FROM backup_jobs WHERE id = ? AND store_id = ?"
    )
    .bind(backup_id.as_str())
    .bind(store_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch backup: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to fetch backup")
    })?;
    
    let backup = match backup {
        Some(b) => b,
        None => {
            return Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "Backup not found"
            })));
        }
    };
    
    if backup.status != "completed" {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Cannot download incomplete backup"
        })));
    }
    
    if backup.archive_path.is_none() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Backup archive not found"
        })));
    }
    
    // Generate token (15 minutes TTL)
    let token = DownloadToken::generate(backup_id.to_string(), user_id.clone(), 900);
    
    // Store token in database
    sqlx::query(
        "INSERT INTO download_tokens (token, backup_job_id, created_by, expires_at, used, created_at)
         VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&token.token)
    .bind(&token.backup_job_id)
    .bind(&token.created_by)
    .bind(&token.expires_at)
    .bind(token.used)
    .bind(&token.created_at)
    .execute(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to store download token: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to generate download token")
    })?;
    
    // Log token generation
    let audit_logger = AuditLogger::new(pool.get_ref().clone());
    let token_data = serde_json::json!({
        "backup_id": backup_id.as_str(),
        "token_expires_at": &token.expires_at,
    });
    
    let _ = audit_logger.log_create(
        "download_token",
        &token.token,
        token_data,
        Some(&user_id),
        false,
        store_id,
    ).await;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "token": token.token,
        "expires_at": token.expires_at,
        "download_url": format!("/api/backups/download?token={}", token.token)
    })))
}

/// Download a backup archive using a time-limited token
/// GET /api/backups/download?token=<token>
pub async fn download_with_token(
    pool: web::Data<SqlitePool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<NamedFile, actix_web::Error> {
    let token_str = match query.get("token") {
        Some(t) => t,
        None => {
            return Err(actix_web::error::ErrorBadRequest("Missing token parameter"));
        }
    };
    
    // Fetch and validate token
    let token = sqlx::query_as::<_, DownloadToken>(
        "SELECT * FROM download_tokens WHERE token = ?"
    )
    .bind(token_str)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch download token: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to validate token")
    })?;
    
    let token = match token {
        Some(t) => t,
        None => {
            return Err(actix_web::error::ErrorUnauthorized("Invalid download token"));
        }
    };
    
    // Validate token
    if !token.is_valid() {
        if token.used {
            return Err(actix_web::error::ErrorUnauthorized("Token already used"));
        } else {
            return Err(actix_web::error::ErrorUnauthorized("Token expired"));
        }
    }
    
    // Get backup job
    let backup = sqlx::query_as::<_, BackupJob>(
        "SELECT * FROM backup_jobs WHERE id = ?"
    )
    .bind(&token.backup_job_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch backup: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to fetch backup")
    })?;
    
    let backup = match backup {
        Some(b) => b,
        None => {
            return Err(actix_web::error::ErrorNotFound("Backup not found"));
        }
    };
    
    let archive_path = match backup.archive_path {
        Some(p) => p,
        None => {
            return Err(actix_web::error::ErrorNotFound("Backup archive not found"));
        }
    };
    
    // Mark token as used
    let _ = sqlx::query(
        "UPDATE download_tokens SET used = 1, used_at = ? WHERE token = ?"
    )
    .bind(chrono::Utc::now().to_rfc3339())
    .bind(token_str)
    .execute(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to mark token as used: {}", e);
        // Continue anyway - download should still work
    });
    
    // Log download
    let audit_logger = AuditLogger::new(pool.get_ref().clone());
    let download_data = serde_json::json!({
        "backup_id": &token.backup_job_id,
        "token": token_str,
        "archive_path": &archive_path,
        "action": "download",
    });
    
    let _ = audit_logger.log_create(
        "backup_download",
        &token.backup_job_id,
        download_data,
        Some(&token.created_by),
        false,
        &backup.store_id,
    ).await;
    
    // Stream the file
    let path = PathBuf::from(&archive_path);
    NamedFile::open(path)
        .map_err(|e| {
            eprintln!("Failed to open archive file: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to open backup archive")
        })
}

/// Clean up expired download tokens (should be called periodically)
/// DELETE /api/backups/download-tokens/cleanup
pub async fn cleanup_expired_tokens(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, actix_web::Error> {
    let now = chrono::Utc::now().to_rfc3339();
    
    let result = sqlx::query(
        "DELETE FROM download_tokens WHERE expires_at < ? OR used = 1"
    )
    .bind(&now)
    .execute(pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to cleanup tokens: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to cleanup tokens")
    })?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Expired tokens cleaned up",
        "deleted_count": result.rows_affected()
    })))
}
