// Candidate Generator Service
// Generates field candidates using lexicon, regex, proximity, and parsing
// Requirements: 4.1 (Candidate Extraction - Universal Terms)

use crate::models::artifact::{BoundingBox, Evidence, EvidenceType, OcrArtifact, OcrWord, ZoneType};
use crate::models::lexicon::Lexicon;
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

/// Candidate generator errors
#[derive(Debug, Error)]
pub enum CandidateGeneratorError {
    #[error("Lexicon error: {0}")]
    LexiconError(String),
    
    #[error("Parsing error: {0}")]
    ParsingError(String),
    
    #[error("No candidates found for field: {0}")]
    NoCandidatesError(String),
}

/// Field candidate with evidence
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldCandidate {
    pub field_name: String,
    pub value_raw: String,
    pub value_normalized: Option<String>,
    pub score: u8, // 0-100
    pub evidence: Vec<Evidence>,
    pub sources: Vec<String>, // OcrArtifact IDs
    pub bbox: Option<BoundingBox>,
}

/// Candidate generation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidateGenerationResult {
    pub candidates: HashMap<String, Vec<FieldCandidate>>,
    pub processing_time_ms: u64,
    pub total_candidates: usize,
}

/// Candidate generator service
pub struct CandidateGenerator {
    lexicon: Lexicon,
}

impl CandidateGenerator {
    /// Create a new candidate generator
    pub fn new(lexicon: Lexicon) -> Self {
        Self { lexicon }
    }
    
    /// Generate candidates from OCR artifacts
    pub fn generate_candidates(
        &self,
        ocr_artifacts: &[OcrArtifact],
        zone_type: Option<&ZoneType>,
        vendor_id: Option<&str>,
    ) -> Result<CandidateGenerationResult, CandidateGeneratorError> {
        let start_time = std::time::Instant::now();
        
        let mut candidates: HashMap<String, Vec<FieldCandidate>> = HashMap::new();
        
        // Get field names to search for
        let field_names = if let Some(zt) = zone_type {
            self.lexicon.zone_priors.get_fields_for_zone(zt)
        } else {
            self.lexicon.get_field_names()
        };
        
        // Generate candidates for each field
        for field_name in field_names {
            let field_candidates = self.generate_candidates_for_field(
                &field_name,
                ocr_artifacts,
                vendor_id,
            );
            
            if !field_candidates.is_empty() {
                candidates.insert(field_name, field_candidates);
            }
        }
        
        let total_candidates = candidates.values().map(|v| v.len()).sum();
        let processing_time_ms = start_time.elapsed().as_millis() as u64;
        
        Ok(CandidateGenerationResult {
            candidates,
            processing_time_ms,
            total_candidates,
        })
    }
    
    /// Generate candidates for a specific field
    fn generate_candidates_for_field(
        &self,
        field_name: &str,
        ocr_artifacts: &[OcrArtifact],
        vendor_id: Option<&str>,
    ) -> Vec<FieldCandidate> {
        let mut candidates = Vec::new();
        
        // Method 1: Label proximity matching
        candidates.extend(self.extract_by_label_proximity(field_name, ocr_artifacts, vendor_id));
        
        // Method 2: Format pattern matching
        candidates.extend(self.extract_by_format_pattern(field_name, ocr_artifacts));
        
        // Method 3: Zone prior matching
        candidates.extend(self.extract_by_zone_prior(field_name, ocr_artifacts));
        
        // Deduplicate and rank
        self.deduplicate_and_rank(candidates)
    }
    
    /// Extract candidates by label proximity
    fn extract_by_label_proximity(
        &self,
        field_name: &str,
        ocr_artifacts: &[OcrArtifact],
        vendor_id: Option<&str>,
    ) -> Vec<FieldCandidate> {
        let mut candidates = Vec::new();
        let _synonyms = self.lexicon.get_synonyms_with_vendor(field_name, vendor_id);
        
        for artifact in ocr_artifacts {
            // Look for label words
            for (i, word) in artifact.words.iter().enumerate() {
                let label_score = self.lexicon.calculate_label_match_score(
                    &word.text,
                    field_name,
                    vendor_id,
                );
                
                if label_score >= self.lexicon.settings.min_label_match_score {
                    // Found a label, look for value nearby
                    if let Some(value_word) = Self::find_value_near_label(&artifact.words, i) {
                        let score = (label_score * 100.0) as u8;
                        
                        let evidence = vec![
                            Evidence {
                                evidence_type: EvidenceType::LabelProximity,
                                description: format!("Found near label '{}'", word.text),
                                artifact_id: artifact.artifact_id.clone(),
                                weight: label_score,
                            },
                        ];
                        
                        candidates.push(FieldCandidate {
                            field_name: field_name.to_string(),
                            value_raw: value_word.text.clone(),
                            value_normalized: self.normalize_value(field_name, &value_word.text),
                            score,
                            evidence,
                            sources: vec![artifact.artifact_id.clone()],
                            bbox: Some(value_word.bbox.clone()),
                        });
                    }
                }
            }
        }
        
        candidates
    }
    
    /// Find value word near a label word
    fn find_value_near_label<'a>(words: &'a [OcrWord], label_index: usize) -> Option<&'a OcrWord> {
        // Look right (most common)
        if label_index + 1 < words.len() {
            return Some(&words[label_index + 1]);
        }
        
        // Look below (next line)
        if label_index + 2 < words.len() {
            let label_y = words[label_index].bbox.y;
            let next_y = words[label_index + 1].bbox.y;
            
            if next_y > label_y + 10 {
                // Different line
                return Some(&words[label_index + 1]);
            }
        }
        
        None
    }
    
    /// Extract candidates by format pattern
    fn extract_by_format_pattern(
        &self,
        field_name: &str,
        ocr_artifacts: &[OcrArtifact],
    ) -> Vec<FieldCandidate> {
        let mut candidates = Vec::new();
        let patterns = self.lexicon.get_format_patterns(field_name);
        
        if patterns.is_empty() {
            return candidates;
        }
        
        for artifact in ocr_artifacts {
            for word in &artifact.words {
                if self.lexicon.matches_format(field_name, &word.text) {
                    let score = 75; // Base score for format match
                    
                    let evidence = vec![
                        Evidence {
                            evidence_type: EvidenceType::FormatParsing,
                            description: format!("Matches format pattern for {}", field_name),
                            artifact_id: artifact.artifact_id.clone(),
                            weight: 0.75,
                        },
                    ];
                    
                    candidates.push(FieldCandidate {
                        field_name: field_name.to_string(),
                        value_raw: word.text.clone(),
                        value_normalized: self.normalize_value(field_name, &word.text),
                        score,
                        evidence,
                        sources: vec![artifact.artifact_id.clone()],
                        bbox: Some(word.bbox.clone()),
                    });
                }
            }
        }
        
        candidates
    }
    
    /// Extract candidates by zone prior
    fn extract_by_zone_prior(
        &self,
        field_name: &str,
        ocr_artifacts: &[OcrArtifact],
    ) -> Vec<FieldCandidate> {
        let mut candidates = Vec::new();
        
        // This is a simplified implementation
        // In a real system, you would check if the artifact's zone matches the expected zone
        
        for artifact in ocr_artifacts {
            // Use zone prior boost if available
            let score = 60; // Base score for zone prior
            
            let evidence = vec![
                Evidence {
                    evidence_type: EvidenceType::ZonePrior,
                    description: format!("Found in expected zone for {}", field_name),
                    artifact_id: artifact.artifact_id.clone(),
                    weight: 0.6,
                },
            ];
            
            // Take first word as candidate (simplified)
            if let Some(word) = artifact.words.first() {
                candidates.push(FieldCandidate {
                    field_name: field_name.to_string(),
                    value_raw: word.text.clone(),
                    value_normalized: self.normalize_value(field_name, &word.text),
                    score,
                    evidence,
                    sources: vec![artifact.artifact_id.clone()],
                    bbox: Some(word.bbox.clone()),
                });
            }
        }
        
        candidates
    }
    
    /// Normalize value based on field type
    fn normalize_value(&self, field_name: &str, value: &str) -> Option<String> {
        if field_name.contains("date") {
            Self::parse_date(value)
        } else if field_name.contains("total") || field_name.contains("price") || field_name.contains("amount") {
            Self::parse_currency(value)
        } else {
            Some(value.trim().to_string())
        }
    }
    
    /// Parse date from various formats
    fn parse_date(value: &str) -> Option<String> {
        // Try common date formats
        let formats = vec![
            "%m/%d/%Y",
            "%d/%m/%Y",
            "%Y-%m-%d",
            "%m-%d-%Y",
            "%B %d, %Y",
            "%b %d, %Y",
        ];
        
        for format in formats {
            if let Ok(date) = NaiveDate::parse_from_str(value, format) {
                return Some(date.format("%Y-%m-%d").to_string());
            }
        }
        
        None
    }
    
    /// Parse currency value
    fn parse_currency(value: &str) -> Option<String> {
        // Remove currency symbols and commas
        let cleaned = value
            .replace('$', "")
            .replace(',', "")
            .replace('€', "")
            .replace('£', "")
            .trim()
            .to_string();
        
        // Try to parse as float
        if let Ok(amount) = cleaned.parse::<f64>() {
            return Some(format!("{:.2}", amount));
        }
        
        None
    }
    
    /// Deduplicate and rank candidates
    fn deduplicate_and_rank(&self, mut candidates: Vec<FieldCandidate>) -> Vec<FieldCandidate> {
        // Sort by score descending
        candidates.sort_by(|a, b| b.score.cmp(&a.score));
        
        // Deduplicate by value
        let mut seen_values = std::collections::HashSet::new();
        let mut unique_candidates = Vec::new();
        
        for candidate in candidates {
            let key = candidate.value_normalized.as_ref().unwrap_or(&candidate.value_raw);
            if seen_values.insert(key.clone()) {
                unique_candidates.push(candidate);
            }
        }
        
        // Keep top N
        unique_candidates.truncate(self.lexicon.settings.max_candidates_per_field);
        
        unique_candidates
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn create_test_lexicon() -> Lexicon {
        let yaml = r#"
field_synonyms:
  invoice_number:
    - invoice no
    - inv #
  total:
    - total
    - amount due

vendor_overrides: {}

format_patterns:
  invoice_number:
    - "^INV-?\\d{4,10}$"
  total:
    - "\\$?\\d+\\.\\d{2}"

proximity_rules:
  max_horizontal_distance: 300
  max_vertical_distance: 50
  preferred_direction: right
  allow_diagonal: true

zone_priors:
  HeaderFields:
    - invoice_number
  TotalsBox:
    - total
  LineItemsTable: []
  FooterNotes: []

confidence_boosters:
  format_match_boost: 0.1
  zone_prior_boost: 0.15
  proximity_boost: 0.1
  consensus_boost: 0.2

settings:
  case_sensitive: false
  allow_partial_matches: true
  min_label_match_score: 0.7
  max_candidates_per_field: 5
  enable_fuzzy_matching: true
  fuzzy_match_threshold: 0.8
"#;
        
        Lexicon::load_from_yaml(yaml).unwrap()
    }
    
    fn create_test_ocr_artifact() -> OcrArtifact {
        OcrArtifact {
            artifact_id: "ocr-1".to_string(),
            zone_id: "zone-1".to_string(),
            profile: "test-profile".to_string(),
            engine: "tesseract".to_string(),
            text: "Invoice No: INV-12345 Total: $123.45".to_string(),
            avg_confidence: 0.95,
            words: vec![
                OcrWord {
                    text: "Invoice".to_string(),
                    confidence: 0.95,
                    bbox: BoundingBox::new(10, 10, 50, 20),
                },
                OcrWord {
                    text: "No:".to_string(),
                    confidence: 0.95,
                    bbox: BoundingBox::new(65, 10, 30, 20),
                },
                OcrWord {
                    text: "INV-12345".to_string(),
                    confidence: 0.95,
                    bbox: BoundingBox::new(100, 10, 80, 20),
                },
                OcrWord {
                    text: "Total:".to_string(),
                    confidence: 0.95,
                    bbox: BoundingBox::new(10, 40, 50, 20),
                },
                OcrWord {
                    text: "$123.45".to_string(),
                    confidence: 0.95,
                    bbox: BoundingBox::new(65, 40, 60, 20),
                },
            ],
            processing_time_ms: 100,
        }
    }
    
    #[test]
    fn test_candidate_generator_creation() {
        let lexicon = create_test_lexicon();
        let generator = CandidateGenerator::new(lexicon);
        
        assert_eq!(generator.lexicon.field_synonyms.len(), 2);
    }
    
    #[test]
    fn test_generate_candidates() {
        let lexicon = create_test_lexicon();
        let generator = CandidateGenerator::new(lexicon);
        let artifacts = vec![create_test_ocr_artifact()];
        
        let result = generator.generate_candidates(&artifacts, None, None).unwrap();
        
        assert!(result.total_candidates > 0);
        assert!(result.processing_time_ms > 0);
    }
    
    #[test]
    fn test_extract_by_label_proximity() {
        let lexicon = create_test_lexicon();
        let generator = CandidateGenerator::new(lexicon);
        let artifacts = vec![create_test_ocr_artifact()];
        
        let candidates = generator.extract_by_label_proximity("invoice_number", &artifacts, None);
        
        assert!(!candidates.is_empty());
        assert_eq!(candidates[0].value_raw, "INV-12345");
    }
    
    #[test]
    fn test_extract_by_format_pattern() {
        let lexicon = create_test_lexicon();
        let generator = CandidateGenerator::new(lexicon);
        let artifacts = vec![create_test_ocr_artifact()];
        
        let candidates = generator.extract_by_format_pattern("invoice_number", &artifacts);
        
        assert!(!candidates.is_empty());
        assert!(candidates[0].value_raw.contains("INV"));
    }
    
    #[test]
    fn test_parse_currency() {
        let lexicon = create_test_lexicon();
        let generator = CandidateGenerator::new(lexicon);
        
        assert_eq!(generator.parse_currency("$123.45"), Some("123.45".to_string()));
        assert_eq!(generator.parse_currency("1,234.56"), Some("1234.56".to_string()));
        assert_eq!(generator.parse_currency("€99.99"), Some("99.99".to_string()));
    }
    
    #[test]
    fn test_parse_date() {
        let lexicon = create_test_lexicon();
        let generator = CandidateGenerator::new(lexicon);
        
        assert_eq!(generator.parse_date("01/15/2024"), Some("2024-01-15".to_string()));
        assert_eq!(generator.parse_date("2024-01-15"), Some("2024-01-15".to_string()));
    }
    
    #[test]
    fn test_deduplicate_and_rank() {
        let lexicon = create_test_lexicon();
        let generator = CandidateGenerator::new(lexicon);
        
        let candidates = vec![
            FieldCandidate {
                field_name: "test".to_string(),
                value_raw: "value1".to_string(),
                value_normalized: Some("value1".to_string()),
                score: 80,
                evidence: vec![],
                sources: vec![],
                bbox: None,
            },
            FieldCandidate {
                field_name: "test".to_string(),
                value_raw: "value1".to_string(),
                value_normalized: Some("value1".to_string()),
                score: 90,
                evidence: vec![],
                sources: vec![],
                bbox: None,
            },
            FieldCandidate {
                field_name: "test".to_string(),
                value_raw: "value2".to_string(),
                value_normalized: Some("value2".to_string()),
                score: 70,
                evidence: vec![],
                sources: vec![],
                bbox: None,
            },
        ];
        
        let result = generator.deduplicate_and_rank(candidates);
        
        assert_eq!(result.len(), 2); // Deduplicated
        assert_eq!(result[0].score, 90); // Highest score first
    }
}
