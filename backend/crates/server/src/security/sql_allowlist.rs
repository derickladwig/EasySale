/// SQL Identifier Allowlist Enforcement
/// 
/// This module provides allowlist-based validation for SQL table and column names
/// to prevent SQL injection attacks through dynamic query construction.
/// 
/// **Security Requirement 5.2, 5.5**: Table and column names must come from
/// predefined allowlists, never from user-controlled input.

use std::error::Error;
use std::fmt;

/// Error type for SQL identifier validation failures
#[derive(Debug, Clone)]
pub enum SqlIdentifierError {
    InvalidTableName(String),
    InvalidColumnName(String),
}

impl fmt::Display for SqlIdentifierError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SqlIdentifierError::InvalidTableName(name) => {
                write!(f, "Invalid table name: '{}' is not in the allowlist", name)
            }
            SqlIdentifierError::InvalidColumnName(name) => {
                write!(f, "Invalid column name: '{}' is not in the allowlist", name)
            }
        }
    }
}

impl Error for SqlIdentifierError {}

/// Allowed table names for dynamic SQL queries
/// 
/// Only these table names are permitted in dynamic SQL construction.
/// This prevents SQL injection through table name manipulation.
pub const ALLOWED_TABLES: &[&str] = &[
    "products",
    "sales",
    "sales_items",
    "customers",
    "inventory",
    "users",
    "stores",
    "tenants",
    "categories",
    "vendors",
    "vendor_bills",
    "vendor_bill_lines",
    "backups",
    "sync_queue",
    "sync_logs",
    "settings",
    "feature_flags",
    "sessions",
    "audit_logs",
];

/// Allowed column names for dynamic SQL queries
/// 
/// Only these column names are permitted in dynamic SQL construction.
/// This prevents SQL injection through column name manipulation.
pub const ALLOWED_COLUMNS: &[&str] = &[
    "id",
    "name",
    "sku",
    "price",
    "cost",
    "quantity",
    "description",
    "category",
    "brand",
    "created_at",
    "updated_at",
    "deleted_at",
    "tenant_id",
    "store_id",
    "user_id",
    "customer_id",
    "product_id",
    "vendor_id",
    "status",
    "total",
    "subtotal",
    "tax",
    "discount",
    "email",
    "phone",
    "address",
    "city",
    "state",
    "zip",
    "country",
    "is_active",
    "role",
    "username",
    "first_name",
    "last_name",
    "display_name",
];

/// Validate that a table name is in the allowlist
/// 
/// # Examples
/// 
/// ```
/// use server::security::sql_allowlist::validate_table_name;
/// 
/// assert!(validate_table_name("products").is_ok());
/// assert!(validate_table_name("customers").is_ok());
/// assert!(validate_table_name("malicious_table").is_err());
/// ```
pub fn validate_table_name(name: &str) -> Result<(), SqlIdentifierError> {
    if ALLOWED_TABLES.contains(&name) {
        Ok(())
    } else {
        Err(SqlIdentifierError::InvalidTableName(name.to_string()))
    }
}

/// Validate that a column name is in the allowlist
/// 
/// # Examples
/// 
/// ```
/// use server::security::sql_allowlist::validate_column_name;
/// 
/// assert!(validate_column_name("name").is_ok());
/// assert!(validate_column_name("price").is_ok());
/// assert!(validate_column_name("malicious_column").is_err());
/// ```
pub fn validate_column_name(name: &str) -> Result<(), SqlIdentifierError> {
    if ALLOWED_COLUMNS.contains(&name) {
        Ok(())
    } else {
        Err(SqlIdentifierError::InvalidColumnName(name.to_string()))
    }
}

/// Build a safe SELECT query with validated identifiers
/// 
/// This function constructs a SELECT query with allowlist-validated
/// table and column names.
/// 
/// # Examples
/// 
/// ```
/// use server::security::sql_allowlist::build_select_query;
/// 
/// let query = build_select_query("products", &["name", "price"]).unwrap();
/// assert_eq!(query, "SELECT name, price FROM products");
/// ```
pub fn build_select_query(
    table: &str,
    columns: &[&str],
) -> Result<String, SqlIdentifierError> {
    // Validate table name
    validate_table_name(table)?;
    
    // Validate all column names
    for column in columns {
        validate_column_name(column)?;
    }
    
    // Build query
    let column_list = columns.join(", ");
    Ok(format!("SELECT {} FROM {}", column_list, table))
}

/// Build a safe WHERE clause with validated column names
/// 
/// This function constructs a WHERE clause with allowlist-validated
/// column names. Values should be parameterized separately.
/// 
/// # Examples
/// 
/// ```
/// use server::security::sql_allowlist::build_where_clause;
/// 
/// let where_clause = build_where_clause(&["name", "category"]).unwrap();
/// assert_eq!(where_clause, "WHERE name = ? AND category = ?");
/// ```
pub fn build_where_clause(columns: &[&str]) -> Result<String, SqlIdentifierError> {
    // Validate all column names
    for column in columns {
        validate_column_name(column)?;
    }
    
    // Build WHERE clause with placeholders
    let conditions: Vec<String> = columns
        .iter()
        .map(|col| format!("{} = ?", col))
        .collect();
    
    Ok(format!("WHERE {}", conditions.join(" AND ")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_table_name_valid() {
        assert!(validate_table_name("products").is_ok());
        assert!(validate_table_name("customers").is_ok());
        assert!(validate_table_name("sales").is_ok());
        assert!(validate_table_name("users").is_ok());
    }

    #[test]
    fn test_validate_table_name_invalid() {
        assert!(validate_table_name("malicious_table").is_err());
        assert!(validate_table_name("DROP TABLE").is_err());
        assert!(validate_table_name("'; DROP TABLE users; --").is_err());
    }

    #[test]
    fn test_validate_column_name_valid() {
        assert!(validate_column_name("name").is_ok());
        assert!(validate_column_name("price").is_ok());
        assert!(validate_column_name("quantity").is_ok());
        assert!(validate_column_name("created_at").is_ok());
    }

    #[test]
    fn test_validate_column_name_invalid() {
        assert!(validate_column_name("malicious_column").is_err());
        assert!(validate_column_name("'; DROP TABLE").is_err());
        assert!(validate_column_name("1=1; --").is_err());
    }

    #[test]
    fn test_build_select_query_valid() {
        let query = build_select_query("products", &["name", "price"]).unwrap();
        assert_eq!(query, "SELECT name, price FROM products");
    }

    #[test]
    fn test_build_select_query_invalid_table() {
        let result = build_select_query("malicious_table", &["name"]);
        assert!(result.is_err());
    }

    #[test]
    fn test_build_select_query_invalid_column() {
        let result = build_select_query("products", &["malicious_column"]);
        assert!(result.is_err());
    }

    #[test]
    fn test_build_where_clause_valid() {
        let where_clause = build_where_clause(&["name", "category"]).unwrap();
        assert_eq!(where_clause, "WHERE name = ? AND category = ?");
    }

    #[test]
    fn test_build_where_clause_invalid() {
        let result = build_where_clause(&["malicious_column"]);
        assert!(result.is_err());
    }

    #[test]
    fn test_injection_attempt_table() {
        let malicious_table = "products; DROP TABLE users; --";
        let result = validate_table_name(malicious_table);
        assert!(result.is_err());
    }

    #[test]
    fn test_injection_attempt_column() {
        let malicious_column = "name; DELETE FROM products; --";
        let result = validate_column_name(malicious_column);
        assert!(result.is_err());
    }

    #[test]
    fn test_error_display() {
        let table_error = SqlIdentifierError::InvalidTableName("bad_table".to_string());
        assert_eq!(
            format!("{}", table_error),
            "Invalid table name: 'bad_table' is not in the allowlist"
        );

        let column_error = SqlIdentifierError::InvalidColumnName("bad_column".to_string());
        assert_eq!(
            format!("{}", column_error),
            "Invalid column name: 'bad_column' is not in the allowlist"
        );
    }
}
