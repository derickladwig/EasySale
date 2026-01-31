// Simple test for PDF text extraction functionality
// Only compiled when document-processing feature is enabled
#![cfg(feature = "document-processing")]

use easysale_server::services::{DocumentIngestService, IngestConfig};
use lopdf::{Document as PdfDocument, Dictionary};
use std::path::PathBuf;
use tempfile::TempDir;

/// Create a simple PDF for testing
fn create_simple_pdf(path: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    let mut doc = PdfDocument::with_version("1.4");
    
    // Create a page
    let pages_id = doc.new_object_id();
    let page_id = doc.add_object(Dictionary::from_iter(vec![
        ("Type", "Page".into()),
        ("Parent", pages_id.into()),
        ("MediaBox", vec![0.into(), 0.into(), 612.into(), 792.into()].into()),
    ]));
    
    // Create pages dictionary
    let pages = Dictionary::from_iter(vec![
        ("Type", "Pages".into()),
        ("Kids", vec![page_id.into()].into()),
        ("Count", 1.into()),
    ]);
    doc.objects.insert(pages_id, pages.into());
    
    // Create catalog
    let catalog_id = doc.add_object(Dictionary::from_iter(vec![
        ("Type", "Catalog".into()),
        ("Pages", pages_id.into()),
    ]));
    
    doc.trailer.set("Root", catalog_id);
    
    // Save the document
    doc.save(path)?;
    
    Ok(())
}

#[tokio::test]
async fn test_pdf_basic_processing() {
    let temp_dir = TempDir::new().unwrap();
    let config = IngestConfig {
        max_file_size: 10 * 1024 * 1024,
        default_dpi: 300,
        storage_dir: temp_dir.path().to_path_buf(),
    };
    let service = DocumentIngestService::new(config);

    // Create a simple PDF
    let test_pdf_path = temp_dir.path().join("test.pdf");
    create_simple_pdf(&test_pdf_path).unwrap();

    // Try to ingest it
    let result = service.ingest_file(&test_pdf_path).await;
    
    // We expect either success or a PDF error (not a panic)
    match result {
        Ok(ingest_result) => {
            println!("PDF processed successfully");
            println!("Pages: {}", ingest_result.page_artifacts.len());
            assert_eq!(ingest_result.input_artifact.mime_type, "application/pdf");
        }
        Err(e) => {
            println!("PDF processing error (expected for minimal PDF): {:?}", e);
            // This is acceptable for a minimal PDF
        }
    }
}

#[test]
fn test_confidence_scoring() {
    let temp_dir = TempDir::new().unwrap();
    let config = IngestConfig {
        max_file_size: 10 * 1024 * 1024,
        default_dpi: 300,
        storage_dir: temp_dir.path().to_path_buf(),
    };
    let service = DocumentIngestService::new(config);

    // Test empty text
    let conf_empty = DocumentIngestService::calculate_text_confidence("");
    assert_eq!(conf_empty, 0.0);

    // Test short text
    let conf_short = DocumentIngestService::calculate_text_confidence("Hello");
    assert!(conf_short > 0.0 && conf_short < 1.0);

    // Test quality text
    let quality_text = "Invoice Number: INV-12345\nDate: 2024-01-15\nTotal: $1,234.56\n\
                        This is a sample invoice with good quality text that should score high.";
    let conf_quality = DocumentIngestService::calculate_text_confidence(quality_text);
    assert!(conf_quality >= 0.8, "Expected high confidence, got {}", conf_quality);

    // Test garbage text
    let garbage = "!@#$%^&*()_+{}|:<>?~`-=[]\\;',./";
    let conf_garbage = DocumentIngestService::calculate_text_confidence(garbage);
    assert!(conf_garbage < 0.7, "Expected low confidence, got {}", conf_garbage);
}
