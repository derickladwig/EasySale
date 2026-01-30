//! POS Core Storage
//!
//! This crate provides the database access layer for core POS operations,
//! including `SQLite` connection management and query builders.
//!
//! This crate depends only on `pos_core_models` and has no integration dependencies.

#![deny(unsafe_code)]
#![warn(clippy::pedantic, clippy::nursery, clippy::unwrap_used)]

pub mod connection;
pub mod error;
pub mod repositories;
pub mod query_builder;

// Re-export commonly used types
pub use connection::{init_pool, DatabasePool};
pub use error::{StorageError, StorageResult};
pub use repositories::transaction::TransactionRepository;
