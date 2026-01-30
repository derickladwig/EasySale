use crate::config::models::{AttributeConfig, CategoryConfig};
use crate::models::{ValidationError};
use regex::Regex;
use serde_json::Value as JsonValue;

/// Attribute validator service
/// Validates product attributes against category configuration
pub struct AttributeValidator;

impl AttributeValidator {
    /// Validate product attributes against category configuration
    pub fn validate(
        category_config: &CategoryConfig,
        attributes: &JsonValue,
    ) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();

        // Ensure attributes is an object
        if !attributes.is_object() {
            errors.push(ValidationError {
                field: "attributes".to_string(),
                message: "Attributes must be a JSON object".to_string(), code: None,
            });
            return Err(errors);
        }

        let attrs_obj = attributes.as_object().unwrap();

        // Validate each configured attribute
        for attr_config in &category_config.attributes {
            let value = attrs_obj.get(&attr_config.name);

            // Check required
            if attr_config.required.unwrap_or(false) && value.is_none() {
                errors.push(ValidationError {
                    field: attr_config.name.clone(),
                    message: format!(
                        "{} is required",
                        attr_config.label.as_ref().unwrap_or(&attr_config.name)
                    ),
                    code: Some("REQUIRED".to_string()),
                });
                continue;
            }

            // If value is present, validate it
            if let Some(value) = value {
                Self::validate_attribute_value(attr_config, value, &mut errors);
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }

    /// Validate a single attribute value against its configuration
    fn validate_attribute_value(
        attr_config: &AttributeConfig,
        value: &JsonValue,
        errors: &mut Vec<ValidationError>,
    ) {
        let label = attr_config.label.as_ref().unwrap_or(&attr_config.name);

        match attr_config.attr_type.as_str() {
            "text" => Self::validate_text(attr_config, value, label, errors),
            "number" => Self::validate_number(attr_config, value, label, errors),
            "dropdown" => Self::validate_dropdown(attr_config, value, label, errors),
            "boolean" => Self::validate_boolean(attr_config, value, label, errors),
            "date" => Self::validate_date(attr_config, value, label, errors),
            "hierarchy" => Self::validate_hierarchy(attr_config, value, label, errors),
            _ => {
                // Unknown type - just check it's not null
                if value.is_null() {
                    errors.push(ValidationError {
                        field: attr_config.name.clone(),
                        message: format!("{} cannot be null", label), code: None
                    });
                }
            }
        }
    }

    /// Validate text attribute
    fn validate_text(
        attr_config: &AttributeConfig,
        value: &JsonValue,
        label: &str,
        errors: &mut Vec<ValidationError>,
    ) {
        if !value.is_string() {
            errors.push(ValidationError {
                field: attr_config.name.clone(),
                message: format!("{} must be text", label), code: None
            });
            return;
        }

        let text = value.as_str().unwrap();

        // Pattern validation
        if let Some(pattern) = &attr_config.pattern {
            match Regex::new(pattern) {
                Ok(regex) => {
                    if !regex.is_match(text) {
                        errors.push(ValidationError {
                            field: attr_config.name.clone(),
                            message: format!("{} format is invalid", label), code: None
                        });
                    }
                }
                Err(_) => {
                    errors.push(ValidationError {
                        field: attr_config.name.clone(),
                        message: format!("Invalid regex pattern for {}", label), code: None
                    });
                }
            }
        }
    }

    /// Validate number attribute
    fn validate_number(
        attr_config: &AttributeConfig,
        value: &JsonValue,
        label: &str,
        errors: &mut Vec<ValidationError>,
    ) {
        if !value.is_number() {
            errors.push(ValidationError {
                field: attr_config.name.clone(),
                message: format!("{} must be a number", label), code: None
            });
            return;
        }

        let num = value.as_f64().unwrap();

        // Min validation
        if let Some(min) = attr_config.min {
            if num < min {
                errors.push(ValidationError {
                    field: attr_config.name.clone(),
                    message: format!("{} must be at least {}", label, min), code: None
                });
            }
        }

        // Max validation
        if let Some(max) = attr_config.max {
            if num > max {
                errors.push(ValidationError {
                    field: attr_config.name.clone(),
                    message: format!("{} must be at most {}", label, max), code: None
                });
            }
        }
    }

    /// Validate dropdown attribute
    fn validate_dropdown(
        attr_config: &AttributeConfig,
        value: &JsonValue,
        label: &str,
        errors: &mut Vec<ValidationError>,
    ) {
        if !value.is_string() {
            errors.push(ValidationError {
                field: attr_config.name.clone(),
                message: format!("{} must be text", label), code: None
            });
            return;
        }

        if let Some(values) = &attr_config.values {
            let selected = value.as_str().unwrap();
            if !values.contains(&selected.to_string()) {
                errors.push(ValidationError {
                    field: attr_config.name.clone(),
                    message: format!("{} must be one of: {}", label, values.join(", ")), code: None
                });
            }
        }
    }

    /// Validate boolean attribute
    fn validate_boolean(
        attr_config: &AttributeConfig,
        value: &JsonValue,
        label: &str,
        errors: &mut Vec<ValidationError>,
    ) {
        if !value.is_boolean() {
            errors.push(ValidationError {
                field: attr_config.name.clone(),
                message: format!("{} must be true or false", label), code: None
            });
        }
    }

    /// Validate date attribute
    fn validate_date(
        attr_config: &AttributeConfig,
        value: &JsonValue,
        label: &str,
        errors: &mut Vec<ValidationError>,
    ) {
        if !value.is_string() {
            errors.push(ValidationError {
                field: attr_config.name.clone(),
                message: format!("{} must be a date string", label), code: None
            });
            return;
        }

        // Basic ISO 8601 date validation
        let date_str = value.as_str().unwrap();
        let date_regex = Regex::new(r"^\d{4}-\d{2}-\d{2}").unwrap();
        if !date_regex.is_match(date_str) {
            errors.push(ValidationError {
                field: attr_config.name.clone(),
                message: format!("{} must be in ISO 8601 format (YYYY-MM-DD)", label), code: None
            });
        }
    }

    /// Validate hierarchy attribute (nested object)
    fn validate_hierarchy(
        attr_config: &AttributeConfig,
        value: &JsonValue,
        label: &str,
        errors: &mut Vec<ValidationError>,
    ) {
        if !value.is_object() {
            errors.push(ValidationError {
                field: attr_config.name.clone(),
                message: format!("{} must be an object", label), code: None
            });
        }
        // Additional hierarchy validation could be added here
        // For now, we just ensure it's an object
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn create_test_category() -> CategoryConfig {
        CategoryConfig {
            id: "test-category".to_string(),
            name: "Test Category".to_string(),
            icon: None,
            color: None,
            description: None,
            parent: None,
            order: None,
            attributes: vec![
                AttributeConfig {
                    name: "color".to_string(),
                    label: Some("Color".to_string()),
                    attr_type: "text".to_string(),
                    required: Some(true),
                    unique: None,
                    values: None,
                    hierarchy_source: None,
                    min: None,
                    max: None,
                    pattern: None,
                    default: None,
                    placeholder: None,
                    help_text: None,
                },
                AttributeConfig {
                    name: "size".to_string(),
                    label: Some("Size".to_string()),
                    attr_type: "dropdown".to_string(),
                    required: Some(false),
                    unique: None,
                    values: Some(vec!["S".to_string(), "M".to_string(), "L".to_string()]),
                    hierarchy_source: None,
                    min: None,
                    max: None,
                    pattern: None,
                    default: None,
                    placeholder: None,
                    help_text: None,
                },
                AttributeConfig {
                    name: "price".to_string(),
                    label: Some("Price".to_string()),
                    attr_type: "number".to_string(),
                    required: Some(true),
                    unique: None,
                    values: None,
                    hierarchy_source: None,
                    min: Some(0.0),
                    max: Some(1000.0),
                    pattern: None,
                    default: None,
                    placeholder: None,
                    help_text: None,
                },
            ],
            search_fields: None,
            display_template: None,
            filters: None,
            wizard: None,
        }
    }

    #[test]
    fn test_valid_attributes() {
        let category = create_test_category();
        let attributes = json!({
            "color": "red",
            "size": "M",
            "price": 50.0
        });

        let result = AttributeValidator::validate(&category, &attributes);
        assert!(result.is_ok());
    }

    #[test]
    fn test_missing_required_attribute() {
        let category = create_test_category();
        let attributes = json!({
            "size": "M"
            // Missing required "color" and "price"
        });

        let result = AttributeValidator::validate(&category, &attributes);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert_eq!(errors.len(), 2); // color and price are required
    }

    #[test]
    fn test_invalid_dropdown_value() {
        let category = create_test_category();
        let attributes = json!({
            "color": "red",
            "size": "XL", // Invalid - not in dropdown values
            "price": 50.0
        });

        let result = AttributeValidator::validate(&category, &attributes);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert_eq!(errors.len(), 1);
        assert_eq!(errors[0].field, "size");
    }

    #[test]
    fn test_number_out_of_range() {
        let category = create_test_category();
        let attributes = json!({
            "color": "red",
            "price": 1500.0 // Exceeds max of 1000
        });

        let result = AttributeValidator::validate(&category, &attributes);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert_eq!(errors.len(), 1);
        assert_eq!(errors[0].field, "price");
    }

    #[test]
    fn test_wrong_type() {
        let category = create_test_category();
        let attributes = json!({
            "color": 123, // Should be text
            "price": "fifty" // Should be number
        });

        let result = AttributeValidator::validate(&category, &attributes);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.len() >= 2);
    }

    #[test]
    fn test_pattern_validation() {
        let mut category = create_test_category();
        category.attributes[0].pattern = Some(r"^[a-z]+$".to_string()); // Only lowercase letters

        let attributes = json!({
            "color": "RED", // Doesn't match pattern
            "price": 50.0
        });

        let result = AttributeValidator::validate(&category, &attributes);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert_eq!(errors[0].field, "color");
    }
}
