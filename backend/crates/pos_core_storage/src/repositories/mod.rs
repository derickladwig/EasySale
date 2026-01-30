//! Repository implementations for data access

pub mod transaction;

// Re-export commonly used repositories
pub use transaction::TransactionRepository;
