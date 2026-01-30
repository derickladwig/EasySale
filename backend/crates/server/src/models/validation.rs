use serde::{Deserialize, Serialize};

/// Validation engine configuration
/// Requirements: 2.3, 2.4
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationEngine {
    pub hard_rules: Vec<HardRule>,
    pub soft_rules: Vec<SoftRule>,
    pub tolerance_config: ToleranceConfig,
}

/// Hard rules that block approval
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HardRule {
    TotalMustParse,
    DateMustParse,
    DateNotFuture { max_days_ahead: u32 },
    TotalsReconcile { tolerance_percent: f64 },
    CriticalFieldsPresent { fields: Vec<String> },
}

/// Soft rules that reduce confidence
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SoftRule {
    TaxMatchesExpected { expected_rate: f64, tolerance: f64 },
    InvoiceNumberMatchesPattern { pattern: String },
    QuantitiesReasonable { min: f64, max: f64 },
    PricesInRange { min: f64, max: f64 },
}

/// Tolerance configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToleranceConfig {
    pub totals_tolerance_percent: f64,
    pub tax_tolerance_percent: f64,
    pub quantity_tolerance_percent: f64,
    pub price_tolerance_percent: f64,
}

impl Default for ToleranceConfig {
    fn default() -> Self {
        Self {
            totals_tolerance_percent: 1.0,  // 1% tolerance
            tax_tolerance_percent: 5.0,     // 5% tolerance
            quantity_tolerance_percent: 2.0, // 2% tolerance
            price_tolerance_percent: 5.0,   // 5% tolerance
        }
    }
}

/// Validation result
/// Requirements: 2.6
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub passed: bool,
    pub must_review: bool,
    pub flags: Vec<ValidationFlag>,
    pub suggested_fixes: Vec<SuggestedFix>,
    pub confidence_impact: i8,
}

/// Validation flag
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationFlag {
    pub rule: String,
    pub severity: FlagSeverity,
    pub message: String,
    pub field: Option<String>,
}

/// Flag severity
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum FlagSeverity {
    Hard, // Blocks approval
    Soft, // Reduces confidence
}

/// Suggested fix action
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuggestedFix {
    pub action: FixAction,
    pub description: String,
    pub ui_hint: String,
}

/// Fix action type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FixAction {
    RotatePage,
    RerunOcrRegion { region: BoundingBox },
    SelectVendor,
    EnterMissingField { field: String },
    AdjustValue { field: String, suggested: String },
}

/// Bounding box for region
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundingBox {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

impl ValidationResult {
    /// Create new validation result
    pub fn new() -> Self {
        Self {
            passed: true,
            must_review: false,
            flags: vec![],
            suggested_fixes: vec![],
            confidence_impact: 0,
        }
    }
    
    /// Add hard flag (blocks approval)
    pub fn add_hard_flag(&mut self, rule: String, message: String, field: Option<String>) {
        self.flags.push(ValidationFlag {
            rule,
            severity: FlagSeverity::Hard,
            message,
            field,
        });
        self.passed = false;
        self.must_review = true;
        self.confidence_impact -= 20; // Hard flags reduce confidence significantly
    }
    
    /// Add soft flag (reduces confidence)
    pub fn add_soft_flag(&mut self, rule: String, message: String, field: Option<String>) {
        self.flags.push(ValidationFlag {
            rule,
            severity: FlagSeverity::Soft,
            message,
            field,
        });
        self.confidence_impact -= 5; // Soft flags reduce confidence slightly
    }
    
    /// Add suggested fix
    pub fn add_suggested_fix(&mut self, fix: SuggestedFix) {
        self.suggested_fixes.push(fix);
    }
    
    /// Check if has hard flags
    pub fn has_hard_flags(&self) -> bool {
        self.flags.iter().any(|f| f.severity == FlagSeverity::Hard)
    }
    
    /// Check if has any flags
    pub fn has_flags(&self) -> bool {
        !self.flags.is_empty()
    }
}

impl Default for ValidationResult {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validation_result_creation() {
        let result = ValidationResult::new();
        assert!(result.passed);
        assert!(!result.must_review);
        assert!(result.flags.is_empty());
        assert_eq!(result.confidence_impact, 0);
    }

    #[test]
    fn test_add_hard_flag() {
        let mut result = ValidationResult::new();
        result.add_hard_flag(
            "TotalMustParse".to_string(),
            "Total field could not be parsed as currency".to_string(),
            Some("total".to_string()),
        );
        
        assert!(!result.passed);
        assert!(result.must_review);
        assert_eq!(result.flags.len(), 1);
        assert_eq!(result.flags[0].severity, FlagSeverity::Hard);
        assert_eq!(result.confidence_impact, -20);
    }

    #[test]
    fn test_add_soft_flag() {
        let mut result = ValidationResult::new();
        result.add_soft_flag(
            "TaxMatchesExpected".to_string(),
            "Tax rate does not match expected 5%".to_string(),
            Some("tax".to_string()),
        );
        
        assert!(result.passed); // Soft flags don't fail validation
        assert!(!result.must_review);
        assert_eq!(result.flags.len(), 1);
        assert_eq!(result.flags[0].severity, FlagSeverity::Soft);
        assert_eq!(result.confidence_impact, -5);
    }

    #[test]
    fn test_has_hard_flags() {
        let mut result = ValidationResult::new();
        assert!(!result.has_hard_flags());
        
        result.add_soft_flag("test".to_string(), "test".to_string(), None);
        assert!(!result.has_hard_flags());
        
        result.add_hard_flag("test".to_string(), "test".to_string(), None);
        assert!(result.has_hard_flags());
    }

    #[test]
    fn test_tolerance_config_default() {
        let config = ToleranceConfig::default();
        assert_eq!(config.totals_tolerance_percent, 1.0);
        assert_eq!(config.tax_tolerance_percent, 5.0);
    }
}
