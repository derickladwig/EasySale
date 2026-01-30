//! Test fixtures for common data structures
//!
//! This module provides pre-defined test data for:
//! - Users and authentication
//! - Products and inventory
//! - Orders and transactions

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestUser {
    pub id: String,
    pub username: String,
    pub email: String,
    pub role: String,
    pub password_hash: String,
}

impl TestUser {
    pub fn admin() -> Self {
        Self {
            id: "user-001".to_string(),
            username: "admin".to_string(),
            email: "admin@EasySale.local".to_string(),
            role: "admin".to_string(),
            password_hash: "$argon2id$v=19$m=19456,t=2,p=1$test$test".to_string(),
        }
    }

    pub fn cashier() -> Self {
        Self {
            id: "user-002".to_string(),
            username: "cashier".to_string(),
            email: "cashier@EasySale.local".to_string(),
            role: "cashier".to_string(),
            password_hash: "$argon2id$v=19$m=19456,t=2,p=1$test$test".to_string(),
        }
    }

    pub fn manager() -> Self {
        Self {
            id: "user-003".to_string(),
            username: "manager".to_string(),
            email: "manager@EasySale.local".to_string(),
            role: "manager".to_string(),
            password_hash: "$argon2id$v=19$m=19456,t=2,p=1$test$test".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestProduct {
    pub id: String,
    pub sku: String,
    pub name: String,
    pub category: String,
    pub price: f64,
    pub cost: f64,
    pub quantity: i32,
}

impl TestProduct {
    pub fn cap() -> Self {
        Self {
            id: "prod-001".to_string(),
            sku: "CAP-BLK-001".to_string(),
            name: "Black Baseball Cap".to_string(),
            category: "caps".to_string(),
            price: 19.99,
            cost: 8.50,
            quantity: 100,
        }
    }

    pub fn auto_part() -> Self {
        Self {
            id: "prod-002".to_string(),
            sku: "PART-BRK-001".to_string(),
            name: "Brake Pad Set".to_string(),
            category: "auto-parts".to_string(),
            price: 89.99,
            cost: 45.00,
            quantity: 25,
        }
    }

    pub fn material() -> Self {
        Self {
            id: "prod-003".to_string(),
            sku: "MAT-001".to_string(),
            name: "Premium Material".to_string(),
            category: "materials".to_string(),
            price: 45.99,
            cost: 22.00,
            quantity: 50,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_fixtures() {
        let admin = TestUser::admin();
        assert_eq!(admin.username, "admin");
        assert_eq!(admin.role, "admin");

        let cashier = TestUser::cashier();
        assert_eq!(cashier.username, "cashier");
        assert_eq!(cashier.role, "cashier");
    }

    #[test]
    fn test_product_fixtures() {
        let cap = TestProduct::cap();
        assert_eq!(cap.category, "caps");
        assert!(cap.price > 0.0);

        let part = TestProduct::auto_part();
        assert_eq!(part.category, "auto-parts");
        assert!(part.price > part.cost);
    }
}
