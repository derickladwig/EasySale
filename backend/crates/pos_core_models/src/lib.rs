//! POS Core Models
//!
//! This crate contains shared types and data structures used throughout
//! the `EasySale` system, including transactions, line items, and domain enums.
//!
//! This crate has no external integration dependencies and serves as the
//! foundation for other core crates.

#![deny(unsafe_code)]
#![warn(clippy::pedantic, clippy::nursery, clippy::unwrap_used)]

pub mod transaction;
pub mod pricing;
pub mod discount;
pub mod tax;
pub mod errors;

// Re-export commonly used types
pub use transaction::{Transaction, TransactionStatus, Payment};
pub use pricing::{LineItem, PricingEngine};
pub use discount::{Discount, DiscountType};
pub use tax::TaxRate;
pub use errors::{DomainError, DomainResult};
