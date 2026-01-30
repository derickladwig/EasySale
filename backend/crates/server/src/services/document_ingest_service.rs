// Document ingest service for OCR pipeline
// Supports PDF rasterization, image loading, and multi-page handling

use crate::models::{InputArtifact, PageArtifact};
use lopdf::Document as PdfDocument;
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use std::fs;
use std::io::Read;
use thiserror::Error;
use uuid::Uuid;

/// Errors that can occur during document ingestion
#[derive(Debug, Error)]
pub enum IngestError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Image processing error: {0}")]
    Image(#[from] image::ImageError),

    #[error("PDF processing error: {0}")]
    Pdf(String),

    #[error("Unsupported file format: {0}")]
    UnsupportedFormat(String),

    #[error("File too large: {size} bytes (max: {max} bytes)")]
    FileTooLarge { size: u64, max: u64 },

    #[error("Invalid file: {0}")]
    InvalidFile(String),
}

/// Configuration for document ingestion
#[derive(Debug, Clone)]
pub struct IngestConfig {
    /// Maximum file size in bytes (default: 50MB)
    pub max_file_size: u64,
    /// DPI for PDF rasterization (default: 300)
    pub default_dpi: u32,
    /// Storage directory for artifacts
    pub storage_dir: PathBuf,
}

impl Default for IngestConfig {
    fn default() -> Self {
        Self {
            max_file_size: 50 * 1024 * 1024, // 50MB
            default_dpi: 300,
            storage_dir: PathBuf::from("./data/artifacts"),
        }
    }
}

/// Result of document ingestion
#[derive(Debug)]
pub struct IngestResult {
    pub input_artifact: InputArtifact,
    pub page_artifacts: Vec<PageArtifact>,
    pub processing_time_ms: u64,
}

/// Document ingest service
pub struct DocumentIngestService {
    config: IngestConfig,
}

impl DocumentIngestService {
    /// Create a new document ingest service
    pub fn new(config: IngestConfig) -> Self {
        Self { config }
    }

    /// Ingest a document from a file path
    pub async fn ingest_file(&self, file_path: &Path) -> Result<IngestResult, IngestError> {
        let start_time = std::time::Instant::now();

        // Validate file exists
        if !file_path.exists() {
            return Err(IngestError::InvalidFile(format!(
                "File does not exist: {}",
                file_path.display()
            )));
        }

        // Check file size
        let metadata = fs::metadata(file_path)?;
        let file_size = metadata.len();
        if file_size > self.config.max_file_size {
            return Err(IngestError::FileTooLarge {
                size: file_size,
                max: self.config.max_file_size,
            });
        }

        // Calculate file hash
        let file_hash = Self::calculate_file_hash(file_path)?;

        // Detect MIME type
        let mime_type = Self::detect_mime_type(file_path)?;

        // Create input artifact
        let input_artifact = InputArtifact::new(
            format!("input-{}", Uuid::new_v4()),
            file_path.to_string_lossy().to_string(),
            file_hash,
            file_size,
            mime_type.clone(),
        );

        // Process based on file type
        let page_artifacts = match mime_type.as_str() {
            "application/pdf" => self.process_pdf(file_path, &input_artifact).await?,
            "image/jpeg" | "image/png" | "image/tiff" => {
                self.process_image(file_path, &input_artifact).await?
            }
            _ => {
                return Err(IngestError::UnsupportedFormat(mime_type));
            }
        };

        let processing_time_ms = start_time.elapsed().as_millis() as u64;

        Ok(IngestResult {
            input_artifact,
            page_artifacts,
            processing_time_ms,
        })
    }

    /// Process a PDF file
    async fn process_pdf(
        &self,
        file_path: &Path,
        input_artifact: &InputArtifact,
    ) -> Result<Vec<PageArtifact>, IngestError> {
        // Load the PDF document
        let doc = PdfDocument::load(file_path)
            .map_err(|e| IngestError::Pdf(format!("Failed to load PDF: {}", e)))?;

        let page_count = doc.get_pages().len();
        let mut page_artifacts = Vec::with_capacity(page_count);

        // Process each page
        for (page_num, _page_id) in doc.get_pages().iter().enumerate() {
            let page_number = (page_num + 1) as u32;

            // Extract text layer from this page
            let text_layer = self.extract_text_from_page(&doc, page_num + 1)?;

            // Calculate confidence score based on text quality
            let text_confidence = Self::calculate_text_confidence(&text_layer);

            // For now, we'll create a placeholder image path
            // TODO: Implement actual PDF rasterization in a future task
            let artifact_id = format!("page-{}", Uuid::new_v4());
            let image_filename = format!("{}.png", artifact_id);
            let image_path = self.config.storage_dir.join(&image_filename);

            // Ensure storage directory exists
            fs::create_dir_all(&self.config.storage_dir)?;

            // Create page artifact with text layer
            let page_artifact = PageArtifact::new(
                artifact_id,
                input_artifact.artifact_id.clone(),
                page_number,
                self.config.default_dpi,
                0, // No rotation initially
                text_confidence, // Use text confidence as rotation score for now
                image_path.to_string_lossy().to_string(),
                if text_layer.is_empty() {
                    None
                } else {
                    Some(text_layer)
                },
            );

            page_artifacts.push(page_artifact);
        }

        Ok(page_artifacts)
    }

    /// Extract text from a specific PDF page
    fn extract_text_from_page(
        &self,
        doc: &PdfDocument,
        page_num: usize,
    ) -> Result<String, IngestError> {
        // Get the page ID
        let pages = doc.get_pages();
        let _page_id = pages
            .get(&(page_num as u32))
            .ok_or_else(|| IngestError::Pdf(format!("Page {} not found", page_num)))?;

        // Extract text from the page
        let text = doc
            .extract_text(&[page_num as u32])
            .unwrap_or_default();

        Ok(text)
    }

    /// Calculate confidence score for extracted text
    /// Returns a score between 0.0 and 1.0 based on text quality indicators
    pub fn calculate_text_confidence(text: &str) -> f64 {
        if text.is_empty() {
            return 0.0;
        }

        let mut score: f64 = 0.5; // Base score for having any text

        // Check text length (longer text generally indicates better extraction)
        let text_length = text.len();
        if text_length > 100 {
            score += 0.1;
        }
        if text_length > 500 {
            score += 0.1;
        }

        // Check for alphanumeric content (good indicator of real text)
        let alphanumeric_ratio = text
            .chars()
            .filter(|c| c.is_alphanumeric())
            .count() as f64
            / text.len() as f64;

        if alphanumeric_ratio > 0.5 {
            score += 0.1;
        }
        if alphanumeric_ratio > 0.7 {
            score += 0.1;
        }

        // Check for whitespace (indicates proper formatting)
        let whitespace_ratio = text
            .chars()
            .filter(|c| c.is_whitespace())
            .count() as f64
            / text.len() as f64;

        if whitespace_ratio > 0.1 && whitespace_ratio < 0.5 {
            score += 0.1;
        }

        // Cap at 1.0
        score.min(1.0)
    }

    /// Process an image file
    async fn process_image(
        &self,
        file_path: &Path,
        input_artifact: &InputArtifact,
    ) -> Result<Vec<PageArtifact>, IngestError> {
        // Load the image
        let img = image::open(file_path)?;

        // Save the image to the artifacts directory
        let artifact_id = format!("page-{}", Uuid::new_v4());
        let image_filename = format!("{}.png", artifact_id);
        let image_path = self.config.storage_dir.join(&image_filename);

        // Ensure storage directory exists
        fs::create_dir_all(&self.config.storage_dir)?;

        // Save the image
        img.save(&image_path)?;

        // Create page artifact
        let page_artifact = PageArtifact::new(
            artifact_id,
            input_artifact.artifact_id.clone(),
            1, // Single page for images
            self.config.default_dpi,
            0, // No rotation initially
            1.0, // Perfect score initially (rotation detection happens later)
            image_path.to_string_lossy().to_string(),
            None, // No text layer for images
        );

        Ok(vec![page_artifact])
    }

    /// Calculate SHA-256 hash of a file
    fn calculate_file_hash(file_path: &Path) -> Result<String, IngestError> {
        let mut file = fs::File::open(file_path)?;
        let mut hasher = Sha256::new();
        let mut buffer = [0; 8192];

        loop {
            let bytes_read = file.read(&mut buffer)?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }

        Ok(format!("{:x}", hasher.finalize()))
    }

    /// Detect MIME type from file extension
    fn detect_mime_type(file_path: &Path) -> Result<String, IngestError> {
        let extension = file_path
            .extension()
            .and_then(|e| e.to_str())
            .ok_or_else(|| {
                IngestError::InvalidFile("File has no extension".to_string())
            })?
            .to_lowercase();

        let mime_type = match extension.as_str() {
            "pdf" => "application/pdf",
            "jpg" | "jpeg" => "image/jpeg",
            "png" => "image/png",
            "tif" | "tiff" => "image/tiff",
            _ => {
                return Err(IngestError::UnsupportedFormat(format!(
                    "Unknown extension: {}",
                    extension
                )));
            }
        };

        Ok(mime_type.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::DynamicImage;
    use tempfile::TempDir;

    fn create_test_config() -> (IngestConfig, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let config = IngestConfig {
            max_file_size: 10 * 1024 * 1024, // 10MB for tests
            default_dpi: 300,
            storage_dir: temp_dir.path().to_path_buf(),
        };
        (config, temp_dir)
    }

    fn create_test_image(path: &Path, width: u32, height: u32) -> Result<(), image::ImageError> {
        let img = DynamicImage::new_rgb8(width, height);
        img.save(path)
    }

    #[tokio::test]
    async fn test_ingest_png_image() {
        let (config, _temp_dir) = create_test_config();
        let service = DocumentIngestService::new(config);

        // Create a test PNG image
        let test_image_path = _temp_dir.path().join("test.png");
        create_test_image(&test_image_path, 800, 600).unwrap();

        // Ingest the image
        let result = service.ingest_file(&test_image_path).await;
        assert!(result.is_ok());

        let ingest_result = result.unwrap();
        assert_eq!(ingest_result.page_artifacts.len(), 1);
        assert_eq!(ingest_result.input_artifact.mime_type, "image/png");
        assert!(ingest_result.processing_time_ms < 30000); // Should be much faster than 30s
    }

    #[tokio::test]
    async fn test_ingest_jpeg_image() {
        let (config, _temp_dir) = create_test_config();
        let service = DocumentIngestService::new(config);

        // Create a test JPEG image
        let test_image_path = _temp_dir.path().join("test.jpg");
        create_test_image(&test_image_path, 800, 600).unwrap();

        // Ingest the image
        let result = service.ingest_file(&test_image_path).await;
        assert!(result.is_ok());

        let ingest_result = result.unwrap();
        assert_eq!(ingest_result.page_artifacts.len(), 1);
        assert_eq!(ingest_result.input_artifact.mime_type, "image/jpeg");
    }

    #[tokio::test]
    async fn test_ingest_nonexistent_file() {
        let (config, _temp_dir) = create_test_config();
        let service = DocumentIngestService::new(config);

        let result = service
            .ingest_file(&PathBuf::from("/nonexistent/file.png"))
            .await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), IngestError::InvalidFile(_)));
    }

    #[tokio::test]
    async fn test_ingest_unsupported_format() {
        let (config, _temp_dir) = create_test_config();
        let service = DocumentIngestService::new(config);

        // Create a test file with unsupported extension
        let test_file_path = _temp_dir.path().join("test.txt");
        fs::write(&test_file_path, "test content").unwrap();

        let result = service.ingest_file(&test_file_path).await;
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            IngestError::UnsupportedFormat(_)
        ));
    }

    #[tokio::test]
    async fn test_file_hash_calculation() {
        let (_config, _temp_dir) = create_test_config();

        // Create a test file
        let test_file_path = _temp_dir.path().join("test.png");
        create_test_image(&test_file_path, 100, 100).unwrap();

        // Calculate hash twice - should be the same
        let hash1 = DocumentIngestService::calculate_file_hash(&test_file_path).unwrap();
        let hash2 = DocumentIngestService::calculate_file_hash(&test_file_path).unwrap();
        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64); // SHA-256 produces 64 hex characters
    }

    #[tokio::test]
    async fn test_mime_type_detection() {
        assert_eq!(
            DocumentIngestService::detect_mime_type(&PathBuf::from("test.pdf"))
                .unwrap(),
            "application/pdf"
        );
        assert_eq!(
            DocumentIngestService::detect_mime_type(&PathBuf::from("test.jpg"))
                .unwrap(),
            "image/jpeg"
        );
        assert_eq!(
            DocumentIngestService::detect_mime_type(&PathBuf::from("test.png"))
                .unwrap(),
            "image/png"
        );
        assert_eq!(
            DocumentIngestService::detect_mime_type(&PathBuf::from("test.tiff"))
                .unwrap(),
            "image/tiff"
        );
    }

    #[tokio::test]
    async fn test_file_too_large() {
        let (mut config, _temp_dir) = create_test_config();
        config.max_file_size = 100; // Very small limit
        let service = DocumentIngestService::new(config);

        // Create a test image that will exceed the limit
        let test_image_path = _temp_dir.path().join("test.png");
        create_test_image(&test_image_path, 800, 600).unwrap();

        let result = service.ingest_file(&test_image_path).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), IngestError::FileTooLarge { .. }));
    }

    #[tokio::test]
    async fn test_page_artifact_properties() {
        let (config, _temp_dir) = create_test_config();
        let service = DocumentIngestService::new(config);

        // Create a test image
        let test_image_path = _temp_dir.path().join("test.png");
        create_test_image(&test_image_path, 800, 600).unwrap();

        // Ingest the image
        let result = service.ingest_file(&test_image_path).await.unwrap();
        let page = &result.page_artifacts[0];

        assert_eq!(page.page_number, 1);
        assert_eq!(page.dpi, 300);
        assert_eq!(page.rotation, 0);
        assert_eq!(page.rotation_score, 1.0);
        assert!(page.text_layer.is_none());
        assert_eq!(page.input_id, result.input_artifact.artifact_id);
    }

    #[tokio::test]
    async fn test_pdf_text_extraction() {
        let (config, _temp_dir) = create_test_config();
        let service = DocumentIngestService::new(config);

        // Create a minimal PDF file for testing
        // Note: This is a very basic PDF that may not have extractable text
        let test_pdf_path = _temp_dir.path().join("test.pdf");
        fs::write(&test_pdf_path, b"%PDF-1.4\n").unwrap();

        let result = service.ingest_file(&test_pdf_path).await;
        // The result may succeed or fail depending on PDF validity
        // We're mainly testing that the code doesn't panic
        match result {
            Ok(_) => {
                // PDF was processed successfully
            }
            Err(IngestError::Pdf(_)) => {
                // Expected error for invalid PDF
            }
            Err(e) => {
                panic!("Unexpected error type: {:?}", e);
            }
        }
    }

    #[test]
    fn test_text_confidence_empty() {
        let confidence = DocumentIngestService::calculate_text_confidence("");
        assert_eq!(confidence, 0.0);
    }

    #[test]
    fn test_text_confidence_short_text() {
        let confidence = DocumentIngestService::calculate_text_confidence("Hello");
        assert!(confidence > 0.0);
        assert!(confidence < 1.0);
    }

    #[test]
    fn test_text_confidence_long_quality_text() {
        let text = "Invoice Number: INV-12345\nDate: 2024-01-15\nTotal: $1,234.56\n\
                    This is a sample invoice with good quality text that should score high. \
                    It contains alphanumeric characters, proper spacing, and formatting.";

        let confidence = DocumentIngestService::calculate_text_confidence(text);
        assert!(confidence >= 0.8, "Expected high confidence for quality text, got {}", confidence);
    }

    #[test]
    fn test_text_confidence_garbage_text() {
        // Text with mostly special characters (poor quality)
        let text = "!@#$%^&*()_+{}|:<>?~`-=[]\\;',./";

        let confidence = DocumentIngestService::calculate_text_confidence(text);
        assert!(confidence < 0.7, "Expected low confidence for garbage text, got {}", confidence);
    }

    #[test]
    fn test_text_confidence_no_whitespace() {
        // Text with no whitespace (poor formatting)
        let text = "abcdefghijklmnopqrstuvwxyz0123456789";

        let confidence = DocumentIngestService::calculate_text_confidence(text);
        assert!(confidence < 0.8, "Expected lower confidence for text without whitespace");
    }
}

