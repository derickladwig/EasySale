//! CSV Import Validation and Cleaning Utilities
//! 
//! This module provides non-destructive data cleaning and validation
//! for CSV imports. All cleaning operations preserve the original data
//! structure while normalizing values for consistency.

use std::collections::HashSet;
use regex::Regex;
use once_cell::sync::Lazy;

/// Validation error with row and field context
#[derive(Debug, Clone)]
pub struct ValidationError {
    pub row: usize,
    pub field: String,
    pub message: String,
    pub severity: ValidationSeverity,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ValidationSeverity {
    Error,   // Import will fail
    Warning, // Import will proceed with warning
}

/// Result of validation pass
#[derive(Debug, Default)]
pub struct ValidationResult {
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<ValidationError>,
    pub cleaned_values: std::collections::HashMap<(usize, String), String>,
}

impl ValidationResult {
    pub fn has_errors(&self) -> bool {
        !self.errors.is_empty()
    }
    
    pub fn add_error(&mut self, row: usize, field: &str, message: &str) {
        self.errors.push(ValidationError {
            row,
            field: field.to_string(),
            message: message.to_string(),
            severity: ValidationSeverity::Error,
        });
    }
    
    pub fn add_warning(&mut self, row: usize, field: &str, message: &str) {
        self.warnings.push(ValidationError {
            row,
            field: field.to_string(),
            message: message.to_string(),
            severity: ValidationSeverity::Warning,
        });
    }
}

// =============================================================================
// String Cleaning Functions (Non-Destructive)
// =============================================================================

/// Trim whitespace from a string value
pub fn clean_trim(value: &str) -> String {
    value.trim().to_string()
}

/// Normalize email to lowercase and trim
pub fn clean_email(value: &str) -> String {
    value.trim().to_lowercase()
}

/// Normalize phone number - remove non-digits except + for international
pub fn clean_phone(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    
    // Keep + at start for international, remove all other non-digits
    let has_plus = trimmed.starts_with('+');
    let digits: String = trimmed.chars().filter(|c| c.is_ascii_digit()).collect();
    
    if has_plus && !digits.is_empty() {
        format!("+{}", digits)
    } else {
        digits
    }
}

/// Normalize URL - ensure https:// prefix
pub fn clean_url(value: &str) -> String {
    let trimmed = value.trim().to_lowercase();
    if trimmed.is_empty() {
        return String::new();
    }
    
    if trimmed.starts_with("https://") || trimmed.starts_with("http://") {
        trimmed
    } else {
        format!("https://{}", trimmed)
    }
}

/// Normalize boolean values to true/false
pub fn clean_boolean(value: &str) -> Option<bool> {
    match value.trim().to_lowercase().as_str() {
        "true" | "1" | "yes" | "y" | "active" | "on" => Some(true),
        "false" | "0" | "no" | "n" | "inactive" | "off" => Some(false),
        "" => None,
        _ => None,
    }
}

/// Normalize decimal to 2 decimal places, remove currency symbols
pub fn clean_decimal(value: &str) -> Result<f64, String> {
    let cleaned = value
        .trim()
        .replace('$', "")
        .replace(',', "")
        .replace('€', "")
        .replace('£', "");
    
    cleaned.parse::<f64>().map_err(|_| format!("Invalid number: '{}'", value))
}

/// Normalize integer, remove decimals
pub fn clean_integer(value: &str) -> Result<i64, String> {
    let cleaned = value.trim().replace(',', "");
    
    // Try parsing as float first, then truncate
    if let Ok(f) = cleaned.parse::<f64>() {
        return Ok(f.trunc() as i64);
    }
    
    cleaned.parse::<i64>().map_err(|_| format!("Invalid integer: '{}'", value))
}

/// Normalize SKU - uppercase, replace spaces with dashes
pub fn clean_sku(value: &str) -> String {
    value.trim().to_uppercase().replace(' ', "-")
}

/// Normalize state code to 2-char uppercase
pub fn clean_state_code(value: &str) -> String {
    let trimmed = value.trim().to_uppercase();
    if trimmed.len() == 2 {
        trimmed
    } else {
        // Try to map common state names to codes
        match trimmed.as_str() {
            "CALIFORNIA" => "CA".to_string(),
            "TEXAS" => "TX".to_string(),
            "NEW YORK" => "NY".to_string(),
            "FLORIDA" => "FL".to_string(),
            "ILLINOIS" => "IL".to_string(),
            "PENNSYLVANIA" => "PA".to_string(),
            "OHIO" => "OH".to_string(),
            "GEORGIA" => "GA".to_string(),
            "MICHIGAN" => "MI".to_string(),
            "NORTH CAROLINA" => "NC".to_string(),
            "NEW JERSEY" => "NJ".to_string(),
            "VIRGINIA" => "VA".to_string(),
            "WASHINGTON" => "WA".to_string(),
            "ARIZONA" => "AZ".to_string(),
            "MASSACHUSETTS" => "MA".to_string(),
            "TENNESSEE" => "TN".to_string(),
            "INDIANA" => "IN".to_string(),
            "MISSOURI" => "MO".to_string(),
            "MARYLAND" => "MD".to_string(),
            "WISCONSIN" => "WI".to_string(),
            "COLORADO" => "CO".to_string(),
            "MINNESOTA" => "MN".to_string(),
            "SOUTH CAROLINA" => "SC".to_string(),
            "ALABAMA" => "AL".to_string(),
            "LOUISIANA" => "LA".to_string(),
            "KENTUCKY" => "KY".to_string(),
            "OREGON" => "OR".to_string(),
            "OKLAHOMA" => "OK".to_string(),
            "CONNECTICUT" => "CT".to_string(),
            "IOWA" => "IA".to_string(),
            "UTAH" => "UT".to_string(),
            "NEVADA" => "NV".to_string(),
            "ARKANSAS" => "AR".to_string(),
            "MISSISSIPPI" => "MS".to_string(),
            "KANSAS" => "KS".to_string(),
            "NEW MEXICO" => "NM".to_string(),
            "NEBRASKA" => "NE".to_string(),
            "WEST VIRGINIA" => "WV".to_string(),
            "IDAHO" => "ID".to_string(),
            "HAWAII" => "HI".to_string(),
            "NEW HAMPSHIRE" => "NH".to_string(),
            "MAINE" => "ME".to_string(),
            "MONTANA" => "MT".to_string(),
            "RHODE ISLAND" => "RI".to_string(),
            "DELAWARE" => "DE".to_string(),
            "SOUTH DAKOTA" => "SD".to_string(),
            "NORTH DAKOTA" => "ND".to_string(),
            "ALASKA" => "AK".to_string(),
            "VERMONT" => "VT".to_string(),
            "WYOMING" => "WY".to_string(),
            "DISTRICT OF COLUMBIA" | "DC" | "D.C." => "DC".to_string(),
            _ => trimmed,
        }
    }
}

/// Normalize country code to 2-char ISO
pub fn clean_country_code(value: &str) -> String {
    let trimmed = value.trim().to_uppercase();
    match trimmed.as_str() {
        "USA" | "UNITED STATES" | "UNITED STATES OF AMERICA" => "US".to_string(),
        "CANADA" | "CAN" => "CA".to_string(),
        "UNITED KINGDOM" | "UK" | "GREAT BRITAIN" | "GB" => "GB".to_string(),
        "MEXICO" | "MEX" => "MX".to_string(),
        _ if trimmed.len() == 2 => trimmed,
        _ => trimmed,
    }
}

/// Normalize vendor keywords - uppercase, trim each, remove duplicates
pub fn clean_keywords(value: &str) -> String {
    let keywords: Vec<String> = value
        .split(',')
        .map(|k| k.trim().to_uppercase())
        .filter(|k| !k.is_empty())
        .collect::<HashSet<_>>()
        .into_iter()
        .collect();
    
    keywords.join(",")
}

/// Normalize barcode type to standard values
pub fn clean_barcode_type(value: &str) -> String {
    match value.trim().to_uppercase().as_str() {
        "UPC" | "UPC-A" | "UPCA" => "UPC-A".to_string(),
        "EAN" | "EAN-13" | "EAN13" => "EAN-13".to_string(),
        "CODE128" | "CODE-128" | "CODE 128" => "Code128".to_string(),
        "QR" | "QRCODE" | "QR-CODE" | "QR CODE" => "QR".to_string(),
        "" => String::new(),
        other => other.to_string(),
    }
}

/// Normalize pricing tier
pub fn clean_pricing_tier(value: &str) -> String {
    match value.trim().to_lowercase().as_str() {
        "retail" | "standard" | "regular" => "retail".to_string(),
        "wholesale" | "bulk" | "business" => "wholesale".to_string(),
        "vip" | "premium" | "gold" => "vip".to_string(),
        "" => "retail".to_string(),
        other => other.to_lowercase(),
    }
}

/// Normalize payment terms
pub fn clean_payment_terms(value: &str) -> String {
    let normalized = value.trim().to_lowercase();
    match normalized.as_str() {
        "net30" | "net 30" | "30 days" | "n30" => "Net 30".to_string(),
        "net15" | "net 15" | "15 days" | "n15" => "Net 15".to_string(),
        "net45" | "net 45" | "45 days" | "n45" => "Net 45".to_string(),
        "net60" | "net 60" | "60 days" | "n60" => "Net 60".to_string(),
        "cod" | "cash on delivery" => "COD".to_string(),
        "prepaid" | "prepay" | "advance" => "Prepaid".to_string(),
        "" => String::new(),
        _ => value.trim().to_string(),
    }
}

/// Normalize tax class
pub fn clean_tax_class(value: &str) -> String {
    match value.trim().to_lowercase().as_str() {
        "standard" | "taxable" | "default" => "standard".to_string(),
        "clothing" | "apparel" | "clothes" => "clothing".to_string(),
        "grocery" | "food" | "groceries" => "grocery".to_string(),
        "exempt" | "tax-exempt" | "non-taxable" | "nontaxable" => "exempt".to_string(),
        "" => String::new(),
        other => other.to_lowercase(),
    }
}

// =============================================================================
// Validation Functions
// =============================================================================

static EMAIL_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap()
});

static SKU_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[A-Za-z0-9\-_]+$").unwrap()
});

/// Validate email format
pub fn validate_email(value: &str) -> bool {
    if value.is_empty() {
        return true; // Empty is valid (optional field)
    }
    EMAIL_REGEX.is_match(value)
}

/// Validate SKU format
pub fn validate_sku(value: &str) -> bool {
    if value.is_empty() {
        return false; // SKU is required
    }
    SKU_REGEX.is_match(value) && value.len() <= 50
}

/// Validate barcode (8-14 digits)
pub fn validate_barcode(value: &str) -> bool {
    if value.is_empty() {
        return true; // Optional
    }
    let digits_only: String = value.chars().filter(|c| c.is_ascii_digit()).collect();
    digits_only.len() >= 8 && digits_only.len() <= 14
}

/// Validate barcode type enum
pub fn validate_barcode_type(value: &str) -> bool {
    if value.is_empty() {
        return true;
    }
    matches!(
        value.to_uppercase().as_str(),
        "UPC-A" | "EAN-13" | "CODE128" | "QR"
    )
}

/// Validate pricing tier enum
pub fn validate_pricing_tier(value: &str) -> bool {
    if value.is_empty() {
        return true;
    }
    matches!(
        value.to_lowercase().as_str(),
        "retail" | "wholesale" | "vip"
    )
}

/// Validate payment terms enum
pub fn validate_payment_terms(value: &str) -> bool {
    if value.is_empty() {
        return true;
    }
    matches!(
        value,
        "Net 15" | "Net 30" | "Net 45" | "Net 60" | "COD" | "Prepaid"
    )
}

/// Validate tax class enum
pub fn validate_tax_class(value: &str) -> bool {
    if value.is_empty() {
        return true;
    }
    matches!(
        value.to_lowercase().as_str(),
        "standard" | "clothing" | "grocery" | "exempt"
    )
}

/// Validate US ZIP code (5 or 9 digits)
pub fn validate_us_zip(value: &str) -> bool {
    if value.is_empty() {
        return true;
    }
    let digits_only: String = value.chars().filter(|c| c.is_ascii_digit()).collect();
    digits_only.len() == 5 || digits_only.len() == 9
}

/// Validate US state code (2 chars)
pub fn validate_us_state(value: &str) -> bool {
    if value.is_empty() {
        return true;
    }
    value.len() == 2 && value.chars().all(|c| c.is_ascii_alphabetic())
}

/// Validate country code (2 chars ISO)
pub fn validate_country_code(value: &str) -> bool {
    if value.is_empty() {
        return true;
    }
    value.len() == 2 && value.chars().all(|c| c.is_ascii_alphabetic())
}

/// Validate URL format
pub fn validate_url(value: &str) -> bool {
    if value.is_empty() {
        return true;
    }
    value.starts_with("https://") || value.starts_with("http://")
}

/// Validate tax ID format (XX-XXXXXXX for US EIN)
pub fn validate_tax_id(value: &str) -> bool {
    if value.is_empty() {
        return true;
    }
    // US EIN format: XX-XXXXXXX
    let parts: Vec<&str> = value.split('-').collect();
    if parts.len() == 2 {
        parts[0].len() == 2 
            && parts[0].chars().all(|c| c.is_ascii_digit())
            && parts[1].len() == 7 
            && parts[1].chars().all(|c| c.is_ascii_digit())
    } else {
        // Allow other formats
        true
    }
}

// =============================================================================
// Cross-Field Validation
// =============================================================================

/// Validate that unit_price >= cost
pub fn validate_price_cost_relationship(unit_price: f64, cost: f64) -> bool {
    unit_price >= cost
}

/// Validate that quantity is non-negative
pub fn validate_non_negative(value: f64) -> bool {
    value >= 0.0
}

// =============================================================================
// Duplicate Detection
// =============================================================================

/// Check for duplicate SKUs in a list
pub fn find_duplicate_skus(skus: &[(usize, String, String)]) -> Vec<(usize, String)> {
    let mut seen: std::collections::HashMap<(String, String), usize> = std::collections::HashMap::new();
    let mut duplicates = Vec::new();
    
    for (row, sku, store_id) in skus {
        let key = (sku.to_uppercase(), store_id.clone());
        if let Some(&first_row) = seen.get(&key) {
            duplicates.push((*row, format!("Duplicate SKU '{}' (first seen at row {})", sku, first_row)));
        } else {
            seen.insert(key, *row);
        }
    }
    
    duplicates
}

/// Check for duplicate vendor names
pub fn find_duplicate_vendor_names(names: &[(usize, String)]) -> Vec<(usize, String)> {
    let mut seen: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    let mut duplicates = Vec::new();
    
    for (row, name) in names {
        let key = name.to_lowercase();
        if let Some(&first_row) = seen.get(&key) {
            duplicates.push((*row, format!("Duplicate vendor name '{}' (first seen at row {})", name, first_row)));
        } else {
            seen.insert(key, *row);
        }
    }
    
    duplicates
}

/// Check for duplicate customer emails
pub fn find_duplicate_emails(emails: &[(usize, String)]) -> Vec<(usize, String)> {
    let mut seen: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    let mut duplicates = Vec::new();
    
    for (row, email) in emails {
        if email.is_empty() {
            continue;
        }
        let key = email.to_lowercase();
        if let Some(&first_row) = seen.get(&key) {
            duplicates.push((*row, format!("Duplicate email '{}' (first seen at row {})", email, first_row)));
        } else {
            seen.insert(key, *row);
        }
    }
    
    duplicates
}

// =============================================================================
// Cross-File Validation
// =============================================================================

/// Validate that vendor names in products exist in vendors list
pub fn validate_vendor_references(
    product_vendor_names: &[(usize, String)],
    vendor_names: &HashSet<String>,
) -> Vec<(usize, String)> {
    let mut missing = Vec::new();
    
    for (row, vendor_name) in product_vendor_names {
        if vendor_name.is_empty() {
            continue;
        }
        let normalized = vendor_name.to_lowercase();
        if !vendor_names.contains(&normalized) {
            missing.push((*row, format!("Vendor '{}' not found in vendors list", vendor_name)));
        }
    }
    
    missing
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_clean_email() {
        assert_eq!(clean_email("  Test@Example.COM  "), "test@example.com");
    }
    
    #[test]
    fn test_clean_phone() {
        assert_eq!(clean_phone("555-123-4567"), "5551234567");
        assert_eq!(clean_phone("+1 (555) 123-4567"), "+15551234567");
    }
    
    #[test]
    fn test_clean_boolean() {
        assert_eq!(clean_boolean("true"), Some(true));
        assert_eq!(clean_boolean("YES"), Some(true));
        assert_eq!(clean_boolean("1"), Some(true));
        assert_eq!(clean_boolean("false"), Some(false));
        assert_eq!(clean_boolean("NO"), Some(false));
        assert_eq!(clean_boolean("0"), Some(false));
        assert_eq!(clean_boolean(""), None);
    }
    
    #[test]
    fn test_clean_decimal() {
        assert_eq!(clean_decimal("$1,234.56").unwrap(), 1234.56);
        assert_eq!(clean_decimal("99.99").unwrap(), 99.99);
    }
    
    #[test]
    fn test_clean_sku() {
        assert_eq!(clean_sku("  demo elec 001  "), "DEMO-ELEC-001");
    }
    
    #[test]
    fn test_clean_state_code() {
        assert_eq!(clean_state_code("California"), "CA");
        assert_eq!(clean_state_code("TX"), "TX");
    }
    
    #[test]
    fn test_validate_email() {
        assert!(validate_email("test@example.com"));
        assert!(validate_email("")); // Empty is valid (optional)
        assert!(!validate_email("invalid"));
        assert!(!validate_email("test@"));
    }
    
    #[test]
    fn test_validate_barcode() {
        assert!(validate_barcode("012345678901")); // 12 digits
        assert!(validate_barcode("")); // Empty is valid
        assert!(!validate_barcode("12345")); // Too short
    }
    
    #[test]
    fn test_find_duplicate_skus() {
        let skus = vec![
            (2, "SKU-001".to_string(), "store-1".to_string()),
            (3, "SKU-002".to_string(), "store-1".to_string()),
            (4, "sku-001".to_string(), "store-1".to_string()), // Duplicate (case-insensitive)
            (5, "SKU-001".to_string(), "store-2".to_string()), // Not duplicate (different store)
        ];
        
        let duplicates = find_duplicate_skus(&skus);
        assert_eq!(duplicates.len(), 1);
        assert_eq!(duplicates[0].0, 4);
    }
}
