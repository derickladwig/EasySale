//! Transaction management and finalization logic

use chrono::Utc;
use rust_decimal::Decimal;

use pos_core_models::{
    Transaction, TransactionStatus, PricingEngine,
    DomainError, DomainResult,
};
use crate::tax::TaxCalculator;
use crate::discount::DiscountApplicator;

/// Trait for transaction finalization
pub trait TransactionFinalizer {
    /// Finalize a transaction, calculating all totals and marking it as complete
    fn finalize_transaction(&self, transaction: &mut Transaction) -> DomainResult<()>;

    /// Validate that a transaction's totals are correct
    fn validate_transaction(&self, transaction: &Transaction) -> DomainResult<bool>;
}

/// Default transaction finalizer implementation
#[derive(Debug, Clone)]
pub struct DefaultTransactionFinalizer<P, T, D>
where
    P: PricingEngine,
    T: TaxCalculator,
    D: DiscountApplicator,
{
    pricing_engine: P,
    tax_calculator: T,
    discount_applicator: D,
}

impl<P, T, D> DefaultTransactionFinalizer<P, T, D>
where
    P: PricingEngine,
    T: TaxCalculator,
    D: DiscountApplicator,
{
    /// Create a new transaction finalizer with custom engines
    pub const fn new(pricing_engine: P, tax_calculator: T, discount_applicator: D) -> Self {
        Self {
            pricing_engine,
            tax_calculator,
            discount_applicator,
        }
    }
}

impl<P, T, D> TransactionFinalizer for DefaultTransactionFinalizer<P, T, D>
where
    P: PricingEngine,
    T: TaxCalculator,
    D: DiscountApplicator,
{
    fn finalize_transaction(&self, transaction: &mut Transaction) -> DomainResult<()> {
        // Check if already finalized
        if transaction.status == TransactionStatus::Finalized {
            return Err(DomainError::InvalidState(
                "Transaction is already finalized".to_string(),
            ));
        }

        // Check if voided
        if transaction.status == TransactionStatus::Voided {
            return Err(DomainError::InvalidState(
                "Cannot finalize voided transaction".to_string(),
            ));
        }

        // Validate that we have items
        if transaction.items.is_empty() {
            return Err(DomainError::ValidationError(
                "Cannot finalize transaction with no items".to_string(),
            ));
        }

        // Calculate subtotal
        let subtotal = self.pricing_engine.calculate_subtotal(&transaction.items)?;
        transaction.subtotal = subtotal;

        // Apply discounts to subtotal
        let discounted_subtotal = self
            .discount_applicator
            .apply_multiple_discounts(subtotal, &transaction.discounts)?;
        
        // Calculate discount total
        transaction.discount_total = subtotal - discounted_subtotal;

        // Calculate tax on discounted subtotal
        let tax = self
            .tax_calculator
            .calculate_multi_tax(discounted_subtotal, &transaction.tax_rates)?;
        transaction.tax = tax;

        // Calculate final total
        transaction.total = discounted_subtotal + tax;

        // Mark as finalized
        transaction.status = TransactionStatus::Finalized;
        transaction.finalized_at = Some(Utc::now());

        Ok(())
    }

    fn validate_transaction(&self, transaction: &Transaction) -> DomainResult<bool> {
        // Validate subtotal
        let calculated_subtotal = self.pricing_engine.calculate_subtotal(&transaction.items)?;
        if !self
            .pricing_engine
            .validate_subtotal(&transaction.items, transaction.subtotal)?
        {
            return Ok(false);
        }

        // Validate discount
        let discounted_subtotal = self
            .discount_applicator
            .apply_multiple_discounts(calculated_subtotal, &transaction.discounts)?;
        let calculated_discount = calculated_subtotal - discounted_subtotal;
        if (calculated_discount - transaction.discount_total).abs() > Decimal::new(1, 2) {
            return Ok(false);
        }

        // Validate tax
        let calculated_tax = self
            .tax_calculator
            .calculate_multi_tax(discounted_subtotal, &transaction.tax_rates)?;
        if (calculated_tax - transaction.tax).abs() > Decimal::new(1, 2) {
            return Ok(false);
        }

        // Validate total
        let calculated_total = discounted_subtotal + calculated_tax;
        if (calculated_total - transaction.total).abs() > Decimal::new(1, 2) {
            return Ok(false);
        }

        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pricing::DefaultPricingEngine;
    use crate::tax::DefaultTaxCalculator;
    use crate::discount::DefaultDiscountApplicator;
    use pos_core_models::{DiscountType, LineItem, TaxRate, Discount};
    use rust_decimal_macros::dec;

    #[test]
    fn test_finalize_transaction() {
        let mut transaction = Transaction::new();
        
        // Add items
        transaction
            .add_item(LineItem::new("PROD-001".to_string(), dec!(2.0), dec!(10.00)))
            .unwrap();
        transaction
            .add_item(LineItem::new("PROD-002".to_string(), dec!(1.0), dec!(5.50)))
            .unwrap();

        // Add tax rate
        transaction
            .add_tax_rate(TaxRate::new("TAX".to_string(), dec!(8.5), "Sales Tax".to_string()).unwrap())
            .unwrap();

        // Create finalizer
        let finalizer = DefaultTransactionFinalizer::new(
            DefaultPricingEngine::new(),
            DefaultTaxCalculator::new(),
            DefaultDiscountApplicator::new(),
        );

        // Finalize
        let result = finalizer.finalize_transaction(&mut transaction);
        assert!(result.is_ok());

        // Check status
        assert_eq!(transaction.status, TransactionStatus::Finalized);
        assert!(transaction.finalized_at.is_some());

        // Check calculations
        assert_eq!(transaction.subtotal, dec!(25.50)); // 20.00 + 5.50
        assert_eq!(transaction.tax, dec!(2.17)); // 25.50 * 8.5% = 2.1675 rounded to 2.17
        assert_eq!(transaction.total, dec!(27.67)); // 25.50 + 2.17
    }

    #[test]
    fn test_finalize_with_discount() {
        let mut transaction = Transaction::new();
        
        // Add items
        transaction
            .add_item(LineItem::new("PROD-001".to_string(), dec!(1.0), dec!(100.00)))
            .unwrap();

        // Add discount
        transaction
            .add_discount(Discount::new("SAVE10".to_string(), DiscountType::Percent, dec!(10.0)).unwrap())
            .unwrap();

        // Add tax rate
        transaction
            .add_tax_rate(TaxRate::new("TAX".to_string(), dec!(8.5), "Sales Tax".to_string()).unwrap())
            .unwrap();

        // Create finalizer
        let finalizer = DefaultTransactionFinalizer::new(
            DefaultPricingEngine::new(),
            DefaultTaxCalculator::new(),
            DefaultDiscountApplicator::new(),
        );

        // Finalize
        finalizer.finalize_transaction(&mut transaction).unwrap();

        // Check calculations
        assert_eq!(transaction.subtotal, dec!(100.00));
        assert_eq!(transaction.discount_total, dec!(10.00)); // 10% of 100
        assert_eq!(transaction.tax, dec!(7.65)); // 90.00 * 8.5% = 7.65
        assert_eq!(transaction.total, dec!(97.65)); // 90.00 + 7.65
    }

    #[test]
    fn test_cannot_finalize_empty_transaction() {
        let mut transaction = Transaction::new();

        let finalizer = DefaultTransactionFinalizer::new(
            DefaultPricingEngine::new(),
            DefaultTaxCalculator::new(),
            DefaultDiscountApplicator::new(),
        );

        let result = finalizer.finalize_transaction(&mut transaction);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), DomainError::ValidationError(_)));
    }

    #[test]
    fn test_cannot_finalize_twice() {
        let mut transaction = Transaction::new();
        transaction
            .add_item(LineItem::new("PROD-001".to_string(), dec!(1.0), dec!(10.00)))
            .unwrap();

        let finalizer = DefaultTransactionFinalizer::new(
            DefaultPricingEngine::new(),
            DefaultTaxCalculator::new(),
            DefaultDiscountApplicator::new(),
        );

        // First finalization
        finalizer.finalize_transaction(&mut transaction).unwrap();

        // Second finalization should fail
        let result = finalizer.finalize_transaction(&mut transaction);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), DomainError::InvalidState(_)));
    }

    #[test]
    fn test_validate_transaction() {
        let mut transaction = Transaction::new();
        transaction
            .add_item(LineItem::new("PROD-001".to_string(), dec!(2.0), dec!(10.00)))
            .unwrap();
        transaction
            .add_tax_rate(TaxRate::new("TAX".to_string(), dec!(8.5), "Sales Tax".to_string()).unwrap())
            .unwrap();

        let finalizer = DefaultTransactionFinalizer::new(
            DefaultPricingEngine::new(),
            DefaultTaxCalculator::new(),
            DefaultDiscountApplicator::new(),
        );

        // Finalize
        finalizer.finalize_transaction(&mut transaction).unwrap();

        // Validate
        let is_valid = finalizer.validate_transaction(&transaction).unwrap();
        assert!(is_valid);
    }
}
