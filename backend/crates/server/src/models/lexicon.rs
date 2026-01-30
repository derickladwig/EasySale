// Lexicon Model
// Defines universal field synonyms and vendor-specific overrides
// Requirements: 4.1 (Candidate Extraction - Universal Terms)

use crate::models::artifact::ZoneType;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use thiserror::Error;

/// Lexicon errors
#[derive(Debug, Error)]
pub enum LexiconError {
    #[error("Failed to load lexicon: {0}")]
    LoadError(String),
    
    #[error("Failed to parse YAML: {0}")]
    ParseError(String),
    
    #[error("Invalid lexicon configuration: {0}")]
    ValidationError(String),
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

/// Proximity rules for label-value matching
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProximityRules {
    pub max_horizontal_distance: u32,
    pub max_vertical_distance: u32,
    pub preferred_direction: String,
    pub allow_diagonal: bool,
}

impl Default for ProximityRules {
    fn default() -> Self {
        Self {
            max_horizontal_distance: 300,
            max_vertical_distance: 50,
            preferred_direction: "right".to_string(),
            allow_diagonal: true,
        }
    }
}

/// Zone priors mapping
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZonePriors {
    #[serde(rename = "HeaderFields")]
    pub header_fields: Vec<String>,
    
    #[serde(rename = "TotalsBox")]
    pub totals_box: Vec<String>,
    
    #[serde(rename = "LineItemsTable")]
    pub line_items_table: Vec<String>,
    
    #[serde(rename = "FooterNotes")]
    pub footer_notes: Vec<String>,
}

impl ZonePriors {
    /// Get fields likely to be in a zone type
    pub fn get_fields_for_zone(&self, zone_type: &ZoneType) -> Vec<String> {
        match zone_type {
            ZoneType::HeaderFields => self.header_fields.clone(),
            ZoneType::TotalsBox => self.totals_box.clone(),
            ZoneType::LineItemsTable => self.line_items_table.clone(),
            ZoneType::FooterNotes => self.footer_notes.clone(),
            _ => vec![],
        }
    }
}

/// Confidence boosters configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidenceBoosters {
    pub format_match_boost: f64,
    pub zone_prior_boost: f64,
    pub proximity_boost: f64,
    pub consensus_boost: f64,
}

impl Default for ConfidenceBoosters {
    fn default() -> Self {
        Self {
            format_match_boost: 0.1,
            zone_prior_boost: 0.15,
            proximity_boost: 0.1,
            consensus_boost: 0.2,
        }
    }
}

/// Lexicon settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LexiconSettings {
    pub case_sensitive: bool,
    pub allow_partial_matches: bool,
    pub min_label_match_score: f64,
    pub max_candidates_per_field: usize,
    pub enable_fuzzy_matching: bool,
    pub fuzzy_match_threshold: f64,
}

impl Default for LexiconSettings {
    fn default() -> Self {
        Self {
            case_sensitive: false,
            allow_partial_matches: true,
            min_label_match_score: 0.7,
            max_candidates_per_field: 5,
            enable_fuzzy_matching: true,
            fuzzy_match_threshold: 0.8,
        }
    }
}

/// Complete lexicon configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Lexicon {
    pub field_synonyms: HashMap<String, Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vendor_overrides: Option<HashMap<String, HashMap<String, Vec<String>>>>,
    pub format_patterns: HashMap<String, Vec<String>>,
    pub proximity_rules: ProximityRules,
    pub zone_priors: ZonePriors,
    pub confidence_boosters: ConfidenceBoosters,
    pub settings: LexiconSettings,
}

impl Lexicon {
    /// Load lexicon from YAML file
    pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Self, LexiconError> {
        let content = fs::read_to_string(path)
            .map_err(|e| LexiconError::LoadError(e.to_string()))?;
        
        Self::load_from_yaml(&content)
    }
    
    /// Load lexicon from YAML string
    pub fn load_from_yaml(yaml: &str) -> Result<Self, LexiconError> {
        let lexicon: Lexicon = serde_yaml::from_str(yaml)
            .map_err(|e| LexiconError::ParseError(e.to_string()))?;
        
        lexicon.validate()?;
        
        Ok(lexicon)
    }
    
    /// Validate lexicon configuration
    fn validate(&self) -> Result<(), LexiconError> {
        // Check that field_synonyms is not empty
        if self.field_synonyms.is_empty() {
            return Err(LexiconError::ValidationError(
                "field_synonyms cannot be empty".to_string()
            ));
        }
        
        // Check that each field has at least one synonym
        for (field, synonyms) in &self.field_synonyms {
            if synonyms.is_empty() {
                return Err(LexiconError::ValidationError(
                    format!("Field '{}' has no synonyms", field)
                ));
            }
        }
        
        Ok(())
    }
    
    /// Get synonyms for a field
    pub fn get_synonyms(&self, field_name: &str) -> Vec<String> {
        self.field_synonyms
            .get(field_name)
            .cloned()
            .unwrap_or_default()
    }
    
    /// Get synonyms for a field with vendor override
    pub fn get_synonyms_with_vendor(
        &self,
        field_name: &str,
        vendor_id: Option<&str>,
    ) -> Vec<String> {
        // Check for vendor override
        if let Some(vid) = vendor_id {
            if let Some(overrides) = &self.vendor_overrides {
                if let Some(vendor_fields) = overrides.get(vid) {
                    if let Some(vendor_synonyms) = vendor_fields.get(field_name) {
                        return vendor_synonyms.clone();
                    }
                }
            }
        }
        
        // Fall back to global synonyms
        self.get_synonyms(field_name)
    }
    
    /// Get format patterns for a field
    pub fn get_format_patterns(&self, field_name: &str) -> Vec<String> {
        self.format_patterns
            .get(field_name)
            .cloned()
            .unwrap_or_default()
    }
    
    /// Check if a value matches any format pattern for a field
    pub fn matches_format(&self, field_name: &str, value: &str) -> bool {
        let patterns = self.get_format_patterns(field_name);
        
        for pattern_str in patterns {
            if let Ok(regex) = regex::Regex::new(&pattern_str) {
                if regex.is_match(value) {
                    return true;
                }
            }
        }
        
        false
    }
    
    /// Get all field names
    pub fn get_field_names(&self) -> Vec<String> {
        self.field_synonyms.keys().cloned().collect()
    }
    
    /// Check if a label matches any synonym for a field
    pub fn label_matches_field(&self, label: &str, field_name: &str, vendor_id: Option<&str>) -> bool {
        let synonyms = self.get_synonyms_with_vendor(field_name, vendor_id);
        
        let label_lower = if self.settings.case_sensitive {
            label.to_string()
        } else {
            label.to_lowercase()
        };
        
        for synonym in synonyms {
            let synonym_lower = if self.settings.case_sensitive {
                synonym
            } else {
                synonym.to_lowercase()
            };
            
            if self.settings.allow_partial_matches {
                if label_lower.contains(&synonym_lower) || synonym_lower.contains(&label_lower) {
                    return true;
                }
            } else {
                if label_lower == synonym_lower {
                    return true;
                }
            }
        }
        
        false
    }
    
    /// Calculate label match score (0-1)
    pub fn calculate_label_match_score(&self, label: &str, field_name: &str, vendor_id: Option<&str>) -> f64 {
        let synonyms = self.get_synonyms_with_vendor(field_name, vendor_id);
        
        let label_lower = if self.settings.case_sensitive {
            label.to_string()
        } else {
            label.to_lowercase()
        };
        
        let mut best_score: f64 = 0.0;
        
        for synonym in synonyms {
            let synonym_lower = if self.settings.case_sensitive {
                synonym
            } else {
                synonym.to_lowercase()
            };
            
            // Exact match
            if label_lower == synonym_lower {
                return 1.0;
            }
            
            // Partial match
            if label_lower.contains(&synonym_lower) {
                let score = synonym_lower.len() as f64 / label_lower.len() as f64;
                best_score = best_score.max(score);
            } else if synonym_lower.contains(&label_lower) {
                let score = label_lower.len() as f64 / synonym_lower.len() as f64;
                best_score = best_score.max(score);
            }
            
            // Fuzzy matching (simple Levenshtein-like)
            if self.settings.enable_fuzzy_matching {
                let fuzzy_score = Self::calculate_fuzzy_score(&label_lower, &synonym_lower);
                best_score = best_score.max(fuzzy_score);
            }
        }
        
        best_score
    }
    
    /// Calculate fuzzy match score using simple character overlap
    fn calculate_fuzzy_score(s1: &str, s2: &str) -> f64 {
        let chars1: Vec<char> = s1.chars().collect();
        let chars2: Vec<char> = s2.chars().collect();
        
        let mut matches = 0;
        for c1 in &chars1 {
            if chars2.contains(c1) {
                matches += 1;
            }
        }
        
        let max_len = chars1.len().max(chars2.len());
        if max_len == 0 {
            return 0.0;
        }
        
        matches as f64 / max_len as f64
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
    - invoice #
  total:
    - total
    - total due
    - amount due

vendor_overrides:
  vendor-abc:
    invoice_number:
      - abc invoice
      - order ref

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
    
    #[test]
    fn test_load_lexicon() {
        let lexicon = create_test_lexicon();
        
        assert_eq!(lexicon.field_synonyms.len(), 2);
        assert!(lexicon.field_synonyms.contains_key("invoice_number"));
        assert!(lexicon.field_synonyms.contains_key("total"));
    }
    
    #[test]
    fn test_get_synonyms() {
        let lexicon = create_test_lexicon();
        
        let synonyms = lexicon.get_synonyms("invoice_number");
        assert_eq!(synonyms.len(), 3);
        assert!(synonyms.contains(&"invoice no".to_string()));
        assert!(synonyms.contains(&"inv #".to_string()));
    }
    
    #[test]
    fn test_get_synonyms_with_vendor() {
        let lexicon = create_test_lexicon();
        
        // Without vendor
        let synonyms = lexicon.get_synonyms_with_vendor("invoice_number", None);
        assert_eq!(synonyms.len(), 3);
        
        // With vendor override
        let synonyms = lexicon.get_synonyms_with_vendor("invoice_number", Some("vendor-abc"));
        assert_eq!(synonyms.len(), 2);
        assert!(synonyms.contains(&"abc invoice".to_string()));
    }
    
    #[test]
    fn test_get_format_patterns() {
        let lexicon = create_test_lexicon();
        
        let patterns = lexicon.get_format_patterns("invoice_number");
        assert_eq!(patterns.len(), 1);
        assert_eq!(patterns[0], "^INV-?\\d{4,10}$");
    }
    
    #[test]
    fn test_matches_format() {
        let lexicon = create_test_lexicon();
        
        assert!(lexicon.matches_format("invoice_number", "INV-12345"));
        assert!(lexicon.matches_format("invoice_number", "INV12345"));
        assert!(!lexicon.matches_format("invoice_number", "ABC-12345"));
        
        assert!(lexicon.matches_format("total", "$123.45"));
        assert!(lexicon.matches_format("total", "123.45"));
        assert!(!lexicon.matches_format("total", "123"));
    }
    
    #[test]
    fn test_label_matches_field() {
        let lexicon = create_test_lexicon();
        
        assert!(lexicon.label_matches_field("Invoice No:", "invoice_number", None));
        assert!(lexicon.label_matches_field("INV #", "invoice_number", None));
        assert!(!lexicon.label_matches_field("Date", "invoice_number", None));
    }
    
    #[test]
    fn test_calculate_label_match_score() {
        let lexicon = create_test_lexicon();
        
        // Exact match
        let score = lexicon.calculate_label_match_score("invoice no", "invoice_number", None);
        assert_eq!(score, 1.0);
        
        // Partial match
        let score = lexicon.calculate_label_match_score("invoice no:", "invoice_number", None);
        assert!(score > 0.7);
        
        // No match
        let score = lexicon.calculate_label_match_score("date", "invoice_number", None);
        assert!(score < 0.5);
    }
    
    #[test]
    fn test_get_field_names() {
        let lexicon = create_test_lexicon();
        
        let fields = lexicon.get_field_names();
        assert_eq!(fields.len(), 2);
        assert!(fields.contains(&"invoice_number".to_string()));
        assert!(fields.contains(&"total".to_string()));
    }
    
    #[test]
    fn test_validate_empty_synonyms() {
        let yaml = r#"
field_synonyms: {}
format_patterns: {}
proximity_rules:
  max_horizontal_distance: 300
  max_vertical_distance: 50
  preferred_direction: right
  allow_diagonal: true
zone_priors:
  HeaderFields: []
  TotalsBox: []
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
        
        let result = Lexicon::load_from_yaml(yaml);
        assert!(result.is_err());
    }
    
    #[test]
    fn test_zone_priors() {
        let lexicon = create_test_lexicon();
        
        let fields = lexicon.zone_priors.get_fields_for_zone(&ZoneType::HeaderFields);
        assert_eq!(fields.len(), 1);
        assert_eq!(fields[0], "invoice_number");
        
        let fields = lexicon.zone_priors.get_fields_for_zone(&ZoneType::TotalsBox);
        assert_eq!(fields.len(), 1);
        assert_eq!(fields[0], "total");
    }
}
