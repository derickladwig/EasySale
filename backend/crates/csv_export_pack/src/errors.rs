//! Export errors

use thiserror::Error;

/// Export error type
#[derive(Debug, Error)]
pub enum ExportError {
    /// CSV generation error
    #[error("CSV generation error: {0}")]
    CsvError(#[from] csv::Error),
    
    /// IO error
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    
    /// ZIP error
    #[error("ZIP error: {0}")]
    ZipError(#[from] zip::result::ZipError),
    
    /// Invalid data
    #[error("Invalid data: {0}")]
    InvalidData(String),
    
    /// Missing required field
    #[error("Missing required field: {0}")]
    MissingField(String),
}

/// Export result type
pub type ExportResult<T> = Result<T, ExportError>;
