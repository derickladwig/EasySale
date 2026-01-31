// Document ingest service for OCR pipeline
// Supports PDF rasterization, image loading, and multi-page handling

use crate::models::{InputArtifact, PageArtifact};
use image::{DynamicImage, ImageBuffer, Rgba};
use lopdf::Document as LopdfDocument;
use pdfium_render::prelude::*;
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

/// Configuration for image enhancement
#[derive(Debug, Clone)]
pub struct EnhancementConfig {
    /// Whether to convert to grayscale
    pub grayscale: bool,
    /// Contrast enhancement factor (1.0 = no change, >1.0 = more contrast)
    pub contrast_factor: f32,
    /// Whether to attempt deskewing
    pub deskew: bool,
    /// Maximum skew angle to correct (in degrees)
    pub max_skew_angle: f32,
}

impl Default for EnhancementConfig {
    fn default() -> Self {
        Self {
            grayscale: true,
            contrast_factor: 1.2,
            deskew: true,
            max_skew_angle: 15.0,
        }
    }
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
        // Ensure storage directory exists
        fs::create_dir_all(&self.config.storage_dir)?;

        // Load the PDF document with lopdf for text extraction
        let doc = LopdfDocument::load(file_path)
            .map_err(|e| IngestError::Pdf(format!("Failed to load PDF: {}", e)))?;

        let page_count = doc.get_pages().len();
        let mut page_artifacts = Vec::with_capacity(page_count);

        // Try to bind to pdfium for rasterization
        let pdfium_bindings = Pdfium::bind_to_system_library()
            .or_else(|_| Pdfium::bind_to_library("pdfium"))
            .or_else(|_| Pdfium::bind_to_library("libpdfium"))
            .ok();

        // Create pdfium instance and load document if bindings are available
        // We need to keep pdfium alive for the duration of the document
        let pdfium_instance = pdfium_bindings.map(Pdfium::new);
        let pdfium_doc = pdfium_instance.as_ref().and_then(|pdfium| {
            pdfium.load_pdf_from_file(file_path, None).ok()
        });

        // Process each page
        for (page_num, _page_id) in doc.get_pages().iter().enumerate() {
            let page_number = (page_num + 1) as u32;

            // Extract text layer from this page using lopdf
            let text_layer = self.extract_text_from_page(&doc, page_num + 1)?;

            // Calculate confidence score based on text quality
            let text_confidence = Self::calculate_text_confidence(&text_layer);

            let artifact_id = format!("page-{}", Uuid::new_v4());
            let image_filename = format!("{}.png", artifact_id);
            let image_path = self.config.storage_dir.join(&image_filename);

            // Rasterize the page to an image
            let rasterization_success = if let Some(ref pdfium_doc) = pdfium_doc {
                self.rasterize_pdf_page(pdfium_doc, page_num, &image_path)
                    .map_err(|e| tracing::warn!("PDF rasterization failed for page {}: {}", page_number, e))
                    .is_ok()
            } else {
                tracing::warn!("Pdfium not available, creating placeholder for page {}", page_number);
                false
            };

            // If rasterization failed, create a placeholder image
            if !rasterization_success {
                self.create_placeholder_image(&image_path, page_number)?;
            }

            // Create page artifact with text layer
            let page_artifact = PageArtifact::new(
                artifact_id,
                input_artifact.artifact_id.clone(),
                page_number,
                self.config.default_dpi,
                0, // No rotation initially
                text_confidence,
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

    /// Rasterize a single PDF page to an image using pdfium
    fn rasterize_pdf_page(
        &self,
        doc: &PdfDocument,
        page_index: usize,
        output_path: &Path,
    ) -> Result<(), IngestError> {
        let page = doc.pages().get(page_index as u16)
            .map_err(|e| IngestError::Pdf(format!("Failed to get page {}: {}", page_index + 1, e)))?;

        // Calculate render dimensions based on DPI
        let dpi = self.config.default_dpi as f32;
        let scale = dpi / 72.0; // PDF points are 1/72 inch

        let width = (page.width().value * scale) as i32;
        let height = (page.height().value * scale) as i32;

        // Render the page to a bitmap
        let bitmap = page.render_with_config(&PdfRenderConfig::new()
            .set_target_width(width)
            .set_target_height(height)
            .render_form_data(true)
            .render_annotations(true))
            .map_err(|e| IngestError::Pdf(format!("Failed to render page: {}", e)))?;

        // Convert to image and save
        let img = bitmap.as_image();
        img.save(output_path)
            .map_err(|e| IngestError::Pdf(format!("Failed to save rendered image: {}", e)))?;

        Ok(())
    }

    /// Create a placeholder image when PDF rasterization is not available
    fn create_placeholder_image(&self, output_path: &Path, page_number: u32) -> Result<(), IngestError> {
        // Create a simple gray placeholder image with page number text
        let width = 612; // Standard letter width at 72 DPI
        let height = 792; // Standard letter height at 72 DPI

        let img: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::from_fn(width, height, |_x, _y| {
            Rgba([240, 240, 240, 255]) // Light gray background
        });

        let dynamic_img = DynamicImage::ImageRgba8(img);
        dynamic_img.save(output_path)
            .map_err(|e| IngestError::Pdf(format!("Failed to save placeholder image: {}", e)))?;

        tracing::info!("Created placeholder image for page {} at {:?}", page_number, output_path);
        Ok(())
    }

    // ============================================================================
    // Image Enhancement for OCR
    // ============================================================================

    /// Enhance an image for better OCR results
    /// 
    /// This applies a series of image processing steps:
    /// 1. Grayscale conversion (reduces noise from color variations)
    /// 2. Contrast enhancement (makes text stand out from background)
    /// 3. Deskewing (corrects rotated scans)
    pub fn enhance_image_for_ocr(
        &self,
        img: &DynamicImage,
        config: &EnhancementConfig,
    ) -> DynamicImage {
        let mut result = img.clone();

        // Step 1: Convert to grayscale
        if config.grayscale {
            result = self.convert_to_grayscale(&result);
        }

        // Step 2: Enhance contrast
        if config.contrast_factor != 1.0 {
            result = self.enhance_contrast(&result, config.contrast_factor);
        }

        // Step 3: Deskew if enabled
        if config.deskew {
            if let Some(deskewed) = self.deskew_image(&result, config.max_skew_angle) {
                result = deskewed;
            }
        }

        result
    }

    /// Convert an image to grayscale
    /// 
    /// Grayscale images are better for OCR because:
    /// - Reduces color noise that can confuse text detection
    /// - Simplifies the image to just luminance values
    /// - Faster processing for subsequent steps
    pub fn convert_to_grayscale(&self, img: &DynamicImage) -> DynamicImage {
        DynamicImage::ImageLuma8(img.to_luma8())
    }

    /// Enhance image contrast using linear scaling
    /// 
    /// Higher contrast makes text stand out more from the background,
    /// which improves OCR accuracy especially for faded or low-quality scans.
    /// 
    /// # Arguments
    /// * `img` - The input image
    /// * `factor` - Contrast factor (1.0 = no change, >1.0 = more contrast)
    pub fn enhance_contrast(&self, img: &DynamicImage, factor: f32) -> DynamicImage {
        let rgba = img.to_rgba8();
        let (width, height) = rgba.dimensions();

        let enhanced: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::from_fn(width, height, |x, y| {
            let pixel = rgba.get_pixel(x, y);
            let r = pixel[0] as f32;
            let g = pixel[1] as f32;
            let b = pixel[2] as f32;
            let a = pixel[3];

            // Apply contrast adjustment around midpoint (128)
            let adjust = |v: f32| -> u8 {
                let adjusted = ((v - 128.0) * factor + 128.0).clamp(0.0, 255.0);
                adjusted as u8
            };

            Rgba([adjust(r), adjust(g), adjust(b), a])
        });

        DynamicImage::ImageRgba8(enhanced)
    }

    /// Attempt to deskew a rotated image
    /// 
    /// Scanned documents are often slightly rotated. This function:
    /// 1. Detects the skew angle by analyzing horizontal lines
    /// 2. Rotates the image to correct the skew
    /// 
    /// # Arguments
    /// * `img` - The input image
    /// * `max_angle` - Maximum skew angle to correct (in degrees)
    /// 
    /// # Returns
    /// * `Some(DynamicImage)` - The deskewed image if skew was detected and corrected
    /// * `None` - If no significant skew was detected
    pub fn deskew_image(&self, img: &DynamicImage, max_angle: f32) -> Option<DynamicImage> {
        // Detect skew angle
        let skew_angle = self.detect_skew_angle(img, max_angle);

        // Only correct if skew is significant (> 0.5 degrees)
        if skew_angle.abs() < 0.5 {
            tracing::debug!("Skew angle {} is too small, skipping deskew", skew_angle);
            return None;
        }

        tracing::info!("Detected skew angle: {} degrees, correcting...", skew_angle);

        // Rotate the image to correct the skew
        Some(self.rotate_image(img, -skew_angle))
    }

    /// Detect the skew angle of an image using projection profile analysis
    /// 
    /// This method works by:
    /// 1. Converting to binary (black/white)
    /// 2. Computing horizontal projection profiles at various angles
    /// 3. Finding the angle that maximizes the variance of the projection
    ///    (text lines create peaks in the projection when properly aligned)
    fn detect_skew_angle(&self, img: &DynamicImage, max_angle: f32) -> f32 {
        let gray = img.to_luma8();
        let (width, height) = gray.dimensions();

        // Binarize the image using Otsu's threshold approximation
        let threshold = self.compute_otsu_threshold(&gray);

        let mut best_angle = 0.0f32;
        let mut best_variance = 0.0f32;

        // Test angles from -max_angle to +max_angle in 0.5 degree steps
        let step = 0.5f32;
        let mut angle = -max_angle;

        while angle <= max_angle {
            let variance = self.compute_projection_variance(&gray, threshold, angle, width, height);

            if variance > best_variance {
                best_variance = variance;
                best_angle = angle;
            }

            angle += step;
        }

        best_angle
    }

    /// Compute Otsu's threshold for binarization
    fn compute_otsu_threshold(&self, img: &image::GrayImage) -> u8 {
        // Build histogram
        let mut histogram = [0u32; 256];
        for pixel in img.pixels() {
            histogram[pixel[0] as usize] += 1;
        }

        let total_pixels = img.width() * img.height();
        let mut sum = 0u64;
        for (i, &count) in histogram.iter().enumerate() {
            sum += (i as u64) * (count as u64);
        }

        let mut sum_b = 0u64;
        let mut w_b = 0u32;
        let mut max_variance = 0.0f64;
        let mut threshold = 0u8;

        for (i, &count) in histogram.iter().enumerate() {
            w_b += count;
            if w_b == 0 {
                continue;
            }

            let w_f = total_pixels - w_b;
            if w_f == 0 {
                break;
            }

            sum_b += (i as u64) * (count as u64);

            let m_b = sum_b as f64 / w_b as f64;
            let m_f = (sum - sum_b) as f64 / w_f as f64;

            let variance = (w_b as f64) * (w_f as f64) * (m_b - m_f) * (m_b - m_f);

            if variance > max_variance {
                max_variance = variance;
                threshold = i as u8;
            }
        }

        threshold
    }

    /// Compute the variance of horizontal projection at a given angle
    fn compute_projection_variance(
        &self,
        img: &image::GrayImage,
        threshold: u8,
        angle: f32,
        width: u32,
        height: u32,
    ) -> f32 {
        let angle_rad = angle.to_radians();
        let cos_a = angle_rad.cos();
        let sin_a = angle_rad.sin();

        let cx = width as f32 / 2.0;
        let cy = height as f32 / 2.0;

        // Compute projection profile
        let mut projection = vec![0u32; height as usize];

        for y in 0..height {
            for x in 0..width {
                // Rotate point around center
                let dx = x as f32 - cx;
                let dy = y as f32 - cy;
                let new_y = (dy * cos_a - dx * sin_a + cy) as i32;

                if new_y >= 0 && new_y < height as i32 {
                    let pixel = img.get_pixel(x, y)[0];
                    if pixel < threshold {
                        // Dark pixel (text)
                        projection[new_y as usize] += 1;
                    }
                }
            }
        }

        // Compute variance of projection
        let sum: u64 = projection.iter().map(|&v| v as u64).sum();
        let mean = sum as f32 / projection.len() as f32;

        let variance: f32 = projection
            .iter()
            .map(|&v| {
                let diff = v as f32 - mean;
                diff * diff
            })
            .sum::<f32>()
            / projection.len() as f32;

        variance
    }

    /// Rotate an image by a given angle (in degrees)
    fn rotate_image(&self, img: &DynamicImage, angle_degrees: f32) -> DynamicImage {
        let rgba = img.to_rgba8();
        let (width, height) = rgba.dimensions();

        let angle_rad = angle_degrees.to_radians();
        let cos_a = angle_rad.cos();
        let sin_a = angle_rad.sin();

        let cx = width as f32 / 2.0;
        let cy = height as f32 / 2.0;

        // Create output image with same dimensions
        let rotated: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::from_fn(width, height, |x, y| {
            // Inverse rotation to find source pixel
            let dx = x as f32 - cx;
            let dy = y as f32 - cy;

            let src_x = (dx * cos_a + dy * sin_a + cx) as i32;
            let src_y = (-dx * sin_a + dy * cos_a + cy) as i32;

            if src_x >= 0 && src_x < width as i32 && src_y >= 0 && src_y < height as i32 {
                *rgba.get_pixel(src_x as u32, src_y as u32)
            } else {
                // Fill with white for out-of-bounds pixels
                Rgba([255, 255, 255, 255])
            }
        });

        DynamicImage::ImageRgba8(rotated)
    }

    /// Enhance an image file and save the result
    /// 
    /// This is a convenience method that loads an image, enhances it,
    /// and saves the result to a new file.
    pub async fn enhance_image_file(
        &self,
        input_path: &Path,
        output_path: &Path,
        config: Option<EnhancementConfig>,
    ) -> Result<(), IngestError> {
        let img = image::open(input_path)?;
        let config = config.unwrap_or_default();

        let enhanced = self.enhance_image_for_ocr(&img, &config);

        enhanced.save(output_path)
            .map_err(|e| IngestError::Pdf(format!("Failed to save enhanced image: {}", e)))?;

        tracing::info!(
            "Enhanced image saved to {:?} (grayscale={}, contrast={}, deskew={})",
            output_path,
            config.grayscale,
            config.contrast_factor,
            config.deskew
        );

        Ok(())
    }

    /// Extract text from a specific PDF page
    fn extract_text_from_page(
        &self,
        doc: &LopdfDocument,
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

    #[test]
    fn test_grayscale_conversion() {
        let (config, _temp_dir) = create_test_config();
        let service = DocumentIngestService::new(config);

        // Create a color image
        let img = DynamicImage::new_rgb8(100, 100);

        // Convert to grayscale
        let gray = service.convert_to_grayscale(&img);

        // Verify it's a grayscale image
        match gray {
            DynamicImage::ImageLuma8(_) => {
                // Expected
            }
            _ => panic!("Expected grayscale image"),
        }
    }

    #[test]
    fn test_contrast_enhancement() {
        let (config, _temp_dir) = create_test_config();
        let service = DocumentIngestService::new(config);

        // Create a gray image with mid-tone pixels
        let mut img = ImageBuffer::from_fn(10, 10, |_, _| {
            Rgba([128u8, 128u8, 128u8, 255u8])
        });

        // Add some variation
        img.put_pixel(0, 0, Rgba([100, 100, 100, 255]));
        img.put_pixel(1, 1, Rgba([156, 156, 156, 255]));

        let dynamic_img = DynamicImage::ImageRgba8(img);

        // Enhance contrast
        let enhanced = service.enhance_contrast(&dynamic_img, 1.5);

        // Verify the image was processed (dimensions should be the same)
        assert_eq!(enhanced.width(), 10);
        assert_eq!(enhanced.height(), 10);
    }

    #[test]
    fn test_enhance_image_for_ocr() {
        let (config, _temp_dir) = create_test_config();
        let service = DocumentIngestService::new(config);

        // Create a test image
        let img = DynamicImage::new_rgb8(100, 100);

        // Apply full enhancement pipeline
        let enhancement_config = super::EnhancementConfig {
            grayscale: true,
            contrast_factor: 1.2,
            deskew: false, // Skip deskew for simple test
            max_skew_angle: 15.0,
        };

        let enhanced = service.enhance_image_for_ocr(&img, &enhancement_config);

        // Verify the image was processed
        assert_eq!(enhanced.width(), 100);
        assert_eq!(enhanced.height(), 100);
    }

    #[test]
    fn test_otsu_threshold() {
        let (config, _temp_dir) = create_test_config();
        let service = DocumentIngestService::new(config);

        // Create a bimodal image with some variation
        // Use values that create a clear bimodal distribution
        let img: image::GrayImage = ImageBuffer::from_fn(100, 100, |x, y| {
            if x < 50 {
                // Dark region with slight variation
                image::Luma([((y % 10) as u8).saturating_add(20)])
            } else {
                // Light region with slight variation
                image::Luma([200u8.saturating_add((y % 10) as u8)])
            }
        });

        let threshold = service.compute_otsu_threshold(&img);

        // Threshold should be somewhere between the two modes
        // Dark mode is around 20-30, light mode is around 200-210
        // So threshold should be somewhere in between
        assert!(threshold >= 20 && threshold < 210, "Threshold {} should be between 20 and 210", threshold);
    }

    #[test]
    fn test_rotate_image() {
        let (config, _temp_dir) = create_test_config();
        let service = DocumentIngestService::new(config);

        // Create a simple test image
        let img = DynamicImage::new_rgb8(100, 100);

        // Rotate by 5 degrees
        let rotated = service.rotate_image(&img, 5.0);

        // Verify dimensions are preserved
        assert_eq!(rotated.width(), 100);
        assert_eq!(rotated.height(), 100);
    }

    #[tokio::test]
    async fn test_enhance_image_file() {
        let (config, temp_dir) = create_test_config();
        let service = DocumentIngestService::new(config);

        // Create a test image
        let input_path = temp_dir.path().join("input.png");
        let output_path = temp_dir.path().join("output.png");
        create_test_image(&input_path, 100, 100).unwrap();

        // Enhance the image
        let result = service.enhance_image_file(&input_path, &output_path, None).await;
        assert!(result.is_ok());

        // Verify output file exists
        assert!(output_path.exists());
    }
}

