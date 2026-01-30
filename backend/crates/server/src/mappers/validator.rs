use super::schema::{FieldMapping, FieldMap};
use crate::models::errors::ValidationError;
use std::collections::HashSet;

/// Validates field mapping configurations
pub struct MappingValidator {
    /// Maximum number of custom fields allowed for QuickBooks (API limitation)
    qbo_custom_field_limit: usize,
}

impl MappingValidator {
    /// Create a new mapping validator
    pub fn new() -> Self {
        Self {
            qbo_custom_field_limit: 3,
        }
    }
    
    /// Validate a complete field mapping configuration
    pub fn validate(&self, mapping: &FieldMapping) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();
        
        // Validate basic fields
        if mapping.tenant_id.is_empty() {
            errors.push(ValidationError::required("tenant_id"));
        }
        
        if mapping.mapping_id.is_empty() {
            errors.push(ValidationError::required("mapping_id"));
        }
        
        if mapping.source_connector.is_empty() {
            errors.push(ValidationError::required("source_connector"));
        }
        
        if mapping.target_connector.is_empty() {
            errors.push(ValidationError::required("target_connector"));
        }
        
        if mapping.entity_type.is_empty() {
            errors.push(ValidationError::required("entity_type"));
        }
        
        if mapping.mappings.is_empty() {
            errors.push(ValidationError::new(
                "mappings",
                "At least one field mapping is required",
                "EMPTY_MAPPINGS",
            ));
        }
        
        // Validate individual field mappings
        for (idx, field_map) in mapping.mappings.iter().enumerate() {
            if let Err(field_errors) = self.validate_field_map(field_map, idx) {
                errors.extend(field_errors);
            }
        }
        
        // Validate no duplicate source fields
        let mut seen_sources = HashSet::new();
        for field_map in &mapping.mappings {
            if !seen_sources.insert(&field_map.source_field) {
                errors.push(ValidationError::new(
                    "mappings",
                    format!("Duplicate source field: {}", field_map.source_field),
                    "DUPLICATE_SOURCE",
                ));
            }
        }
        
        // Validate QuickBooks custom field limit
        if mapping.target_connector == "quickbooks" {
            if let Err(qbo_errors) = self.validate_qbo_custom_fields(mapping) {
                errors.extend(qbo_errors);
            }
        }
        
        // Validate transformation references
        if let Some(ref transformations) = mapping.transformations {
            for transform in transformations {
                if transform.name.is_empty() {
                    errors.push(ValidationError::required("transformation.name"));
                }
            }
        }
        
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
    
    /// Validate an individual field map
    fn validate_field_map(&self, field_map: &FieldMap, index: usize) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();
        let field_prefix = format!("mappings[{}]", index);
        
        if field_map.source_field.is_empty() {
            errors.push(ValidationError::new(
                &format!("{}.source_field", field_prefix),
                "Source field is required",
                "REQUIRED",
            ));
        }
        
        if field_map.target_field.is_empty() {
            errors.push(ValidationError::new(
                &format!("{}.target_field", field_prefix),
                "Target field is required",
                "REQUIRED",
            ));
        }
        
        // Validate dot notation format
        if !field_map.source_field.is_empty() && !Self::is_valid_field_path(&field_map.source_field) {
            errors.push(ValidationError::new(
                &format!("{field_prefix}.source_field"),
                format!("Invalid field path format: {}", field_map.source_field),
                "INVALID_FORMAT",
            ));
        }
        
        if !field_map.target_field.is_empty() && !Self::is_valid_field_path(&field_map.target_field) {
            errors.push(ValidationError::new(
                &format!("{field_prefix}.target_field"),
                format!("Invalid field path format: {}", field_map.target_field),
                "INVALID_FORMAT",
            ));
        }
        
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
    
    /// Validate QuickBooks custom field limit (max 3 string custom fields)
    fn validate_qbo_custom_fields(&self, mapping: &FieldMapping) -> Result<(), Vec<ValidationError>> {
        let custom_field_count = mapping.mappings.iter()
            .filter(|m| m.target_field.starts_with("CustomField"))
            .count();
        
        if custom_field_count > self.qbo_custom_field_limit {
            return Err(vec![ValidationError::new(
                "mappings",
                format!(
                    "QuickBooks allows maximum {} custom fields, found {}",
                    self.qbo_custom_field_limit,
                    custom_field_count
                ),
                "QBO_CUSTOM_FIELD_LIMIT",
            )]);
        }
        
        Ok(())
    }
    
    /// Validate field path format (dot notation with optional array notation)
    fn is_valid_field_path(path: &str) -> bool {
        if path.is_empty() {
            return false;
        }
        
        // Allow alphanumeric, dots, underscores, and array notation []
        let valid_chars = path.chars().all(|c| {
            c.is_alphanumeric() || c == '.' || c == '_' || c == '[' || c == ']'
        });
        
        if !valid_chars {
            return false;
        }
        
        // Check for valid array notation (must be [])
        if path.contains('[') {
            if !path.contains("[]") {
                return false; // Array notation must be empty brackets
            }
        }
        
        // Path should not start or end with a dot
        if path.starts_with('.') || path.ends_with('.') {
            return false;
        }
        
        // No consecutive dots
        if path.contains("..") {
            return false;
        }
        
        true
    }
}

impl Default for MappingValidator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mappers::schema::TransformationType;
    
    #[test]
    fn test_valid_mapping() {
        let validator = MappingValidator::new();
        let mut mapping = FieldMapping::new(
            "tenant-1".to_string(),
            "test-mapping".to_string(),
            "woocommerce".to_string(),
            "quickbooks".to_string(),
            "order-to-invoice".to_string(),
        );
        
        mapping.add_mapping(FieldMap::new(
            "billing.email".to_string(),
            "BillEmail.Address".to_string(),
            true,
        ));
        
        assert!(validator.validate(&mapping).is_ok());
    }
    
    #[test]
    fn test_empty_tenant_id() {
        let validator = MappingValidator::new();
        let mut mapping = FieldMapping::new(
            "".to_string(),
            "test-mapping".to_string(),
            "woocommerce".to_string(),
            "quickbooks".to_string(),
            "order-to-invoice".to_string(),
        );
        
        mapping.add_mapping(FieldMap::new(
            "field1".to_string(),
            "field2".to_string(),
            true,
        ));
        
        let result = validator.validate(&mapping);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.field == "tenant_id"));
    }
    
    #[test]
    fn test_empty_mappings() {
        let validator = MappingValidator::new();
        let mapping = FieldMapping::new(
            "tenant-1".to_string(),
            "test-mapping".to_string(),
            "woocommerce".to_string(),
            "quickbooks".to_string(),
            "order-to-invoice".to_string(),
        );
        
        let result = validator.validate(&mapping);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.field == "mappings"));
    }
    
    #[test]
    fn test_duplicate_source_fields() {
        let validator = MappingValidator::new();
        let mut mapping = FieldMapping::new(
            "tenant-1".to_string(),
            "test-mapping".to_string(),
            "woocommerce".to_string(),
            "quickbooks".to_string(),
            "order-to-invoice".to_string(),
        );
        
        mapping.add_mapping(FieldMap::new(
            "billing.email".to_string(),
            "BillEmail.Address".to_string(),
            true,
        ));
        
        mapping.add_mapping(FieldMap::new(
            "billing.email".to_string(),
            "CustomerEmail".to_string(),
            false,
        ));
        
        let result = validator.validate(&mapping);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.message.contains("Duplicate source field")));
    }
    
    #[test]
    fn test_qbo_custom_field_limit() {
        let validator = MappingValidator::new();
        let mut mapping = FieldMapping::new(
            "tenant-1".to_string(),
            "test-mapping".to_string(),
            "woocommerce".to_string(),
            "quickbooks".to_string(),
            "order-to-invoice".to_string(),
        );
        
        // Add 4 custom fields (exceeds limit of 3)
        for i in 1..=4 {
            mapping.add_mapping(FieldMap::new(
                format!("custom{}", i),
                format!("CustomField{}", i),
                false,
            ));
        }
        
        let result = validator.validate(&mapping);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.code == Some("QBO_CUSTOM_FIELD_LIMIT".to_string())));
    }
    
    #[test]
    fn test_valid_field_paths() {
        assert!(MappingValidator::is_valid_field_path("billing.email"));
        assert!(MappingValidator::is_valid_field_path("line_items[].name"));
        assert!(MappingValidator::is_valid_field_path("CustomerRef.value"));
        assert!(MappingValidator::is_valid_field_path("simple_field"));
    }
    
    #[test]
    fn test_invalid_field_paths() {
        assert!(!MappingValidator::is_valid_field_path(""));
        assert!(!MappingValidator::is_valid_field_path(".starts_with_dot"));
        assert!(!MappingValidator::is_valid_field_path("ends_with_dot."));
        assert!(!MappingValidator::is_valid_field_path("double..dots"));
        assert!(!MappingValidator::is_valid_field_path("invalid[0]")); // Array notation must be []
        assert!(!MappingValidator::is_valid_field_path("has spaces"));
        assert!(!MappingValidator::is_valid_field_path("has-dashes"));
    }
}
