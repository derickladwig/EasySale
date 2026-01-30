//! Accounting Snapshots
//!
//! This crate manages immutable accounting snapshots created at transaction
//! finalization. Snapshots capture all computed financial data (subtotal, tax,
//! discounts, totals, payments) and are never modified after creation.
//!
//! This ensures that exports and reports always use the exact values that were
//! computed at the time of the transaction, with no recomputation.

#![deny(unsafe_code)]
#![warn(clippy::pedantic, clippy::nursery, clippy::unwrap_used)]

pub mod snapshot;
pub mod builder;
pub mod errors;
pub mod repository;
pub mod migration;

// Re-export commonly used types
pub use snapshot::{AccountingSnapshot, SnapshotLine, Payment};
pub use builder::SnapshotBuilder;
pub use errors::{SnapshotError, SnapshotResult};
pub use repository::SnapshotRepository;
pub use migration::{MigrationJob, MigrationStats, VerificationResult};
