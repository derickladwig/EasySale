//! Snapshot builder trait and implementation
//!
//! This module provides the trait and implementation for building accounting
//! snapshots from transactions using `pos_core_domain` business logic.

use pos_core_models::{Transaction, TransactionStatus};
use rust_decimal::Decimal;
use tracing::{debug, warn};

use crate::errors::{SnapshotError, SnapshotResult};
use crate::snapshot::{AccountingSnapshot, Payment, SnapshotLine};

/// Trait for building accounting snapshots from transactions
pub trait SnapshotBuilder {
    /// Create an accounting snapshot from a finalized transaction
    ///
    /// # Errors
    ///
    /// Returns an error if:
    /// - Transaction is not finalized
    /// - Transaction data is inconsistent
    /// - Snapshot creation fails
    fn build_snapshot(&self, transaction: &Transaction) -> SnapshotResult<AccountingSnapshot>;
}

/// Default implementation of snapshot builder
pub struct DefaultSnapshotBuilder;

impl DefaultSnapshotBuilder {
    /// Create a new default snapshot builder
    #[must_use]
    pub const fn new() -> Self {
        Self
    }
}

impl Default for DefaultSnapshotBuilder {
    fn default() -> Self {
        Self::new()
    }
}

impl SnapshotBuilder for DefaultSnapshotBuilder {
    fn build_snapshot(&self, transaction: &Transaction) -> SnapshotResult<AccountingSnapshot> {
        // Verify transaction is finalized
        if transaction.status != TransactionStatus::Finalized {
            return Err(SnapshotError::InvalidTransactionState(format!(
                "Transaction {} is not finalized (status: {:?})",
                transaction.id, transaction.status
            )));
        }

        // Verify transaction has a finalized_at timestamp
        let finalized_at = transaction.finalized_at.ok_or_else(|| {
            SnapshotError::InvalidTransactionState(format!(
                "Transaction {} is marked as finalized but has no finalized_at timestamp",
                transaction.id
            ))
        })?;

        debug!(
            transaction_id = %transaction.id,
            item_count = transaction.items.len(),
            total = %transaction.total,
            "Building accounting snapshot"
        );

        // Convert line items to snapshot lines
        let lines: Vec<SnapshotLine> = transaction
            .items
            .iter()
            .map(|item| {
                let line_total = item.line_total.unwrap_or_else(|| item.calculate_line_total());
                
                // Calculate tax amount for this line
                // For now, we'll distribute tax proportionally based on line total
                let tax_amount = if transaction.subtotal > Decimal::ZERO {
                    (line_total / transaction.subtotal) * transaction.tax
                } else {
                    Decimal::ZERO
                };

                SnapshotLine::new(
                    item.product_id.clone(),
                    // Use product_id as description for now
                    // In a real system, this would come from product lookup
                    item.product_id.clone(),
                    item.quantity,
                    item.unit_price,
                    line_total,
                    tax_amount,
                )
            })
            .collect();

        // Convert payments
        let payments: Vec<Payment> = transaction
            .payments
            .iter()
            .map(|p| Payment {
                method: p.method.clone(),
                amount: p.amount,
            })
            .collect();

        // Create the snapshot
        let snapshot = AccountingSnapshot::new(
            transaction.id,
            finalized_at,
            transaction.subtotal,
            transaction.tax,
            transaction.discount_total,
            transaction.total,
            payments,
            lines,
        );

        // Verify snapshot consistency
        if !snapshot.verify_consistency() {
            warn!(
                transaction_id = %transaction.id,
                snapshot_id = %snapshot.id,
                "Snapshot failed consistency check"
            );
            return Err(SnapshotError::InconsistentData(format!(
                "Snapshot for transaction {} failed consistency verification",
                transaction.id
            )));
        }

        debug!(
            transaction_id = %transaction.id,
            snapshot_id = %snapshot.id,
            "Successfully created accounting snapshot"
        );

        Ok(snapshot)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use pos_core_models::{LineItem, Payment as TransactionPayment};
    use rust_decimal_macros::dec;
    use uuid::Uuid;

    fn create_test_transaction() -> Transaction {
        let mut transaction = Transaction::with_id(Uuid::new_v4());
        
        // Add line items
        let item1 = LineItem::new("PROD-001".to_string(), dec!(2.0), dec!(10.00));
        let item2 = LineItem::new("PROD-002".to_string(), dec!(1.0), dec!(15.00));
        
        transaction.add_item(item1).unwrap();
        transaction.add_item(item2).unwrap();
        
        // Set calculated totals
        transaction.subtotal = dec!(35.00); // 20.00 + 15.00
        transaction.tax = dec!(2.80); // 8% tax
        transaction.discount_total = dec!(0.00);
        transaction.total = dec!(37.80); // 35.00 + 2.80
        
        // Add payment
        transaction.add_payment(TransactionPayment {
            method: "cash".to_string(),
            amount: dec!(37.80),
        }).unwrap();
        
        // Finalize
        transaction.status = TransactionStatus::Finalized;
        transaction.finalized_at = Some(Utc::now());
        
        transaction
    }

    #[test]
    fn test_build_snapshot_from_finalized_transaction() {
        let transaction = create_test_transaction();
        let builder = DefaultSnapshotBuilder::new();

        let result = builder.build_snapshot(&transaction);
        assert!(result.is_ok());

        let snapshot = result.unwrap();
        assert_eq!(snapshot.transaction_id, transaction.id);
        assert_eq!(snapshot.subtotal, dec!(35.00));
        assert_eq!(snapshot.tax, dec!(2.80));
        assert_eq!(snapshot.discount, dec!(0.00));
        assert_eq!(snapshot.total, dec!(37.80));
        assert_eq!(snapshot.lines.len(), 2);
        assert_eq!(snapshot.payments.len(), 1);
        assert!(snapshot.verify_consistency());
    }

    #[test]
    fn test_build_snapshot_from_draft_transaction_fails() {
        let mut transaction = create_test_transaction();
        transaction.status = TransactionStatus::Draft;
        transaction.finalized_at = None;

        let builder = DefaultSnapshotBuilder::new();
        let result = builder.build_snapshot(&transaction);

        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            SnapshotError::InvalidTransactionState(_)
        ));
    }

    #[test]
    fn test_build_snapshot_without_finalized_at_fails() {
        let mut transaction = create_test_transaction();
        transaction.status = TransactionStatus::Finalized;
        transaction.finalized_at = None; // Missing timestamp

        let builder = DefaultSnapshotBuilder::new();
        let result = builder.build_snapshot(&transaction);

        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            SnapshotError::InvalidTransactionState(_)
        ));
    }

    #[test]
    fn test_snapshot_line_totals_match_transaction() {
        let transaction = create_test_transaction();
        let builder = DefaultSnapshotBuilder::new();

        let snapshot = builder.build_snapshot(&transaction).unwrap();

        // Verify line totals
        let line_total_sum: Decimal = snapshot.lines.iter().map(|l| l.line_total).sum();
        assert_eq!(line_total_sum, transaction.subtotal);

        // Verify individual lines
        assert_eq!(snapshot.lines[0].line_total, dec!(20.00)); // 2 × 10.00
        assert_eq!(snapshot.lines[1].line_total, dec!(15.00)); // 1 × 15.00
    }

    #[test]
    fn test_snapshot_tax_distribution() {
        let transaction = create_test_transaction();
        let builder = DefaultSnapshotBuilder::new();

        let snapshot = builder.build_snapshot(&transaction).unwrap();

        // Verify tax amounts sum to total tax
        let tax_sum: Decimal = snapshot.lines.iter().map(|l| l.tax_amount).sum();
        
        // Allow small rounding difference
        let diff = (tax_sum - transaction.tax).abs();
        assert!(diff < dec!(0.01), "Tax sum {} differs from transaction tax {} by {}", tax_sum, transaction.tax, diff);
    }

    #[test]
    fn test_snapshot_payments_copied() {
        let transaction = create_test_transaction();
        let builder = DefaultSnapshotBuilder::new();

        let snapshot = builder.build_snapshot(&transaction).unwrap();

        assert_eq!(snapshot.payments.len(), 1);
        assert_eq!(snapshot.payments[0].method, "cash");
        assert_eq!(snapshot.payments[0].amount, dec!(37.80));
    }

    #[test]
    fn test_snapshot_with_discount() {
        let mut transaction = create_test_transaction();
        transaction.discount_total = dec!(5.00);
        transaction.total = dec!(32.80); // 35.00 + 2.80 - 5.00

        let builder = DefaultSnapshotBuilder::new();
        let snapshot = builder.build_snapshot(&transaction).unwrap();

        assert_eq!(snapshot.discount, dec!(5.00));
        assert_eq!(snapshot.total, dec!(32.80));
        assert!(snapshot.verify_consistency());
    }

    #[test]
    fn test_snapshot_with_multiple_payments() {
        let mut transaction = Transaction::with_id(Uuid::new_v4());
        
        // Add line items
        let item1 = LineItem::new("PROD-001".to_string(), dec!(2.0), dec!(10.00));
        let item2 = LineItem::new("PROD-002".to_string(), dec!(1.0), dec!(15.00));
        
        transaction.add_item(item1).unwrap();
        transaction.add_item(item2).unwrap();
        
        // Set calculated totals
        transaction.subtotal = dec!(35.00);
        transaction.tax = dec!(2.80);
        transaction.discount_total = dec!(0.00);
        transaction.total = dec!(37.80);
        
        // Add multiple payments BEFORE finalizing
        transaction.add_payment(TransactionPayment {
            method: "cash".to_string(),
            amount: dec!(20.00),
        }).unwrap();
        transaction.add_payment(TransactionPayment {
            method: "card".to_string(),
            amount: dec!(17.80),
        }).unwrap();
        
        // Now finalize
        transaction.status = TransactionStatus::Finalized;
        transaction.finalized_at = Some(Utc::now());

        let builder = DefaultSnapshotBuilder::new();
        let snapshot = builder.build_snapshot(&transaction).unwrap();

        assert_eq!(snapshot.payments.len(), 2);
        assert_eq!(snapshot.total_paid(), dec!(37.80));
        assert!(snapshot.is_paid_in_full());
    }
}
