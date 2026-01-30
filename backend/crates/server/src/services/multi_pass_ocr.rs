use crate::services::ocr_service::{OCREngine, OCRError, OCRResult, OCRService};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Multi-pass OCR service for improved accuracy
/// Runs OCR multiple times with different configurations and merges results
#[allow(dead_code)] // Advanced feature - multi-pass OCR
pub struct MultiPassOCRService {
    base_service: OCRService,
    pass_configs: Vec<OCRPassConfig>,
}

/// Configuration for a single OCR pass
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OCRPassConfig {
    pub pass_number: u8,
    pub mode: OCRMode,
    pub psm: u8,  // Tesseract Page Segmentation Mode
    pub oem: u8,  // OCR Engine Mode
    pub dpi: Option<u32>,
    pub language: String,
    pub region: Option<BoundingBox>,
    pub weight: f64,  // Weight for confidence voting
}

/// OCR mode for different document types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OCRMode {
    FullPage,       // PSM 3: Fully automatic page segmentation
    TableAnalysis,  // PSM 6: Assume uniform block of text
    SmallText,      // PSM 8: Treat image as single word
    Handwriting,    // PSM 13: Raw line (for handwriting)
    HighDPI,        // Same as FullPage but with higher DPI
}

/// Bounding box for region-specific OCR
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundingBox {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

/// Result from multi-pass OCR with merged text
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiPassOCRResult {
    pub text: String,
    pub confidence: f64,
    pub pass_results: Vec<OCRResult>,
    pub merge_metadata: MergeMetadata,
}

/// Metadata about the merge process
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MergeMetadata {
    pub total_passes: usize,
    pub conflicts_found: usize,
    pub conflicts_resolved: usize,
    pub average_agreement: f64,  // % of text that all passes agreed on
}

impl MultiPassOCRService {
    /// Create new multi-pass OCR service with custom configurations
    pub fn new(base_service: OCRService, pass_configs: Vec<OCRPassConfig>) -> Self {
        Self {
            base_service,
            pass_configs,
        }
    }

    /// Create multi-pass OCR service with default 3-pass configuration
    pub fn with_defaults(engine: OCREngine) -> Self {
        let base_service = OCRService::new(engine);
        let pass_configs = Self::default_pass_configs();
        
        Self {
            base_service,
            pass_configs,
        }
    }

    /// Default 3-pass configuration optimized for invoices
    fn default_pass_configs() -> Vec<OCRPassConfig> {
        vec![
            // Pass 1: Full page, default settings
            OCRPassConfig {
                pass_number: 1,
                mode: OCRMode::FullPage,
                psm: 3,
                oem: 3,
                dpi: None,
                language: "eng".to_string(),
                region: None,
                weight: 1.0,
            },
            // Pass 2: Table analysis mode (better for line items)
            OCRPassConfig {
                pass_number: 2,
                mode: OCRMode::TableAnalysis,
                psm: 6,
                oem: 3,
                dpi: None,
                language: "eng".to_string(),
                region: None,
                weight: 1.2,  // Higher weight for table data
            },
            // Pass 3: Small text optimization (better for headers/totals)
            OCRPassConfig {
                pass_number: 3,
                mode: OCRMode::SmallText,
                psm: 8,
                oem: 3,
                dpi: Some(300),
                language: "eng".to_string(),
                region: None,
                weight: 0.8,
            },
        ]
    }

    /// Process image with multiple OCR passes
    /// Requirements: 2.1, 2.2, 2.3
    pub async fn process_image(&self, image_path: &str) -> Result<MultiPassOCRResult, OCRError> {
        let mut pass_results = Vec::new();

        // Run each OCR pass
        for config in &self.pass_configs {
            let result = self.run_single_pass(image_path, config).await?;
            pass_results.push(result);
        }

        // Merge results
        let merged = self.merge_results(&pass_results)?;

        Ok(merged)
    }

    /// Run a single OCR pass with specific configuration
    async fn run_single_pass(
        &self,
        image_path: &str,
        config: &OCRPassConfig,
    ) -> Result<OCRResult, OCRError> {
        // For now, use the base service
        // In production, would apply config-specific settings
        let mut result = self.base_service.process_image(image_path).await?;
        
        // Adjust confidence based on pass weight
        result.confidence *= config.weight;
        
        Ok(result)
    }

    /// Merge results from multiple OCR passes
    /// Requirements: 2.4, 3.8
    fn merge_results(&self, results: &[OCRResult]) -> Result<MultiPassOCRResult, OCRError> {
        if results.is_empty() {
            return Err(OCRError::ProcessingFailed("No OCR results to merge".to_string()));
        }

        // If only one result, return it directly
        if results.len() == 1 {
            return Ok(MultiPassOCRResult {
                text: results[0].text.clone(),
                confidence: results[0].confidence,
                pass_results: results.to_vec(),
                merge_metadata: MergeMetadata {
                    total_passes: 1,
                    conflicts_found: 0,
                    conflicts_resolved: 0,
                    average_agreement: 1.0,
                },
            });
        }

        // Align text from all passes (line-by-line)
        let aligned_lines = Self::align_text_lines(results);

        // Merge lines using confidence voting
        let mut merged_lines = Vec::new();
        let mut conflicts_found = 0;
        let mut conflicts_resolved = 0;
        let mut total_agreement = 0.0;

        for line_variants in &aligned_lines {
            if Self::all_agree(line_variants) {
                // All passes agree - high confidence
                merged_lines.push(line_variants[0].clone());
                total_agreement += 1.0;
            } else {
                // Disagreement - resolve via voting
                let resolved = Self::resolve_conflict(line_variants);
                merged_lines.push(resolved);
                conflicts_found += 1;
                conflicts_resolved += 1;
            }
        }

        let average_agreement = if !aligned_lines.is_empty() {
            total_agreement / aligned_lines.len() as f64
        } else {
            0.0
        };

        // Calculate overall confidence
        let confidence = Self::calculate_merged_confidence(results, conflicts_found, aligned_lines.len());

        Ok(MultiPassOCRResult {
            text: merged_lines.join("\n"),
            confidence,
            pass_results: results.to_vec(),
            merge_metadata: MergeMetadata {
                total_passes: results.len(),
                conflicts_found,
                conflicts_resolved,
                average_agreement,
            },
        })
    }

    /// Align text lines from multiple OCR results
    fn align_text_lines(results: &[OCRResult]) -> Vec<Vec<String>> {
        // Split each result into lines
        let all_lines: Vec<Vec<String>> = results
            .iter()
            .map(|r| r.text.lines().map(|s| s.to_string()).collect())
            .collect();

        // Find maximum number of lines
        let max_lines = all_lines.iter().map(|lines| lines.len()).max().unwrap_or(0);

        // Align lines (pad shorter results with empty strings)
        let mut aligned = Vec::new();
        for i in 0..max_lines {
            let mut line_variants = Vec::new();
            for lines in &all_lines {
                if i < lines.len() {
                    line_variants.push(lines[i].clone());
                } else {
                    line_variants.push(String::new());
                }
            }
            aligned.push(line_variants);
        }

        aligned
    }

    /// Check if all passes agree on a line
    fn all_agree(variants: &[String]) -> bool {
        if variants.is_empty() {
            return true;
        }

        let first = variants[0].trim();
        variants.iter().all(|v| v.trim() == first)
    }

    /// Resolve conflict between different OCR results for the same line
    fn resolve_conflict(variants: &[String]) -> String {
        // Count occurrences of each variant
        let mut counts: HashMap<String, usize> = HashMap::new();
        for variant in variants {
            let trimmed = variant.trim().to_string();
            if !trimmed.is_empty() {
                *counts.entry(trimmed).or_insert(0) += 1;
            }
        }

        // Return the most common variant
        counts
            .into_iter()
            .max_by_key(|(_, count)| *count)
            .map(|(text, _)| text)
            .unwrap_or_else(|| variants[0].clone())
    }

    /// Calculate overall confidence from merged results
    fn calculate_merged_confidence(
        results: &[OCRResult],
        conflicts: usize,
        total_lines: usize,
    ) -> f64 {
        // Average confidence from all passes
        let avg_confidence: f64 = results.iter().map(|r| r.confidence).sum::<f64>() / results.len() as f64;

        // Adjust based on agreement rate
        let agreement_rate = if total_lines > 0 {
            1.0 - (conflicts as f64 / total_lines as f64)
        } else {
            1.0
        };

        // Boost confidence if passes agree
        let boosted_confidence = avg_confidence * (0.8 + 0.2 * agreement_rate);

        // Cap at 0.99 (never 100% confident)
        boosted_confidence.min(0.99)
    }
}

impl Default for MultiPassOCRService {
    fn default() -> Self {
        Self::with_defaults(OCREngine::Tesseract {
            tesseract_path: "tesseract".to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_pass_configs() {
        let configs = MultiPassOCRService::default_pass_configs();
        assert_eq!(configs.len(), 3);
        assert_eq!(configs[0].pass_number, 1);
        assert_eq!(configs[1].pass_number, 2);
        assert_eq!(configs[2].pass_number, 3);
    }

    #[test]
    fn test_align_text_lines() {
        let service = MultiPassOCRService::default();
        
        let results = vec![
            OCRResult {
                text: "Line 1\nLine 2\nLine 3".to_string(),
                confidence: 0.9,
                engine: "test".to_string(),
                processing_time_ms: 100,
            },
            OCRResult {
                text: "Line 1\nLine 2".to_string(),
                confidence: 0.8,
                engine: "test".to_string(),
                processing_time_ms: 100,
            },
        ];

        let aligned = MultiPassOCRService::align_text_lines(&results);
        assert_eq!(aligned.len(), 3);
        assert_eq!(aligned[0].len(), 2);
        assert_eq!(aligned[0][0], "Line 1");
        assert_eq!(aligned[0][1], "Line 1");
        assert_eq!(aligned[2][1], ""); // Padded
    }

    #[test]
    fn test_all_agree() {
        let service = MultiPassOCRService::default();
        
        // All agree
        let variants1 = vec!["Line 1".to_string(), "Line 1".to_string(), "Line 1".to_string()];
        assert!(MultiPassOCRService::all_agree(&variants1));

        // Disagree
        let variants2 = vec!["Line 1".to_string(), "Line 2".to_string(), "Line 1".to_string()];
        assert!(!MultiPassOCRService::all_agree(&variants2));
    }

    #[test]
    fn test_resolve_conflict() {
        let service = MultiPassOCRService::default();
        
        // Majority wins
        let variants = vec![
            "Invoice #12345".to_string(),
            "Invoice #12345".to_string(),
            "Invoice #12346".to_string(),
        ];
        
        let resolved = MultiPassOCRService::resolve_conflict(&variants);
        assert_eq!(resolved, "Invoice #12345");
    }

    #[test]
    fn test_calculate_merged_confidence() {
        let service = MultiPassOCRService::default();
        
        let results = vec![
            OCRResult {
                text: "test".to_string(),
                confidence: 0.9,
                engine: "test".to_string(),
                processing_time_ms: 100,
            },
            OCRResult {
                text: "test".to_string(),
                confidence: 0.8,
                engine: "test".to_string(),
                processing_time_ms: 100,
            },
        ];

        // No conflicts - high confidence
        let confidence1 = MultiPassOCRService::calculate_merged_confidence(&results, 0, 10);
        assert!(confidence1 > 0.85);

        // Many conflicts - lower confidence
        let confidence2 = MultiPassOCRService::calculate_merged_confidence(&results, 5, 10);
        assert!(confidence2 < confidence1);
    }
}
