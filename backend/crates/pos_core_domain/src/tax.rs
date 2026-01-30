//! Tax calculation logic

use rust_decimal::Decimal;
use pos_core_models::{TaxRate, DomainError, DomainResult};

/// Trait for tax calculation
pub trait TaxCalculator {
    /// Calculate tax amount from subtotal and tax rate
    fn calculate_tax(&self, subtotal: Decimal, tax_rate: &TaxRate) -> DomainResult<Decimal>;

    /// Calculate tax from multiple tax rates (compound or additive)
    fn calculate_multi_tax(
        &self,
        subtotal: Decimal,
        tax_rates: &[TaxRate],
    ) -> DomainResult<Decimal>;

    /// Validate that calculated tax matches expected tax
    fn validate_tax(
        &self,
        subtotal: Decimal,
        tax_rate: &TaxRate,
        expected_tax: Decimal,
    ) -> DomainResult<bool>;
}

/// Default tax calculator implementation
#[derive(Debug, Clone, Default)]
pub struct DefaultTaxCalculator {
    /// Tolerance for decimal comparison (e.g., 0.01 for penny rounding)
    pub tolerance: Decimal,
    /// Whether to use compound tax (tax on tax) or additive
    pub compound: bool,
}

impl DefaultTaxCalculator {
    /// Create a new tax calculator with default settings
    #[must_use] 
    pub fn new() -> Self {
        Self {
            tolerance: Decimal::new(1, 2), // 0.01
            compound: false,
        }
    }

    /// Create a tax calculator with custom tolerance
    #[must_use] 
    pub const fn with_tolerance(tolerance: Decimal) -> Self {
        Self {
            tolerance,
            compound: false,
        }
    }

    /// Create a tax calculator with compound tax enabled
    #[must_use] 
    pub fn with_compound(compound: bool) -> Self {
        Self {
            tolerance: Decimal::new(1, 2),
            compound,
        }
    }
}

impl TaxCalculator for DefaultTaxCalculator {
    fn calculate_tax(&self, subtotal: Decimal, tax_rate: &TaxRate) -> DomainResult<Decimal> {
        if subtotal < Decimal::ZERO {
            return Err(DomainError::InvalidInput(
                "Subtotal cannot be negative".to_string(),
            ));
        }

        // Tax = subtotal × (rate_percent / 100)
        let tax = subtotal * (tax_rate.rate_percent / Decimal::ONE_HUNDRED);

        // Round to 2 decimal places
        Ok(tax.round_dp(2))
    }

    fn calculate_multi_tax(
        &self,
        subtotal: Decimal,
        tax_rates: &[TaxRate],
    ) -> DomainResult<Decimal> {
        if tax_rates.is_empty() {
            return Ok(Decimal::ZERO);
        }

        if self.compound {
            // Compound tax: each tax is calculated on the previous total
            let mut total = subtotal;
            for rate in tax_rates {
                let tax = self.calculate_tax(total, rate)?;
                total += tax;
            }
            Ok(total - subtotal)
        } else {
            // Additive tax: all taxes calculated on original subtotal
            let mut total_tax = Decimal::ZERO;
            for rate in tax_rates {
                let tax = self.calculate_tax(subtotal, rate)?;
                total_tax += tax;
            }
            Ok(total_tax)
        }
    }

    fn validate_tax(
        &self,
        subtotal: Decimal,
        tax_rate: &TaxRate,
        expected_tax: Decimal,
    ) -> DomainResult<bool> {
        let calculated = self.calculate_tax(subtotal, tax_rate)?;
        let diff = (calculated - expected_tax).abs();
        Ok(diff <= self.tolerance)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_tax_rate_creation() {
        let rate = TaxRate::new("TAX".to_string(), dec!(8.5), "Sales Tax".to_string()).unwrap();
        assert_eq!(rate.rate_percent, dec!(8.5));
    }

    #[test]
    fn test_tax_rate_negative_error() {
        let result = TaxRate::new("TAX".to_string(), dec!(-1.0), "Invalid".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn test_tax_rate_over_100_error() {
        let result = TaxRate::new("TAX".to_string(), dec!(101.0), "Invalid".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn test_calculate_tax() {
        let calculator = DefaultTaxCalculator::new();
        let rate = TaxRate::new("TAX".to_string(), dec!(8.5), "Sales Tax".to_string()).unwrap();

        let tax = calculator.calculate_tax(dec!(100.00), &rate).unwrap();
        assert_eq!(tax, dec!(8.50));
    }

    #[test]
    fn test_calculate_tax_with_rounding() {
        let calculator = DefaultTaxCalculator::new();
        let rate = TaxRate::new("TAX".to_string(), dec!(8.875), "Sales Tax".to_string()).unwrap();

        let tax = calculator.calculate_tax(dec!(100.00), &rate).unwrap();
        assert_eq!(tax, dec!(8.88)); // Rounded to 2 decimal places
    }

    #[test]
    fn test_calculate_multi_tax_additive() {
        let calculator = DefaultTaxCalculator::new();
        let rates = vec![
            TaxRate::new("STATE".to_string(), dec!(5.0), "State Tax".to_string()).unwrap(),
            TaxRate::new("LOCAL".to_string(), dec!(2.5), "Local Tax".to_string()).unwrap(),
        ];

        let tax = calculator.calculate_multi_tax(dec!(100.00), &rates).unwrap();
        assert_eq!(tax, dec!(7.50)); // 5.00 + 2.50
    }

    #[test]
    fn test_calculate_multi_tax_compound() {
        let calculator = DefaultTaxCalculator::with_compound(true);
        let rates = vec![
            TaxRate::new("STATE".to_string(), dec!(5.0), "State Tax".to_string()).unwrap(),
            TaxRate::new("LOCAL".to_string(), dec!(2.5), "Local Tax".to_string()).unwrap(),
        ];

        let tax = calculator.calculate_multi_tax(dec!(100.00), &rates).unwrap();
        // First: 100 * 5% = 5.00, total = 105.00
        // Second: 105 * 2.5% = 2.625 rounded to 2.62, total = 107.62
        // Tax = 107.62 - 100.00 = 7.62
        assert_eq!(tax, dec!(7.62));
    }

    #[test]
    fn test_validate_tax() {
        let calculator = DefaultTaxCalculator::new();
        let rate = TaxRate::new("TAX".to_string(), dec!(8.5), "Sales Tax".to_string()).unwrap();

        // Exact match
        assert!(calculator.validate_tax(dec!(100.00), &rate, dec!(8.50)).unwrap());

        // Within tolerance
        assert!(calculator.validate_tax(dec!(100.00), &rate, dec!(8.51)).unwrap());

        // Outside tolerance
        assert!(!calculator.validate_tax(dec!(100.00), &rate, dec!(9.00)).unwrap());
    }

    #[test]
    fn test_negative_subtotal_error() {
        let calculator = DefaultTaxCalculator::new();
        let rate = TaxRate::new("TAX".to_string(), dec!(8.5), "Sales Tax".to_string()).unwrap();

        let result = calculator.calculate_tax(dec!(-100.00), &rate);
        assert!(result.is_err());
    }
}
