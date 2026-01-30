//! Integration tests for core crate usage
//!
//! These tests verify that the server correctly uses types and functions
//! from the core crates (pos_core_domain, pos_core_models, pos_core_storage).

#[cfg(test)]
mod tests {
    use pos_core_models::{Transaction, TransactionStatus, Payment, LineItem};
    use pos_core_storage::{init_pool, DatabasePool};
    use rust_decimal::Decimal;
    use std::str::FromStr;

    #[test]
    fn test_core_transaction_types_available() {
        // Verify we can create a transaction using core types
        let transaction = Transaction::new();
        assert_eq!(transaction.status, TransactionStatus::Draft);
        assert!(transaction.items.is_empty());
    }

    #[test]
    fn test_core_payment_type_available() {
        // Verify we can create a payment using core types
        let payment = Payment {
            method: "cash".to_string(),
            amount: Decimal::from_str("100.00").unwrap(),
        };
        assert_eq!(payment.method, "cash");
        assert_eq!(payment.amount, Decimal::from_str("100.00").unwrap());
    }

    #[test]
    fn test_core_line_item_available() {
        // Verify we can create a line item using core types
        let item = LineItem::new(
            "PROD-001".to_string(),
            Decimal::from_str("2.0").unwrap(),
            Decimal::from_str("10.00").unwrap(),
        );
        assert_eq!(item.product_id, "PROD-001");
        assert_eq!(item.quantity, Decimal::from_str("2.0").unwrap());
        assert_eq!(item.unit_price, Decimal::from_str("10.00").unwrap());
    }

    #[tokio::test]
    async fn test_core_storage_init_pool() {
        // Verify we can use the init_pool function from core storage
        std::env::set_var("DATABASE_PATH", ":memory:");
        
        let result = init_pool().await;
        assert!(result.is_ok(), "Failed to initialize database pool from core storage");
        
        let pool = result.unwrap();
        
        // Verify we can execute a query
        let result = sqlx::query("SELECT 1")
            .execute(&pool)
            .await;
        assert!(result.is_ok(), "Failed to execute query on pool from core storage");
    }

    #[test]
    fn test_transaction_modification_rules() {
        // Verify core domain rules are enforced
        let mut transaction = Transaction::new();
        
        // Can add items to draft transaction
        let item = LineItem::new(
            "PROD-001".to_string(),
            Decimal::from_str("1.0").unwrap(),
            Decimal::from_str("10.00").unwrap(),
        );
        let result = transaction.add_item(item);
        assert!(result.is_ok());
        
        // Cannot modify finalized transaction
        transaction.status = TransactionStatus::Finalized;
        let item2 = LineItem::new(
            "PROD-002".to_string(),
            Decimal::from_str("1.0").unwrap(),
            Decimal::from_str("20.00").unwrap(),
        );
        let result = transaction.add_item(item2);
        assert!(result.is_err());
    }
}
