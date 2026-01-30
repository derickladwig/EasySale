/// Security module for input validation and sanitization
/// 
/// This module provides security controls for:
/// - QuickBooks Online query language input sanitization
/// - SQL identifier allowlisting
/// - OAuth configuration validation

pub mod qbo_sanitizer;
pub mod sql_allowlist;

// Re-export commonly used functions
pub use qbo_sanitizer::{sanitize_qbo_query_value, build_qbo_query, build_qbo_query_multi};
pub use sql_allowlist::{validate_table_name, validate_column_name, ALLOWED_TABLES, ALLOWED_COLUMNS};
