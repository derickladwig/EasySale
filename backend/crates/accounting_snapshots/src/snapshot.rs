//! Accounting snapshot types
//!
//! This module defines the immutable accounting snapshot structures that capture
//! all financial data at transaction finalization.

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Payment method information
///
/// Represents a single payment made towards a transaction.
/// Transactions can have multiple payments (multi-tender support).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Payment {
    /// Payment method identifier (e.g., "cash", "card", "check", "`on_account`")
    pub method: String,
    /// Amount paid using this method
    pub amount: Decimal,
}

/// Snapshot line item
///
/// Represents a single line item in an accounting snapshot with all computed values.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SnapshotLine {
    /// Product identifier
    pub product_id: String,
    /// Product description
    pub description: String,
    /// Quantity sold
    pub quantity: Decimal,
    /// Unit price at time of sale
    pub unit_price: Decimal,
    /// Line total (quantity × `unit_price`)
    pub line_total: Decimal,
    /// Tax amount for this line
    pub tax_amount: Decimal,
}

impl SnapshotLine {
    /// Create a new snapshot line
    #[must_use]
    pub const fn new(
        product_id: String,
        description: String,
        quantity: Decimal,
        unit_price: Decimal,
        line_total: Decimal,
        tax_amount: Decimal,
    ) -> Self {
        Self {
            product_id,
            description,
            quantity,
            unit_price,
            line_total,
            tax_amount,
        }
    }
}

/// Immutable accounting snapshot
///
/// Captures all computed financial data at transaction finalization.
/// Once created, snapshots are never modified - they serve as the authoritative
/// record for exports and reports.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AccountingSnapshot {
    /// Unique snapshot identifier
    pub id: Uuid,
    /// Transaction this snapshot was created from
    pub transaction_id: Uuid,
    /// When the snapshot was created
    pub created_at: DateTime<Utc>,
    /// When the transaction was finalized
    pub finalized_at: DateTime<Utc>,
    /// Subtotal before tax and discounts
    pub subtotal: Decimal,
    /// Total tax amount
    pub tax: Decimal,
    /// Total discount amount
    pub discount: Decimal,
    /// Final total (subtotal + tax - discount)
    pub total: Decimal,
    /// Payments made (multi-tender support)
    pub payments: Vec<Payment>,
    /// Line items with computed values
    pub lines: Vec<SnapshotLine>,
}

impl AccountingSnapshot {
    /// Create a new accounting snapshot
    #[must_use]
    pub fn new(
        transaction_id: Uuid,
        finalized_at: DateTime<Utc>,
        subtotal: Decimal,
        tax: Decimal,
        discount: Decimal,
        total: Decimal,
        payments: Vec<Payment>,
        lines: Vec<SnapshotLine>,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            transaction_id,
            created_at: Utc::now(),
            finalized_at,
            subtotal,
            tax,
            discount,
            total,
            payments,
            lines,
        }
    }

    /// Create a snapshot with a specific ID (for testing or migration)
    #[must_use]
    pub fn with_id(
        id: Uuid,
        transaction_id: Uuid,
        finalized_at: DateTime<Utc>,
        subtotal: Decimal,
        tax: Decimal,
        discount: Decimal,
        total: Decimal,
        payments: Vec<Payment>,
        lines: Vec<SnapshotLine>,
    ) -> Self {
        Self {
            id,
            transaction_id,
            created_at: Utc::now(),
            finalized_at,
            subtotal,
            tax,
            discount,
            total,
            payments,
            lines,
        }
    }

    /// Verify that the snapshot's totals are internally consistent
    ///
    /// Checks that:
    /// - Line totals sum to subtotal
    /// - subtotal + tax - discount = total
    #[must_use] 
    pub fn verify_consistency(&self) -> bool {
        // Sum line totals
        let line_total_sum: Decimal = self.lines.iter().map(|line| line.line_total).sum();
        
        // Check subtotal matches line totals
        if (line_total_sum - self.subtotal).abs() > Decimal::new(1, 2) {
            // Allow 1 cent rounding difference
            return false;
        }

        // Check total calculation
        let calculated_total = self.subtotal + self.tax - self.discount;
        if (calculated_total - self.total).abs() > Decimal::new(1, 2) {
            // Allow 1 cent rounding difference
            return false;
        }

        true
    }

    /// Get the total amount paid
    #[must_use] 
    pub fn total_paid(&self) -> Decimal {
        self.payments.iter().map(|p| p.amount).sum()
    }

    /// Check if the transaction is paid in full
    #[must_use] 
    pub fn is_paid_in_full(&self) -> bool {
        self.total_paid() >= self.total
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_snapshot_line_creation() {
        let line = SnapshotLine::new(
            "PROD-001".to_string(),
            "Widget".to_string(),
            dec!(2.0),
            dec!(10.00),
            dec!(20.00),
            dec!(1.60),
        );

        assert_eq!(line.product_id, "PROD-001");
        assert_eq!(line.description, "Widget");
        assert_eq!(line.quantity, dec!(2.0));
        assert_eq!(line.unit_price, dec!(10.00));
        assert_eq!(line.line_total, dec!(20.00));
        assert_eq!(line.tax_amount, dec!(1.60));
    }

    #[test]
    fn test_accounting_snapshot_creation() {
        let payments = vec![Payment {
            method: "cash".to_string(),
            amount: dec!(21.60),
        }];

        let lines = vec![SnapshotLine::new(
            "PROD-001".to_string(),
            "Widget".to_string(),
            dec!(2.0),
            dec!(10.00),
            dec!(20.00),
            dec!(1.60),
        )];

        let snapshot = AccountingSnapshot::new(
            Uuid::new_v4(),
            Utc::now(),
            dec!(20.00),
            dec!(1.60),
            dec!(0.00),
            dec!(21.60),
            payments,
            lines,
        );

        assert_eq!(snapshot.subtotal, dec!(20.00));
        assert_eq!(snapshot.tax, dec!(1.60));
        assert_eq!(snapshot.discount, dec!(0.00));
        assert_eq!(snapshot.total, dec!(21.60));
        assert_eq!(snapshot.lines.len(), 1);
        assert_eq!(snapshot.payments.len(), 1);
    }

    #[test]
    fn test_snapshot_consistency_valid() {
        let lines = vec![
            SnapshotLine::new(
                "PROD-001".to_string(),
                "Widget".to_string(),
                dec!(2.0),
                dec!(10.00),
                dec!(20.00),
                dec!(1.60),
            ),
            SnapshotLine::new(
                "PROD-002".to_string(),
                "Gadget".to_string(),
                dec!(1.0),
                dec!(15.00),
                dec!(15.00),
                dec!(1.20),
            ),
        ];

        let snapshot = AccountingSnapshot::new(
            Uuid::new_v4(),
            Utc::now(),
            dec!(35.00), // 20.00 + 15.00
            dec!(2.80),  // 1.60 + 1.20
            dec!(0.00),
            dec!(37.80), // 35.00 + 2.80
            vec![],
            lines,
        );

        assert!(snapshot.verify_consistency());
    }

    #[test]
    fn test_snapshot_consistency_invalid_subtotal() {
        let lines = vec![SnapshotLine::new(
            "PROD-001".to_string(),
            "Widget".to_string(),
            dec!(2.0),
            dec!(10.00),
            dec!(20.00),
            dec!(1.60),
        )];

        let snapshot = AccountingSnapshot::new(
            Uuid::new_v4(),
            Utc::now(),
            dec!(25.00), // Wrong! Should be 20.00
            dec!(1.60),
            dec!(0.00),
            dec!(26.60),
            vec![],
            lines,
        );

        assert!(!snapshot.verify_consistency());
    }

    #[test]
    fn test_snapshot_consistency_invalid_total() {
        let lines = vec![SnapshotLine::new(
            "PROD-001".to_string(),
            "Widget".to_string(),
            dec!(2.0),
            dec!(10.00),
            dec!(20.00),
            dec!(1.60),
        )];

        let snapshot = AccountingSnapshot::new(
            Uuid::new_v4(),
            Utc::now(),
            dec!(20.00),
            dec!(1.60),
            dec!(0.00),
            dec!(25.00), // Wrong! Should be 21.60
            vec![],
            lines,
        );

        assert!(!snapshot.verify_consistency());
    }

    #[test]
    fn test_total_paid() {
        let payments = vec![
            Payment {
                method: "cash".to_string(),
                amount: dec!(10.00),
            },
            Payment {
                method: "card".to_string(),
                amount: dec!(11.60),
            },
        ];

        let snapshot = AccountingSnapshot::new(
            Uuid::new_v4(),
            Utc::now(),
            dec!(20.00),
            dec!(1.60),
            dec!(0.00),
            dec!(21.60),
            payments,
            vec![],
        );

        assert_eq!(snapshot.total_paid(), dec!(21.60));
        assert!(snapshot.is_paid_in_full());
    }

    #[test]
    fn test_not_paid_in_full() {
        let payments = vec![Payment {
            method: "cash".to_string(),
            amount: dec!(10.00),
        }];

        let snapshot = AccountingSnapshot::new(
            Uuid::new_v4(),
            Utc::now(),
            dec!(20.00),
            dec!(1.60),
            dec!(0.00),
            dec!(21.60),
            payments,
            vec![],
        );

        assert_eq!(snapshot.total_paid(), dec!(10.00));
        assert!(!snapshot.is_paid_in_full());
    }
}
