// Field Resolver Service
// Resolves final field values from candidates using consensus and cross-checks
// Requirements: 4.2 (Field Resolver - Consensus + Cross-Checks)

use crate::models::artifact::{Evidence, EvidenceType};
use crate::services::candidate_generator::FieldCandidate;
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

/// Field resolver errors
#[derive(Debug, Error)]
pub enum FieldResolverError {
    #[error("No candidates provided for field: {0}")]
    NoCandidatesError(String),
    
    #[error("Validation error: {0}")]
    ValidationError(String),
    
    #[error("Cross-field validation failed: {0}")]
    CrossFieldError(String),
}

/// Resolved field value with confidence and explanation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldValue {
    pub field_name: String,
    pub value: String,
    pub normalized: Option<String>,
    pub confidence: u8, // 0-100
    pub chosen_sources: Vec<String>, // Artifact IDs
    pub alternatives: Vec<FieldCandidate>,
    pub flags: Vec<String>,
    pub explanation: String, // Plain-language "why we think this"
}

/// Resolution result for all fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolutionResult {
    pub fields: HashMap<String, FieldValue>,
    pub cross_field_validations: Vec<CrossFieldValidation>,
    pub contradictions: Vec<Contradiction>,
    pub overall_confidence: u8,
    pub processing_time_ms: u64,
}

/// Cross-field validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossFieldValidation {
    pub validation_type: ValidationType,
    pub passed: bool,
    pub message: String,
    pub penalty: u8, // Confidence penalty if failed
}

/// Types of cross-field validations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ValidationType {
    TotalEqualsSubtotalPlusTax,
    DateNotInFuture,
    InvoiceNumberFormat,
    VendorNamePresent,
}

/// Contradiction detected between fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Contradiction {
    pub fields: Vec<String>,
    pub description: String,
    pub severity: ContradictionSeverity,
}

/// Severity of contradiction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ContradictionSeverity {
    Critical, // Blocks approval
    Warning,  // Reduces confidence
}

/// Field resolver service
pub struct FieldResolver {
    #[allow(dead_code)]
    consensus_threshold: f64,
    cross_validation_enabled: bool,
}

impl FieldResolver {
    /// Create a new field resolver
    pub fn new() -> Self {
        Self {
            consensus_threshold: 0.7,
            cross_validation_enabled: true,
        }
    }
    
    /// Create with custom settings
    pub fn with_settings(consensus_threshold: f64, cross_validation_enabled: bool) -> Self {
        Self {
            consensus_threshold,
            cross_validation_enabled,
        }
    }
    
    /// Resolve field values from candidates
    pub fn resolve_fields(
        &self,
        candidates_by_field: HashMap<String, Vec<FieldCandidate>>,
    ) -> Result<ResolutionResult, FieldResolverError> {
        let start_time = std::time::Instant::now();
        
        let mut fields = HashMap::new();
        
        // Resolve each field
        for (field_name, candidates) in candidates_by_field {
            if candidates.is_empty() {
                continue;
            }
            
            let field_value = self.resolve_single_field(&field_name, candidates)?;
            fields.insert(field_name, field_value);
        }
        
        // Perform cross-field validations
        let cross_field_validations = if self.cross_validation_enabled {
            Self::perform_cross_field_validations(&fields)
        } else {
            vec![]
        };
        
        // Detect contradictions
        let contradictions = Self::detect_contradictions(&fields, &cross_field_validations);
        
        // Apply penalties for failed validations
        let mut fields_with_penalties = fields;
        for validation in &cross_field_validations {
            if !validation.passed {
                Self::apply_validation_penalty(&mut fields_with_penalties, validation);
            }
        }
        
        // Calculate overall confidence
        let overall_confidence = Self::calculate_overall_confidence(&fields_with_penalties);
        
        let processing_time_ms = start_time.elapsed().as_millis() as u64;
        
        Ok(ResolutionResult {
            fields: fields_with_penalties,
            cross_field_validations,
            contradictions,
            overall_confidence,
            processing_time_ms,
        })
    }
    
    /// Resolve a single field from its candidates
    fn resolve_single_field(
        &self,
        field_name: &str,
        mut candidates: Vec<FieldCandidate>,
    ) -> Result<FieldValue, FieldResolverError> {
        if candidates.is_empty() {
            return Err(FieldResolverError::NoCandidatesError(field_name.to_string()));
        }
        
        // Sort by score descending
        candidates.sort_by(|a, b| b.score.cmp(&a.score));
        
        // Apply consensus boost
        Self::apply_consensus_boost(&mut candidates);
        
        // Re-sort after consensus boost
        candidates.sort_by(|a, b| b.score.cmp(&a.score));
        
        // Choose best candidate
        let best = candidates[0].clone();
        
        // Keep top alternatives
        let alternatives: Vec<FieldCandidate> = candidates.iter().skip(1).take(3).cloned().collect();
        
        // Build explanation
        let explanation = Self::build_explanation(&best, &candidates);
        
        // Detect flags
        let flags = Self::detect_field_flags(field_name, &best);
        
        Ok(FieldValue {
            field_name: field_name.to_string(),
            value: best.value_raw.clone(),
            normalized: best.value_normalized.clone(),
            confidence: best.score,
            chosen_sources: best.sources.clone(),
            alternatives,
            flags,
            explanation,
        })
    }
    
    /// Apply consensus boost to candidates
    fn apply_consensus_boost(candidates: &mut [FieldCandidate]) {
        // Count occurrences of each normalized value
        let mut value_counts: HashMap<String, usize> = HashMap::new();
        
        for candidate in candidates.iter() {
            let key = candidate.value_normalized.as_ref().unwrap_or(&candidate.value_raw);
            *value_counts.entry(key.clone()).or_insert(0) += 1;
        }
        
        // Apply boost to candidates with consensus
        for candidate in candidates.iter_mut() {
            let key = candidate.value_normalized.as_ref().unwrap_or(&candidate.value_raw);
            let count = value_counts.get(key).unwrap_or(&1);
            
            if *count > 1 {
                // Consensus boost: +10 points per additional occurrence
                let boost = ((*count - 1) * 10).min(20) as u8;
                candidate.score = candidate.score.saturating_add(boost).min(100);
                
                // Add consensus evidence
                candidate.evidence.push(Evidence {
                    evidence_type: EvidenceType::Consensus,
                    description: format!("Value seen {} times across sources", count),
                    artifact_id: "consensus".to_string(),
                    weight: 0.2 * (*count as f64),
                });
            }
        }
    }
    
    /// Build plain-language explanation
    fn build_explanation(best: &FieldCandidate, all_candidates: &[FieldCandidate]) -> String {
        let mut parts = Vec::new();
        
        // Confidence level
        if best.score >= 95 {
            parts.push("Very confident".to_string());
        } else if best.score >= 85 {
            parts.push("Confident".to_string());
        } else if best.score >= 70 {
            parts.push("Moderately confident".to_string());
        } else {
            parts.push("Low confidence".to_string());
        }
        
        // Evidence summary
        let evidence_types: Vec<String> = best.evidence.iter()
            .map(|e| format!("{:?}", e.evidence_type))
            .collect();
        
        if !evidence_types.is_empty() {
            parts.push(format!("based on {}", evidence_types.join(", ")));
        }
        
        // Consensus
        let consensus_count = all_candidates.iter()
            .filter(|c| {
                let key = c.value_normalized.as_ref().unwrap_or(&c.value_raw);
                let best_key = best.value_normalized.as_ref().unwrap_or(&best.value_raw);
                key == best_key
            })
            .count();
        
        if consensus_count > 1 {
            parts.push(format!("(seen {consensus_count} times)"));
        }
        
        parts.join(" ")
    }
    
    /// Detect field-specific flags
    fn detect_field_flags(field_name: &str, candidate: &FieldCandidate) -> Vec<String> {
        let mut flags = Vec::new();
        
        // Low confidence flag
        if candidate.score < 70 {
            flags.push("low_confidence".to_string());
        }
        
        // Field-specific checks
        if field_name.contains("date") {
            if let Some(normalized) = &candidate.value_normalized {
                if let Ok(date) = NaiveDate::parse_from_str(normalized, "%Y-%m-%d") {
                    let today = chrono::Local::now().naive_local().date();
                    if date > today {
                        flags.push("future_date".to_string());
                    }
                }
            }
        }
        
        if field_name.contains("total") || field_name.contains("amount") {
            if let Some(normalized) = &candidate.value_normalized {
                if let Ok(amount) = normalized.parse::<f64>() {
                    if amount <= 0.0 {
                        flags.push("invalid_amount".to_string());
                    }
                    if amount > 1_000_000.0 {
                        flags.push("unusually_large_amount".to_string());
                    }
                }
            }
        }
        
        flags
    }
    
    /// Perform cross-field validations
    fn perform_cross_field_validations(
        fields: &HashMap<String, FieldValue>,
    ) -> Vec<CrossFieldValidation> {
        let mut validations = Vec::new();
        
        // Validation 1: Total = Subtotal + Tax
        validations.push(Self::validate_total_equals_subtotal_plus_tax(fields));
        
        // Validation 2: Date not in future
        validations.push(Self::validate_date_not_in_future(fields));
        
        // Validation 3: Invoice number format
        validations.push(Self::validate_invoice_number_format(fields));
        
        // Validation 4: Vendor name present
        validations.push(Self::validate_vendor_name_present(fields));
        
        validations
    }
    
    /// Validate total = subtotal + tax
    fn validate_total_equals_subtotal_plus_tax(
        fields: &HashMap<String, FieldValue>,
    ) -> CrossFieldValidation {
        let total = Self::get_field_as_f64(fields, "total");
        let subtotal = Self::get_field_as_f64(fields, "subtotal");
        let tax = Self::get_field_as_f64(fields, "tax");
        
        if let (Some(t), Some(s), Some(tx)) = (total, subtotal, tax) {
            let expected = s + tx;
            let diff = (t - expected).abs();
            let tolerance = 0.02; // 2 cents tolerance
            
            let passed = diff <= tolerance;
            
            CrossFieldValidation {
                validation_type: ValidationType::TotalEqualsSubtotalPlusTax,
                passed,
                message: if passed {
                    format!("Total ${t:.2} = Subtotal ${s:.2} + Tax ${tx:.2}")
                } else {
                    format!("Total ${t:.2} ≠ Subtotal ${s:.2} + Tax ${tx:.2} (diff: ${diff:.2})")
                },
                penalty: if passed { 0 } else { 20 },
            }
        } else {
            CrossFieldValidation {
                validation_type: ValidationType::TotalEqualsSubtotalPlusTax,
                passed: false,
                message: "Missing required fields for validation".to_string(),
                penalty: 10,
            }
        }
    }
    
    /// Validate date not in future
    fn validate_date_not_in_future(
        fields: &HashMap<String, FieldValue>,
    ) -> CrossFieldValidation {
        if let Some(date_field) = fields.get("invoice_date") {
            if let Some(normalized) = &date_field.normalized {
                if let Ok(date) = NaiveDate::parse_from_str(normalized, "%Y-%m-%d") {
                    let today = chrono::Local::now().naive_local().date();
                    let passed = date <= today;
                    
                    return CrossFieldValidation {
                        validation_type: ValidationType::DateNotInFuture,
                        passed,
                        message: if passed {
                            format!("Date {normalized} is valid")
                        } else {
                            format!("Date {normalized} is in the future")
                        },
                        penalty: if passed { 0 } else { 30 },
                    };
                }
            }
        }
        
        CrossFieldValidation {
            validation_type: ValidationType::DateNotInFuture,
            passed: true,
            message: "No date field to validate".to_string(),
            penalty: 0,
        }
    }
    
    /// Validate invoice number format
    fn validate_invoice_number_format(
        fields: &HashMap<String, FieldValue>,
    ) -> CrossFieldValidation {
        if let Some(inv_field) = fields.get("invoice_number") {
            let value = &inv_field.value;
            
            // Basic format check: should have some alphanumeric content
            let has_content = value.chars().any(|c| c.is_alphanumeric());
            let not_too_short = value.len() >= 3;
            let not_too_long = value.len() <= 50;
            
            let passed = has_content && not_too_short && not_too_long;
            
            CrossFieldValidation {
                validation_type: ValidationType::InvoiceNumberFormat,
                passed,
                message: if passed {
                    format!("Invoice number '{value}' has valid format")
                } else {
                    format!("Invoice number '{value}' has invalid format")
                },
                penalty: if passed { 0 } else { 15 },
            }
        } else {
            CrossFieldValidation {
                validation_type: ValidationType::InvoiceNumberFormat,
                passed: false,
                message: "Invoice number missing".to_string(),
                penalty: 25,
            }
        }
    }
    
    /// Validate vendor name present
    fn validate_vendor_name_present(
        fields: &HashMap<String, FieldValue>,
    ) -> CrossFieldValidation {
        if let Some(vendor_field) = fields.get("vendor_name") {
            let value = &vendor_field.value;
            let passed = !value.trim().is_empty() && value.len() >= 2;
            
            CrossFieldValidation {
                validation_type: ValidationType::VendorNamePresent,
                passed,
                message: if passed {
                    format!("Vendor name '{value}' is present")
                } else {
                    "Vendor name is empty or too short".to_string()
                },
                penalty: if passed { 0 } else { 20 },
            }
        } else {
            CrossFieldValidation {
                validation_type: ValidationType::VendorNamePresent,
                passed: false,
                message: "Vendor name missing".to_string(),
                penalty: 20,
            }
        }
    }
    
    /// Detect contradictions
    fn detect_contradictions(
        fields: &HashMap<String, FieldValue>,
        validations: &[CrossFieldValidation],
    ) -> Vec<Contradiction> {
        let mut contradictions = Vec::new();
        
        // Check for critical validation failures
        for validation in validations {
            if !validation.passed && validation.penalty >= 20 {
                contradictions.push(Contradiction {
                    fields: vec!["multiple".to_string()],
                    description: validation.message.clone(),
                    severity: if validation.penalty >= 25 {
                        ContradictionSeverity::Critical
                    } else {
                        ContradictionSeverity::Warning
                    },
                });
            }
        }
        
        // Check for fields with critical flags
        for (field_name, field_value) in fields {
            if field_value.flags.contains(&"future_date".to_string()) {
                contradictions.push(Contradiction {
                    fields: vec![field_name.clone()],
                    description: format!("{} is in the future", field_name),
                    severity: ContradictionSeverity::Critical,
                });
            }
            
            if field_value.flags.contains(&"invalid_amount".to_string()) {
                contradictions.push(Contradiction {
                    fields: vec![field_name.clone()],
                    description: format!("{} has invalid amount", field_name),
                    severity: ContradictionSeverity::Critical,
                });
            }
        }
        
        contradictions
    }
    
    /// Apply validation penalty to fields
    fn apply_validation_penalty(
        fields: &mut HashMap<String, FieldValue>,
        validation: &CrossFieldValidation,
    ) {
        // Apply penalty to related fields
        match validation.validation_type {
            ValidationType::TotalEqualsSubtotalPlusTax => {
                for field_name in &["total", "subtotal", "tax"] {
                    if let Some(field) = fields.get_mut(*field_name) {
                        field.confidence = field.confidence.saturating_sub(validation.penalty / 3);
                        field.flags.push("cross_validation_failed".to_string());
                    }
                }
            }
            ValidationType::DateNotInFuture => {
                if let Some(field) = fields.get_mut("invoice_date") {
                    field.confidence = field.confidence.saturating_sub(validation.penalty);
                    field.flags.push("validation_failed".to_string());
                }
            }
            ValidationType::InvoiceNumberFormat => {
                if let Some(field) = fields.get_mut("invoice_number") {
                    field.confidence = field.confidence.saturating_sub(validation.penalty);
                    field.flags.push("validation_failed".to_string());
                }
            }
            ValidationType::VendorNamePresent => {
                if let Some(field) = fields.get_mut("vendor_name") {
                    field.confidence = field.confidence.saturating_sub(validation.penalty);
                    field.flags.push("validation_failed".to_string());
                }
            }
        }
    }
    
    /// Calculate overall confidence
    fn calculate_overall_confidence(fields: &HashMap<String, FieldValue>) -> u8 {
        if fields.is_empty() {
            return 0;
        }
        
        let sum: u32 = fields.values().map(|f| f.confidence as u32).sum();
        (sum / fields.len() as u32) as u8
    }
    
    /// Helper: Get field value as f64
    fn get_field_as_f64(fields: &HashMap<String, FieldValue>, field_name: &str) -> Option<f64> {
        fields.get(field_name)
            .and_then(|f| f.normalized.as_ref())
            .and_then(|v| v.parse::<f64>().ok())
    }
}

impl Default for FieldResolver {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::artifact::BoundingBox;
    
    fn create_test_candidate(value: &str, score: u8) -> FieldCandidate {
        FieldCandidate {
            field_name: "test".to_string(),
            value_raw: value.to_string(),
            value_normalized: Some(value.to_string()),
            score,
            evidence: vec![],
            sources: vec!["source-1".to_string()],
            bbox: Some(BoundingBox::new(0, 0, 100, 20)),
        }
    }
    
    #[test]
    fn test_field_resolver_creation() {
        let resolver = FieldResolver::new();
        assert_eq!(resolver.consensus_threshold, 0.7);
        assert!(resolver.cross_validation_enabled);
    }
    
    #[test]
    fn test_resolve_single_field() {
        let resolver = FieldResolver::new();
        let candidates = vec![
            create_test_candidate("value1", 80),
            create_test_candidate("value2", 70),
        ];
        
        let result = resolver.resolve_single_field("test_field", candidates).unwrap();
        
        assert_eq!(result.field_name, "test_field");
        assert_eq!(result.value, "value1");
        assert_eq!(result.confidence, 80);
        assert_eq!(result.alternatives.len(), 1);
    }
    
    #[test]
    fn test_consensus_boost() {
        let _resolver = FieldResolver::new();
        let mut candidates = vec![
            create_test_candidate("value1", 70),
            create_test_candidate("value1", 75),
            create_test_candidate("value2", 80),
        ];
        
        FieldResolver::apply_consensus_boost(&mut candidates);
        
        // value1 should get consensus boost
        assert!(candidates[0].score > 70);
        assert!(candidates[1].score > 75);
    }
    
    #[test]
    fn test_detect_field_flags() {
        // Low confidence
        let candidate = create_test_candidate("test", 60);
        let flags = FieldResolver::detect_field_flags("test", &candidate);
        assert!(flags.contains(&"low_confidence".to_string()));
        
        // Invalid amount
        let mut candidate = create_test_candidate("-10.00", 80);
        candidate.value_normalized = Some("-10.00".to_string());
        let flags = FieldResolver::detect_field_flags("total", &candidate);
        assert!(flags.contains(&"invalid_amount".to_string()));
    }
    
    #[test]
    fn test_validate_total_equals_subtotal_plus_tax() {
        let mut fields = HashMap::new();
        
        fields.insert("total".to_string(), FieldValue {
            field_name: "total".to_string(),
            value: "110.00".to_string(),
            normalized: Some("110.00".to_string()),
            confidence: 90,
            chosen_sources: vec![],
            alternatives: vec![],
            flags: vec![],
            explanation: "test".to_string(),
        });
        
        fields.insert("subtotal".to_string(), FieldValue {
            field_name: "subtotal".to_string(),
            value: "100.00".to_string(),
            normalized: Some("100.00".to_string()),
            confidence: 90,
            chosen_sources: vec![],
            alternatives: vec![],
            flags: vec![],
            explanation: "test".to_string(),
        });
        
        fields.insert("tax".to_string(), FieldValue {
            field_name: "tax".to_string(),
            value: "10.00".to_string(),
            normalized: Some("10.00".to_string()),
            confidence: 90,
            chosen_sources: vec![],
            alternatives: vec![],
            flags: vec![],
            explanation: "test".to_string(),
        });
        
        let validation = FieldResolver::validate_total_equals_subtotal_plus_tax(&fields);
        assert!(validation.passed);
        assert_eq!(validation.penalty, 0);
    }
    
    #[test]
    fn test_validate_total_mismatch() {
        let mut fields = HashMap::new();
        
        fields.insert("total".to_string(), FieldValue {
            field_name: "total".to_string(),
            value: "120.00".to_string(),
            normalized: Some("120.00".to_string()),
            confidence: 90,
            chosen_sources: vec![],
            alternatives: vec![],
            flags: vec![],
            explanation: "test".to_string(),
        });
        
        fields.insert("subtotal".to_string(), FieldValue {
            field_name: "subtotal".to_string(),
            value: "100.00".to_string(),
            normalized: Some("100.00".to_string()),
            confidence: 90,
            chosen_sources: vec![],
            alternatives: vec![],
            flags: vec![],
            explanation: "test".to_string(),
        });
        
        fields.insert("tax".to_string(), FieldValue {
            field_name: "tax".to_string(),
            value: "10.00".to_string(),
            normalized: Some("10.00".to_string()),
            confidence: 90,
            chosen_sources: vec![],
            alternatives: vec![],
            flags: vec![],
            explanation: "test".to_string(),
        });
        
        let validation = FieldResolver::validate_total_equals_subtotal_plus_tax(&fields);
        assert!(!validation.passed);
        assert_eq!(validation.penalty, 20);
    }
    
    #[test]
    fn test_resolve_fields_with_cross_validation() {
        let resolver = FieldResolver::new();
        let mut candidates_by_field = HashMap::new();
        
        candidates_by_field.insert("total".to_string(), vec![
            FieldCandidate {
                field_name: "total".to_string(),
                value_raw: "110.00".to_string(),
                value_normalized: Some("110.00".to_string()),
                score: 90,
                evidence: vec![],
                sources: vec![],
                bbox: None,
            },
        ]);
        
        candidates_by_field.insert("subtotal".to_string(), vec![
            FieldCandidate {
                field_name: "subtotal".to_string(),
                value_raw: "100.00".to_string(),
                value_normalized: Some("100.00".to_string()),
                score: 90,
                evidence: vec![],
                sources: vec![],
                bbox: None,
            },
        ]);
        
        candidates_by_field.insert("tax".to_string(), vec![
            FieldCandidate {
                field_name: "tax".to_string(),
                value_raw: "10.00".to_string(),
                value_normalized: Some("10.00".to_string()),
                score: 90,
                evidence: vec![],
                sources: vec![],
                bbox: None,
            },
        ]);
        
        let result = resolver.resolve_fields(candidates_by_field).unwrap();
        
        assert_eq!(result.fields.len(), 3);
        assert!(result.overall_confidence > 0);
        assert!(!result.cross_field_validations.is_empty());
    }
    
    #[test]
    fn test_calculate_overall_confidence() {
        let mut fields = HashMap::new();
        
        fields.insert("field1".to_string(), FieldValue {
            field_name: "field1".to_string(),
            value: "value1".to_string(),
            normalized: None,
            confidence: 90,
            chosen_sources: vec![],
            alternatives: vec![],
            flags: vec![],
            explanation: "test".to_string(),
        });
        
        fields.insert("field2".to_string(), FieldValue {
            field_name: "field2".to_string(),
            value: "value2".to_string(),
            normalized: None,
            confidence: 80,
            chosen_sources: vec![],
            alternatives: vec![],
            flags: vec![],
            explanation: "test".to_string(),
        });
        
        let overall = FieldResolver::calculate_overall_confidence(&fields);
        assert_eq!(overall, 85); // (90 + 80) / 2
    }
}
