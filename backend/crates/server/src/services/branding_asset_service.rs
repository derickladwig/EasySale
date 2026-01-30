/**
 * Branding Asset Service
 * 
 * Handles image upload and storage for branding assets.
 * Stores uploaded images and serves them via API.
 * 
 * Note: Image processing (resize, crop, favicon generation) is handled
 * client-side or via optional feature flags. This service focuses on
 * storage and retrieval.
 * 
 * Requirements:
 * - Support any image format (PNG, JPG, SVG, WebP)
 * - Tenant-isolated asset storage
 * - Serve assets via API
 */

use std::path::PathBuf;
use std::fs;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrandingAsset {
    pub id: String,
    pub tenant_id: String,
    pub asset_type: AssetType,
    pub original_filename: String,
    pub mime_type: String,
    pub file_path: String,
    pub file_size: u64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AssetType {
    LogoLight,
    LogoDark,
    LogoMaster,
    Favicon,
    Icon,
    AppIcon,
    AppleTouchIcon,
    PwaIcon192,
    PwaIcon512,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CropRegion {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadResult {
    pub asset: BrandingAsset,
    pub generated_assets: Vec<GeneratedAsset>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedAsset {
    pub asset_type: String,
    pub size: String,
    pub path: String,
    pub url: String,
}

#[derive(Debug)]
pub enum BrandingAssetError {
    InvalidImage(String),
    UnsupportedFormat(String),
    ProcessingFailed(String),
    StorageFailed(String),
    NotFound(String),
}

impl std::fmt::Display for BrandingAssetError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BrandingAssetError::InvalidImage(msg) => write!(f, "Invalid image: {}", msg),
            BrandingAssetError::UnsupportedFormat(msg) => write!(f, "Unsupported format: {}", msg),
            BrandingAssetError::ProcessingFailed(msg) => write!(f, "Processing failed: {}", msg),
            BrandingAssetError::StorageFailed(msg) => write!(f, "Storage failed: {}", msg),
            BrandingAssetError::NotFound(msg) => write!(f, "Not found: {}", msg),
        }
    }
}

impl std::error::Error for BrandingAssetError {}

// ============================================================================
// Service
// ============================================================================

pub struct BrandingAssetService {
    base_path: PathBuf,
}

impl BrandingAssetService {
    pub fn new(base_path: &str) -> Self {
        Self {
            base_path: PathBuf::from(base_path),
        }
    }

    /// Get the storage path for a tenant's branding assets
    fn get_tenant_path(&self, tenant_id: &str) -> PathBuf {
        self.base_path.join("branding").join(tenant_id)
    }

    /// Upload and store a branding image
    pub async fn upload_image(
        &self,
        tenant_id: &str,
        asset_type: AssetType,
        image_data: &[u8],
        filename: &str,
        mime_type: &str,
        _crop: Option<CropRegion>,
    ) -> Result<UploadResult, BrandingAssetError> {
        // Validate mime type
        if !self.is_valid_image_type(mime_type) {
            return Err(BrandingAssetError::UnsupportedFormat(
                format!("Unsupported image type: {}", mime_type)
            ));
        }

        // Create tenant directory
        let tenant_path = self.get_tenant_path(tenant_id);
        fs::create_dir_all(&tenant_path)
            .map_err(|e| BrandingAssetError::StorageFailed(e.to_string()))?;

        // Generate unique ID
        let asset_id = Uuid::new_v4().to_string();

        // Determine file extension
        let ext = self.get_extension_for_mime(mime_type);
        
        // Create filename based on asset type
        let stored_filename = match &asset_type {
            AssetType::LogoLight => format!("logo-light.{}", ext),
            AssetType::LogoDark => format!("logo-dark.{}", ext),
            AssetType::LogoMaster => format!("logo.{}", ext),
            AssetType::Favicon => format!("favicon.{}", ext),
            AssetType::Icon => format!("icon.{}", ext),
            AssetType::AppIcon => format!("app-icon.{}", ext),
            AssetType::AppleTouchIcon => format!("apple-touch-icon.{}", ext),
            AssetType::PwaIcon192 => format!("pwa-192.{}", ext),
            AssetType::PwaIcon512 => format!("pwa-512.{}", ext),
        };
        
        let file_path = tenant_path.join(&stored_filename);
        
        // Write file
        fs::write(&file_path, image_data)
            .map_err(|e| BrandingAssetError::StorageFailed(e.to_string()))?;
        
        let file_size = image_data.len() as u64;

        // Create asset record
        let asset = BrandingAsset {
            id: asset_id.clone(),
            tenant_id: tenant_id.to_string(),
            asset_type: asset_type.clone(),
            original_filename: filename.to_string(),
            mime_type: mime_type.to_string(),
            file_path: file_path.to_string_lossy().to_string(),
            file_size,
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        // Generate asset URLs
        let mut generated_assets = vec![
            GeneratedAsset {
                asset_type: format!("{:?}", asset_type).to_lowercase(),
                size: "original".to_string(),
                path: file_path.to_string_lossy().to_string(),
                url: format!("/api/branding/assets/{}/{}", tenant_id, stored_filename),
            }
        ];

        // For favicon/icon uploads, also create aliases
        if matches!(asset_type, AssetType::Favicon | AssetType::Icon) {
            // Copy to favicon.png if it's an icon upload
            if asset_type == AssetType::Icon {
                let favicon_path = tenant_path.join(format!("favicon.{}", ext));
                fs::copy(&file_path, &favicon_path).ok();
                generated_assets.push(GeneratedAsset {
                    asset_type: "favicon".to_string(),
                    size: "original".to_string(),
                    path: favicon_path.to_string_lossy().to_string(),
                    url: format!("/api/branding/assets/{}/favicon.{}", tenant_id, ext),
                });
            }
        }

        Ok(UploadResult {
            asset,
            generated_assets,
        })
    }

    /// Check if mime type is a valid image type
    fn is_valid_image_type(&self, mime_type: &str) -> bool {
        matches!(
            mime_type,
            "image/png" | "image/jpeg" | "image/jpg" | "image/webp" | 
            "image/gif" | "image/bmp" | "image/svg+xml"
        )
    }

    /// Get file extension for MIME type
    fn get_extension_for_mime(&self, mime_type: &str) -> &str {
        match mime_type {
            "image/png" => "png",
            "image/jpeg" | "image/jpg" => "jpg",
            "image/webp" => "webp",
            "image/gif" => "gif",
            "image/bmp" => "bmp",
            "image/svg+xml" => "svg",
            _ => "png",
        }
    }

    /// Get asset by filename
    pub fn get_asset(&self, tenant_id: &str, filename: &str) -> Result<Vec<u8>, BrandingAssetError> {
        let tenant_path = self.get_tenant_path(tenant_id);
        let file_path = tenant_path.join(filename);
        
        if !file_path.exists() {
            return Err(BrandingAssetError::NotFound(filename.to_string()));
        }
        
        fs::read(&file_path)
            .map_err(|e| BrandingAssetError::StorageFailed(e.to_string()))
    }

    /// List all assets for a tenant
    pub fn list_assets(&self, tenant_id: &str) -> Result<Vec<String>, BrandingAssetError> {
        let tenant_path = self.get_tenant_path(tenant_id);
        
        if !tenant_path.exists() {
            return Ok(Vec::new());
        }
        
        let entries = fs::read_dir(&tenant_path)
            .map_err(|e| BrandingAssetError::StorageFailed(e.to_string()))?;
        
        let mut assets = Vec::new();
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                assets.push(name.to_string());
            }
        }
        
        Ok(assets)
    }

    /// Delete all assets for a tenant
    pub fn delete_tenant_assets(&self, tenant_id: &str) -> Result<(), BrandingAssetError> {
        let tenant_path = self.get_tenant_path(tenant_id);
        
        if tenant_path.exists() {
            fs::remove_dir_all(&tenant_path)
                .map_err(|e| BrandingAssetError::StorageFailed(e.to_string()))?;
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_asset_type_serialization() {
        let asset_type = AssetType::LogoLight;
        let json = serde_json::to_string(&asset_type).unwrap();
        assert_eq!(json, "\"logo_light\"");
    }

    #[test]
    fn test_crop_region() {
        let region = CropRegion {
            x: 10,
            y: 20,
            width: 100,
            height: 100,
        };
        assert_eq!(region.x, 10);
        assert_eq!(region.width, 100);
    }

    #[test]
    fn test_valid_image_types() {
        let service = BrandingAssetService::new("data");
        assert!(service.is_valid_image_type("image/png"));
        assert!(service.is_valid_image_type("image/jpeg"));
        assert!(service.is_valid_image_type("image/webp"));
        assert!(service.is_valid_image_type("image/svg+xml"));
        assert!(!service.is_valid_image_type("text/plain"));
    }
}
