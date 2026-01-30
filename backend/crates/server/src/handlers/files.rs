/**
 * File Management Handlers
 * 
 * API endpoints for file upload, download, and management.
 */

use actix_web::{get, delete, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::services::FileService;

/// GET /api/files
/// List all files with optional filtering
#[get("/api/files")]
pub async fn list_files(
    pool: web::Data<SqlitePool>,
    query: web::Query<ListFilesQuery>,
) -> impl Responder {
    tracing::info!("Listing files");

    let mut sql = String::from(
        "SELECT id, filename, file_path, file_size, mime_type, entity_type, entity_id, 
         uploaded_by, created_at 
         FROM bill_files 
         WHERE 1=1"
    );
    
    let mut params: Vec<String> = Vec::new();
    
    if let Some(entity_type) = &query.entity_type {
        sql.push_str(" AND entity_type = ?");
        params.push(entity_type.clone());
    }
    
    if let Some(entity_id) = &query.entity_id {
        sql.push_str(" AND entity_id = ?");
        params.push(entity_id.clone());
    }
    
    if let Some(mime_type) = &query.mime_type {
        sql.push_str(" AND mime_type LIKE ?");
        params.push(format!("%{}%", mime_type));
    }
    
    sql.push_str(" ORDER BY created_at DESC");
    
    if let Some(limit) = query.limit {
        sql.push_str(&format!(" LIMIT {}", limit));
    }
    
    #[derive(sqlx::FromRow, Serialize)]
    struct FileRow {
        id: String,
        filename: String,
        file_path: String,
        file_size: i64,
        mime_type: String,
        entity_type: String,
        entity_id: String,
        uploaded_by: String,
        created_at: String,
    }
    
    let mut query_builder = sqlx::query_as::<_, FileRow>(&sql);
    for param in params {
        query_builder = query_builder.bind(param);
    }
    
    match query_builder.fetch_all(pool.get_ref()).await {
        Ok(files) => HttpResponse::Ok().json(serde_json::json!({
            "files": files,
            "total": files.len()
        })),
        Err(e) => {
            tracing::error!("Failed to list files: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to list files: {}", e)
            }))
        }
    }
}

/// GET /api/files/:id
/// Get file metadata and download URL
#[get("/api/files/{id}")]
pub async fn get_file(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    _file_service: web::Data<FileService>,
) -> impl Responder {
    let file_id = path.into_inner();
    tracing::info!("Getting file: {}", file_id);

    #[derive(sqlx::FromRow)]
    struct FileMetadata {
        id: String,
        filename: String,
        file_path: String,
        file_size: i64,
        mime_type: String,
        entity_type: String,
        entity_id: String,
        uploaded_by: String,
        created_at: String,
    }

    match sqlx::query_as::<_, FileMetadata>(
        "SELECT id, filename, file_path, file_size, mime_type, entity_type, entity_id, 
         uploaded_by, created_at 
         FROM bill_files 
         WHERE id = ?"
    )
    .bind(&file_id)
    .fetch_one(pool.get_ref())
    .await
    {
        Ok(file) => {
            // Note: FileService requires tenant_id for security
            // For now, we'll skip file content retrieval or need to add tenant_id to query
            HttpResponse::Ok().json(serde_json::json!({
                "id": file.id,
                "filename": file.filename,
                "file_path": file.file_path,
                "file_size": file.file_size,
                "mime_type": file.mime_type,
                "entity_type": file.entity_type,
                "entity_id": file.entity_id,
                "uploaded_by": file.uploaded_by,
                "created_at": file.created_at,
                "download_url": format!("/api/files/{}/download", file_id)
            }))
        }
        Err(sqlx::Error::RowNotFound) => {
            HttpResponse::NotFound().json(serde_json::json!({
                "error": "File not found"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to get file metadata: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get file: {}", e)
            }))
        }
    }
}

/// GET /api/files/:id/download
/// Download file content
#[get("/api/files/{id}/download")]
pub async fn download_file(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    file_service: web::Data<FileService>,
) -> impl Responder {
    let file_id = path.into_inner();
    tracing::info!("Downloading file: {}", file_id);

    #[derive(sqlx::FromRow)]
    struct FileInfo {
        filename: String,
        file_path: String,
        mime_type: String,
    }

    // Get file metadata
    let file_info = match sqlx::query_as::<_, FileInfo>(
        "SELECT filename, file_path, mime_type FROM bill_files WHERE id = ?"
    )
    .bind(&file_id)
    .fetch_one(pool.get_ref())
    .await
    {
        Ok(info) => info,
        Err(sqlx::Error::RowNotFound) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "File not found"
            }));
        }
        Err(e) => {
            tracing::error!("Failed to get file info: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get file info: {}", e)
            }));
        }
    };

    // Extract tenant_id from file_path (format: vendor-bills/{tenant_id}/...)
    let tenant_id = file_info.file_path
        .split('/')
        .nth(1)
        .unwrap_or("unknown");

    // Get file content
    match file_service.get_bill_file(&file_info.file_path, tenant_id).await {
        Ok(content) => {
            HttpResponse::Ok()
                .content_type(file_info.mime_type)
                .insert_header((
                    "Content-Disposition",
                    format!("attachment; filename=\"{}\"", file_info.filename),
                ))
                .body(content)
        }
        Err(e) => {
            tracing::error!("Failed to download file: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to download file: {}", e)
            }))
        }
    }
}

/// DELETE /api/files/:id
/// Delete a file
#[delete("/api/files/{id}")]
pub async fn delete_file(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    file_service: web::Data<FileService>,
) -> impl Responder {
    let file_id = path.into_inner();
    tracing::info!("Deleting file: {}", file_id);

    // Get file path and tenant_id from database first
    #[derive(sqlx::FromRow)]
    struct FileInfo {
        file_path: String,
    }

    let file_info = match sqlx::query_as::<_, FileInfo>(
        "SELECT file_path FROM bill_files WHERE id = ?"
    )
    .bind(&file_id)
    .fetch_one(pool.get_ref())
    .await
    {
        Ok(info) => info,
        Err(sqlx::Error::RowNotFound) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "File not found"
            }));
        }
        Err(e) => {
            tracing::error!("Failed to get file info: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get file info: {}", e)
            }));
        }
    };

    // Extract tenant_id from file_path
    let tenant_id = file_info.file_path
        .split('/')
        .nth(1)
        .unwrap_or("unknown");

    // Delete file from storage
    match file_service.delete_bill_file(&file_info.file_path, tenant_id, true).await {
        Ok(_) => {
            // Delete file record from database
            match sqlx::query("DELETE FROM bill_files WHERE id = ?")
                .bind(&file_id)
                .execute(pool.get_ref())
                .await
            {
                Ok(result) => {
                    if result.rows_affected() == 0 {
                        HttpResponse::NotFound().json(serde_json::json!({
                            "error": "File not found"
                        }))
                    } else {
                        HttpResponse::Ok().json(serde_json::json!({
                            "message": "File deleted successfully",
                            "file_id": file_id
                        }))
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to delete file record: {:?}", e);
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": format!("Failed to delete file record: {}", e)
                    }))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete file: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to delete file: {}", e)
            }))
        }
    }
}

/// GET /api/files/stats
/// Get file storage statistics
#[get("/api/files/stats")]
pub async fn get_file_stats(pool: web::Data<SqlitePool>) -> impl Responder {
    tracing::info!("Getting file statistics");

    #[derive(sqlx::FromRow)]
    struct Stats {
        total_files: i64,
        total_size: i64,
    }

    match sqlx::query_as::<_, Stats>(
        "SELECT COUNT(*) as total_files, COALESCE(SUM(file_size), 0) as total_size 
         FROM bill_files"
    )
    .fetch_one(pool.get_ref())
    .await
    {
        Ok(stats) => {
            // Get breakdown by type
            #[derive(sqlx::FromRow)]
            struct TypeStats {
                entity_type: String,
                count: i64,
                total_size: i64,
            }

            let type_stats = sqlx::query_as::<_, TypeStats>(
                "SELECT entity_type, COUNT(*) as count, COALESCE(SUM(file_size), 0) as total_size 
                 FROM bill_files 
                 GROUP BY entity_type"
            )
            .fetch_all(pool.get_ref())
            .await
            .unwrap_or_default();

            let by_type: Vec<serde_json::Value> = type_stats
                .iter()
                .map(|t| serde_json::json!({
                    "entity_type": t.entity_type,
                    "count": t.count,
                    "total_size_bytes": t.total_size,
                    "total_size_mb": (t.total_size as f64) / 1_048_576.0
                }))
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "total_files": stats.total_files,
                "total_size_bytes": stats.total_size,
                "total_size_mb": (stats.total_size as f64) / 1_048_576.0,
                "by_type": by_type
            }))
        }
        Err(e) => {
            tracing::error!("Failed to get file stats: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get file stats: {}", e)
            }))
        }
    }
}

// Request types

#[derive(Deserialize)]
pub struct ListFilesQuery {
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub mime_type: Option<String>,
    pub limit: Option<i64>,
}
