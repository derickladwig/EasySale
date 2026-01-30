use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ValidationError {
    #[error("Invalid date format. Expected YYYY-MM-DD")]
    InvalidDateFormat,
    #[error("Date range invalid: start date must be before end date")]
    InvalidDateRange,
    #[error("Date is too far in the past or future")]
    DateOutOfRange,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidatedDateRange {
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
}

impl ValidatedDateRange {
    pub fn new(start_date: Option<&str>, end_date: Option<&str>) -> Result<Self, ValidationError> {
        let start = if let Some(date_str) = start_date {
            Some(validate_date_input(date_str)?)
        } else {
            None
        };

        let end = if let Some(date_str) = end_date {
            Some(validate_date_input(date_str)?)
        } else {
            None
        };

        // Validate range if both dates provided
        if let (Some(start), Some(end)) = (start, end) {
            if start > end {
                return Err(ValidationError::InvalidDateRange);
            }
        }

        Ok(ValidatedDateRange {
            start_date: start,
            end_date: end,
        })
    }
}

pub fn validate_date_input(date_str: &str) -> Result<NaiveDate, ValidationError> {
    // Parse ISO 8601 date format (YYYY-MM-DD)
    let date = NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
        .map_err(|_| ValidationError::InvalidDateFormat)?;

    // Validate reasonable date range (1900 to 2100)
    let min_date = NaiveDate::from_ymd_opt(1900, 1, 1).unwrap();
    let max_date = NaiveDate::from_ymd_opt(2100, 12, 31).unwrap();

    if date < min_date || date > max_date {
        return Err(ValidationError::DateOutOfRange);
    }

    Ok(date)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_date() {
        assert!(validate_date_input("2024-01-15").is_ok());
    }

    #[test]
    fn test_invalid_date_format() {
        assert!(matches!(
            validate_date_input("2024/01/15"),
            Err(ValidationError::InvalidDateFormat)
        ));
        assert!(matches!(
            validate_date_input("invalid"),
            Err(ValidationError::InvalidDateFormat)
        ));
    }

    #[test]
    fn test_date_out_of_range() {
        assert!(matches!(
            validate_date_input("1800-01-01"),
            Err(ValidationError::DateOutOfRange)
        ));
        assert!(matches!(
            validate_date_input("2200-01-01"),
            Err(ValidationError::DateOutOfRange)
        ));
    }

    #[test]
    fn test_valid_date_range() {
        let range = ValidatedDateRange::new(Some("2024-01-01"), Some("2024-01-31"));
        assert!(range.is_ok());
    }

    #[test]
    fn test_invalid_date_range() {
        let range = ValidatedDateRange::new(Some("2024-01-31"), Some("2024-01-01"));
        assert!(matches!(range, Err(ValidationError::InvalidDateRange)));
    }
}
