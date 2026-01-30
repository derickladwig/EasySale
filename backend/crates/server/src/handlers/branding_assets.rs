/**
 * Branding Assets Handler
 * 
 * HTTP endpoints for uploading, managing, and serving branding assets.
 * Supports image upload with cropping, generates favicon sets and app icons.
 * 
 * Endpoints:
 * - POST /api/branding/assets/upload - Upload branding image
 * - GET /api/branding/assets/{tenant_id}/{filename} - Serve asset
 * - GET /api/branding/assets/{tenant_id} - List tenant assets
 * - DELETE /api/branding/assets/{tenant_id} - Delete all tenant assets
 * - POST /api/branding/generate - Generate all assets from master
 */

use actix_web::{web, HttpRequest, HttpResponse, Result};
use actix_multipart::Multipart;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::env;

use crate::services::branding_asset_service::{
    BrandingAssetService, AssetType, CropRegion, BrandingAssetError
};

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct UploadQuery {
    pub asset_type: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct UploadResponse {
    pub success: bool,
    pub asset_id: String,
    pub asset_type: String,
    pub original_filename: String,
    pub file_size: u64,
    pub generated_assets: Vec<GeneratedAssetResponse>,
    pub urls: AssetUrls,
}

#[derive(Debug, Serialize)]
pub struct GeneratedAssetResponse {
    pub asset_type: String,
    pub size: String,
    pub url: String,
}

#[derive(Debug, Serialize)]
pub struct AssetUrls {
    pub master: String,
    pub favicon: Option<String>,
    pub favicon_ico: Option<String>,
    pub pwa_192: Option<String>,
    pub pwa_512: Option<String>,
    pub apple_touch: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GenerateRequest {
    pub tenant_id: String,
    pub asset_id: String,
    pub generate_favicon: bool,
    pub generate_app_icons: bool,
    pub crop: Option<CropRegion>,
}

#[derive(Debug, Serialize)]
pub struct ListAssetsResponse {
    pub tenant_id: String,
    pub assets: Vec<String>,
}

// ============================================================================
// Handlers
// ============================================================================

/// Get the branding assets storage path
fn get_assets_base_path() -> String {
    env::var("BRANDING_ASSETS_PATH")
        .unwrap_or_else(|_| "data".to_string())
}

/// Upload branding image
/// POST /api/branding/assets/upload
pub async fn upload_branding_asset(
    req: HttpRequest,
    mut payload: Multipart,
    query: web::Query<UploadQuery>,
) -> Result<HttpResponse> {
    // Get tenant ID from context or environment
    let tenant_id = req
        .headers()
        .get("X-Tenant-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| {
            env::var("TENANT_ID").unwrap_or_else(|_| "default".to_string())
        });

    // Parse asset type
    let asset_type = match query.asset_type.as_deref() {
        Some("logo_light") => AssetType::LogoLight,
        Some("logo_dark") => AssetType::LogoDark,
        Some("logo") | Some("logo_master") => AssetType::LogoMaster,
        Some("favicon") => AssetType::Favicon,
        Some("icon") => AssetType::Icon,
        Some("app_icon") => AssetType::AppIcon,
        _ => AssetType::LogoMaster, // Default
    };

    // Read multipart data
    let mut file_data: Option<Vec<u8>> = None;
    let mut filename: Option<String> = None;
    let mut mime_type: Option<String> = None;
    let mut crop: Option<CropRegion> = None;

    while let Some(item) = payload.next().await {
        let mut field = item.map_err(|e| {
            actix_web::error::ErrorBadRequest(format!("Multipart error: {}", e))
        })?;

        let content_disposition = field.content_disposition();
        let field_name = content_disposition.get_name().unwrap_or("");

        match field_name {
            "file" | "image" => {
                // Get filename
                filename = content_disposition.get_filename().map(|s| s.to_string());
                
                // Get content type
                mime_type = field.content_type().map(|m| m.to_string());
                
                // Read file data
                let mut data = Vec::new();
                while let Some(chunk) = field.next().await {
                    let chunk = chunk.map_err(|e| {
                        actix_web::error::ErrorBadRequest(format!("Read error: {}", e))
                    })?;
                    data.extend_from_slice(&chunk);
                }
                file_data = Some(data);
            }
            "crop" => {
                // Read crop region JSON
                let mut data = Vec::new();
                while let Some(chunk) = field.next().await {
                    let chunk = chunk.map_err(|e| {
                        actix_web::error::ErrorBadRequest(format!("Read error: {}", e))
                    })?;
                    data.extend_from_slice(&chunk);
                }
                if let Ok(crop_str) = String::from_utf8(data) {
                    crop = serde_json::from_str(&crop_str).ok();
                }
            }
            _ => {
                // Skip unknown fields
                while field.next().await.is_some() {}
            }
        }
    }

    // Validate required fields
    let file_data = file_data.ok_or_else(|| {
        actix_web::error::ErrorBadRequest("No file uploaded")
    })?;
    
    let filename = filename.unwrap_or_else(|| "upload.png".to_string());
    let mime_type = mime_type.unwrap_or_else(|| "image/png".to_string());

    // Validate mime type
    if !is_valid_image_type(&mime_type) {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Invalid image type. Supported: PNG, JPEG, WebP, GIF, BMP"
        })));
    }

    // Create service and upload
    let service = BrandingAssetService::new(&get_assets_base_path());
    
    match service.upload_image(
        &tenant_id,
        asset_type.clone(),
        &file_data,
        &filename,
        &mime_type,
        crop,
    ).await {
        Ok(result) => {
            // Build response
            let generated_assets: Vec<GeneratedAssetResponse> = result.generated_assets
                .iter()
                .map(|a| GeneratedAssetResponse {
                    asset_type: a.asset_type.clone(),
                    size: a.size.clone(),
                    url: a.url.clone(),
                })
                .collect();

            // Find specific URLs
            let favicon_url = result.generated_assets.iter()
                .find(|a| a.asset_type == "favicon" && a.size == "32x32")
                .map(|a| a.url.clone());
            
            let favicon_ico_url = result.generated_assets.iter()
                .find(|a| a.asset_type == "favicon" && a.size == "ico")
                .map(|a| a.url.clone());
            
            let pwa_192_url = result.generated_assets.iter()
                .find(|a| a.asset_type == "pwa_icon" && a.size == "192x192")
                .map(|a| a.url.clone());
            
            let pwa_512_url = result.generated_assets.iter()
                .find(|a| a.asset_type == "pwa_icon" && a.size == "512x512")
                .map(|a| a.url.clone());
            
            let apple_touch_url = result.generated_assets.iter()
                .find(|a| a.asset_type == "apple_touch_icon")
                .map(|a| a.url.clone());

            // Get the first generated asset URL as master
            let master_url = result.generated_assets.first()
                .map(|a| a.url.clone())
                .unwrap_or_else(|| format!("/api/branding/assets/{}/logo.png", tenant_id));

            let response = UploadResponse {
                success: true,
                asset_id: result.asset.id.clone(),
                asset_type: format!("{:?}", asset_type).to_lowercase(),
                original_filename: result.asset.original_filename,
                file_size: result.asset.file_size,
                generated_assets,
                urls: AssetUrls {
                    master: master_url,
                    favicon: favicon_url,
                    favicon_ico: favicon_ico_url,
                    pwa_192: pwa_192_url,
                    pwa_512: pwa_512_url,
                    apple_touch: apple_touch_url,
                },
            };

            Ok(HttpResponse::Ok().json(response))
        }
        Err(e) => {
            tracing::error!("Failed to upload branding asset: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Upload failed: {}", e)
            })))
        }
    }
}

/// Serve branding asset
/// GET /api/branding/assets/{tenant_id}/{filename}
pub async fn get_branding_asset(
    path: web::Path<(String, String)>,
) -> Result<HttpResponse> {
    let (tenant_id, filename) = path.into_inner();
    
    let service = BrandingAssetService::new(&get_assets_base_path());
    
    match service.get_asset(&tenant_id, &filename) {
        Ok(data) => {
            // Determine content type from filename
            let content_type = get_content_type(&filename);
            
            Ok(HttpResponse::Ok()
                .content_type(content_type)
                .insert_header(("Cache-Control", "public, max-age=31536000"))
                .body(data))
        }
        Err(BrandingAssetError::NotFound(_)) => {
            Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "Asset not found"
            })))
        }
        Err(e) => {
            tracing::error!("Failed to get branding asset: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to retrieve asset: {}", e)
            })))
        }
    }
}

/// List tenant assets
/// GET /api/branding/assets/{tenant_id}
pub async fn list_branding_assets(
    path: web::Path<String>,
) -> Result<HttpResponse> {
    let tenant_id = path.into_inner();
    
    let service = BrandingAssetService::new(&get_assets_base_path());
    
    match service.list_assets(&tenant_id) {
        Ok(assets) => {
            Ok(HttpResponse::Ok().json(ListAssetsResponse {
                tenant_id,
                assets,
            }))
        }
        Err(e) => {
            tracing::error!("Failed to list branding assets: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to list assets: {}", e)
            })))
        }
    }
}

/// Delete all tenant assets
/// DELETE /api/branding/assets/{tenant_id}
pub async fn delete_branding_assets(
    path: web::Path<String>,
) -> Result<HttpResponse> {
    let tenant_id = path.into_inner();
    
    let service = BrandingAssetService::new(&get_assets_base_path());
    
    match service.delete_tenant_assets(&tenant_id) {
        Ok(()) => {
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "message": "All branding assets deleted"
            })))
        }
        Err(e) => {
            tracing::error!("Failed to delete branding assets: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to delete assets: {}", e)
            })))
        }
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

fn is_valid_image_type(mime_type: &str) -> bool {
    matches!(
        mime_type,
        "image/png" | "image/jpeg" | "image/jpg" | "image/webp" | "image/gif" | "image/bmp"
    )
}

fn get_content_type(filename: &str) -> &'static str {
    if filename.ends_with(".png") {
        "image/png"
    } else if filename.ends_with(".jpg") || filename.ends_with(".jpeg") {
        "image/jpeg"
    } else if filename.ends_with(".webp") {
        "image/webp"
    } else if filename.ends_with(".gif") {
        "image/gif"
    } else if filename.ends_with(".ico") {
        "image/x-icon"
    } else if filename.ends_with(".svg") {
        "image/svg+xml"
    } else {
        "application/octet-stream"
    }
}

// ============================================================================
// Route Configuration
// ============================================================================

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/branding/assets")
            .route("/upload", web::post().to(upload_branding_asset))
            .route("/{tenant_id}/{filename}", web::get().to(get_branding_asset))
            .route("/{tenant_id}", web::get().to(list_branding_assets))
            .route("/{tenant_id}", web::delete().to(delete_branding_assets))
    );
}
