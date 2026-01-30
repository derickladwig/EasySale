/**
 * Transformation Functions
 * 
 * Built-in transformation functions for field mapping:
 * - dateFormat: Convert date formats
 * - concat: Concatenate fields
 * - split: Split strings
 * - lookup: Resolve IDs via mapping table
 * - String operations: uppercase, lowercase, trim, replace
 * 
 * Requirements: 3.4
 */

use chrono::{DateTime, NaiveDate};
use serde_json::Value;
use std::collections::HashMap;

/// Transformation context with access to ID mapper and other services
pub struct TransformationContext {
    pub id_mappings: HashMap<String, String>,
    pub tenant_id: String,
}

/// Registry for transformation functions
pub struct TransformationRegistry {
    context: Option<TransformationContext>,
}

impl TransformationRegistry {
    /// Create a new transformation registry
    pub fn new() -> Self {
        Self { context: None }
    }

    /// Create a registry with context
    pub fn with_context(context: TransformationContext) -> Self {
        Self {
            context: Some(context),
        }
    }

    /// Apply a transformation by name
    pub fn apply(&self, transform_name: &str, value: Value) -> Result<Value, String> {
        match transform_name {
            "uppercase" => TransformationFunctions::uppercase(&value),
            "lowercase" => TransformationFunctions::lowercase(&value),
            "trim" => TransformationFunctions::trim(&value),
            _ => {
                // For transformations that need parameters, parse the name
                if transform_name.starts_with("dateFormat(") {
                    Self::apply_date_format(transform_name, &value)
                } else if transform_name.starts_with("concat(") {
                    Self::apply_concat(transform_name, &value)
                } else if transform_name.starts_with("split(") {
                    Self::apply_split(transform_name, &value)
                } else if transform_name.starts_with("replace(") {
                    Self::apply_replace(transform_name, &value)
                } else if transform_name == "lookupQBOCustomer" {
                    self.apply_lookup_customer(&value)
                } else if transform_name == "lookupQBOItem" {
                    self.apply_lookup_item(&value)
                } else if transform_name == "mapLineItems" {
                    self.apply_map_line_items(&value)
                } else {
                    Err(format!("Unknown transformation: {}", transform_name))
                }
            }
        }
    }

    fn apply_date_format(transform_name: &str, value: &Value) -> Result<Value, String> {
        // Parse: dateFormat(from, to)
        let params = Self::parse_params(transform_name)?;
        if params.len() != 2 {
            return Err("dateFormat requires 2 parameters: from_format, to_format".to_string());
        }
        TransformationFunctions::date_format(value, &params[0], &params[1])
    }

    fn apply_concat(transform_name: &str, value: &Value) -> Result<Value, String> {
        // Parse: concat(separator)
        let params = Self::parse_params(transform_name)?;
        if params.is_empty() {
            return Err("concat requires 1 parameter: separator".to_string());
        }
        
        // Value should be an array
        let values = value.as_array()
            .ok_or_else(|| "concat requires an array value".to_string())?;
        
        TransformationFunctions::concat(values, &params[0])
    }

    fn apply_split(transform_name: &str, value: &Value) -> Result<Value, String> {
        // Parse: split(delimiter, index)
        let params = Self::parse_params(transform_name)?;
        if params.len() != 2 {
            return Err("split requires 2 parameters: delimiter, index".to_string());
        }
        
        let index = params[1].parse::<usize>()
            .map_err(|_| "split index must be a number".to_string())?;
        
        TransformationFunctions::split(value, &params[0], index)
    }

    fn apply_replace(transform_name: &str, value: &Value) -> Result<Value, String> {
        // Parse: replace(from, to)
        let params = Self::parse_params(transform_name)?;
        if params.len() != 2 {
            return Err("replace requires 2 parameters: from, to".to_string());
        }
        TransformationFunctions::replace(value, &params[0], &params[1])
    }

    fn apply_lookup_customer(&self, value: &Value) -> Result<Value, String> {
        let context = self.context.as_ref()
            .ok_or_else(|| "lookupQBOCustomer requires transformation context".to_string())?;
        TransformationFunctions::lookup_qbo_customer(value, context)
    }

    fn apply_lookup_item(&self, value: &Value) -> Result<Value, String> {
        let context = self.context.as_ref()
            .ok_or_else(|| "lookupQBOItem requires transformation context".to_string())?;
        TransformationFunctions::lookup_qbo_item(value, context)
    }

    fn apply_map_line_items(&self, value: &Value) -> Result<Value, String> {
        let context = self.context.as_ref()
            .ok_or_else(|| "mapLineItems requires transformation context".to_string())?;
        TransformationFunctions::map_line_items(value, context)
    }

    /// Parse parameters from transformation name
    /// Example: "dateFormat(ISO8601, YYYY-MM-DD)" -> ["ISO8601", "YYYY-MM-DD"]
    fn parse_params(transform_name: &str) -> Result<Vec<String>, String> {
        let start = transform_name.find('(')
            .ok_or_else(|| "Invalid transformation format".to_string())?;
        let end = transform_name.rfind(')')
            .ok_or_else(|| "Invalid transformation format".to_string())?;
        
        let params_str = &transform_name[start + 1..end];
        let params: Vec<String> = params_str
            .split(',')
            .map(|s| s.trim().to_string())
            .collect();
        
        Ok(params)
    }
}

impl Default for TransformationRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Transformation functions
pub struct TransformationFunctions;

impl TransformationFunctions {
    /// Convert date format from ISO8601 to YYYY-MM-DD
    pub fn date_format(value: &Value, from_format: &str, to_format: &str) -> Result<Value, String> {
        let date_str = value.as_str()
            .ok_or_else(|| "Value is not a string".to_string())?;

        match from_format {
            "ISO8601" | "iso8601" => {
                // Parse ISO8601 datetime
                let dt = DateTime::parse_from_rfc3339(date_str)
                    .map_err(|e| format!("Failed to parse ISO8601 date: {}", e))?;

                match to_format {
                    "YYYY-MM-DD" => Ok(Value::String(dt.format("%Y-%m-%d").to_string())),
                    "MM/DD/YYYY" => Ok(Value::String(dt.format("%m/%d/%Y").to_string())),
                    "DD-MM-YYYY" => Ok(Value::String(dt.format("%d-%m-%Y").to_string())),
                    _ => Err(format!("Unsupported target format: {}", to_format)),
                }
            }
            "YYYY-MM-DD" => {
                // Parse YYYY-MM-DD date
                let date = NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
                    .map_err(|e| format!("Failed to parse YYYY-MM-DD date: {}", e))?;

                match to_format {
                    "ISO8601" => {
                        let dt = date.and_hms_opt(0, 0, 0)
                            .ok_or_else(|| "Failed to create datetime".to_string())?;
                        Ok(Value::String(dt.format("%Y-%m-%dT%H:%M:%SZ").to_string()))
                    }
                    "MM/DD/YYYY" => Ok(Value::String(date.format("%m/%d/%Y").to_string())),
                    _ => Err(format!("Unsupported target format: {}", to_format)),
                }
            }
            _ => Err(format!("Unsupported source format: {}", from_format)),
        }
    }

    /// Concatenate multiple field values
    pub fn concat(values: &[Value], separator: &str) -> Result<Value, String> {
        let strings: Vec<String> = values
            .iter()
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect();

        if strings.is_empty() {
            return Err("No valid string values to concatenate".to_string());
        }

        Ok(Value::String(strings.join(separator)))
    }

    /// Split a string into parts
    pub fn split(value: &Value, delimiter: &str, index: usize) -> Result<Value, String> {
        let string = value.as_str()
            .ok_or_else(|| "Value is not a string".to_string())?;

        let parts: Vec<&str> = string.split(delimiter).collect();
        
        parts.get(index)
            .map(|s| Value::String(s.to_string()))
            .ok_or_else(|| format!("Index {} out of bounds", index))
    }

    /// Convert to uppercase
    pub fn uppercase(value: &Value) -> Result<Value, String> {
        let string = value.as_str()
            .ok_or_else(|| "Value is not a string".to_string())?;
        Ok(Value::String(string.to_uppercase()))
    }

    /// Convert to lowercase
    pub fn lowercase(value: &Value) -> Result<Value, String> {
        let string = value.as_str()
            .ok_or_else(|| "Value is not a string".to_string())?;
        Ok(Value::String(string.to_lowercase()))
    }

    /// Trim whitespace
    pub fn trim(value: &Value) -> Result<Value, String> {
        let string = value.as_str()
            .ok_or_else(|| "Value is not a string".to_string())?;
        Ok(Value::String(string.trim().to_string()))
    }

    /// Replace substring
    pub fn replace(value: &Value, from: &str, to: &str) -> Result<Value, String> {
        let string = value.as_str()
            .ok_or_else(|| "Value is not a string".to_string())?;
        Ok(Value::String(string.replace(from, to)))
    }

    /// Lookup QuickBooks Customer ID by email
    pub fn lookup_qbo_customer(
        email: &Value,
        context: &TransformationContext,
    ) -> Result<Value, String> {
        let email_str = email.as_str()
            .ok_or_else(|| "Email is not a string".to_string())?;

        let key = format!("woocommerce:customer:{}:quickbooks", email_str);
        
        context.id_mappings
            .get(&key)
            .map(|id| Value::String(id.clone()))
            .ok_or_else(|| format!("No QuickBooks customer mapping found for email: {}", email_str))
    }

    /// Lookup QuickBooks Item ID by SKU
    pub fn lookup_qbo_item(
        sku: &Value,
        context: &TransformationContext,
    ) -> Result<Value, String> {
        let sku_str = sku.as_str()
            .ok_or_else(|| "SKU is not a string".to_string())?;

        let key = format!("woocommerce:product:{}:quickbooks", sku_str);
        
        context.id_mappings
            .get(&key)
            .map(|id| Value::String(id.clone()))
            .ok_or_else(|| format!("No QuickBooks item mapping found for SKU: {}", sku_str))
    }

    /// Map WooCommerce line items to QuickBooks Line array
    pub fn map_line_items(
        line_items: &Value,
        context: &TransformationContext,
    ) -> Result<Value, String> {
        let items = line_items.as_array()
            .ok_or_else(|| "Line items is not an array".to_string())?;

        let mut qbo_lines = Vec::new();

        for (index, item) in items.iter().enumerate() {
            let sku = item.get("sku")
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("Line item {} missing SKU", index))?;

            let quantity = item.get("quantity")
                .and_then(|v| v.as_f64())
                .ok_or_else(|| format!("Line item {} missing quantity", index))?;

            let unit_price = item.get("price")
                .or_else(|| item.get("unit_price"))
                .and_then(|v| v.as_f64())
                .ok_or_else(|| format!("Line item {} missing price", index))?;

            let total = item.get("total")
                .and_then(|v| v.as_f64())
                .unwrap_or(quantity * unit_price);

            // Lookup QuickBooks Item ID
            let item_id = Self::lookup_qbo_item(&Value::String(sku.to_string()), context)?;

            let qbo_line = serde_json::json!({
                "LineNum": index + 1,
                "Amount": total,
                "DetailType": "SalesItemLineDetail",
                "SalesItemLineDetail": {
                    "ItemRef": {
                        "value": item_id
                    },
                    "UnitPrice": unit_price,
                    "Qty": quantity
                }
            });

            qbo_lines.push(qbo_line);
        }

        Ok(Value::Array(qbo_lines))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_date_format_iso_to_ymd() {
        let value = json!("2024-01-15T10:30:00Z");
        let result = TransformationFunctions::date_format(&value, "ISO8601", "YYYY-MM-DD");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!("2024-01-15"));
    }

    #[test]
    fn test_date_format_ymd_to_iso() {
        let value = json!("2024-01-15");
        let result = TransformationFunctions::date_format(&value, "YYYY-MM-DD", "ISO8601");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!("2024-01-15T00:00:00Z"));
    }

    #[test]
    fn test_concat() {
        let values = vec![json!("John"), json!("Doe")];
        let result = TransformationFunctions::concat(&values, " ");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!("John Doe"));
    }

    #[test]
    fn test_split() {
        let value = json!("John,Doe,Smith");
        let result = TransformationFunctions::split(&value, ",", 1);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!("Doe"));
    }

    #[test]
    fn test_uppercase() {
        let value = json!("hello world");
        let result = TransformationFunctions::uppercase(&value);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!("HELLO WORLD"));
    }

    #[test]
    fn test_lowercase() {
        let value = json!("HELLO WORLD");
        let result = TransformationFunctions::lowercase(&value);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!("hello world"));
    }

    #[test]
    fn test_trim() {
        let value = json!("  hello world  ");
        let result = TransformationFunctions::trim(&value);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!("hello world"));
    }

    #[test]
    fn test_replace() {
        let value = json!("hello world");
        let result = TransformationFunctions::replace(&value, "world", "Rust");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!("hello Rust"));
    }

    #[test]
    fn test_lookup_qbo_customer() {
        let mut mappings = HashMap::new();
        mappings.insert(
            "woocommerce:customer:john@example.com:quickbooks".to_string(),
            "123".to_string(),
        );

        let context = TransformationContext {
            id_mappings: mappings,
            tenant_id: "tenant-1".to_string(),
        };

        let email = json!("john@example.com");
        let result = TransformationFunctions::lookup_qbo_customer(&email, &context);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!("123"));
    }

    #[test]
    fn test_map_line_items() {
        let mut mappings = HashMap::new();
        mappings.insert(
            "woocommerce:product:SKU123:quickbooks".to_string(),
            "456".to_string(),
        );

        let context = TransformationContext {
            id_mappings: mappings,
            tenant_id: "tenant-1".to_string(),
        };

        let line_items = json!([
            {
                "sku": "SKU123",
                "quantity": 2.0,
                "unit_price": 10.0,
                "total": 20.0
            }
        ]);

        let result = TransformationFunctions::map_line_items(&line_items, &context);
        assert!(result.is_ok());
        
        let lines = result.unwrap();
        assert!(lines.is_array());
        let lines_array = lines.as_array().unwrap();
        assert_eq!(lines_array.len(), 1);
        
        let first_line = &lines_array[0];
        assert_eq!(first_line["Amount"], json!(20.0));
        assert_eq!(first_line["SalesItemLineDetail"]["Qty"], json!(2.0));
    }

    #[test]
    fn test_registry_uppercase() {
        let registry = TransformationRegistry::new();
        let value = json!("hello");
        let result = registry.apply("uppercase", value);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!("HELLO"));
    }

    #[test]
    fn test_registry_date_format() {
        let registry = TransformationRegistry::new();
        let value = json!("2024-01-15T10:30:00Z");
        let result = registry.apply("dateFormat(ISO8601, YYYY-MM-DD)", value);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!("2024-01-15"));
    }

    #[test]
    fn test_registry_split() {
        let registry = TransformationRegistry::new();
        let value = json!("a,b,c");
        let result = registry.apply("split(,, 1)", value);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!("b"));
    }

    #[test]
    fn test_registry_unknown_transformation() {
        let registry = TransformationRegistry::new();
        let value = json!("test");
        let result = registry.apply("unknownTransform", value);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unknown transformation"));
    }
}
