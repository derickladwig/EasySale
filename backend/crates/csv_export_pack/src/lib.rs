//! CSV Export Pack
//!
//! This crate generates QuickBooks-compatible CSV files from accounting snapshots.
//! It's feature-gated with `#[cfg(feature = "export")]` to enable optional compilation.

#![deny(unsafe_code)]
#![warn(clippy::pedantic, clippy::nursery, clippy::unwrap_used)]

pub mod exporter;
pub mod quickbooks;
pub mod generic;
pub mod errors;
pub mod packaging;

// Re-export commonly used types
pub use exporter::CsvExporter;
pub use quickbooks::QuickBooksExporter;
pub use generic::GenericExporter;
pub use errors::{ExportError, ExportResult};
pub use packaging::ZipPackager;
