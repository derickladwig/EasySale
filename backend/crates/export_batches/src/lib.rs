//! Export Batches
//!
//! This crate manages collections of accounting snapshots for export with
//! idempotency guarantees. Batches track which snapshots have been exported
//! to prevent duplicate exports.

#![deny(unsafe_code)]
#![warn(clippy::pedantic, clippy::nursery, clippy::unwrap_used)]

pub mod batch;
pub mod manager;
pub mod errors;
pub mod repository;

// Re-export commonly used types
pub use batch::{ExportBatch, BatchStatus};
pub use manager::BatchManager;
pub use errors::{BatchError, BatchResult};
pub use repository::BatchRepository;
