// Zone Detection Service for Invoice OCR Enhancement
// Detects document zones: HeaderFields, TotalsBox, LineItemsTable, FooterNotes, etc.
// Requirements: 3.1

use crate::models::artifact::{BoundingBox, ZoneType};
use image::{DynamicImage, GenericImageView, ImageBuffer, Luma};
use serde::{Deserialize, Serialize};
use std::path::Path;
use thiserror::Error;

/// Zone detection errors
#[derive(Debug, Error)]
pub enum ZoneDetectorError {
    #[error("Failed to load image: {0}")]
    ImageLoadError(String),
    
    #[error("Failed to process image: {0}")]
    ProcessingError(String),
    
    #[error("Invalid configuration: {0}")]
    ConfigError(String),
    
    #[error("Timeout exceeded")]
    TimeoutError,
}

/// Configuration for zone detection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZoneDetectorConfig {
    /// Maximum processing time per page in milliseconds
    pub max_processing_time_ms: u64,
    
    /// Minimum confidence threshold for zone detection
    pub min_confidence: f64,
    
    /// Enable manual zone override
    pub allow_manual_override: bool,
}

impl Default for ZoneDetectorConfig {
    fn default() -> Self {
        Self {
            max_processing_time_ms: 3000, // 3 seconds
            min_confidence: 0.5,
            allow_manual_override: true,
        }
    }
}

/// A detected zone with its properties
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedZone {
    pub zone_type: ZoneType,
    pub bbox: BoundingBox,
    pub confidence: f64,
    pub priority: u8,
}

/// Result of zone detection for a page
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZoneDetectionResult {
    pub page_id: String,
    pub zones: Vec<DetectedZone>,
    pub processing_time_ms: u64,
    pub image_width: u32,
    pub image_height: u32,
}

/// Zone map containing all detected zones for a page
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZoneMap {
    pub page_id: String,
    pub zones: Vec<DetectedZone>,
    pub blocks: Vec<BoundingBox>, // Masks/ignored regions
}

/// Zone detector service
pub struct ZoneDetectorService {
    config: ZoneDetectorConfig,
}

impl ZoneDetectorService {
    /// Create a new zone detector service with default configuration
    pub fn new() -> Self {
        Self {
            config: ZoneDetectorConfig::default(),
        }
    }
    
    /// Create a new zone detector service with custom configuration
    pub fn with_config(config: ZoneDetectorConfig) -> Self {
        Self { config }
    }
    
    /// Detect zones in an image file
    pub fn detect_zones(
        &self,
        page_id: &str,
        image_path: &Path,
    ) -> Result<ZoneDetectionResult, ZoneDetectorError> {
        let start_time = std::time::Instant::now();
        
        // Load the image
        let img = image::open(image_path)
            .map_err(|e| ZoneDetectorError::ImageLoadError(e.to_string()))?;
        
        let (width, height) = img.dimensions();
        
        // Detect zones using heuristic-based approach
        let zones = self.detect_zones_heuristic(&img)?;
        
        let processing_time_ms = start_time.elapsed().as_millis() as u64;
        
        // Check timeout
        if processing_time_ms > self.config.max_processing_time_ms {
            return Err(ZoneDetectorError::TimeoutError);
        }
        
        Ok(ZoneDetectionResult {
            page_id: page_id.to_string(),
            zones,
            processing_time_ms,
            image_width: width,
            image_height: height,
        })
    }

    /// Detect zones using heuristic-based approach
    /// This is a simplified implementation that uses layout analysis
    fn detect_zones_heuristic(
        &self,
        img: &DynamicImage,
    ) -> Result<Vec<DetectedZone>, ZoneDetectorError> {
        let (width, height) = img.dimensions();
        let mut zones = Vec::new();
        
        // Convert to grayscale for analysis
        let gray = img.to_luma8();
        
        // Detect header zone (top 20% of page)
        let header_zone = self.detect_header_zone(width, height, &gray)?;
        if let Some(zone) = header_zone {
            zones.push(zone);
        }
        
        // Detect totals box (typically bottom-right area)
        let totals_zone = self.detect_totals_zone(width, height, &gray)?;
        if let Some(zone) = totals_zone {
            zones.push(zone);
        }
        
        // Detect line items table (middle section)
        let table_zone = self.detect_table_zone(width, height, &gray)?;
        if let Some(zone) = table_zone {
            zones.push(zone);
        }
        
        // Detect footer notes (bottom area, excluding totals)
        let footer_zone = self.detect_footer_zone(width, height, &gray)?;
        if let Some(zone) = footer_zone {
            zones.push(zone);
        }
        
        // Detect barcode area (typically top-right or bottom)
        let barcode_zone = self.detect_barcode_zone(width, height, &gray)?;
        if let Some(zone) = barcode_zone {
            zones.push(zone);
        }
        
        // Detect logo area (typically top-left)
        let logo_zone = self.detect_logo_zone(width, height, &gray)?;
        if let Some(zone) = logo_zone {
            zones.push(zone);
        }
        
        // Filter zones by minimum confidence
        let filtered_zones: Vec<DetectedZone> = zones
            .into_iter()
            .filter(|z| z.confidence >= self.config.min_confidence)
            .collect();
        
        Ok(filtered_zones)
    }
    
    /// Detect header fields zone (top portion of document)
    fn detect_header_zone(
        &self,
        width: u32,
        height: u32,
        _gray: &ImageBuffer<Luma<u8>, Vec<u8>>,
    ) -> Result<Option<DetectedZone>, ZoneDetectorError> {
        // Header is typically in the top 20% of the page
        let header_height = (height as f32 * 0.20) as u32;
        
        // Use heuristic: header zone has high confidence if page is standard size
        let confidence = if height > 800 { 0.85 } else { 0.70 };
        
        Ok(Some(DetectedZone {
            zone_type: ZoneType::HeaderFields,
            bbox: BoundingBox::new(0, 0, width, header_height),
            confidence,
            priority: 1,
        }))
    }

    /// Detect totals box zone (typically bottom-right)
    fn detect_totals_zone(
        &self,
        width: u32,
        height: u32,
        gray: &ImageBuffer<Luma<u8>, Vec<u8>>,
    ) -> Result<Option<DetectedZone>, ZoneDetectorError> {
        // Totals box is typically in the bottom-right 30% x 20% of the page
        let box_width = (width as f32 * 0.30) as u32;
        let box_height = (height as f32 * 0.20) as u32;
        let x = width - box_width;
        let y = height - box_height;
        
        // Calculate confidence based on text density in this region
        let confidence = Self::calculate_text_density(gray, x, y, box_width, box_height);
        
        Ok(Some(DetectedZone {
            zone_type: ZoneType::TotalsBox,
            bbox: BoundingBox::new(x, y, box_width, box_height),
            confidence: confidence.max(0.75), // Boost confidence for typical location
            priority: 2,
        }))
    }
    
    /// Detect line items table zone (middle section)
    fn detect_table_zone(
        &self,
        width: u32,
        height: u32,
        gray: &ImageBuffer<Luma<u8>, Vec<u8>>,
    ) -> Result<Option<DetectedZone>, ZoneDetectorError> {
        // Table is typically in the middle 40-70% of the page
        let start_y = (height as f32 * 0.25) as u32;
        let table_height = (height as f32 * 0.45) as u32;
        
        // Calculate confidence based on horizontal line detection
        let confidence = Self::detect_table_lines(gray, 0, start_y, width, table_height);
        
        Ok(Some(DetectedZone {
            zone_type: ZoneType::LineItemsTable,
            bbox: BoundingBox::new(0, start_y, width, table_height),
            confidence: confidence.max(0.70),
            priority: 3,
        }))
    }
    
    /// Detect footer notes zone (bottom area)
    fn detect_footer_zone(
        &self,
        width: u32,
        height: u32,
        _gray: &ImageBuffer<Luma<u8>, Vec<u8>>,
    ) -> Result<Option<DetectedZone>, ZoneDetectorError> {
        // Footer is typically in the bottom 15% of the page, left side
        let footer_height = (height as f32 * 0.15) as u32;
        let footer_width = (width as f32 * 0.60) as u32; // Left 60%
        let y = height - footer_height;
        
        Ok(Some(DetectedZone {
            zone_type: ZoneType::FooterNotes,
            bbox: BoundingBox::new(0, y, footer_width, footer_height),
            confidence: 0.65,
            priority: 5,
        }))
    }
    
    /// Detect barcode area zone
    fn detect_barcode_zone(
        &self,
        width: u32,
        height: u32,
        gray: &ImageBuffer<Luma<u8>, Vec<u8>>,
    ) -> Result<Option<DetectedZone>, ZoneDetectorError> {
        // Check top-right corner for barcode
        let box_width = (width as f32 * 0.25) as u32;
        let box_height = (height as f32 * 0.10) as u32;
        let x = width - box_width;
        
        // Calculate confidence based on barcode-like patterns
        let confidence = Self::detect_barcode_pattern(gray, x, 0, box_width, box_height);
        
        if confidence > 0.5 {
            Ok(Some(DetectedZone {
                zone_type: ZoneType::BarcodeArea,
                bbox: BoundingBox::new(x, 0, box_width, box_height),
                confidence,
                priority: 6,
            }))
        } else {
            Ok(None)
        }
    }

    /// Detect logo area zone
    fn detect_logo_zone(
        &self,
        width: u32,
        height: u32,
        gray: &ImageBuffer<Luma<u8>, Vec<u8>>,
    ) -> Result<Option<DetectedZone>, ZoneDetectorError> {
        // Check top-left corner for logo
        let box_width = (width as f32 * 0.25) as u32;
        let box_height = (height as f32 * 0.15) as u32;
        
        // Calculate confidence based on image density
        let confidence = Self::detect_logo_pattern(gray, 0, 0, box_width, box_height);
        
        if confidence > 0.5 {
            Ok(Some(DetectedZone {
                zone_type: ZoneType::LogoArea,
                bbox: BoundingBox::new(0, 0, box_width, box_height),
                confidence,
                priority: 7,
            }))
        } else {
            Ok(None)
        }
    }
    
    /// Calculate text density in a region (0.0 to 1.0)
    fn calculate_text_density(
        gray: &ImageBuffer<Luma<u8>, Vec<u8>>,
        x: u32,
        y: u32,
        width: u32,
        height: u32,
    ) -> f64 {
        let mut dark_pixels = 0;
        let mut total_pixels = 0;
        
        let img_width = gray.width();
        let img_height = gray.height();
        
        for py in y..y.saturating_add(height).min(img_height) {
            for px in x..x.saturating_add(width).min(img_width) {
                let pixel = gray.get_pixel(px, py);
                total_pixels += 1;
                
                // Consider pixels darker than threshold as text
                if pixel[0] < 200 {
                    dark_pixels += 1;
                }
            }
        }
        
        if total_pixels == 0 {
            return 0.0;
        }
        
        let density = dark_pixels as f64 / total_pixels as f64;
        
        // Normalize to reasonable confidence range (5-20% density is typical for text)
        if density >= 0.05 && density <= 0.30 {
            0.80
        } else if density > 0.30 {
            0.60 // Too dense, might be image
        } else {
            0.50 // Too sparse
        }
    }
    
    /// Detect horizontal lines typical of tables
    fn detect_table_lines(
        gray: &ImageBuffer<Luma<u8>, Vec<u8>>,
        x: u32,
        y: u32,
        width: u32,
        height: u32,
    ) -> f64 {
        let mut horizontal_lines = 0;
        let img_width = gray.width();
        let img_height = gray.height();
        
        // Sample every 10 rows to detect horizontal lines
        for py in (y..y.saturating_add(height).min(img_height)).step_by(10) {
            let mut consecutive_dark = 0;
            
            for px in x..x.saturating_add(width).min(img_width) {
                let pixel = gray.get_pixel(px, py);
                
                if pixel[0] < 150 {
                    consecutive_dark += 1;
                } else {
                    consecutive_dark = 0;
                }
                
                // If we find a long horizontal line, count it
                if consecutive_dark > width / 3 {
                    horizontal_lines += 1;
                    break;
                }
            }
        }
        
        // More horizontal lines = higher confidence it's a table
        let line_density = horizontal_lines as f64 / (height / 10) as f64;
        (line_density * 2.0).min(0.90)
    }

    /// Detect barcode-like patterns (vertical lines with regular spacing)
    fn detect_barcode_pattern(
        gray: &ImageBuffer<Luma<u8>, Vec<u8>>,
        x: u32,
        y: u32,
        width: u32,
        height: u32,
    ) -> f64 {
        let mut vertical_transitions = 0;
        let img_width = gray.width();
        let img_height = gray.height();
        
        // Sample middle row of the region
        let sample_y = y + height / 2;
        if sample_y >= img_height {
            return 0.0;
        }
        
        let mut prev_dark = false;
        
        for px in x..x.saturating_add(width).min(img_width) {
            let pixel = gray.get_pixel(px, sample_y);
            let is_dark = pixel[0] < 150;
            
            if is_dark != prev_dark {
                vertical_transitions += 1;
            }
            prev_dark = is_dark;
        }
        
        // Barcodes have many vertical transitions
        let transition_density = vertical_transitions as f64 / width as f64;
        
        if transition_density > 0.3 {
            0.75
        } else if transition_density > 0.15 {
            0.55
        } else {
            0.30
        }
    }
    
    /// Detect logo-like patterns (high contrast, distinct shapes)
    fn detect_logo_pattern(
        gray: &ImageBuffer<Luma<u8>, Vec<u8>>,
        x: u32,
        y: u32,
        width: u32,
        height: u32,
    ) -> f64 {
        let mut edge_pixels = 0;
        let mut total_pixels = 0;
        let img_width = gray.width();
        let img_height = gray.height();
        
        // Detect edges using simple gradient
        for py in y + 1..y.saturating_add(height).min(img_height) - 1 {
            for px in x + 1..x.saturating_add(width).min(img_width) - 1 {
                let center = gray.get_pixel(px, py)[0] as i32;
                let right = gray.get_pixel(px + 1, py)[0] as i32;
                let bottom = gray.get_pixel(px, py + 1)[0] as i32;
                
                let gradient = ((center - right).abs() + (center - bottom).abs()) / 2;
                
                if gradient > 30 {
                    edge_pixels += 1;
                }
                total_pixels += 1;
            }
        }
        
        if total_pixels == 0 {
            return 0.0;
        }
        
        let edge_density = edge_pixels as f64 / total_pixels as f64;
        
        // Logos typically have 10-30% edge density
        if edge_density >= 0.10 && edge_density <= 0.40 {
            0.70
        } else if edge_density > 0.40 {
            0.55 // Too many edges, might be text
        } else {
            0.40 // Too few edges
        }
    }
    
    /// Apply manual zone override
    pub fn apply_manual_override(
        &self,
        result: &mut ZoneDetectionResult,
        zone_type: ZoneType,
        bbox: BoundingBox,
    ) -> Result<(), ZoneDetectorError> {
        if !self.config.allow_manual_override {
            return Err(ZoneDetectorError::ConfigError(
                "Manual override is disabled".to_string(),
            ));
        }
        
        // Remove existing zone of the same type
        result.zones.retain(|z| z.zone_type != zone_type);
        
        // Add the manually specified zone with high confidence
        result.zones.push(DetectedZone {
            zone_type,
            bbox,
            confidence: 1.0, // Manual overrides have 100% confidence
            priority: 0, // Highest priority
        });
        
        Ok(())
    }
}

impl Default for ZoneDetectorService {
    fn default() -> Self {
        Self::new()
    }
}


#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Luma, Rgb, RgbImage};
    use std::fs;
    use tempfile::TempDir;

    fn create_test_image(width: u32, height: u32) -> DynamicImage {
        let img = RgbImage::new(width, height);
        DynamicImage::ImageRgb8(img)
    }

    fn create_invoice_like_image(width: u32, height: u32) -> DynamicImage {
        let mut img = RgbImage::new(width, height);
        
        // Fill with white background
        for pixel in img.pixels_mut() {
            *pixel = Rgb([255, 255, 255]);
        }
        
        // Add header area (dark text simulation)
        for y in 0..height / 5 {
            for x in 0..width {
                if (x + y) % 10 < 3 {
                    img.put_pixel(x, y, Rgb([50, 50, 50]));
                }
            }
        }
        
        // Add table lines in middle
        for y in (height / 4..height * 3 / 4).step_by(50) {
            for x in 0..width {
                img.put_pixel(x, y, Rgb([0, 0, 0]));
            }
        }
        
        // Add totals box in bottom-right
        let totals_x = width * 7 / 10;
        let totals_y = height * 4 / 5;
        for y in totals_y..height {
            for x in totals_x..width {
                if (x + y) % 8 < 2 {
                    img.put_pixel(x, y, Rgb([30, 30, 30]));
                }
            }
        }
        
        DynamicImage::ImageRgb8(img)
    }

    fn save_test_image(img: &DynamicImage, dir: &TempDir, filename: &str) -> std::path::PathBuf {
        let path = dir.path().join(filename);
        img.save(&path).unwrap();
        path
    }

    #[test]
    fn test_zone_detector_creation() {
        let detector = ZoneDetectorService::new();
        assert_eq!(detector.config.max_processing_time_ms, 3000);
        assert_eq!(detector.config.min_confidence, 0.5);
        assert!(detector.config.allow_manual_override);
    }

    #[test]
    fn test_zone_detector_with_custom_config() {
        let config = ZoneDetectorConfig {
            max_processing_time_ms: 5000,
            min_confidence: 0.7,
            allow_manual_override: false,
        };
        
        let detector = ZoneDetectorService::with_config(config);
        assert_eq!(detector.config.max_processing_time_ms, 5000);
        assert_eq!(detector.config.min_confidence, 0.7);
        assert!(!detector.config.allow_manual_override);
    }

    #[test]
    fn test_detect_zones_basic() {
        let detector = ZoneDetectorService::new();
        let temp_dir = TempDir::new().unwrap();
        
        let img = create_test_image(1000, 1400);
        let img_path = save_test_image(&img, &temp_dir, "test.png");
        
        let result = detector.detect_zones("page-001", &img_path);
        assert!(result.is_ok());
        
        let result = result.unwrap();
        assert_eq!(result.page_id, "page-001");
        assert_eq!(result.image_width, 1000);
        assert_eq!(result.image_height, 1400);
        assert!(result.processing_time_ms < 3000);
        
        // Should detect at least header and totals zones
        assert!(!result.zones.is_empty());
    }

    #[test]
    fn test_detect_multiple_zone_types() {
        let detector = ZoneDetectorService::new();
        let temp_dir = TempDir::new().unwrap();
        
        let img = create_invoice_like_image(1000, 1400);
        let img_path = save_test_image(&img, &temp_dir, "invoice.png");
        
        let result = detector.detect_zones("page-002", &img_path).unwrap();
        
        // Should detect at least 5 zone types
        let zone_types: Vec<ZoneType> = result.zones.iter().map(|z| z.zone_type).collect();
        
        // Check for key zone types
        assert!(zone_types.contains(&ZoneType::HeaderFields));
        assert!(zone_types.contains(&ZoneType::TotalsBox));
        assert!(zone_types.contains(&ZoneType::LineItemsTable));
        
        // Should have at least 3 zones
        assert!(result.zones.len() >= 3);
    }

    #[test]
    fn test_zone_confidence_scores() {
        let detector = ZoneDetectorService::new();
        let temp_dir = TempDir::new().unwrap();
        
        let img = create_invoice_like_image(1000, 1400);
        let img_path = save_test_image(&img, &temp_dir, "invoice2.png");
        
        let result = detector.detect_zones("page-003", &img_path).unwrap();
        
        // All zones should have confidence scores
        for zone in &result.zones {
            assert!(zone.confidence >= 0.0 && zone.confidence <= 1.0);
            assert!(zone.confidence >= detector.config.min_confidence);
        }
    }

    #[test]
    fn test_zone_bounding_boxes() {
        let detector = ZoneDetectorService::new();
        let temp_dir = TempDir::new().unwrap();
        
        let img = create_test_image(1000, 1400);
        let img_path = save_test_image(&img, &temp_dir, "test2.png");
        
        let result = detector.detect_zones("page-004", &img_path).unwrap();
        
        // All zones should have valid bounding boxes
        for zone in &result.zones {
            assert!(zone.bbox.width > 0);
            assert!(zone.bbox.height > 0);
            assert!(zone.bbox.x + zone.bbox.width <= 1000);
            assert!(zone.bbox.y + zone.bbox.height <= 1400);
        }
    }

    #[test]
    fn test_processing_time_limit() {
        let config = ZoneDetectorConfig {
            max_processing_time_ms: 3000,
            min_confidence: 0.5,
            allow_manual_override: true,
        };
        
        let detector = ZoneDetectorService::with_config(config);
        let temp_dir = TempDir::new().unwrap();
        
        let img = create_test_image(1000, 1400);
        let img_path = save_test_image(&img, &temp_dir, "test3.png");
        
        let result = detector.detect_zones("page-005", &img_path).unwrap();
        
        // Processing should complete within time limit
        assert!(result.processing_time_ms < 3000);
    }

    #[test]
    fn test_manual_override() {
        let detector = ZoneDetectorService::new();
        let temp_dir = TempDir::new().unwrap();
        
        let img = create_test_image(1000, 1400);
        let img_path = save_test_image(&img, &temp_dir, "test4.png");
        
        let mut result = detector.detect_zones("page-006", &img_path).unwrap();
        
        // Apply manual override for totals box
        let custom_bbox = BoundingBox::new(700, 1100, 250, 200);
        let override_result = detector.apply_manual_override(
            &mut result,
            ZoneType::TotalsBox,
            custom_bbox,
        );
        
        assert!(override_result.is_ok());
        
        // Should have replaced the totals box zone
        let totals_zones: Vec<&DetectedZone> = result
            .zones
            .iter()
            .filter(|z| z.zone_type == ZoneType::TotalsBox)
            .collect();
        
        assert_eq!(totals_zones.len(), 1);
        assert_eq!(totals_zones[0].bbox.x, 700);
        assert_eq!(totals_zones[0].bbox.y, 1100);
        assert_eq!(totals_zones[0].confidence, 1.0);
        assert_eq!(totals_zones[0].priority, 0);
    }

    #[test]
    fn test_manual_override_disabled() {
        let config = ZoneDetectorConfig {
            max_processing_time_ms: 3000,
            min_confidence: 0.5,
            allow_manual_override: false,
        };
        
        let detector = ZoneDetectorService::with_config(config);
        let temp_dir = TempDir::new().unwrap();
        
        let img = create_test_image(1000, 1400);
        let img_path = save_test_image(&img, &temp_dir, "test5.png");
        
        let mut result = detector.detect_zones("page-007", &img_path).unwrap();
        
        // Manual override should fail
        let custom_bbox = BoundingBox::new(700, 1100, 250, 200);
        let override_result = detector.apply_manual_override(
            &mut result,
            ZoneType::TotalsBox,
            custom_bbox,
        );
        
        assert!(override_result.is_err());
        assert!(matches!(
            override_result.unwrap_err(),
            ZoneDetectorError::ConfigError(_)
        ));
    }

    #[test]
    fn test_header_zone_detection() {
        let detector = ZoneDetectorService::new();
        let gray = ImageBuffer::from_fn(1000, 1400, |_, _| Luma([255u8]));
        
        let result = detector.detect_header_zone(1000, 1400, &gray).unwrap();
        
        assert!(result.is_some());
        let zone = result.unwrap();
        assert_eq!(zone.zone_type, ZoneType::HeaderFields);
        assert_eq!(zone.bbox.x, 0);
        assert_eq!(zone.bbox.y, 0);
        assert_eq!(zone.bbox.width, 1000);
        assert!(zone.bbox.height > 0);
        assert!(zone.confidence > 0.5);
    }

    #[test]
    fn test_totals_zone_detection() {
        let detector = ZoneDetectorService::new();
        let gray = ImageBuffer::from_fn(1000, 1400, |_, _| Luma([255u8]));
        
        let result = detector.detect_totals_zone(1000, 1400, &gray).unwrap();
        
        assert!(result.is_some());
        let zone = result.unwrap();
        assert_eq!(zone.zone_type, ZoneType::TotalsBox);
        assert!(zone.bbox.x > 500); // Should be on right side
        assert!(zone.bbox.y > 1000); // Should be near bottom
        assert!(zone.confidence > 0.5);
    }

    #[test]
    fn test_table_zone_detection() {
        let detector = ZoneDetectorService::new();
        let gray = ImageBuffer::from_fn(1000, 1400, |_, _| Luma([255u8]));
        
        let result = detector.detect_table_zone(1000, 1400, &gray).unwrap();
        
        assert!(result.is_some());
        let zone = result.unwrap();
        assert_eq!(zone.zone_type, ZoneType::LineItemsTable);
        assert_eq!(zone.bbox.x, 0);
        assert!(zone.bbox.y > 200); // Should be below header
        assert!(zone.bbox.y < 800); // Should be in middle
        assert!(zone.confidence > 0.5);
    }

    #[test]
    fn test_footer_zone_detection() {
        let detector = ZoneDetectorService::new();
        let gray = ImageBuffer::from_fn(1000, 1400, |_, _| Luma([255u8]));
        
        let result = detector.detect_footer_zone(1000, 1400, &gray).unwrap();
        
        assert!(result.is_some());
        let zone = result.unwrap();
        assert_eq!(zone.zone_type, ZoneType::FooterNotes);
        assert_eq!(zone.bbox.x, 0);
        assert!(zone.bbox.y > 1000); // Should be near bottom
        assert!(zone.confidence > 0.5);
    }

    #[test]
    fn test_text_density_calculation() {
        let detector = ZoneDetectorService::new();
        
        // Create image with 10% dark pixels (typical text density)
        let mut gray = ImageBuffer::from_fn(100, 100, |_, _| Luma([255u8]));
        for y in 0..100 {
            for x in 0..10 {
                gray.put_pixel(x, y, Luma([50u8]));
            }
        }
        
        let density = detector.calculate_text_density(&gray, 0, 0, 100, 100);
        assert!(density > 0.5); // Should recognize as text
    }

    #[test]
    fn test_table_line_detection() {
        let detector = ZoneDetectorService::new();
        
        // Create image with horizontal lines
        let mut gray = ImageBuffer::from_fn(100, 100, |_, _| Luma([255u8]));
        for y in (0..100).step_by(20) {
            for x in 0..100 {
                gray.put_pixel(x, y, Luma([0u8]));
            }
        }
        
        let confidence = detector.detect_table_lines(&gray, 0, 0, 100, 100);
        assert!(confidence > 0.5); // Should recognize table lines
    }

    #[test]
    fn test_barcode_pattern_detection() {
        let detector = ZoneDetectorService::new();
        
        // Create image with vertical stripes (barcode-like)
        let gray = ImageBuffer::from_fn(100, 50, |x, _| {
            if x % 4 < 2 {
                Luma([0u8])
            } else {
                Luma([255u8])
            }
        });
        
        let confidence = detector.detect_barcode_pattern(&gray, 0, 0, 100, 50);
        assert!(confidence > 0.5); // Should recognize barcode pattern
    }

    #[test]
    fn test_logo_pattern_detection() {
        let detector = ZoneDetectorService::new();
        
        // Create image with edges (logo-like)
        let gray = ImageBuffer::from_fn(100, 100, |x, y| {
            if x < 50 && y < 50 {
                Luma([0u8])
            } else {
                Luma([255u8])
            }
        });
        
        let confidence = detector.detect_logo_pattern(&gray, 0, 0, 100, 100);
        assert!(confidence > 0.3); // Should detect some logo-like pattern
    }

    #[test]
    fn test_min_confidence_filtering() {
        let config = ZoneDetectorConfig {
            max_processing_time_ms: 3000,
            min_confidence: 0.8, // High threshold
            allow_manual_override: true,
        };
        
        let detector = ZoneDetectorService::with_config(config);
        let temp_dir = TempDir::new().unwrap();
        
        let img = create_test_image(1000, 1400);
        let img_path = save_test_image(&img, &temp_dir, "test6.png");
        
        let result = detector.detect_zones("page-008", &img_path).unwrap();
        
        // All returned zones should meet minimum confidence
        for zone in &result.zones {
            assert!(zone.confidence >= 0.8);
        }
    }

    #[test]
    fn test_zone_priority_assignment() {
        let detector = ZoneDetectorService::new();
        let temp_dir = TempDir::new().unwrap();
        
        let img = create_invoice_like_image(1000, 1400);
        let img_path = save_test_image(&img, &temp_dir, "invoice3.png");
        
        let result = detector.detect_zones("page-009", &img_path).unwrap();
        
        // All zones should have priority assigned
        for zone in &result.zones {
            assert!(zone.priority > 0 || zone.confidence == 1.0); // Manual overrides have priority 0
        }
    }

    #[test]
    fn test_image_load_error() {
        let detector = ZoneDetectorService::new();
        let non_existent_path = Path::new("/non/existent/path.png");
        
        let result = detector.detect_zones("page-010", non_existent_path);
        
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            ZoneDetectorError::ImageLoadError(_)
        ));
    }

    #[test]
    fn test_zone_detection_result_serialization() {
        let result = ZoneDetectionResult {
            page_id: "page-001".to_string(),
            zones: vec![
                DetectedZone {
                    zone_type: ZoneType::HeaderFields,
                    bbox: BoundingBox::new(0, 0, 100, 50),
                    confidence: 0.85,
                    priority: 1,
                },
            ],
            processing_time_ms: 1500,
            image_width: 1000,
            image_height: 1400,
        };
        
        let json = serde_json::to_string(&result).unwrap();
        let deserialized: ZoneDetectionResult = serde_json::from_str(&json).unwrap();
        
        assert_eq!(deserialized.page_id, "page-001");
        assert_eq!(deserialized.zones.len(), 1);
        assert_eq!(deserialized.processing_time_ms, 1500);
    }
}
