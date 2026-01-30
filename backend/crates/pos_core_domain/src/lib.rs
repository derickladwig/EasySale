//! POS Core Domain
//!
//! This crate contains the core business logic for the `EasySale` system,
//! including pricing calculations, tax calculations, discount application,
//! and transaction finalization.
//!
//! This crate is intentionally isolated from any integration-specific code
//! (`QuickBooks`, `WooCommerce`, Supabase) to enable open-source distribution.

#![deny(unsafe_code)]
#![warn(clippy::pedantic, clippy::nursery, clippy::unwrap_used)]

pub mod pricing;
pub mod tax;
pub mod discount;
pub mod transaction;

// Re-export types from pos_core_models
pub use pos_core_models::{
    DomainError, DomainResult, Transaction, TransactionStatus, Payment,
    LineItem, PricingEngine, Discount, DiscountType, TaxRate,
};

// Re-export domain logic traits
pub use pricing::DefaultPricingEngine;
pub use tax::TaxCalculator;
pub use discount::DiscountApplicator;
pub use transaction::TransactionFinalizer;
