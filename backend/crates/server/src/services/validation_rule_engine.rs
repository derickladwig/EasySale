// Validation Rule Engine
// Implements hard and soft validation rules for invoice OCR results

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ValidationError {
    #[error("Rule evaluation failed: {0}")]
    EvaluationError(String),
    
    #[error("Configuration error: {0}")]
    ConfigError(String),
    
    #[error("Invalid rule type: {0}")]
    InvalidRuleType(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RuleType {
    TotalMath,
    DateRange,
    RequiredField,
    FormatValidation,
    CrossFieldCheck,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Severity {
    Hard,  // Blocks approval
    Soft,  // Warns only
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationRule {
    pub rule_id: String,
    pub rule_type: RuleType,
    pub severity: Severity,
    pub message: String,
    pub penalty: u8,  // Confidence penalty (0-100)
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub passed: bool,
    pub rule_id: String,
    pub rule_type: RuleType,
    pub severity: Severity,
    pub message: String,
    pub penalty: u8,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationReport {
    pub overall_passed: bool,
    pub hard_failures: Vec<ValidationResult>,
    pub soft_failures: Vec<ValidationResult>,
    pub total_penalty: u8,
    pub blocking_reasons: Vec<String>,
    pub warnings: Vec<String>,
}

pub struct ValidationRuleEngine {
    hard_rules: Vec<ValidationRule>,
    soft_rules: Vec<ValidationRule>,
}

impl ValidationRuleEngine {
    pub fn new(rules: Vec<ValidationRule>) -> Self {
        let (hard_rules, soft_rules): (Vec<_>, Vec<_>) = rules
            .into_iter()
            .filter(|r| r.enabled)
            .partition(|r| r.severity == Severity::Hard);
        
        Self {
            hard_rules,
            soft_rules,
        }
    }
    
    pub fn validate(&self, context: &ValidationContext) -> Result<ValidationReport, ValidationError> {
        let mut hard_failures = Vec::new();
        let mut soft_failures = Vec::new();
        let mut total_penalty = 0u8;
        
        // Evaluate hard rules
        for rule in &self.hard_rules {
            if let Some(result) = self.evaluate_rule(rule, context)? {
                if !result.passed {
                    total_penalty = total_penalty.saturating_add(result.penalty);
                    hard_failures.push(result);
                }
            }
        }
        
        // Evaluate soft rules
        for rule in &self.soft_rules {
            if let Some(result) = self.evaluate_rule(rule, context)? {
                if !result.passed {
                    total_penalty = total_penalty.saturating_add(result.penalty);
                    soft_failures.push(result);
                }
            }
        }
        
        let overall_passed = hard_failures.is_empty();
        let blocking_reasons = hard_failures.iter()
            .map(|r| r.message.clone())
            .collect();
        let warnings = soft_failures.iter()
            .map(|r| r.message.clone())
            .collect();
        
        Ok(ValidationReport {
            overall_passed,
            hard_failures,
            soft_failures,
            total_penalty,
            blocking_reasons,
            warnings,
        })
    }
    
    fn evaluate_rule(&self, rule: &ValidationRule, context: &ValidationContext) -> Result<Option<ValidationResult>, ValidationError> {
        let passed = match rule.rule_type {
            RuleType::TotalMath => self.validate_total_math(context),
            RuleType::DateRange => self.validate_date_range(context),
            RuleType::RequiredField => self.validate_required_field(context),
            RuleType::FormatValidation => self.validate_format(context),
            RuleType::CrossFieldCheck => self.validate_cross_field(context),
        }?;
        
        Ok(Some(ValidationResult {
            passed,
            rule_id: rule.rule_id.clone(),
            rule_type: rule.rule_type.clone(),
            severity: rule.severity.clone(),
            message: rule.message.clone(),
            penalty: if passed { 0 } else { rule.penalty },
            details: None,
        }))
    }
    
    fn validate_total_math(&self, context: &ValidationContext) -> Result<bool, ValidationError> {
        let subtotal = context.fields.get("subtotal")
            .and_then(|v| v.parse::<f64>().ok());
        let tax = context.fields.get("tax")
            .and_then(|v| v.parse::<f64>().ok());
        let total = context.fields.get("total")
            .and_then(|v| v.parse::<f64>().ok());
        
        match (subtotal, tax, total) {
            (Some(sub), Some(t), Some(tot)) => {
                let expected = sub + t;
                let diff = (tot - expected).abs();
                Ok(diff <= 0.02) // ±$0.02 tolerance
            }
            _ => Ok(true), // Skip if fields missing
        }
    }
    
    fn validate_date_range(&self, context: &ValidationContext) -> Result<bool, ValidationError> {
        if let Some(date_str) = context.fields.get("invoice_date") {
            // Try parsing common date formats
            if let Ok(date) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
                let now = Utc::now().date_naive();
                return Ok(date <= now); // Date not in future
            }
            if let Ok(date) = chrono::NaiveDate::parse_from_str(date_str, "%m/%d/%Y") {
                let now = Utc::now().date_naive();
                return Ok(date <= now);
            }
        }
        Ok(true) // Skip if can't parse
    }
    
    fn validate_required_field(&self, context: &ValidationContext) -> Result<bool, ValidationError> {
        let required_fields = vec!["invoice_number", "invoice_date", "vendor_name", "total"];
        
        for field in required_fields {
            if !context.fields.contains_key(field) || context.fields.get(field).map(|v| v.is_empty()).unwrap_or(true) {
                return Ok(false);
            }
        }
        
        Ok(true)
    }
    
    fn validate_format(&self, context: &ValidationContext) -> Result<bool, ValidationError> {
        // Validate invoice number format (alphanumeric, dashes, underscores)
        if let Some(inv_num) = context.fields.get("invoice_number") {
            let valid = inv_num.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_');
            if !valid {
                return Ok(false);
            }
        }
        
        // Validate total is a valid number
        if let Some(total) = context.fields.get("total") {
            if total.parse::<f64>().is_err() {
                return Ok(false);
            }
        }
        
        Ok(true)
    }
    
    fn validate_cross_field(&self, context: &ValidationContext) -> Result<bool, ValidationError> {
        // Vendor name should be present if invoice number is present
        let has_invoice = context.fields.contains_key("invoice_number");
        let has_vendor = context.fields.contains_key("vendor_name") 
            && !context.fields.get("vendor_name").map(|v| v.is_empty()).unwrap_or(true);
        
        if has_invoice && !has_vendor {
            return Ok(false);
        }
        
        Ok(true)
    }
    
    pub fn add_rule(&mut self, rule: ValidationRule) {
        if !rule.enabled {
            return;
        }
        
        match rule.severity {
            Severity::Hard => self.hard_rules.push(rule),
            Severity::Soft => self.soft_rules.push(rule),
        }
    }
    
    pub fn remove_rule(&mut self, rule_id: &str) {
        self.hard_rules.retain(|r| r.rule_id != rule_id);
        self.soft_rules.retain(|r| r.rule_id != rule_id);
    }
    
    pub fn get_rule(&self, rule_id: &str) -> Option<&ValidationRule> {
        self.hard_rules.iter()
            .chain(self.soft_rules.iter())
            .find(|r| r.rule_id == rule_id)
    }
    
    pub fn list_rules(&self) -> Vec<&ValidationRule> {
        self.hard_rules.iter()
            .chain(self.soft_rules.iter())
            .collect()
    }
}

#[derive(Debug, Clone)]
pub struct ValidationContext {
    pub fields: HashMap<String, String>,
    pub vendor_id: Option<String>,
    pub document_type: String,
}

impl ValidationContext {
    pub fn new() -> Self {
        Self {
            fields: HashMap::new(),
            vendor_id: None,
            document_type: "invoice".to_string(),
        }
    }
    
    pub fn with_fields(mut self, fields: HashMap<String, String>) -> Self {
        self.fields = fields;
        self
    }
    
    pub fn with_vendor(mut self, vendor_id: String) -> Self {
        self.vendor_id = Some(vendor_id);
        self
    }
}

impl Default for ValidationContext {
    fn default() -> Self {
        Self::new()
    }
}

// Default rules
impl ValidationRuleEngine {
    pub fn with_defaults() -> Self {
        let rules = vec![
            ValidationRule {
                rule_id: "total_math".to_string(),
                rule_type: RuleType::TotalMath,
                severity: Severity::Hard,
                message: "Total must equal Subtotal + Tax (±$0.02)".to_string(),
                penalty: 50,
                enabled: true,
            },
            ValidationRule {
                rule_id: "date_not_future".to_string(),
                rule_type: RuleType::DateRange,
                severity: Severity::Hard,
                message: "Invoice date cannot be in the future".to_string(),
                penalty: 30,
                enabled: true,
            },
            ValidationRule {
                rule_id: "required_fields".to_string(),
                rule_type: RuleType::RequiredField,
                severity: Severity::Hard,
                message: "Required fields missing: invoice_number, invoice_date, vendor_name, total".to_string(),
                penalty: 100,
                enabled: true,
            },
            ValidationRule {
                rule_id: "format_validation".to_string(),
                rule_type: RuleType::FormatValidation,
                severity: Severity::Soft,
                message: "Field format validation failed".to_string(),
                penalty: 10,
                enabled: true,
            },
            ValidationRule {
                rule_id: "cross_field_check".to_string(),
                rule_type: RuleType::CrossFieldCheck,
                severity: Severity::Soft,
                message: "Cross-field validation failed".to_string(),
                penalty: 15,
                enabled: true,
            },
        ];
        
        Self::new(rules)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_validation_engine_creation() {
        let engine = ValidationRuleEngine::with_defaults();
        assert_eq!(engine.hard_rules.len(), 3);
        assert_eq!(engine.soft_rules.len(), 2);
    }
    
    #[test]
    fn test_total_math_validation_pass() {
        let engine = ValidationRuleEngine::with_defaults();
        let mut fields = HashMap::new();
        fields.insert("subtotal".to_string(), "100.00".to_string());
        fields.insert("tax".to_string(), "10.00".to_string());
        fields.insert("total".to_string(), "110.00".to_string());
        fields.insert("invoice_number".to_string(), "INV-001".to_string());
        fields.insert("invoice_date".to_string(), "2026-01-20".to_string());
        fields.insert("vendor_name".to_string(), "Acme Corp".to_string());
        
        let context = ValidationContext::new().with_fields(fields);
        let result = engine.validate(&context).unwrap();
        
        assert!(result.overall_passed);
        assert_eq!(result.hard_failures.len(), 0);
    }
    
    #[test]
    fn test_total_math_validation_fail() {
        let engine = ValidationRuleEngine::with_defaults();
        let mut fields = HashMap::new();
        fields.insert("subtotal".to_string(), "100.00".to_string());
        fields.insert("tax".to_string(), "10.00".to_string());
        fields.insert("total".to_string(), "115.00".to_string()); // Wrong total
        fields.insert("invoice_number".to_string(), "INV-001".to_string());
        fields.insert("invoice_date".to_string(), "2026-01-20".to_string());
        fields.insert("vendor_name".to_string(), "Acme Corp".to_string());
        
        let context = ValidationContext::new().with_fields(fields);
        let result = engine.validate(&context).unwrap();
        
        assert!(!result.overall_passed);
        assert_eq!(result.hard_failures.len(), 1);
        assert_eq!(result.hard_failures[0].rule_type, RuleType::TotalMath);
    }
    
    #[test]
    fn test_date_validation_future() {
        let engine = ValidationRuleEngine::with_defaults();
        let mut fields = HashMap::new();
        fields.insert("invoice_date".to_string(), "2030-01-01".to_string()); // Future date
        fields.insert("invoice_number".to_string(), "INV-001".to_string());
        fields.insert("vendor_name".to_string(), "Acme Corp".to_string());
        fields.insert("total".to_string(), "100.00".to_string());
        
        let context = ValidationContext::new().with_fields(fields);
        let result = engine.validate(&context).unwrap();
        
        assert!(!result.overall_passed);
        assert!(result.hard_failures.iter().any(|f| f.rule_type == RuleType::DateRange));
    }
    
    #[test]
    fn test_required_fields_missing() {
        let engine = ValidationRuleEngine::with_defaults();
        let mut fields = HashMap::new();
        fields.insert("invoice_number".to_string(), "INV-001".to_string());
        // Missing other required fields
        
        let context = ValidationContext::new().with_fields(fields);
        let result = engine.validate(&context).unwrap();
        
        assert!(!result.overall_passed);
        assert!(result.hard_failures.iter().any(|f| f.rule_type == RuleType::RequiredField));
    }
    
    #[test]
    fn test_soft_rule_warning() {
        let engine = ValidationRuleEngine::with_defaults();
        let mut fields = HashMap::new();
        fields.insert("invoice_number".to_string(), "INV@@@001".to_string()); // Invalid format
        fields.insert("invoice_date".to_string(), "2026-01-20".to_string());
        fields.insert("vendor_name".to_string(), "Acme Corp".to_string());
        fields.insert("total".to_string(), "100.00".to_string());
        
        let context = ValidationContext::new().with_fields(fields);
        let result = engine.validate(&context).unwrap();
        
        assert!(result.overall_passed); // Soft rules don't block
        assert_eq!(result.soft_failures.len(), 1);
        assert!(result.total_penalty > 0);
    }
    
    #[test]
    fn test_add_remove_rule() {
        let mut engine = ValidationRuleEngine::with_defaults();
        let initial_count = engine.list_rules().len();
        
        let new_rule = ValidationRule {
            rule_id: "custom_rule".to_string(),
            rule_type: RuleType::FormatValidation,
            severity: Severity::Soft,
            message: "Custom validation".to_string(),
            penalty: 5,
            enabled: true,
        };
        
        engine.add_rule(new_rule);
        assert_eq!(engine.list_rules().len(), initial_count + 1);
        
        engine.remove_rule("custom_rule");
        assert_eq!(engine.list_rules().len(), initial_count);
    }
    
    #[test]
    fn test_penalty_accumulation() {
        let engine = ValidationRuleEngine::with_defaults();
        let mut fields = HashMap::new();
        fields.insert("invoice_number".to_string(), "INV@@@001".to_string()); // Format issue
        fields.insert("invoice_date".to_string(), "2026-01-20".to_string());
        fields.insert("vendor_name".to_string(), "".to_string()); // Empty vendor
        fields.insert("total".to_string(), "100.00".to_string());
        
        let context = ValidationContext::new().with_fields(fields);
        let result = engine.validate(&context).unwrap();
        
        assert!(result.total_penalty > 0);
        assert_eq!(result.soft_failures.len(), 2); // Format + cross-field
    }
}
