//! Discount types and models

use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use crate::errors::{DomainError, DomainResult};

/// Discount type
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DiscountType {
    /// Percentage discount (e.g., 10% off)
    Percent,
    /// Fixed amount discount (e.g., $5 off)
    Fixed,
    /// Fixed cart discount (applied to entire cart)
    FixedCart,
}

/// Discount configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Discount {
    pub code: String,
    pub discount_type: DiscountType,
    pub amount: Decimal,
    pub description: Option<String>,
}

impl Discount {
    /// Create a new discount
    pub fn new(
        code: String,
        discount_type: DiscountType,
        amount: Decimal,
    ) -> DomainResult<Self> {
        if amount < Decimal::ZERO {
            return Err(DomainError::InvalidInput(
                "Discount amount cannot be negative".to_string(),
            ));
        }

        if discount_type == DiscountType::Percent && amount > Decimal::ONE_HUNDRED {
            return Err(DomainError::InvalidInput(
                "Percentage discount cannot exceed 100%".to_string(),
            ));
        }

        Ok(Self {
            code,
            discount_type,
            amount,
            description: None,
        })
    }

    /// Create a discount with description
    #[must_use] 
    pub fn with_description(mut self, description: String) -> Self {
        self.description = Some(description);
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_discount_creation() {
        let discount = Discount::new(
            "SAVE10".to_string(),
            DiscountType::Percent,
            dec!(10.0),
        )
        .unwrap();
        assert_eq!(discount.amount, dec!(10.0));
        assert_eq!(discount.code, "SAVE10");
    }

    #[test]
    fn test_discount_negative_error() {
        let result = Discount::new(
            "INVALID".to_string(),
            DiscountType::Percent,
            dec!(-10.0),
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_discount_over_100_percent_error() {
        let result = Discount::new(
            "INVALID".to_string(),
            DiscountType::Percent,
            dec!(101.0),
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_discount_with_description() {
        let discount = Discount::new(
            "SAVE10".to_string(),
            DiscountType::Percent,
            dec!(10.0),
        )
        .unwrap()
        .with_description("10% off sale".to_string());
        
        assert_eq!(discount.description, Some("10% off sale".to_string()));
    }
}
