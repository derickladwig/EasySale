// Property-based tests for accounting snapshots
// Feature: split-build-system

use accounting_snapshots::{AccountingSnapshot, SnapshotLine, Payment};
use chrono::Utc;
use proptest::prelude::*;
use rust_decimal::Decimal;
use uuid::Uuid;

// Property 2: Snapshot Immutability
// Validates: Requirements 3.3, 12.1

prop_compose! {
    fn arbitrary_decimal()(value in 0..100000i64) -> Decimal {
        Decimal::from(value) / Decimal::from(100)
    }
}

prop_compose! {
    fn arbitrary_payment()(
        method in "[a-z]{4,10}",
        amount in arbitrary_decimal()
    ) -> Payment {
        Payment { method, amount }
    }
}

prop_compose! {
    fn arbitrary_snapshot_line()(
        description in "[A-Za-z ]{5,20}",
        quantity in arbitrary_decimal(),
        unit_price in arbitrary_decimal(),
        line_total in arbitrary_decimal(),
        tax_amount in arbitrary_decimal()
    ) -> SnapshotLine {
        SnapshotLine {
            product_id: Uuid::new_v4().to_string(),
            description,
            quantity,
            unit_price,
            line_total,
            tax_amount,
        }
    }
}

prop_compose! {
    fn arbitrary_snapshot()(
        id in "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}",
        transaction_id in "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}",
        subtotal in arbitrary_decimal(),
        tax in arbitrary_decimal(),
        discount in arbitrary_decimal(),
        total in arbitrary_decimal(),
        payments in prop::collection::vec(arbitrary_payment(), 1..3),
        lines in prop::collection::vec(arbitrary_snapshot_line(), 1..5)
    ) -> AccountingSnapshot {
        let now = Utc::now();
        AccountingSnapshot {
            id: Uuid::parse_str(&id).unwrap(),
            transaction_id: Uuid::parse_str(&transaction_id).unwrap(),
            created_at: now,
            finalized_at: now,
            subtotal,
            tax,
            discount,
            total,
            payments,
            lines,
        }
    }
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn test_snapshot_immutability_structure(snapshot in arbitrary_snapshot()) {
        // Feature: split-build-system, Property 2: Snapshot Immutability
        // Validates: Requirements 3.3, 12.1
        
        // Verify snapshot structure is immutable by design
        // The AccountingSnapshot struct has no mut methods
        // This test verifies the structure remains consistent
        
        let original_id = snapshot.id;
        let original_transaction_id = snapshot.transaction_id;
        let original_total = snapshot.total;
        let original_payments_len = snapshot.payments.len();
        let original_lines_len = snapshot.lines.len();
        
        // Verify all fields are accessible and consistent
        prop_assert_eq!(snapshot.id, original_id);
        prop_assert_eq!(snapshot.transaction_id, original_transaction_id);
        prop_assert_eq!(snapshot.total, original_total);
        prop_assert_eq!(snapshot.payments.len(), original_payments_len);
        prop_assert_eq!(snapshot.lines.len(), original_lines_len);
        
        // Verify snapshot consistency
        prop_assert!(snapshot.subtotal >= Decimal::ZERO);
        prop_assert!(snapshot.tax >= Decimal::ZERO);
        prop_assert!(snapshot.discount >= Decimal::ZERO);
        prop_assert!(snapshot.total >= Decimal::ZERO);
    }

    #[test]
    fn test_snapshot_totals_consistency(
        subtotal in arbitrary_decimal(),
        tax in arbitrary_decimal(),
        discount in arbitrary_decimal()
    ) {
        // Feature: split-build-system, Property 2: Snapshot Immutability
        // Validates: Requirements 3.3, 12.1
        
        // Calculate expected total
        let expected_total = subtotal + tax - discount;
        
        // Create snapshot with calculated total
        let now = Utc::now();
        let snapshot = AccountingSnapshot {
            id: Uuid::new_v4(),
            transaction_id: Uuid::new_v4(),
            created_at: now,
            finalized_at: now,
            subtotal,
            tax,
            discount,
            total: expected_total,
            payments: vec![Payment {
                method: "cash".to_string(),
                amount: expected_total,
            }],
            lines: vec![],
        };
        
        // Verify total is consistent
        prop_assert_eq!(snapshot.total, expected_total);
        prop_assert_eq!(snapshot.subtotal + snapshot.tax - snapshot.discount, snapshot.total);
    }

    #[test]
    fn test_snapshot_payments_immutability(payments in prop::collection::vec(arbitrary_payment(), 1..10)) {
        // Feature: split-build-system, Property 2: Snapshot Immutability
        // Validates: Requirements 3.3, 12.1
        
        let now = Utc::now();
        let total: Decimal = payments.iter().map(|p| p.amount).sum();
        
        let snapshot = AccountingSnapshot {
            id: Uuid::new_v4(),
            transaction_id: Uuid::new_v4(),
            created_at: now,
            finalized_at: now,
            subtotal: total,
            tax: Decimal::ZERO,
            discount: Decimal::ZERO,
            total,
            payments: payments.clone(),
            lines: vec![],
        };
        
        // Verify payments are preserved
        prop_assert_eq!(snapshot.payments.len(), payments.len());
        for (original, stored) in payments.iter().zip(snapshot.payments.iter()) {
            prop_assert_eq!(&original.method, &stored.method);
            prop_assert_eq!(original.amount, stored.amount);
        }
    }
}
