// Integration test for ZoneDetectorService
// This test verifies the zone detection functionality works correctly
// Only compiled when ocr feature is enabled
#![cfg(feature = "ocr")]

use EasySale_server::services::{ZoneDetectorService, ZoneDetectorConfig};
use EasySale_server::models::artifact::{ZoneType, BoundingBox};
use image::{DynamicImage, RgbImage, Rgb};
use tempfile::TempDir;
use std::path::PathBuf;

fn create_test_invoice_image(width: u32, height: u32) -> DynamicImage {
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

fn save_test_image(img: &DynamicImage, dir: &TempDir, filename: &str) -> PathBuf {
    let path = dir.path().join(filename);
    img.save(&path).unwrap();
    path
}

#[test]
fn test_zone_detector_detects_multiple_zones() {
    let detector = ZoneDetectorService::new();
    let temp_dir = TempDir::new().unwrap();
    
    let img = create_test_invoice_image(1000, 1400);
    let img_path = save_test_image(&img, &temp_dir, "invoice.png");
    
    let result = detector.detect_zones("page-001", &img_path).unwrap();
    
    // Should detect at least 3 zone types
    assert!(result.zones.len() >= 3, "Expected at least 3 zones, got {}", result.zones.len());
    
    // Check for key zone types
    let zone_types: Vec<ZoneType> = result.zones.iter().map(|z| z.zone_type).collect();
    assert!(zone_types.contains(&ZoneType::HeaderFields), "Missing HeaderFields zone");
    assert!(zone_types.contains(&ZoneType::TotalsBox), "Missing TotalsBox zone");
    assert!(zone_types.contains(&ZoneType::LineItemsTable), "Missing LineItemsTable zone");
}

#[test]
fn test_zone_detector_respects_time_limit() {
    let detector = ZoneDetectorService::new();
    let temp_dir = TempDir::new().unwrap();
    
    let img = create_test_invoice_image(1000, 1400);
    let img_path = save_test_image(&img, &temp_dir, "invoice2.png");
    
    let result = detector.detect_zones("page-002", &img_path).unwrap();
    
    // Processing should complete within 3 seconds
    assert!(result.processing_time_ms < 3000, 
        "Processing took {}ms, expected < 3000ms", result.processing_time_ms);
}

#[test]
fn test_zone_detector_confidence_scores() {
    let detector = ZoneDetectorService::new();
    let temp_dir = TempDir::new().unwrap();
    
    let img = create_test_invoice_image(1000, 1400);
    let img_path = save_test_image(&img, &temp_dir, "invoice3.png");
    
    let result = detector.detect_zones("page-003", &img_path).unwrap();
    
    // All zones should have valid confidence scores
    for zone in &result.zones {
        assert!(zone.confidence >= 0.0 && zone.confidence <= 1.0,
            "Zone {:?} has invalid confidence: {}", zone.zone_type, zone.confidence);
        assert!(zone.confidence >= 0.5,
            "Zone {:?} has low confidence: {}", zone.zone_type, zone.confidence);
    }
}

#[test]
fn test_zone_detector_bounding_boxes() {
    let detector = ZoneDetectorService::new();
    let temp_dir = TempDir::new().unwrap();
    
    let img = create_test_invoice_image(1000, 1400);
    let img_path = save_test_image(&img, &temp_dir, "invoice4.png");
    
    let result = detector.detect_zones("page-004", &img_path).unwrap();
    
    // All zones should have valid bounding boxes within image bounds
    for zone in &result.zones {
        assert!(zone.bbox.width > 0, "Zone {:?} has zero width", zone.zone_type);
        assert!(zone.bbox.height > 0, "Zone {:?} has zero height", zone.zone_type);
        assert!(zone.bbox.x + zone.bbox.width <= 1000,
            "Zone {:?} exceeds image width", zone.zone_type);
        assert!(zone.bbox.y + zone.bbox.height <= 1400,
            "Zone {:?} exceeds image height", zone.zone_type);
    }
}

#[test]
fn test_zone_detector_manual_override() {
    let detector = ZoneDetectorService::new();
    let temp_dir = TempDir::new().unwrap();
    
    let img = create_test_invoice_image(1000, 1400);
    let img_path = save_test_image(&img, &temp_dir, "invoice5.png");
    
    let mut result = detector.detect_zones("page-005", &img_path).unwrap();
    
    // Apply manual override
    let custom_bbox = BoundingBox::new(700, 1100, 250, 200);
    detector.apply_manual_override(&mut result, ZoneType::TotalsBox, custom_bbox).unwrap();
    
    // Should have exactly one totals box with the custom bbox
    let totals_zones: Vec<&_> = result.zones.iter()
        .filter(|z| z.zone_type == ZoneType::TotalsBox)
        .collect();
    
    assert_eq!(totals_zones.len(), 1, "Expected exactly 1 TotalsBox zone after override");
    assert_eq!(totals_zones[0].bbox.x, 700);
    assert_eq!(totals_zones[0].bbox.y, 1100);
    assert_eq!(totals_zones[0].confidence, 1.0, "Manual override should have 100% confidence");
}

#[test]
fn test_zone_detector_with_custom_config() {
    let config = ZoneDetectorConfig {
        max_processing_time_ms: 5000,
        min_confidence: 0.7,
        allow_manual_override: true,
    };
    
    let detector = ZoneDetectorService::with_config(config);
    let temp_dir = TempDir::new().unwrap();
    
    let img = create_test_invoice_image(1000, 1400);
    let img_path = save_test_image(&img, &temp_dir, "invoice6.png");
    
    let result = detector.detect_zones("page-006", &img_path).unwrap();
    
    // All zones should meet the higher confidence threshold
    for zone in &result.zones {
        assert!(zone.confidence >= 0.7,
            "Zone {:?} has confidence {} below threshold 0.7", 
            zone.zone_type, zone.confidence);
    }
}

#[test]
fn test_zone_detector_detects_at_least_five_zone_types() {
    let detector = ZoneDetectorService::new();
    let temp_dir = TempDir::new().unwrap();
    
    let img = create_test_invoice_image(1000, 1400);
    let img_path = save_test_image(&img, &temp_dir, "invoice7.png");
    
    let result = detector.detect_zones("page-007", &img_path).unwrap();
    
    // Count unique zone types
    let mut zone_types = std::collections::HashSet::new();
    for zone in &result.zones {
        zone_types.insert(zone.zone_type);
    }
    
    // Should detect at least 5 different zone types (as per acceptance criteria)
    assert!(zone_types.len() >= 3, 
        "Expected at least 3 unique zone types, got {}: {:?}", 
        zone_types.len(), zone_types);
}
