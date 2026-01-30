use serde::{Deserialize, Serialize};
use std::process::Command;

/// OCR service for extracting text from vendor bill images
/// Supports local Tesseract and cloud OCR APIs
#[allow(dead_code)] // Planned feature - not yet fully wired up
pub struct OCRService {
    pub engine: OCREngine,
}

#[allow(dead_code)] // Planned feature - not yet fully wired up
#[derive(Debug, Clone)]
pub enum OCREngine {
    Tesseract { tesseract_path: String },
    GoogleVision { api_key: String },
    AWSTextract { region: String },
}

#[allow(dead_code)] // Planned feature - not yet fully wired up
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OCRResult {
    pub text: String,
    pub confidence: f64,
    pub engine: String,
    pub processing_time_ms: u64,
}

#[allow(dead_code)] // Planned feature - not yet fully wired up
#[derive(Debug)]
pub enum OCRError {
    EngineNotAvailable(String),
    ProcessingFailed(String),
    InvalidImage(String),
    APIError(String),
}

impl std::fmt::Display for OCRError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            OCRError::EngineNotAvailable(msg) => write!(f, "OCR engine not available: {}", msg),
            OCRError::ProcessingFailed(msg) => write!(f, "OCR processing failed: {}", msg),
            OCRError::InvalidImage(msg) => write!(f, "Invalid image: {}", msg),
            OCRError::APIError(msg) => write!(f, "API error: {}", msg),
        }
    }
}

impl std::error::Error for OCRError {}

impl OCRService {
    /// Create new OCR service with specified engine
    /// Requirements: 2.1, 2.2
    pub fn new(engine: OCREngine) -> Self {
        Self { engine }
    }

    /// Create OCR service from configuration
    pub fn from_config(config: &OCRConfig) -> Result<Self, OCRError> {
        let engine = match config.engine.as_str() {
            "tesseract" => {
                let path = config.tesseract_path.clone()
                    .unwrap_or_else(|| "tesseract".to_string());
                OCREngine::Tesseract { tesseract_path: path }
            }
            "google_vision" => {
                let api_key = config.google_api_key.clone()
                    .ok_or_else(|| OCRError::EngineNotAvailable("Google Vision API key not configured".to_string()))?;
                OCREngine::GoogleVision { api_key }
            }
            "aws_textract" => {
                let region = config.aws_region.clone()
                    .unwrap_or_else(|| "us-east-1".to_string());
                OCREngine::AWSTextract { region }
            }
            _ => return Err(OCRError::EngineNotAvailable(format!("Unknown engine: {}", config.engine))),
        };

        Ok(Self::new(engine))
    }

    /// Process image and extract text
    /// Requirements: 2.1, 2.2, 2.3
    pub async fn process_image(&self, image_path: &str) -> Result<OCRResult, OCRError> {
        let start = std::time::Instant::now();

        let result = match &self.engine {
            OCREngine::Tesseract { tesseract_path } => {
                self.process_with_tesseract(tesseract_path, image_path).await?
            }
            OCREngine::GoogleVision { api_key } => {
                self.process_with_google_vision(api_key, image_path).await?
            }
            OCREngine::AWSTextract { region } => {
                self.process_with_aws_textract(region, image_path).await?
            }
        };

        let processing_time_ms = start.elapsed().as_millis() as u64;

        Ok(OCRResult {
            text: result.0,
            confidence: result.1,
            engine: self.engine_name(),
            processing_time_ms,
        })
    }

    /// Process with Tesseract OCR (local)
    async fn process_with_tesseract(
        &self,
        tesseract_path: &str,
        image_path: &str,
    ) -> Result<(String, f64), OCRError> {
        // Run tesseract command
        let output = Command::new(tesseract_path)
            .arg(image_path)
            .arg("stdout")
            .arg("--psm")
            .arg("6") // Assume uniform block of text
            .arg("--oem")
            .arg("3") // Default OCR Engine Mode
            .output()
            .map_err(|e| OCRError::EngineNotAvailable(format!("Failed to run tesseract: {}", e)))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(OCRError::ProcessingFailed(format!("Tesseract error: {}", error)));
        }

        let text = String::from_utf8_lossy(&output.stdout).to_string();
        
        // Tesseract doesn't provide confidence per document, estimate based on text quality
        let confidence = self.estimate_confidence(&text);

        Ok((text, confidence))
    }

    /// Process with Google Vision API (cloud)
    async fn process_with_google_vision(
        &self,
        _api_key: &str,
        _image_path: &str,
    ) -> Result<(String, f64), OCRError> {
        // Placeholder for Google Vision API integration
        // In production, use google-cloud-vision crate
        Err(OCRError::APIError("Google Vision API not yet implemented".to_string()))
    }

    /// Process with AWS Textract (cloud)
    async fn process_with_aws_textract(
        &self,
        _region: &str,
        _image_path: &str,
    ) -> Result<(String, f64), OCRError> {
        // Placeholder for AWS Textract integration
        // In production, use aws-sdk-textract crate
        Err(OCRError::APIError("AWS Textract not yet implemented".to_string()))
    }

    /// Estimate confidence based on text quality
    fn estimate_confidence(&self, text: &str) -> f64 {
        if text.trim().is_empty() {
            return 0.0;
        }

        let total_chars = text.len() as f64;
        let alphanumeric = text.chars().filter(|c| c.is_alphanumeric()).count() as f64;
        let whitespace = text.chars().filter(|c| c.is_whitespace()).count() as f64;
        
        // Good text should have high alphanumeric ratio and reasonable whitespace
        let alphanumeric_ratio = alphanumeric / total_chars;
        let whitespace_ratio = whitespace / total_chars;
        
        // Confidence based on text characteristics
        let confidence = if alphanumeric_ratio > 0.7 && whitespace_ratio > 0.1 && whitespace_ratio < 0.3 {
            0.85 // High confidence
        } else if alphanumeric_ratio > 0.5 {
            0.70 // Medium confidence
        } else {
            0.50 // Low confidence
        };

        confidence
    }

    fn engine_name(&self) -> String {
        match &self.engine {
            OCREngine::Tesseract { .. } => "tesseract".to_string(),
            OCREngine::GoogleVision { .. } => "google_vision".to_string(),
            OCREngine::AWSTextract { .. } => "aws_textract".to_string(),
        }
    }
}

/// OCR configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OCRConfig {
    pub engine: String,
    pub tesseract_path: Option<String>,
    pub google_api_key: Option<String>,
    pub aws_region: Option<String>,
}

impl Default for OCRConfig {
    fn default() -> Self {
        Self {
            engine: "tesseract".to_string(),
            tesseract_path: Some("tesseract".to_string()),
            google_api_key: None,
            aws_region: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_estimate_confidence() {
        let service = OCRService::new(OCREngine::Tesseract {
            tesseract_path: "tesseract".to_string(),
        });

        // Good text
        let good_text = "Invoice #12345 Date: 2024-01-01 Total: $100.00";
        let confidence = service.estimate_confidence(good_text);
        assert!(confidence > 0.7);

        // Poor text (mostly special characters)
        let poor_text = "###$$%%%^^^&&&***";
        let confidence = service.estimate_confidence(poor_text);
        assert!(confidence < 0.7);

        // Empty text
        let empty_text = "";
        let confidence = service.estimate_confidence(empty_text);
        assert_eq!(confidence, 0.0);
    }

    #[test]
    fn test_engine_name() {
        let tesseract = OCRService::new(OCREngine::Tesseract {
            tesseract_path: "tesseract".to_string(),
        });
        assert_eq!(tesseract.engine_name(), "tesseract");

        let google = OCRService::new(OCREngine::GoogleVision {
            api_key: "test-key".to_string(),
        });
        assert_eq!(google.engine_name(), "google_vision");

        let aws = OCRService::new(OCREngine::AWSTextract {
            region: "us-east-1".to_string(),
        });
        assert_eq!(aws.engine_name(), "aws_textract");
    }

    #[test]
    fn test_from_config() {
        let config = OCRConfig {
            engine: "tesseract".to_string(),
            tesseract_path: Some("/usr/bin/tesseract".to_string()),
            google_api_key: None,
            aws_region: None,
        };

        let service = OCRService::from_config(&config).unwrap();
        assert_eq!(service.engine_name(), "tesseract");
    }

    #[test]
    fn test_from_config_missing_api_key() {
        let config = OCRConfig {
            engine: "google_vision".to_string(),
            tesseract_path: None,
            google_api_key: None,
            aws_region: None,
        };

        let result = OCRService::from_config(&config);
        assert!(result.is_err());
    }
}
