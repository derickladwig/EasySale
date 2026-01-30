//! Tax types and models

use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use crate::errors::{DomainError, DomainResult};

/// Tax rate configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxRate {
    pub rate_code: String,
    pub rate_percent: Decimal,
    pub label: String,
}

impl TaxRate {
    /// Create a new tax rate
    pub fn new(rate_code: String, rate_percent: Decimal, label: String) -> DomainResult<Self> {
        if rate_percent < Decimal::ZERO {
            return Err(DomainError::InvalidInput(
                "Tax rate cannot be negative".to_string(),
            ));
        }

        if rate_percent > Decimal::ONE_HUNDRED {
            return Err(DomainError::InvalidInput(
                "Tax rate cannot exceed 100%".to_string(),
            ));
        }

        Ok(Self {
            rate_code,
            rate_percent,
            label,
        })
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
        assert_eq!(rate.rate_code, "TAX");
        assert_eq!(rate.label, "Sales Tax");
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
}
