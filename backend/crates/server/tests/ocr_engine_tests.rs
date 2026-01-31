// Integration tests for OCR Engine Abstraction
// Requirements: 2.1 (OCR Profiles)
// Only compiled when ocr feature is enabled
#![cfg(feature = "ocr")]

use easysale_server::services::{OcrEngine, OcrProfile, TesseractEngine};

#[test]
fn test_ocr_profile_creation() {
    let profile = OcrProfile::full_page_default();
    assert_eq!(profile.name, "full-page-default");
    assert_eq!(profile.psm, 3);
    assert_eq!(profile.oem, 3);
    assert_eq!(profile.dpi, Some(300));
    assert_eq!(profile.language, "eng");
    assert!(profile.whitelist.is_none());
    assert!(profile.blacklist.is_none());
    assert_eq!(profile.timeout_seconds, 30);
}

#[test]
fn test_numbers_only_profile() {
    let profile = OcrProfile::numbers_only();
    assert_eq!(profile.name, "numbers-only-totals");
    assert_eq!(profile.psm, 7); // Single line
    assert_eq!(profile.whitelist, Some("0123456789.$,".to_string()));
    assert_eq!(profile.timeout_seconds, 15);
}

#[test]
fn test_table_dense_profile() {
    let profile = OcrProfile::table_dense();
    assert_eq!(profile.name, "table-dense");
    assert_eq!(profile.psm, 6); // Uniform block of text
    assert!(profile.dpi.is_none());
}

#[test]
fn test_header_fields_profile() {
    let profile = OcrProfile::header_fields();
    assert_eq!(profile.name, "header-fields");
    assert_eq!(profile.psm, 11); // Sparse text
    assert_eq!(profile.timeout_seconds, 20);
}

#[test]
fn test_single_word_profile() {
    let profile = OcrProfile::single_word();
    assert_eq!(profile.name, "single-word");
    assert_eq!(profile.psm, 8); // Single word
    assert_eq!(profile.timeout_seconds, 10);
}

#[test]
fn test_tesseract_engine_creation() {
    let engine = TesseractEngine::new();
    assert_eq!(engine.engine_name(), "tesseract");
}

#[test]
fn test_tesseract_engine_with_custom_path() {
    let engine = TesseractEngine::with_path("/usr/bin/tesseract".to_string());
    assert_eq!(engine.engine_name(), "tesseract");
}

#[test]
fn test_profile_serialization() {
    let profile = OcrProfile::numbers_only();
    let json = serde_json::to_string(&profile).unwrap();
    let deserialized: OcrProfile = serde_json::from_str(&json).unwrap();

    assert_eq!(profile.name, deserialized.name);
    assert_eq!(profile.psm, deserialized.psm);
    assert_eq!(profile.oem, deserialized.oem);
    assert_eq!(profile.whitelist, deserialized.whitelist);
    assert_eq!(profile.timeout_seconds, deserialized.timeout_seconds);
}

#[tokio::test]
#[ignore] // Only run if tesseract is installed
async fn test_tesseract_availability() {
    let engine = TesseractEngine::new();
    let is_available = engine.is_available().await;
    
    // This test will pass if tesseract is installed, otherwise it will be skipped
    if is_available {
        println!("Tesseract is available");
    } else {
        println!("Tesseract is not available - install it to run full OCR tests");
    }
}
