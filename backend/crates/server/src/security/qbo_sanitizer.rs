/// QuickBooks Online Query Language Input Sanitization
/// 
/// This module provides sanitization functions for user-provided values
/// used in QuickBooks Online (QBO) query language queries.
/// 
/// **Security Requirement 5.1**: All user-provided values must be escaped
/// or sanitized before constructing QBO queries to prevent injection attacks.

/// Sanitize a value for use in QuickBooks Online query language
/// 
/// QBO query language uses single quotes to delimit string values.
/// To escape a single quote, it must be doubled (e.g., "O'Brien" becomes "O''Brien").
/// 
/// # Examples
/// 
/// ```
/// use server::security::qbo_sanitizer::sanitize_qbo_query_value;
/// 
/// assert_eq!(sanitize_qbo_query_value("John"), "John");
/// assert_eq!(sanitize_qbo_query_value("O'Brien"), "O''Brien");
/// assert_eq!(sanitize_qbo_query_value("It's a test"), "It''s a test");
/// ```
pub fn sanitize_qbo_query_value(value: &str) -> String {
    // Escape single quotes by doubling them (QBO query language standard)
    value.replace('\'', "''")
}

/// Build a safe QBO query with sanitized values
/// 
/// This function constructs a QBO query string with properly sanitized values.
/// 
/// # Examples
/// 
/// ```
/// use server::security::qbo_sanitizer::build_qbo_query;
/// 
/// let query = build_qbo_query("Customer", "DisplayName", "O'Brien");
/// assert_eq!(query, "SELECT * FROM Customer WHERE DisplayName = 'O''Brien'");
/// ```
pub fn build_qbo_query(entity: &str, field: &str, value: &str) -> String {
    let sanitized_value = sanitize_qbo_query_value(value);
    format!("SELECT * FROM {} WHERE {} = '{}'", entity, field, sanitized_value)
}

/// Build a safe QBO query with multiple conditions
/// 
/// This function constructs a QBO query with multiple WHERE conditions,
/// all with properly sanitized values.
/// 
/// # Examples
/// 
/// ```
/// use server::security::qbo_sanitizer::build_qbo_query_multi;
/// 
/// let conditions = vec![
///     ("DisplayName", "O'Brien"),
///     ("CompanyName", "Bob's Hardware"),
/// ];
/// let query = build_qbo_query_multi("Customer", &conditions);
/// assert_eq!(
///     query,
///     "SELECT * FROM Customer WHERE DisplayName = 'O''Brien' AND CompanyName = 'Bob''s Hardware'"
/// );
/// ```
pub fn build_qbo_query_multi(entity: &str, conditions: &[(&str, &str)]) -> String {
    let where_clauses: Vec<String> = conditions
        .iter()
        .map(|(field, value)| {
            let sanitized_value = sanitize_qbo_query_value(value);
            format!("{} = '{}'", field, sanitized_value)
        })
        .collect();
    
    format!("SELECT * FROM {} WHERE {}", entity, where_clauses.join(" AND "))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_simple_string() {
        assert_eq!(sanitize_qbo_query_value("John"), "John");
        assert_eq!(sanitize_qbo_query_value("Smith"), "Smith");
        assert_eq!(sanitize_qbo_query_value("123"), "123");
    }

    #[test]
    fn test_sanitize_single_quote() {
        assert_eq!(sanitize_qbo_query_value("O'Brien"), "O''Brien");
        assert_eq!(sanitize_qbo_query_value("It's"), "It''s");
        assert_eq!(sanitize_qbo_query_value("'quoted'"), "''quoted''");
    }

    #[test]
    fn test_sanitize_multiple_quotes() {
        assert_eq!(
            sanitize_qbo_query_value("It's Bob's store"),
            "It''s Bob''s store"
        );
        assert_eq!(
            sanitize_qbo_query_value("'multiple' 'quotes'"),
            "''multiple'' ''quotes''"
        );
    }

    #[test]
    fn test_sanitize_special_characters() {
        // Other special characters should pass through unchanged
        assert_eq!(sanitize_qbo_query_value("test@example.com"), "test@example.com");
        assert_eq!(sanitize_qbo_query_value("$100.00"), "$100.00");
        assert_eq!(sanitize_qbo_query_value("50%"), "50%");
        assert_eq!(sanitize_qbo_query_value("a & b"), "a & b");
    }

    #[test]
    fn test_sanitize_empty_string() {
        assert_eq!(sanitize_qbo_query_value(""), "");
    }

    #[test]
    fn test_build_qbo_query_simple() {
        let query = build_qbo_query("Customer", "DisplayName", "John Smith");
        assert_eq!(query, "SELECT * FROM Customer WHERE DisplayName = 'John Smith'");
    }

    #[test]
    fn test_build_qbo_query_with_quotes() {
        let query = build_qbo_query("Customer", "DisplayName", "O'Brien");
        assert_eq!(query, "SELECT * FROM Customer WHERE DisplayName = 'O''Brien'");
    }

    #[test]
    fn test_build_qbo_query_multi_simple() {
        let conditions = vec![
            ("DisplayName", "John Smith"),
            ("CompanyName", "Acme Corp"),
        ];
        let query = build_qbo_query_multi("Customer", &conditions);
        assert_eq!(
            query,
            "SELECT * FROM Customer WHERE DisplayName = 'John Smith' AND CompanyName = 'Acme Corp'"
        );
    }

    #[test]
    fn test_build_qbo_query_multi_with_quotes() {
        let conditions = vec![
            ("DisplayName", "O'Brien"),
            ("CompanyName", "Bob's Hardware"),
        ];
        let query = build_qbo_query_multi("Customer", &conditions);
        assert_eq!(
            query,
            "SELECT * FROM Customer WHERE DisplayName = 'O''Brien' AND CompanyName = 'Bob''s Hardware'"
        );
    }

    #[test]
    fn test_injection_attempt() {
        // Test that injection attempts are properly escaped
        let malicious_input = "'; DROP TABLE Customer; --";
        let sanitized = sanitize_qbo_query_value(malicious_input);
        assert_eq!(sanitized, "''; DROP TABLE Customer; --");
        
        let query = build_qbo_query("Customer", "DisplayName", malicious_input);
        assert_eq!(
            query,
            "SELECT * FROM Customer WHERE DisplayName = '''; DROP TABLE Customer; --'"
        );
    }
}
