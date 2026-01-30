use crate::models::review::InvoiceExtraction;
use crate::models::validation::{
    FixAction, HardRule, SoftRule, SuggestedFix, ToleranceConfig, ValidationEngine,
    ValidationResult,
};
use chrono::Utc;
use regex::Regex;

/// Validation engine service
/// Requirements: 2.3, 2.4, 2.6
pub struct ValidationEngineService {
    engine: ValidationEngine,
}

impl ValidationEngineService {
    /// Create new validation engine service
    pub fn new(engine: ValidationEngine) -> Self {
        Self { engine }
    }

    /// Create with default rules
    pub fn with_defaults() -> Self {
        let engine = ValidationEngine {
            hard_rules: vec![
                HardRule::TotalMustParse,
                HardRule::DateMustParse,
                HardRule::DateNotFuture { max_days_ahead: 30 },
                HardRule::TotalsReconcile {
                    tolerance_percent: 1.0,
                },
                HardRule::CriticalFieldsPresent {
                    fields: vec![
                        "invoice_number".to_string(),
                        "invoice_date".to_string(),
                        "total".to_string(),
                    ],
                },
            ],
            soft_rules: vec![
                SoftRule::TaxMatchesExpected {
                    expected_rate: 0.05, // 5% GST
                    tolerance: 0.01,     // 1% tolerance
                },
            ],
            tolerance_config: ToleranceConfig::default(),
        };

        Self { engine }
    }

    /// Validate invoice extraction
    pub fn validate(&self, extraction: &InvoiceExtraction) -> ValidationResult {
        let mut result = ValidationResult::new();

        // Run hard rules
        for rule in &self.engine.hard_rules {
            self.apply_hard_rule(rule, extraction, &mut result);
        }

        // Run soft rules
        for rule in &self.engine.soft_rules {
            self.apply_soft_rule(rule, extraction, &mut result);
        }

        // Set must_review if there are hard flags
        if result.has_hard_flags() {
            result.must_review = true;
        }

        result
    }

    /// Apply hard rule
    fn apply_hard_rule(
        &self,
        rule: &HardRule,
        extraction: &InvoiceExtraction,
        result: &mut ValidationResult,
    ) {
        match rule {
            HardRule::TotalMustParse => {
                if extraction.total.is_none() {
                    result.add_hard_flag(
                        "TotalMustParse".to_string(),
                        "Total field could not be parsed as currency".to_string(),
                        Some("total".to_string()),
                    );
                    result.add_suggested_fix(SuggestedFix {
                        action: FixAction::EnterMissingField {
                            field: "total".to_string(),
                        },
                        description: "Enter the total amount manually".to_string(),
                        ui_hint: "Click the total field to enter value".to_string(),
                    });
                }
            }
            HardRule::DateMustParse => {
                if extraction.invoice_date.is_none() {
                    result.add_hard_flag(
                        "DateMustParse".to_string(),
                        "Invoice date could not be parsed".to_string(),
                        Some("invoice_date".to_string()),
                    );
                    result.add_suggested_fix(SuggestedFix {
                        action: FixAction::EnterMissingField {
                            field: "invoice_date".to_string(),
                        },
                        description: "Enter the invoice date manually".to_string(),
                        ui_hint: "Click the date field to enter value".to_string(),
                    });
                }
            }
            HardRule::DateNotFuture { max_days_ahead } => {
                if let Some(date_str) = &extraction.invoice_date {
                    if let Ok(date) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
                        let today = Utc::now().date_naive();
                        let max_date = today + chrono::Duration::days(*max_days_ahead as i64);

                        if date > max_date {
                            result.add_hard_flag(
                                "DateNotFuture".to_string(),
                                format!(
                                    "Invoice date {} is more than {} days in the future",
                                    date_str, max_days_ahead
                                ),
                                Some("invoice_date".to_string()),
                            );
                            result.add_suggested_fix(SuggestedFix {
                                action: FixAction::AdjustValue {
                                    field: "invoice_date".to_string(),
                                    suggested: today.to_string(),
                                },
                                description: "Adjust invoice date to today".to_string(),
                                ui_hint: "Click to use today's date".to_string(),
                            });
                        }
                    }
                }
            }
            HardRule::TotalsReconcile { tolerance_percent } => {
                if let (Some(subtotal), Some(tax), Some(total)) =
                    (extraction.subtotal, extraction.tax, extraction.total)
                {
                    let calculated_total = subtotal + tax;
                    let diff = (calculated_total - total).abs();
                    let tolerance = total * (tolerance_percent / 100.0);

                    if diff > tolerance {
                        result.add_hard_flag(
                            "TotalsReconcile".to_string(),
                            format!(
                                "Totals do not reconcile: subtotal ({}) + tax ({}) = {} but total is {}",
                                subtotal, tax, calculated_total, total
                            ),
                            Some("total".to_string()),
                        );
                        result.add_suggested_fix(SuggestedFix {
                            action: FixAction::AdjustValue {
                                field: "total".to_string(),
                                suggested: calculated_total.to_string(),
                            },
                            description: format!("Use calculated total: {}", calculated_total),
                            ui_hint: "Click to use calculated value".to_string(),
                        });
                    }
                }
            }
            HardRule::CriticalFieldsPresent { fields } => {
                for field in fields {
                    let is_present = match field.as_str() {
                        "invoice_number" => extraction.invoice_number.is_some(),
                        "invoice_date" => extraction.invoice_date.is_some(),
                        "vendor_name" => extraction.vendor_name.is_some(),
                        "total" => extraction.total.is_some(),
                        _ => true,
                    };

                    if !is_present {
                        result.add_hard_flag(
                            "CriticalFieldsPresent".to_string(),
                            format!("Critical field '{}' is missing", field),
                            Some(field.clone()),
                        );
                        result.add_suggested_fix(SuggestedFix {
                            action: FixAction::EnterMissingField {
                                field: field.clone(),
                            },
                            description: format!("Enter {} manually", field),
                            ui_hint: format!("Click the {} field to enter value", field),
                        });
                    }
                }
            }
        }
    }

    /// Apply soft rule
    fn apply_soft_rule(
        &self,
        rule: &SoftRule,
        extraction: &InvoiceExtraction,
        result: &mut ValidationResult,
    ) {
        match rule {
            SoftRule::TaxMatchesExpected {
                expected_rate,
                tolerance,
            } => {
                if let (Some(subtotal), Some(tax)) = (extraction.subtotal, extraction.tax) {
                    let expected_tax = subtotal * expected_rate;
                    let diff = (tax - expected_tax).abs();
                    let tolerance_amount = expected_tax * tolerance;

                    if diff > tolerance_amount {
                        result.add_soft_flag(
                            "TaxMatchesExpected".to_string(),
                            format!(
                                "Tax amount {} does not match expected {}% rate (expected: {})",
                                tax,
                                expected_rate * 100.0,
                                expected_tax
                            ),
                            Some("tax".to_string()),
                        );
                    }
                }
            }
            SoftRule::InvoiceNumberMatchesPattern { pattern } => {
                if let Some(invoice_number) = &extraction.invoice_number {
                    if let Ok(regex) = Regex::new(pattern) {
                        if !regex.is_match(invoice_number) {
                            result.add_soft_flag(
                                "InvoiceNumberMatchesPattern".to_string(),
                                format!(
                                    "Invoice number '{}' does not match expected pattern '{}'",
                                    invoice_number, pattern
                                ),
                                Some("invoice_number".to_string()),
                            );
                        }
                    }
                }
            }
            SoftRule::QuantitiesReasonable { min, max } => {
                for (i, line_item) in extraction.line_items.iter().enumerate() {
                    if line_item.quantity < *min || line_item.quantity > *max {
                        result.add_soft_flag(
                            "QuantitiesReasonable".to_string(),
                            format!(
                                "Line item {} quantity {} is outside reasonable range ({}-{})",
                                i + 1,
                                line_item.quantity,
                                min,
                                max
                            ),
                            Some(format!("line_items[{}].quantity", i)),
                        );
                    }
                }
            }
            SoftRule::PricesInRange { min, max } => {
                for (i, line_item) in extraction.line_items.iter().enumerate() {
                    if line_item.unit_price < *min || line_item.unit_price > *max {
                        result.add_soft_flag(
                            "PricesInRange".to_string(),
                            format!(
                                "Line item {} price {} is outside reasonable range ({}-{})",
                                i + 1,
                                line_item.unit_price,
                                min,
                                max
                            ),
                            Some(format!("line_items[{}].unit_price", i)),
                        );
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::review::LineItem;

    #[test]
    fn test_validation_engine_creation() {
        let service = ValidationEngineService::with_defaults();
        assert!(!service.engine.hard_rules.is_empty());
        assert!(!service.engine.soft_rules.is_empty());
    }

    #[test]
    fn test_total_must_parse() {
        let service = ValidationEngineService::with_defaults();

        let extraction = InvoiceExtraction {
            invoice_number: Some("INV-12345".to_string()),
            invoice_date: Some("2024-01-15".to_string()),
            vendor_name: Some("Acme Corp".to_string()),
            subtotal: Some(100.0),
            tax: Some(5.0),
            total: None, // Missing total
            line_items: vec![],
        };

        let result = service.validate(&extraction);
        assert!(result.has_hard_flags());
        assert!(result.must_review);
        assert!(result.flags.iter().any(|f| f.rule == "TotalMustParse"));
    }

    #[test]
    fn test_totals_reconcile() {
        let service = ValidationEngineService::with_defaults();

        let extraction = InvoiceExtraction {
            invoice_number: Some("INV-12345".to_string()),
            invoice_date: Some("2024-01-15".to_string()),
            vendor_name: Some("Acme Corp".to_string()),
            subtotal: Some(100.0),
            tax: Some(5.0),
            total: Some(110.0), // Wrong total (should be 105.0)
            line_items: vec![],
        };

        let result = service.validate(&extraction);
        assert!(result.has_hard_flags());
        assert!(result
            .flags
            .iter()
            .any(|f| f.rule == "TotalsReconcile"));
    }

    #[test]
    fn test_valid_invoice() {
        let service = ValidationEngineService::with_defaults();

        let extraction = InvoiceExtraction {
            invoice_number: Some("INV-12345".to_string()),
            invoice_date: Some("2024-01-15".to_string()),
            vendor_name: Some("Acme Corp".to_string()),
            subtotal: Some(100.0),
            tax: Some(5.0),
            total: Some(105.0), // Correct total
            line_items: vec![],
        };

        let result = service.validate(&extraction);
        assert!(!result.has_hard_flags());
        assert!(!result.must_review);
    }

    #[test]
    fn test_tax_matches_expected() {
        let service = ValidationEngineService::with_defaults();

        let extraction = InvoiceExtraction {
            invoice_number: Some("INV-12345".to_string()),
            invoice_date: Some("2024-01-15".to_string()),
            vendor_name: Some("Acme Corp".to_string()),
            subtotal: Some(100.0),
            tax: Some(10.0), // Wrong tax (expected 5.0 for 5% rate)
            total: Some(110.0),
            line_items: vec![],
        };

        let result = service.validate(&extraction);
        assert!(!result.has_hard_flags()); // Soft rule doesn't block
        assert!(result.has_flags());
        assert!(result
            .flags
            .iter()
            .any(|f| f.rule == "TaxMatchesExpected"));
    }
}
