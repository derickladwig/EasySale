// OCR Engine Abstraction
// Provides trait-based abstraction for OCR engines with profile support
// Requirements: 2.1 (OCR Profiles)

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::time::{Duration, Instant};
use tokio::time::timeout;

use crate::models::artifact::{BoundingBox, OcrWord};

/// OCR profile configuration for different document zones and scenarios
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrProfile {
    pub name: String,
    pub psm: u8,  // Page Segmentation Mode
    pub oem: u8,  // OCR Engine Mode
    pub dpi: Option<u32>,
    pub language: String,
    pub whitelist: Option<String>, // e.g., "0123456789.$," for totals
    pub blacklist: Option<String>,
    pub timeout_seconds: u64,
}

impl OcrProfile {
    /// Profile for full page with default settings
    pub fn full_page_default() -> Self {
        Self {
            name: "full-page-default".to_string(),
            psm: 3, // Fully automatic page segmentation
            oem: 3, // Default OCR Engine Mode
            dpi: Some(300),
            language: "eng".to_string(),
            whitelist: None,
            blacklist: None,
            timeout_seconds: 30,
        }
    }

    /// Profile optimized for numbers-only fields (totals, amounts)
    pub fn numbers_only() -> Self {
        Self {
            name: "numbers-only-totals".to_string(),
            psm: 7, // Single line
            oem: 3,
            dpi: Some(300),
            language: "eng".to_string(),
            whitelist: Some("0123456789.$,".to_string()),
            blacklist: None,
            timeout_seconds: 15,
        }
    }

    /// Profile optimized for dense table data
    pub fn table_dense() -> Self {
        Self {
            name: "table-dense".to_string(),
            psm: 6, // Uniform block of text
            oem: 3,
            dpi: None,
            language: "eng".to_string(),
            whitelist: None,
            blacklist: None,
            timeout_seconds: 30,
        }
    }

    /// Profile for header fields
    pub fn header_fields() -> Self {
        Self {
            name: "header-fields".to_string(),
            psm: 11, // Sparse text
            oem: 3,
            dpi: Some(300),
            language: "eng".to_string(),
            whitelist: None,
            blacklist: None,
            timeout_seconds: 20,
        }
    }

    /// Profile for single word recognition
    pub fn single_word() -> Self {
        Self {
            name: "single-word".to_string(),
            psm: 8, // Single word
            oem: 3,
            dpi: Some(300),
            language: "eng".to_string(),
            whitelist: None,
            blacklist: None,
            timeout_seconds: 10,
        }
    }
}

/// Result from OCR processing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrResult {
    pub text: String,
    pub avg_confidence: f64,
    pub words: Vec<OcrWord>,
    pub processing_time_ms: u64,
    pub profile_used: String,
    pub engine_name: String,
}

/// OCR processing errors
#[derive(Debug, thiserror::Error)]
pub enum OcrError {
    #[error("OCR engine not available: {0}")]
    EngineNotAvailable(String),

    #[error("OCR processing failed: {0}")]
    ProcessingFailed(String),

    #[error("Invalid image: {0}")]
    InvalidImage(String),

    #[error("OCR timeout after {0} seconds")]
    Timeout(u64),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Profile error: {0}")]
    ProfileError(String),
}

/// Trait for OCR engine implementations
#[async_trait]
pub trait OcrEngine: Send + Sync {
    /// Process an image with the given profile
    /// Requirements: 2.1, 2.2
    async fn process(&self, image_path: &str, profile: &OcrProfile) -> Result<OcrResult, OcrError>;

    /// Get the engine name
    fn engine_name(&self) -> &str;

    /// Check if the engine is available
    async fn is_available(&self) -> bool;
}

/// Tesseract OCR engine implementation
#[derive(Debug, Clone)]
pub struct TesseractEngine {
    tesseract_path: String,
}

impl TesseractEngine {
    /// Create a new Tesseract engine with default path
    pub fn new() -> Self {
        Self {
            tesseract_path: "tesseract".to_string(),
        }
    }

    /// Create a new Tesseract engine with custom path
    pub fn with_path(tesseract_path: String) -> Self {
        Self { tesseract_path }
    }

    /// Build Tesseract command with profile settings
    fn build_command(&self, image_path: &str, profile: &OcrProfile) -> Command {
        let mut cmd = Command::new(&self.tesseract_path);
        
        cmd.arg(image_path)
            .arg("stdout") // Output to stdout
            .arg("--psm")
            .arg(profile.psm.to_string())
            .arg("--oem")
            .arg(profile.oem.to_string())
            .arg("-l")
            .arg(&profile.language);

        // Add DPI if specified
        if let Some(dpi) = profile.dpi {
            cmd.arg("--dpi").arg(dpi.to_string());
        }

        // Add whitelist if specified
        if let Some(whitelist) = &profile.whitelist {
            cmd.arg("-c")
                .arg(format!("tessedit_char_whitelist={}", whitelist));
        }

        // Add blacklist if specified
        if let Some(blacklist) = &profile.blacklist {
            cmd.arg("-c")
                .arg(format!("tessedit_char_blacklist={}", blacklist));
        }

        // Request TSV output for word-level data
        cmd.arg("tsv");

        cmd
    }

    /// Parse Tesseract TSV output to extract words with confidence
    fn parse_tsv_output(&self, output: &str) -> (String, Vec<OcrWord>, f64) {
        let mut words = Vec::new();
        let mut text_lines: Vec<String> = Vec::new();
        let mut total_confidence = 0.0;
        let mut word_count = 0;

        for line in output.lines().skip(1) {
            // Skip header
            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() < 12 {
                continue;
            }

            // TSV format: level, page_num, block_num, par_num, line_num, word_num,
            //             left, top, width, height, conf, text
            let level = parts[0].parse::<u8>().unwrap_or(0);
            let conf_str = parts[10];
            let text = parts[11];

            // Only process word-level entries (level 5)
            if level != 5 || text.trim().is_empty() {
                continue;
            }

            // Parse confidence (-1 means no confidence)
            let confidence = conf_str.parse::<f64>().unwrap_or(-1.0);
            if confidence >= 0.0 {
                total_confidence += confidence;
                word_count += 1;
            }

            // Parse bounding box
            let left = parts[6].parse::<u32>().unwrap_or(0);
            let top = parts[7].parse::<u32>().unwrap_or(0);
            let width = parts[8].parse::<u32>().unwrap_or(0);
            let height = parts[9].parse::<u32>().unwrap_or(0);

            words.push(OcrWord {
                text: text.to_string(),
                confidence: confidence / 100.0, // Convert to 0-1 range
                bbox: BoundingBox::new(left, top, width, height),
            });

            text_lines.push(text.to_string());
        }

        let avg_confidence = if word_count > 0 {
            (total_confidence / word_count as f64) / 100.0 // Convert to 0-1 range
        } else {
            0.0
        };

        let full_text = text_lines.join(" ");

        (full_text, words, avg_confidence)
    }
}

impl Default for TesseractEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl OcrEngine for TesseractEngine {
    async fn process(&self, image_path: &str, profile: &OcrProfile) -> Result<OcrResult, OcrError> {
        let start = Instant::now();

        // Build command
        let mut cmd = self.build_command(image_path, profile);

        // Execute with timeout
        let timeout_duration = Duration::from_secs(profile.timeout_seconds);
        let output = timeout(timeout_duration, tokio::task::spawn_blocking(move || cmd.output()))
            .await
            .map_err(|_| OcrError::Timeout(profile.timeout_seconds))?
            .map_err(|e| OcrError::ProcessingFailed(format!("Failed to spawn command: {}", e)))?
            .map_err(|e| OcrError::EngineNotAvailable(format!("Failed to run tesseract: {}", e)))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(OcrError::ProcessingFailed(format!(
                "Tesseract error: {}",
                error
            )));
        }

        // Parse output
        let output_str = String::from_utf8_lossy(&output.stdout);
        let (text, words, avg_confidence) = self.parse_tsv_output(&output_str);

        let processing_time_ms = start.elapsed().as_millis() as u64;

        Ok(OcrResult {
            text,
            avg_confidence,
            words,
            processing_time_ms,
            profile_used: profile.name.clone(),
            engine_name: self.engine_name().to_string(),
        })
    }

    fn engine_name(&self) -> &str {
        "tesseract"
    }

    async fn is_available(&self) -> bool {
        // Try to run tesseract --version
        let output = Command::new(&self.tesseract_path)
            .arg("--version")
            .output();

        output.is_ok() && output.unwrap().status.success()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ocr_profile_full_page_default() {
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
    fn test_ocr_profile_numbers_only() {
        let profile = OcrProfile::numbers_only();
        assert_eq!(profile.name, "numbers-only-totals");
        assert_eq!(profile.psm, 7);
        assert_eq!(profile.whitelist, Some("0123456789.$,".to_string()));
        assert_eq!(profile.timeout_seconds, 15);
    }

    #[test]
    fn test_ocr_profile_table_dense() {
        let profile = OcrProfile::table_dense();
        assert_eq!(profile.name, "table-dense");
        assert_eq!(profile.psm, 6);
        assert!(profile.dpi.is_none());
    }

    #[test]
    fn test_ocr_profile_header_fields() {
        let profile = OcrProfile::header_fields();
        assert_eq!(profile.name, "header-fields");
        assert_eq!(profile.psm, 11);
        assert_eq!(profile.timeout_seconds, 20);
    }

    #[test]
    fn test_ocr_profile_single_word() {
        let profile = OcrProfile::single_word();
        assert_eq!(profile.name, "single-word");
        assert_eq!(profile.psm, 8);
        assert_eq!(profile.timeout_seconds, 10);
    }

    #[test]
    fn test_tesseract_engine_creation() {
        let engine = TesseractEngine::new();
        assert_eq!(engine.tesseract_path, "tesseract");
        assert_eq!(engine.engine_name(), "tesseract");
    }

    #[test]
    fn test_tesseract_engine_with_custom_path() {
        let engine = TesseractEngine::with_path("/usr/bin/tesseract".to_string());
        assert_eq!(engine.tesseract_path, "/usr/bin/tesseract");
    }

    #[test]
    fn test_tesseract_build_command_basic() {
        let engine = TesseractEngine::new();
        let profile = OcrProfile::full_page_default();
        let cmd = engine.build_command("/path/to/image.png", &profile);

        let cmd_str = format!("{:?}", cmd);
        assert!(cmd_str.contains("tesseract"));
        assert!(cmd_str.contains("/path/to/image.png"));
        assert!(cmd_str.contains("stdout"));
        assert!(cmd_str.contains("--psm"));
        assert!(cmd_str.contains("3"));
        assert!(cmd_str.contains("--oem"));
        assert!(cmd_str.contains("3"));
    }

    #[test]
    fn test_tesseract_build_command_with_whitelist() {
        let engine = TesseractEngine::new();
        let profile = OcrProfile::numbers_only();
        let cmd = engine.build_command("/path/to/image.png", &profile);

        let cmd_str = format!("{:?}", cmd);
        assert!(cmd_str.contains("tessedit_char_whitelist=0123456789.$,"));
    }

    #[test]
    fn test_tesseract_build_command_with_dpi() {
        let engine = TesseractEngine::new();
        let profile = OcrProfile {
            name: "test".to_string(),
            psm: 3,
            oem: 3,
            dpi: Some(400),
            language: "eng".to_string(),
            whitelist: None,
            blacklist: None,
            timeout_seconds: 30,
        };
        let cmd = engine.build_command("/path/to/image.png", &profile);

        let cmd_str = format!("{:?}", cmd);
        assert!(cmd_str.contains("--dpi"));
        assert!(cmd_str.contains("400"));
    }

    #[test]
    fn test_parse_tsv_output_empty() {
        let engine = TesseractEngine::new();
        let output = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n";
        let (text, words, confidence) = engine.parse_tsv_output(output);

        assert_eq!(text, "");
        assert_eq!(words.len(), 0);
        assert_eq!(confidence, 0.0);
    }

    #[test]
    fn test_parse_tsv_output_with_words() {
        let engine = TesseractEngine::new();
        let output = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n\
                      5\t1\t1\t1\t1\t1\t100\t200\t50\t20\t95.5\tInvoice\n\
                      5\t1\t1\t1\t1\t2\t160\t200\t30\t20\t92.3\t#123\n";
        let (text, words, confidence) = engine.parse_tsv_output(output);

        assert_eq!(text, "Invoice #123");
        assert_eq!(words.len(), 2);
        assert_eq!(words[0].text, "Invoice");
        assert!((words[0].confidence - 0.955).abs() < 0.001);
        assert_eq!(words[0].bbox.x, 100);
        assert_eq!(words[0].bbox.y, 200);
        assert_eq!(words[1].text, "#123");
        assert!((words[1].confidence - 0.923).abs() < 0.001);
        assert!((confidence - 0.939).abs() < 0.01); // Average of 95.5 and 92.3
    }

    #[test]
    fn test_parse_tsv_output_with_low_confidence() {
        let engine = TesseractEngine::new();
        let output = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n\
                      5\t1\t1\t1\t1\t1\t100\t200\t50\t20\t-1\tUnknown\n";
        let (text, words, confidence) = engine.parse_tsv_output(output);

        assert_eq!(text, "Unknown");
        assert_eq!(words.len(), 1);
        assert!((words[0].confidence - (-0.01)).abs() < 0.001);
        assert_eq!(confidence, 0.0); // No valid confidence values
    }

    #[test]
    fn test_ocr_profile_serialization() {
        let profile = OcrProfile::numbers_only();
        let json = serde_json::to_string(&profile).unwrap();
        let deserialized: OcrProfile = serde_json::from_str(&json).unwrap();

        assert_eq!(profile.name, deserialized.name);
        assert_eq!(profile.psm, deserialized.psm);
        assert_eq!(profile.oem, deserialized.oem);
        assert_eq!(profile.whitelist, deserialized.whitelist);
    }

    #[test]
    fn test_ocr_result_serialization() {
        let result = OcrResult {
            text: "Test text".to_string(),
            avg_confidence: 0.95,
            words: vec![],
            processing_time_ms: 100,
            profile_used: "test-profile".to_string(),
            engine_name: "tesseract".to_string(),
        };

        let json = serde_json::to_string(&result).unwrap();
        let deserialized: OcrResult = serde_json::from_str(&json).unwrap();

        assert_eq!(result.text, deserialized.text);
        assert_eq!(result.avg_confidence, deserialized.avg_confidence);
        assert_eq!(result.processing_time_ms, deserialized.processing_time_ms);
    }

    // Integration test - only runs if tesseract is available
    #[tokio::test]
    #[ignore] // Ignore by default, run with --ignored flag
    async fn test_tesseract_integration() {
        let engine = TesseractEngine::new();
        
        // Check if tesseract is available
        if !engine.is_available().await {
            println!("Tesseract not available, skipping integration test");
            return;
        }

        // This test requires a real image file
        // In a real test, you would create a test image or use a fixture
        // For now, we just verify the engine is available
        assert!(engine.is_available().await);
    }
}
