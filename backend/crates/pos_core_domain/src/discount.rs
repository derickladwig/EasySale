//! Discount application logic

use rust_decimal::Decimal;
use pos_core_models::{Discount, DiscountType, DomainError, DomainResult};

/// Trait for discount application
pub trait DiscountApplicator {
    /// Apply a discount to an amount
    fn apply_discount(&self, amount: Decimal, discount: &Discount) -> DomainResult<Decimal>;

    /// Calculate the discount amount (not the final price)
    fn calculate_discount_amount(
        &self,
        amount: Decimal,
        discount: &Discount,
    ) -> DomainResult<Decimal>;

    /// Apply multiple discounts (in order)
    fn apply_multiple_discounts(
        &self,
        amount: Decimal,
        discounts: &[Discount],
    ) -> DomainResult<Decimal>;
}

/// Default discount applicator implementation
#[derive(Debug, Clone, Default)]
pub struct DefaultDiscountApplicator {
    /// Whether to allow discounts that exceed the original amount
    pub allow_negative: bool,
}

impl DefaultDiscountApplicator {
    /// Create a new discount applicator
    #[must_use] 
    pub const fn new() -> Self {
        Self {
            allow_negative: false,
        }
    }

    /// Create a discount applicator that allows negative results
    #[must_use] 
    pub const fn allow_negative() -> Self {
        Self {
            allow_negative: true,
        }
    }
}

impl DiscountApplicator for DefaultDiscountApplicator {
    fn apply_discount(&self, amount: Decimal, discount: &Discount) -> DomainResult<Decimal> {
        if amount < Decimal::ZERO {
            return Err(DomainError::InvalidInput(
                "Amount cannot be negative".to_string(),
            ));
        }

        let discount_amount = self.calculate_discount_amount(amount, discount)?;
        let final_amount = amount - discount_amount;

        if !self.allow_negative && final_amount < Decimal::ZERO {
            return Err(DomainError::CalculationError(
                "Discount exceeds original amount".to_string(),
            ));
        }

        Ok(final_amount.max(Decimal::ZERO))
    }

    fn calculate_discount_amount(
        &self,
        amount: Decimal,
        discount: &Discount,
    ) -> DomainResult<Decimal> {
        if amount < Decimal::ZERO {
            return Err(DomainError::InvalidInput(
                "Amount cannot be negative".to_string(),
            ));
        }

        let discount_amount = match discount.discount_type {
            DiscountType::Percent => {
                // Percentage: amount × (discount / 100)
                amount * (discount.amount / Decimal::ONE_HUNDRED)
            }
            DiscountType::Fixed | DiscountType::FixedCart => {
                // Fixed amount
                discount.amount
            }
        };

        Ok(discount_amount.round_dp(2))
    }

    fn apply_multiple_discounts(
        &self,
        amount: Decimal,
        discounts: &[Discount],
    ) -> DomainResult<Decimal> {
        let mut current_amount = amount;

        for discount in discounts {
            current_amount = self.apply_discount(current_amount, discount)?;
        }

        Ok(current_amount)
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
    fn test_apply_percent_discount() {
        let applicator = DefaultDiscountApplicator::new();
        let discount = Discount::new(
            "SAVE10".to_string(),
            DiscountType::Percent,
            dec!(10.0),
        )
        .unwrap();

        let final_amount = applicator.apply_discount(dec!(100.00), &discount).unwrap();
        assert_eq!(final_amount, dec!(90.00));
    }

    #[test]
    fn test_apply_fixed_discount() {
        let applicator = DefaultDiscountApplicator::new();
        let discount = Discount::new(
            "SAVE5".to_string(),
            DiscountType::Fixed,
            dec!(5.00),
        )
        .unwrap();

        let final_amount = applicator.apply_discount(dec!(100.00), &discount).unwrap();
        assert_eq!(final_amount, dec!(95.00));
    }

    #[test]
    fn test_calculate_discount_amount_percent() {
        let applicator = DefaultDiscountApplicator::new();
        let discount = Discount::new(
            "SAVE10".to_string(),
            DiscountType::Percent,
            dec!(10.0),
        )
        .unwrap();

        let discount_amount = applicator
            .calculate_discount_amount(dec!(100.00), &discount)
            .unwrap();
        assert_eq!(discount_amount, dec!(10.00));
    }

    #[test]
    fn test_calculate_discount_amount_fixed() {
        let applicator = DefaultDiscountApplicator::new();
        let discount = Discount::new(
            "SAVE5".to_string(),
            DiscountType::Fixed,
            dec!(5.00),
        )
        .unwrap();

        let discount_amount = applicator
            .calculate_discount_amount(dec!(100.00), &discount)
            .unwrap();
        assert_eq!(discount_amount, dec!(5.00));
    }

    #[test]
    fn test_discount_exceeds_amount_error() {
        let applicator = DefaultDiscountApplicator::new();
        let discount = Discount::new(
            "SAVE200".to_string(),
            DiscountType::Fixed,
            dec!(200.00),
        )
        .unwrap();

        let result = applicator.apply_discount(dec!(100.00), &discount);
        assert!(result.is_err());
    }

    #[test]
    fn test_discount_exceeds_amount_allowed() {
        let applicator = DefaultDiscountApplicator::allow_negative();
        let discount = Discount::new(
            "SAVE200".to_string(),
            DiscountType::Fixed,
            dec!(200.00),
        )
        .unwrap();

        let final_amount = applicator.apply_discount(dec!(100.00), &discount).unwrap();
        assert_eq!(final_amount, Decimal::ZERO); // Clamped to zero
    }

    #[test]
    fn test_apply_multiple_discounts() {
        let applicator = DefaultDiscountApplicator::new();
        let discounts = vec![
            Discount::new("SAVE10".to_string(), DiscountType::Percent, dec!(10.0)).unwrap(),
            Discount::new("SAVE5".to_string(), DiscountType::Fixed, dec!(5.00)).unwrap(),
        ];

        let final_amount = applicator
            .apply_multiple_discounts(dec!(100.00), &discounts)
            .unwrap();
        // First: 100 - 10% = 90
        // Second: 90 - 5 = 85
        assert_eq!(final_amount, dec!(85.00));
    }

    #[test]
    fn test_negative_amount_error() {
        let applicator = DefaultDiscountApplicator::new();
        let discount = Discount::new(
            "SAVE10".to_string(),
            DiscountType::Percent,
            dec!(10.0),
        )
        .unwrap();

        let result = applicator.apply_discount(dec!(-100.00), &discount);
        assert!(result.is_err());
    }
}
