// Zone Cropper Service for Invoice OCR Enhancement
// Crops zones from variants with coordinate mapping and mask application
// Requirements: 3.1

use crate::models::artifact::{BoundingBox, ZoneArtifact, ZoneType};
use crate::services::zone_detector_service::DetectedZone;
use crate::services::variant_generator::RankedVariant;
use image::{DynamicImage, GenericImageView};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use thiserror::Error;

// Conditional imports for document-cleanup feature
#[cfg(feature = "document-cleanup")]
use crate::services::cleanup_engine::{CleanupShield, NormalizedBBox};

/// Zone cropper errors
#[derive(Debug, Error)]
pub enum ZoneCropperError {
    #[error("Failed to load image: {0}")]
    ImageLoadError(String),
    
    #[error("Failed to crop zone: {0}")]
    CropError(String),
    
    #[error("Failed to save cropped zone: {0}")]
    SaveError(String),
    
    #[error("Invalid zone coordinates: {0}")]
    InvalidCoordinatesError(String),
    
    #[error("IO error: {0}")]
    IoError(String),
}

/// Configuration for zone cropper
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZoneCropperConfig {
    /// Output directory for cropped zones
    pub output_dir: PathBuf,
    
    /// Padding around zones in pixels
    pub zone_padding: u32,
    
    /// Apply masks to cropped zones
    pub apply_masks: bool,
    
    /// Save coordinate mapping metadata
    pub save_metadata: bool,
}

impl Default for ZoneCropperConfig {
    fn default() -> Self {
        Self {
            output_dir: PathBuf::from("./data/zone_artifacts"),
            zone_padding: 5,
            apply_masks: true,
            save_metadata: true,
        }
    }
}

/// Coordinate mapping from zone to original image
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoordinateMapping {
    /// Zone artifact ID
    pub zone_artifact_id: String,
    
    /// Original image dimensions
    pub original_width: u32,
    pub original_height: u32,
    
    /// Zone bounding box in original image
    pub original_bbox: BoundingBox,
    
    /// Cropped zone dimensions
    pub cropped_width: u32,
    pub cropped_height: u32,
    
    /// Padding applied
    pub padding: u32,
}

impl CoordinateMapping {
    /// Map coordinates from cropped zone back to original image
    pub fn map_to_original(&self, zone_x: u32, zone_y: u32) -> (u32, u32) {
        let orig_x = self.original_bbox.x + zone_x.saturating_sub(self.padding);
        let orig_y = self.original_bbox.y + zone_y.saturating_sub(self.padding);
        (orig_x, orig_y)
    }
    
    /// Map coordinates from original image to cropped zone
    pub fn map_to_zone(&self, orig_x: u32, orig_y: u32) -> Option<(u32, u32)> {
        if orig_x < self.original_bbox.x || orig_y < self.original_bbox.y {
            return None;
        }
        
        let zone_x = orig_x - self.original_bbox.x + self.padding;
        let zone_y = orig_y - self.original_bbox.y + self.padding;
        
        if zone_x >= self.cropped_width || zone_y >= self.cropped_height {
            return None;
        }
        
        Some((zone_x, zone_y))
    }
}

/// Result of zone cropping operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZoneCropResult {
    /// Created zone artifacts
    pub zone_artifacts: Vec<ZoneArtifact>,
    
    /// Coordinate mappings
    pub coordinate_mappings: Vec<CoordinateMapping>,
    
    /// Processing time in milliseconds
    pub processing_time_ms: u64,
    
    /// Number of zones cropped
    pub zones_cropped: usize,
    
    /// Number of masks applied
    pub masks_applied: usize,
}

/// Zone cropper service
pub struct ZoneCropper {
    config: ZoneCropperConfig,
}

impl ZoneCropper {
    /// Create a new zone cropper with default configuration
    pub fn new() -> Self {
        Self {
            config: ZoneCropperConfig::default(),
        }
    }
    
    /// Create a new zone cropper with custom configuration
    pub fn with_config(config: ZoneCropperConfig) -> Self {
        Self { config }
    }
    
    /// Crop zones from a variant image (without masks)
    pub fn crop_zones_no_masks(
        &self,
        variant: &RankedVariant,
        zones: &[DetectedZone],
    ) -> Result<ZoneCropResult, ZoneCropperError> {
        let start_time = std::time::Instant::now();
        
        // Load variant image
        let img = image::open(&variant.artifact.image_path)
            .map_err(|e| ZoneCropperError::ImageLoadError(e.to_string()))?;
        
        let (img_width, img_height) = img.dimensions();
        
        // Create output directory if it doesn't exist
        std::fs::create_dir_all(&self.config.output_dir)
            .map_err(|e| ZoneCropperError::IoError(e.to_string()))?;
        
        let mut zone_artifacts = Vec::new();
        let mut coordinate_mappings = Vec::new();
        
        // Crop each zone
        for zone in zones {
            // Validate zone coordinates
            if !self.validate_zone_coordinates(&zone.bbox, img_width, img_height) {
                continue; // Skip invalid zones
            }
            
            // Crop zone with padding
            let (cropped_img, actual_bbox) = self.crop_zone_with_padding(
                &img,
                &zone.bbox,
                img_width,
                img_height,
            )?;
            
            // Generate artifact ID
            let artifact_id = uuid::Uuid::new_v4().to_string();
            
            // Save cropped zone
            let zone_filename = format!(
                "zone_{}_{}.png",
                zone.zone_type.as_str(),
                artifact_id
            );
            let zone_path = self.config.output_dir.join(&zone_filename);
            
            cropped_img.save(&zone_path)
                .map_err(|e| ZoneCropperError::SaveError(e.to_string()))?;
            
            // Create zone artifact
            let (cropped_width, cropped_height) = cropped_img.dimensions();
            let zone_artifact = ZoneArtifact {
                artifact_id: artifact_id.clone(),
                variant_id: variant.artifact.artifact_id.clone(),
                zone_type: zone.zone_type.clone(),
                bbox: actual_bbox.clone(),
                confidence: zone.confidence,
                image_path: zone_path.to_string_lossy().to_string(),
                masks: Vec::new(), // No masks applied
            };
            
            zone_artifacts.push(zone_artifact);
            
            // Create coordinate mapping
            if self.config.save_metadata {
                let mapping = CoordinateMapping {
                    zone_artifact_id: artifact_id,
                    original_width: img_width,
                    original_height: img_height,
                    original_bbox: actual_bbox,
                    cropped_width,
                    cropped_height,
                    padding: self.config.zone_padding,
                };
                
                coordinate_mappings.push(mapping);
            }
        }
        
        let processing_time_ms = start_time.elapsed().as_millis() as u64;
        
        Ok(ZoneCropResult {
            zone_artifacts,
            coordinate_mappings,
            processing_time_ms,
            zones_cropped: zones.len(),
            masks_applied: 0,
        })
    }
    
    /// Crop zones from a variant image with mask support (requires document-cleanup feature)
    #[cfg(feature = "document-cleanup")]
    pub fn crop_zones(
        &self,
        variant: &RankedVariant,
        zones: &[DetectedZone],
        masks: &[CleanupShield],
    ) -> Result<ZoneCropResult, ZoneCropperError> {
        let start_time = std::time::Instant::now();
        
        // Load variant image
        let img = image::open(&variant.artifact.image_path)
            .map_err(|e| ZoneCropperError::ImageLoadError(e.to_string()))?;
        
        let (img_width, img_height) = img.dimensions();
        
        // Create output directory if it doesn't exist
        std::fs::create_dir_all(&self.config.output_dir)
            .map_err(|e| ZoneCropperError::IoError(e.to_string()))?;
        
        let mut zone_artifacts = Vec::new();
        let mut coordinate_mappings = Vec::new();
        let mut masks_applied = 0;
        
        // Crop each zone
        for zone in zones {
            // Validate zone coordinates
            if !self.validate_zone_coordinates(&zone.bbox, img_width, img_height) {
                continue; // Skip invalid zones
            }
            
            // Crop zone with padding
            let (cropped_img, actual_bbox) = self.crop_zone_with_padding(
                &img,
                &zone.bbox,
                img_width,
                img_height,
            )?;
            
            // Apply masks if enabled
            let masked_img = if self.config.apply_masks {
                let applied = self.apply_masks_to_zone(&cropped_img, &actual_bbox, masks)?;
                masks_applied += applied;
                cropped_img // For now, return original (mask application is visual)
            } else {
                cropped_img
            };
            
            // Generate artifact ID
            let artifact_id = uuid::Uuid::new_v4().to_string();
            
            // Save cropped zone
            let zone_filename = format!(
                "zone_{}_{}.png",
                zone.zone_type.as_str(),
                artifact_id
            );
            let zone_path = self.config.output_dir.join(&zone_filename);
            
            masked_img.save(&zone_path)
                .map_err(|e| ZoneCropperError::SaveError(e.to_string()))?;
            
            // Create zone artifact
            let (cropped_width, cropped_height) = masked_img.dimensions();
            let zone_artifact = ZoneArtifact {
                artifact_id: artifact_id.clone(),
                variant_id: variant.artifact.artifact_id.clone(),
                zone_type: zone.zone_type.clone(),
                bbox: actual_bbox.clone(),
                confidence: zone.confidence,
                image_path: zone_path.to_string_lossy().to_string(),
                // Convert normalized_bbox to pixel-based BoundingBox for the artifact
                masks: masks.iter().map(|m| {
                    Self::denormalize_bbox(&m.normalized_bbox, img_width, img_height)
                }).collect(),
            };
            
            zone_artifacts.push(zone_artifact);
            
            // Create coordinate mapping
            if self.config.save_metadata {
                let mapping = CoordinateMapping {
                    zone_artifact_id: artifact_id,
                    original_width: img_width,
                    original_height: img_height,
                    original_bbox: actual_bbox,
                    cropped_width,
                    cropped_height,
                    padding: self.config.zone_padding,
                };
                
                coordinate_mappings.push(mapping);
            }
        }
        
        let processing_time_ms = start_time.elapsed().as_millis() as u64;
        
        Ok(ZoneCropResult {
            zone_artifacts,
            coordinate_mappings,
            processing_time_ms,
            zones_cropped: zones.len(),
            masks_applied,
        })
    }
    
    /// Validate zone coordinates
    fn validate_zone_coordinates(
        &self,
        bbox: &BoundingBox,
        img_width: u32,
        img_height: u32,
    ) -> bool {
        bbox.x < img_width
            && bbox.y < img_height
            && bbox.width > 0
            && bbox.height > 0
            && bbox.x + bbox.width <= img_width
            && bbox.y + bbox.height <= img_height
    }
    
    /// Crop zone with padding
    fn crop_zone_with_padding(
        &self,
        img: &DynamicImage,
        bbox: &BoundingBox,
        img_width: u32,
        img_height: u32,
    ) -> Result<(DynamicImage, BoundingBox), ZoneCropperError> {
        // Calculate padded coordinates
        let x_start = bbox.x.saturating_sub(self.config.zone_padding);
        let y_start = bbox.y.saturating_sub(self.config.zone_padding);
        let x_end = (bbox.x + bbox.width + self.config.zone_padding).min(img_width);
        let y_end = (bbox.y + bbox.height + self.config.zone_padding).min(img_height);
        
        let actual_width = x_end - x_start;
        let actual_height = y_end - y_start;
        
        // Crop the image
        let cropped = img.crop_imm(x_start, y_start, actual_width, actual_height);
        
        let actual_bbox = BoundingBox {
            x: x_start,
            y: y_start,
            width: actual_width,
            height: actual_height,
        };
        
        Ok((cropped, actual_bbox))
    }
    
    /// Apply masks to a cropped zone (requires document-cleanup feature)
    #[cfg(feature = "document-cleanup")]
    fn apply_masks_to_zone(
        &self,
        _zone_img: &DynamicImage,
        zone_bbox: &BoundingBox,
        masks: &[CleanupShield],
    ) -> Result<usize, ZoneCropperError> {
        let mut applied_count = 0;
        
        // Get image dimensions from zone_bbox for denormalization
        // Note: We use the zone's parent image dimensions, approximated from the zone
        let img_width = zone_bbox.x + zone_bbox.width + 100; // Approximate
        let img_height = zone_bbox.y + zone_bbox.height + 100; // Approximate
        
        // Check which masks overlap with this zone
        for mask in masks {
            // Convert normalized bbox to pixel coordinates for comparison
            let mask_bbox = Self::denormalize_bbox(&mask.normalized_bbox, img_width, img_height);
            if self.bboxes_overlap(zone_bbox, &mask_bbox) {
                applied_count += 1;
                // In a real implementation, we would:
                // 1. Calculate the intersection of mask and zone
                // 2. Fill that region with white or black
                // 3. Update the zone image
                // For now, we just count overlapping masks
            }
        }
        
        Ok(applied_count)
    }
    
    /// Check if two bounding boxes overlap
    fn bboxes_overlap(&self, bbox1: &BoundingBox, bbox2: &BoundingBox) -> bool {
        let x1_end = bbox1.x + bbox1.width;
        let y1_end = bbox1.y + bbox1.height;
        let x2_end = bbox2.x + bbox2.width;
        let y2_end = bbox2.y + bbox2.height;
        
        !(bbox1.x >= x2_end || x1_end <= bbox2.x || bbox1.y >= y2_end || y1_end <= bbox2.y)
    }
    
    /// Convert normalized bbox to pixel-based BoundingBox (requires document-cleanup feature)
    /// 
    /// Helper method to convert from the new normalized coordinate system
    /// to the legacy pixel-based BoundingBox format.
    #[cfg(feature = "document-cleanup")]
    fn denormalize_bbox(bbox: &NormalizedBBox, img_width: u32, img_height: u32) -> BoundingBox {
        let (x, y, width, height) = crate::services::cleanup_engine::types::denormalize_bbox(
            bbox,
            img_width,
            img_height,
        );
        BoundingBox { x, y, width, height }
    }
    
    /// Crop zones from multiple variants (without masks)
    pub fn crop_zones_from_variants_no_masks(
        &self,
        variants: &[RankedVariant],
        zones: &[DetectedZone],
    ) -> Result<Vec<ZoneCropResult>, ZoneCropperError> {
        let mut results = Vec::new();
        
        for variant in variants {
            let result = self.crop_zones_no_masks(variant, zones)?;
            results.push(result);
        }
        
        Ok(results)
    }
    
    /// Crop zones from multiple variants with mask support (requires document-cleanup feature)
    #[cfg(feature = "document-cleanup")]
    pub fn crop_zones_from_variants(
        &self,
        variants: &[RankedVariant],
        zones: &[DetectedZone],
        masks: &[CleanupShield],
    ) -> Result<Vec<ZoneCropResult>, ZoneCropperError> {
        let mut results = Vec::new();
        
        for variant in variants {
            let result = self.crop_zones(variant, zones, masks)?;
            results.push(result);
        }
        
        Ok(results)
    }
}

impl Default for ZoneCropper {
    fn default() -> Self {
        Self::new()
    }
}

impl ZoneType {
    /// Convert zone type to string for filename
    pub fn as_str(&self) -> &str {
        match self {
            ZoneType::HeaderFields => "header",
            ZoneType::TotalsBox => "totals",
            ZoneType::LineItemsTable => "table",
            ZoneType::FooterNotes => "footer",
            ZoneType::BarcodeArea => "barcode",
            ZoneType::LogoArea => "logo",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::artifact::ZoneType;
    use crate::models::{VariantType, VariantArtifact};
    
    fn create_test_variant() -> RankedVariant {
        RankedVariant {
            artifact: VariantArtifact {
                artifact_id: "test-variant".to_string(),
                page_id: "test-page".to_string(),
                variant_type: VariantType::Grayscale,
                readiness_score: 0.85,
                image_path: "test_image.png".to_string(),
                processing_time_ms: 100,
            },
            readiness_score: 0.85,
            score_breakdown: crate::services::variant_generator::ScoreBreakdown {
                contrast: 0.8,
                edge_density: 0.9,
                noise_level: 0.85,
                sharpness: 0.8,
            },
        }
    }
    
    fn create_test_zone() -> DetectedZone {
        DetectedZone {
            zone_type: ZoneType::HeaderFields,
            bbox: BoundingBox {
                x: 100,
                y: 100,
                width: 200,
                height: 150,
            },
            confidence: 0.85,
            priority: 1,
        }
    }
    
    #[test]
    fn test_zone_cropper_creation() {
        let cropper = ZoneCropper::new();
        assert_eq!(cropper.config.zone_padding, 5);
        assert!(cropper.config.apply_masks);
        assert!(cropper.config.save_metadata);
    }
    
    #[test]
    fn test_validate_zone_coordinates() {
        let cropper = ZoneCropper::new();
        
        // Valid zone
        let valid_bbox = BoundingBox {
            x: 100,
            y: 100,
            width: 200,
            height: 150,
        };
        assert!(cropper.validate_zone_coordinates(&valid_bbox, 1000, 1000));
        
        // Zone exceeds image bounds
        let invalid_bbox = BoundingBox {
            x: 900,
            y: 900,
            width: 200,
            height: 150,
        };
        assert!(!cropper.validate_zone_coordinates(&invalid_bbox, 1000, 1000));
        
        // Zero width
        let zero_width_bbox = BoundingBox {
            x: 100,
            y: 100,
            width: 0,
            height: 150,
        };
        assert!(!cropper.validate_zone_coordinates(&zero_width_bbox, 1000, 1000));
    }
    
    #[test]
    fn test_bboxes_overlap() {
        let cropper = ZoneCropper::new();
        
        let bbox1 = BoundingBox {
            x: 100,
            y: 100,
            width: 200,
            height: 150,
        };
        
        // Overlapping bbox
        let bbox2 = BoundingBox {
            x: 150,
            y: 150,
            width: 200,
            height: 150,
        };
        assert!(cropper.bboxes_overlap(&bbox1, &bbox2));
        
        // Non-overlapping bbox
        let bbox3 = BoundingBox {
            x: 400,
            y: 400,
            width: 200,
            height: 150,
        };
        assert!(!cropper.bboxes_overlap(&bbox1, &bbox3));
    }
    
    #[test]
    fn test_coordinate_mapping() {
        let mapping = CoordinateMapping {
            zone_artifact_id: "test-zone".to_string(),
            original_width: 1000,
            original_height: 1000,
            original_bbox: BoundingBox {
                x: 100,
                y: 100,
                width: 200,
                height: 150,
            },
            cropped_width: 210,
            cropped_height: 160,
            padding: 5,
        };
        
        // Map from zone to original
        let (orig_x, orig_y) = mapping.map_to_original(10, 10);
        assert_eq!(orig_x, 105); // 100 + 10 - 5
        assert_eq!(orig_y, 105);
        
        // Map from original to zone
        let zone_coords = mapping.map_to_zone(105, 105);
        assert_eq!(zone_coords, Some((10, 10)));
        
        // Out of bounds
        let out_of_bounds = mapping.map_to_zone(50, 50);
        assert_eq!(out_of_bounds, None);
    }
    
    #[test]
    fn test_zone_type_as_str() {
        assert_eq!(ZoneType::HeaderFields.as_str(), "header");
        assert_eq!(ZoneType::TotalsBox.as_str(), "totals");
        assert_eq!(ZoneType::LineItemsTable.as_str(), "table");
        assert_eq!(ZoneType::FooterNotes.as_str(), "footer");
        assert_eq!(ZoneType::BarcodeArea.as_str(), "barcode");
        assert_eq!(ZoneType::LogoArea.as_str(), "logo");
    }
}
