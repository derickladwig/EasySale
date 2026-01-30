// OCR Ingest Handler
// API endpoint for invoice file upload with review case creation and OCR job queuing
// Requirements: 1.1, 1.7, 2.1, 2.6, 2.7

use actix_multipart::Multipart;
use actix_web::{web, HttpRequest, HttpMessage, HttpResponse, Error};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;
use std::io::Write;
use std::path::Path;
use std::time::Instant;
use uuid::Uuid;

/// Maximum file size: 50MB
const MAX_FILE_SIZE: u64 = 50 * 1024 * 1024;

/// Allowed file extensions for OCR processing
const VALID_EXTENSIONS: &[&str] = &["pdf", "jpg", "jpeg", "png", "tiff", "tif"];

#[derive(Debug, Serialize)]
pub struct IngestResponse {
    pub case_id: String,
    pub job_id: String,
    pub status: String,
    pub estimated_time_ms: u64,
    pub file_path: String,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub code: String,
}

#[derive(Debug, Deserialize)]
pub struct IngestQuery {
    pub vendor_id: Option<String>,
    pub priority: Option<i32>,
    pub ocr_profile: Option<String>,
}


/// POST /api/ocr/ingest
/// Upload a document for OCR processing
/// 
/// Creates a review case and queues an OCR job for background processing.
/// Requirements: 1.1, 1.7, 2.1
pub async fn ingest_invoice(
    req: HttpRequest,
    mut payload: Multipart,
    pool: web::Data<SqlitePool>,
    query: web::Query<IngestQuery>,
) -> Result<HttpResponse, Error> {
    let start_time = Instant::now();
    
    // Extract tenant context
    let tenant_id = req.extensions()
        .get::<crate::models::UserContext>()
        .map(|ctx| ctx.tenant_id.clone())
        .unwrap_or_else(|| "default-tenant".to_string());
    
    let user_id = req.extensions()
        .get::<crate::models::UserContext>()
        .map(|ctx| ctx.user_id.clone())
        .unwrap_or_else(|| "system".to_string());

    tracing::info!(
        tenant_id = %tenant_id,
        user_id = %user_id,
        "OCR ingest request started"
    );

    let case_id = Uuid::new_v4().to_string();
    let job_id = Uuid::new_v4().to_string();
    let mut file_data: Vec<u8> = Vec::new();
    let mut original_filename = String::new();
    let mut vendor_id = query.vendor_id.clone();
    
    // Ensure uploads directory exists with tenant isolation
    let upload_dir = format!("./uploads/{}", tenant_id);
    std::fs::create_dir_all(&upload_dir).map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Failed to create uploads directory: {}", e))
    })?;
    
    // Process multipart upload
    while let Some(item) = payload.next().await {
        let mut field = item?;
        let content_disposition = field.content_disposition();
        
        match content_disposition.get_name() {
            Some("file") => {
                let raw_filename = content_disposition
                    .get_filename()
                    .unwrap_or("upload.pdf");
                original_filename = sanitize_filename(raw_filename);
                
                while let Some(chunk) = field.next().await {
                    let data = chunk?;
                    if file_data.len() as u64 + data.len() as u64 > MAX_FILE_SIZE {
                        return Ok(HttpResponse::BadRequest().json(ErrorResponse {
                            error: format!("File too large. Maximum size: {}MB", MAX_FILE_SIZE / 1024 / 1024),
                            code: "FILE_TOO_LARGE".to_string(),
                        }));
                    }
                    file_data.extend_from_slice(&data);
                }
            }
            Some("vendor_id") => {
                let mut value = Vec::new();
                while let Some(chunk) = field.next().await {
                    let data = chunk?;
                    value.extend_from_slice(&data);
                }
                vendor_id = Some(String::from_utf8_lossy(&value).to_string());
            }
            _ => {}
        }
    }

    if file_data.is_empty() {
        tracing::warn!(
            tenant_id = %tenant_id,
            user_id = %user_id,
            "OCR ingest failed: no file uploaded"
        );
        return Ok(HttpResponse::BadRequest().json(ErrorResponse {
            error: "No file uploaded".to_string(),
            code: "NO_FILE".to_string(),
        }));
    }

    let extension = get_extension(&original_filename);
    if !is_valid_file_type(&extension) {
        tracing::warn!(
            tenant_id = %tenant_id,
            user_id = %user_id,
            filename = %original_filename,
            extension = %extension,
            "OCR ingest failed: invalid file type"
        );
        return Ok(HttpResponse::BadRequest().json(ErrorResponse {
            error: format!("Invalid file type '{}'. Supported: PDF, JPG, PNG, TIFF", extension),
            code: "INVALID_FILE_TYPE".to_string(),
        }));
    }

    let file_hash = calculate_hash(&file_data);
    let file_size = file_data.len() as i64;

    // Check for duplicate file (idempotency)
    let existing_job = sqlx::query_scalar::<_, String>(
        "SELECT id FROM ocr_jobs WHERE source_file_hash = ? AND tenant_id = ? AND status != 'FAILED' LIMIT 1"
    )
    .bind(&file_hash)
    .bind(&tenant_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Database error: {}", e)))?;

    if let Some(existing_id) = existing_job {
        let existing_case = sqlx::query_scalar::<_, String>(
            "SELECT review_case_id FROM ocr_jobs WHERE id = ?"
        )
        .bind(&existing_id)
        .fetch_optional(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Database error: {}", e)))?;

        tracing::info!(
            tenant_id = %tenant_id,
            user_id = %user_id,
            file_hash = %file_hash,
            existing_job_id = %existing_id,
            "OCR ingest: duplicate file detected, returning existing job"
        );

        return Ok(HttpResponse::Ok().json(IngestResponse {
            case_id: existing_case.unwrap_or_default(),
            job_id: existing_id,
            status: "already_queued".to_string(),
            estimated_time_ms: 0,
            file_path: String::new(),
        }));
    }

    let safe_filename = format!("{}-{}", case_id, original_filename);
    let file_path = format!("{}/{}", upload_dir, safe_filename);
    let relative_path = format!("uploads/{}/{}", tenant_id, safe_filename);
    
    let mut f = std::fs::File::create(&file_path).map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Failed to create file: {}", e))
    })?;
    
    f.write_all(&file_data).map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Failed to write file: {}", e))
    })?;

    let now = chrono::Utc::now().to_rfc3339();
    let mime_type = get_mime_type(&extension);
    let ocr_profile = query.ocr_profile.clone().unwrap_or_else(|| "full-page-default".to_string());
    let priority = query.priority.unwrap_or(0);

    // Create review case record
    let create_case_result = sqlx::query(
        r#"INSERT INTO review_cases (
            id, tenant_id, state, vendor_id, vendor_name, confidence,
            source_file_path, source_file_type, extracted_data, validation_result,
            ocr_raw_text, created_at, updated_at, created_by
        ) VALUES (?, ?, 'Queued', ?, NULL, 0, ?, ?, NULL, NULL, NULL, ?, ?, ?)"#
    )
    .bind(&case_id)
    .bind(&tenant_id)
    .bind(&vendor_id)
    .bind(&relative_path)
    .bind(&mime_type)
    .bind(&now)
    .bind(&now)
    .bind(&user_id)
    .execute(pool.get_ref())
    .await;

    if let Err(e) = create_case_result {
        let _ = std::fs::remove_file(&file_path);
        tracing::error!(
            tenant_id = %tenant_id,
            user_id = %user_id,
            case_id = %case_id,
            error = %e,
            "OCR ingest failed: could not create review case"
        );
        return Ok(HttpResponse::InternalServerError().json(ErrorResponse {
            error: format!("Failed to create review case: {}", e),
            code: "DATABASE_ERROR".to_string(),
        }));
    }

    // Create OCR job record
    let create_job_result = sqlx::query(
        r#"INSERT INTO ocr_jobs (
            id, tenant_id, status, source_file_path, source_file_type,
            source_file_hash, source_file_size, ocr_profile, priority,
            review_case_id, vendor_bill_id, created_at, updated_at, created_by
        ) VALUES (?, ?, 'QUEUED', ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)"#
    )
    .bind(&job_id)
    .bind(&tenant_id)
    .bind(&relative_path)
    .bind(&mime_type)
    .bind(&file_hash)
    .bind(file_size)
    .bind(&ocr_profile)
    .bind(priority)
    .bind(&case_id)
    .bind(&now)
    .bind(&now)
    .bind(&user_id)
    .execute(pool.get_ref())
    .await;

    if let Err(e) = create_job_result {
        let _ = std::fs::remove_file(&file_path);
        let _ = sqlx::query("DELETE FROM review_cases WHERE id = ?")
            .bind(&case_id)
            .execute(pool.get_ref())
            .await;
        tracing::error!(
            tenant_id = %tenant_id,
            user_id = %user_id,
            case_id = %case_id,
            job_id = %job_id,
            error = %e,
            "OCR ingest failed: could not create OCR job"
        );
        return Ok(HttpResponse::InternalServerError().json(ErrorResponse {
            error: format!("Failed to create OCR job: {}", e),
            code: "DATABASE_ERROR".to_string(),
        }));
    }

    let estimated_time_ms = estimate_processing_time(file_size as u64, &mime_type);
    let elapsed_ms = start_time.elapsed().as_millis() as u64;

    tracing::info!(
        tenant_id = %tenant_id,
        user_id = %user_id,
        case_id = %case_id,
        job_id = %job_id,
        file_size = file_size,
        mime_type = %mime_type,
        elapsed_ms = elapsed_ms,
        estimated_processing_ms = estimated_time_ms,
        "OCR ingest completed successfully"
    );

    Ok(HttpResponse::Ok().json(IngestResponse {
        case_id,
        job_id,
        status: "queued".to_string(),
        estimated_time_ms,
        file_path: relative_path,
    }))
}


/// GET /api/ocr/jobs/:id - Get OCR job status
pub async fn get_job_status(
    path: web::Path<String>,
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, Error> {
    let job_id = path.into_inner();

    #[derive(sqlx::FromRow, Serialize)]
    struct JobStatus {
        id: String,
        status: String,
        review_case_id: Option<String>,
        error_message: Option<String>,
        processing_time_ms: Option<i64>,
        retry_count: i32,
        created_at: String,
        updated_at: String,
    }

    let job = sqlx::query_as::<_, JobStatus>(
        "SELECT id, status, review_case_id, error_message, processing_time_ms, retry_count, created_at, updated_at FROM ocr_jobs WHERE id = ?"
    )
    .bind(&job_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Database error: {}", e)))?;

    match job {
        Some(j) => Ok(HttpResponse::Ok().json(j)),
        None => Ok(HttpResponse::NotFound().json(ErrorResponse {
            error: "Job not found".to_string(),
            code: "NOT_FOUND".to_string(),
        })),
    }
}

#[derive(Debug, Deserialize)]
pub struct ListJobsQuery {
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// GET /api/ocr/jobs - List OCR jobs with optional filtering
pub async fn list_jobs(
    req: HttpRequest,
    query: web::Query<ListJobsQuery>,
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, Error> {
    let tenant_id = req.extensions()
        .get::<crate::models::UserContext>()
        .map(|ctx| ctx.tenant_id.clone())
        .unwrap_or_else(|| "default-tenant".to_string());

    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);

    #[derive(sqlx::FromRow, Serialize)]
    struct JobSummary {
        id: String,
        status: String,
        source_file_path: String,
        review_case_id: Option<String>,
        created_at: String,
        updated_at: String,
    }

    let jobs = if let Some(ref status) = query.status {
        sqlx::query_as::<_, JobSummary>(
            "SELECT id, status, source_file_path, review_case_id, created_at, updated_at 
             FROM ocr_jobs WHERE tenant_id = ? AND status = ? 
             ORDER BY created_at DESC LIMIT ? OFFSET ?"
        )
        .bind(&tenant_id)
        .bind(status)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool.get_ref())
        .await
    } else {
        sqlx::query_as::<_, JobSummary>(
            "SELECT id, status, source_file_path, review_case_id, created_at, updated_at 
             FROM ocr_jobs WHERE tenant_id = ? 
             ORDER BY created_at DESC LIMIT ? OFFSET ?"
        )
        .bind(&tenant_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool.get_ref())
        .await
    };

    match jobs {
        Ok(j) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "jobs": j,
            "limit": limit,
            "offset": offset
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(ErrorResponse {
            error: format!("Database error: {}", e),
            code: "DATABASE_ERROR".to_string(),
        })),
    }
}

/// POST /api/ocr/jobs/:id/retry - Retry a failed OCR job
pub async fn retry_job(
    path: web::Path<String>,
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, Error> {
    let job_id = path.into_inner();
    let now = chrono::Utc::now().to_rfc3339();

    let job_status = sqlx::query_scalar::<_, String>(
        "SELECT status FROM ocr_jobs WHERE id = ?"
    )
    .bind(&job_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Database error: {}", e)))?;

    match job_status {
        Some(status) if status == "FAILED" => {
            sqlx::query(
                "UPDATE ocr_jobs SET status = 'QUEUED', error_message = NULL, updated_at = ?, retry_count = retry_count + 1 WHERE id = ?"
            )
            .bind(&now)
            .bind(&job_id)
            .execute(pool.get_ref())
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Database error: {}", e)))?;

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "message": "Job queued for retry",
                "job_id": job_id
            })))
        }
        Some(status) => Ok(HttpResponse::BadRequest().json(ErrorResponse {
            error: format!("Cannot retry job with status: {}", status),
            code: "INVALID_STATUS".to_string(),
        })),
        None => Ok(HttpResponse::NotFound().json(ErrorResponse {
            error: "Job not found".to_string(),
            code: "NOT_FOUND".to_string(),
        })),
    }
}


/// Sanitize filename to prevent path traversal attacks
fn sanitize_filename(filename: &str) -> String {
    let name = Path::new(filename)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("upload");
    
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' | '\0' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect::<String>()
        .trim_start_matches('.')
        .to_string()
}

fn get_extension(filename: &str) -> String {
    Path::new(filename)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase()
}

fn is_valid_file_type(extension: &str) -> bool {
    VALID_EXTENSIONS.contains(&extension.to_lowercase().as_str())
}

fn get_mime_type(extension: &str) -> String {
    match extension.to_lowercase().as_str() {
        "pdf" => "application/pdf",
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "tiff" | "tif" => "image/tiff",
        _ => "application/octet-stream",
    }.to_string()
}

fn calculate_hash(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    format!("{:x}", hasher.finalize())
}

fn estimate_processing_time(file_size: u64, mime_type: &str) -> u64 {
    let base_ms = 5000u64;
    let size_factor = (file_size / 102400) * 1000;
    let type_factor = if mime_type == "application/pdf" { 2000u64 } else { 0u64 };
    base_ms + size_factor + type_factor
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/api/ingest")
            .route(web::post().to(ingest_invoice))
    )
    .service(
        web::resource("/api/ocr/jobs")
            .route(web::get().to(list_jobs))
    )
    .service(
        web::resource("/api/ocr/jobs/{id}")
            .route(web::get().to(get_job_status))
    )
    .service(
        web::resource("/api/ocr/jobs/{id}/retry")
            .route(web::post().to(retry_job))
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_valid_file_types() {
        assert!(is_valid_file_type("pdf"));
        assert!(is_valid_file_type("PDF"));
        assert!(is_valid_file_type("jpg"));
        assert!(is_valid_file_type("jpeg"));
        assert!(is_valid_file_type("png"));
        assert!(is_valid_file_type("tiff"));
        assert!(!is_valid_file_type("doc"));
        assert!(!is_valid_file_type("exe"));
    }

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("invoice.pdf"), "invoice.pdf");
        assert_eq!(sanitize_filename("../../../etc/passwd"), "passwd");
        assert_eq!(sanitize_filename("..\\..\\windows\\system32"), "system32");
        assert_eq!(sanitize_filename("file:name.pdf"), "file_name.pdf");
        assert_eq!(sanitize_filename(".hidden"), "hidden");
    }

    #[test]
    fn test_get_extension() {
        assert_eq!(get_extension("invoice.pdf"), "pdf");
        assert_eq!(get_extension("INVOICE.PDF"), "pdf");
        assert_eq!(get_extension("noextension"), "");
    }

    #[test]
    fn test_calculate_hash() {
        let data = b"test content";
        let hash = calculate_hash(data);
        assert_eq!(hash.len(), 64);
        assert_eq!(hash, calculate_hash(data));
    }
}
