//! Transaction types and models

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::discount::Discount;
use crate::errors::{DomainError, DomainResult};
use crate::pricing::LineItem;
use crate::tax::TaxRate;

/// Transaction status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TransactionStatus {
    /// Transaction is being built (not yet finalized)
    Draft,
    /// Transaction has been finalized and cannot be modified
    Finalized,
    /// Transaction has been voided/cancelled
    Voided,
}

/// Payment method information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payment {
    pub method: String, // "cash", "card", "check", "on_account", etc.
    pub amount: Decimal,
}

/// Complete transaction with all calculated totals
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: Uuid,
    pub items: Vec<LineItem>,
    pub tax_rates: Vec<TaxRate>,
    pub discounts: Vec<Discount>,
    pub payments: Vec<Payment>,
    pub subtotal: Decimal,
    pub tax: Decimal,
    pub discount_total: Decimal,
    pub total: Decimal,
    pub status: TransactionStatus,
    pub created_at: DateTime<Utc>,
    pub finalized_at: Option<DateTime<Utc>>,
}

impl Transaction {
    /// Create a new draft transaction
    #[must_use] 
    pub fn new() -> Self {
        Self {
            id: Uuid::new_v4(),
            items: Vec::new(),
            tax_rates: Vec::new(),
            discounts: Vec::new(),
            payments: Vec::new(),
            subtotal: Decimal::ZERO,
            tax: Decimal::ZERO,
            discount_total: Decimal::ZERO,
            total: Decimal::ZERO,
            status: TransactionStatus::Draft,
            created_at: Utc::now(),
            finalized_at: None,
        }
    }

    /// Create a transaction with a specific ID (for testing or migration)
    #[must_use] 
    pub fn with_id(id: Uuid) -> Self {
        Self {
            id,
            items: Vec::new(),
            tax_rates: Vec::new(),
            discounts: Vec::new(),
            payments: Vec::new(),
            subtotal: Decimal::ZERO,
            tax: Decimal::ZERO,
            discount_total: Decimal::ZERO,
            total: Decimal::ZERO,
            status: TransactionStatus::Draft,
            created_at: Utc::now(),
            finalized_at: None,
        }
    }

    /// Add a line item to the transaction
    pub fn add_item(&mut self, item: LineItem) -> DomainResult<()> {
        if self.status != TransactionStatus::Draft {
            return Err(DomainError::InvalidState(
                "Cannot modify finalized transaction".to_string(),
            ));
        }
        self.items.push(item);
        Ok(())
    }

    /// Add a tax rate to the transaction
    pub fn add_tax_rate(&mut self, tax_rate: TaxRate) -> DomainResult<()> {
        if self.status != TransactionStatus::Draft {
            return Err(DomainError::InvalidState(
                "Cannot modify finalized transaction".to_string(),
            ));
        }
        self.tax_rates.push(tax_rate);
        Ok(())
    }

    /// Add a discount to the transaction
    pub fn add_discount(&mut self, discount: Discount) -> DomainResult<()> {
        if self.status != TransactionStatus::Draft {
            return Err(DomainError::InvalidState(
                "Cannot modify finalized transaction".to_string(),
            ));
        }
        self.discounts.push(discount);
        Ok(())
    }

    /// Add a payment to the transaction
    pub fn add_payment(&mut self, payment: Payment) -> DomainResult<()> {
        if self.status != TransactionStatus::Draft {
            return Err(DomainError::InvalidState(
                "Cannot modify finalized transaction".to_string(),
            ));
        }
        self.payments.push(payment);
        Ok(())
    }

    /// Check if the transaction is paid in full
    #[must_use] 
    pub fn is_paid_in_full(&self) -> bool {
        let total_paid: Decimal = self.payments.iter().map(|p| p.amount).sum();
        total_paid >= self.total
    }
}

impl Default for Transaction {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_transaction_creation() {
        let transaction = Transaction::new();
        assert_eq!(transaction.status, TransactionStatus::Draft);
        assert!(transaction.items.is_empty());
        assert_eq!(transaction.total, Decimal::ZERO);
    }

    #[test]
    fn test_add_item_to_draft() {
        let mut transaction = Transaction::new();
        let item = LineItem::new("PROD-001".to_string(), dec!(2.0), dec!(10.00));

        let result = transaction.add_item(item);
        assert!(result.is_ok());
        assert_eq!(transaction.items.len(), 1);
    }

    #[test]
    fn test_cannot_modify_finalized_transaction() {
        let mut transaction = Transaction::new();
        transaction.status = TransactionStatus::Finalized;

        let item = LineItem::new("PROD-001".to_string(), dec!(2.0), dec!(10.00));
        let result = transaction.add_item(item);

        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), DomainError::InvalidState(_)));
    }

    #[test]
    fn test_is_paid_in_full() {
        let mut transaction = Transaction::new();
        transaction.total = dec!(100.00);

        // Not paid
        assert!(!transaction.is_paid_in_full());

        // Partially paid
        transaction.add_payment(Payment {
            method: "cash".to_string(),
            amount: dec!(50.00),
        }).unwrap();
        assert!(!transaction.is_paid_in_full());

        // Fully paid
        transaction.add_payment(Payment {
            method: "card".to_string(),
            amount: dec!(50.00),
        }).unwrap();
        assert!(transaction.is_paid_in_full());

        // Overpaid
        transaction.add_payment(Payment {
            method: "cash".to_string(),
            amount: dec!(10.00),
        }).unwrap();
        assert!(transaction.is_paid_in_full());
    }
}
