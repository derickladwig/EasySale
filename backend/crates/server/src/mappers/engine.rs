use super::schema::FieldMapping;
use super::transformations::TransformationRegistry;
use serde_json::Value as JsonValue;

/// Engine for applying field mappings to transform data
pub struct MappingEngine {
    transformation_registry: TransformationRegistry,
}

impl MappingEngine {
    /// Create a new mapping engine
    pub fn new(transformation_registry: TransformationRegistry) -> Self {
        Self {
            transformation_registry,
        }
    }
    
    /// Apply field mapping to source data and produce target data
    pub fn apply_mapping(
        &self,
        mapping: &FieldMapping,
        source_data: &JsonValue,
    ) -> Result<JsonValue, String> {
        let mut target_data = serde_json::json!({});
        
        for field_map in &mapping.mappings {
            // Extract value from source
            let source_value = self.extract_value(source_data, &field_map.source_field)?;
            
            // Apply transformation if specified
            let transformed_value = if let Some(ref transform_name) = field_map.transform {
                self.transformation_registry.apply(transform_name, source_value)?
            } else {
                source_value
            };
            
            // Handle missing required fields
            let final_value = if transformed_value.is_null() {
                if field_map.required {
                    if let Some(ref default) = field_map.default_value {
                        default.clone()
                    } else {
                        return Err(format!(
                            "Required field '{}' is missing and has no default value",
                            field_map.source_field
                        ));
                    }
                } else if let Some(ref default) = field_map.default_value {
                    default.clone()
                } else {
                    JsonValue::Null
                }
            } else {
                transformed_value
            };
            
            // Set value in target
            self.set_value(&mut target_data, &field_map.target_field, final_value)?;
        }
        
        Ok(target_data)
    }
    
    /// Extract a value from source data using dot notation
    fn extract_value(&self, data: &JsonValue, path: &str) -> Result<JsonValue, String> {
        // Handle array notation
        if path.contains("[]") {
            return self.extract_array_values(data, path);
        }
        
        // Split path by dots
        let parts: Vec<&str> = path.split('.').collect();
        let mut current = data;
        
        for part in parts {
            match current {
                JsonValue::Object(map) => {
                    current = map.get(part).unwrap_or(&JsonValue::Null);
                }
                _ => return Ok(JsonValue::Null),
            }
        }
        
        Ok(current.clone())
    }
    
    /// Extract array values using array notation (e.g., "line_items[].name")
    fn extract_array_values(&self, data: &JsonValue, path: &str) -> Result<JsonValue, String> {
        // Split on [] to get base path and remaining path
        let parts: Vec<&str> = path.split("[]").collect();
        if parts.len() != 2 {
            return Err(format!("Invalid array path: {}", path));
        }
        
        let base_path = parts[0];
        let item_path = parts[1].trim_start_matches('.');
        
        // Extract the array
        let array = self.extract_value(data, base_path)?;
        
        if !array.is_array() {
            return Ok(JsonValue::Null);
        }
        
        // Extract values from each array item
        let mut results = Vec::new();
        if let Some(items) = array.as_array() {
            for item in items {
                if item_path.is_empty() {
                    results.push(item.clone());
                } else {
                    let value = self.extract_value(item, item_path)?;
                    results.push(value);
                }
            }
        }
        
        Ok(JsonValue::Array(results))
    }
    
    /// Set a value in target data using dot notation
    fn set_value(&self, data: &mut JsonValue, path: &str, value: JsonValue) -> Result<(), String> {
        // Handle array notation
        if path.contains("[]") {
            return self.set_array_values(data, path, value);
        }
        
        let parts: Vec<&str> = path.split('.').collect();
        
        // Ensure data is an object
        if !data.is_object() {
            *data = serde_json::json!({});
        }
        
        // Build the nested structure
        if parts.len() == 1 {
            // Simple case - single level
            if let Some(map) = data.as_object_mut() {
                map.insert(parts[0].to_string(), value);
            }
        } else {
            // Nested case - build path recursively
            self.set_nested_value(data, &parts, value)?;
        }
        
        Ok(())
    }
    
    /// Helper to set nested values recursively
    fn set_nested_value(&self, data: &mut JsonValue, parts: &[&str], value: JsonValue) -> Result<(), String> {
        if parts.is_empty() {
            return Ok(());
        }
        
        if parts.len() == 1 {
            // Base case - set the value
            if let Some(map) = data.as_object_mut() {
                map.insert(parts[0].to_string(), value);
            }
            return Ok(());
        }
        
        // Recursive case - ensure intermediate object exists
        let key = parts[0];
        
        // Ensure the key exists as an object
        if let Some(map) = data.as_object_mut() {
            if !map.contains_key(key) {
                map.insert(key.to_string(), serde_json::json!({}));
            }
            
            // Get mutable reference to the nested object
            if let Some(nested) = map.get_mut(key) {
                return self.set_nested_value(nested, &parts[1..], value);
            }
        }
        
        Ok(())
    }
    
    /// Set array values using array notation
    fn set_array_values(&self, data: &mut JsonValue, path: &str, value: JsonValue) -> Result<(), String> {
        // Split on [] to get base path and remaining path
        let parts: Vec<&str> = path.split("[]").collect();
        if parts.len() != 2 {
            return Err(format!("Invalid array path: {}", path));
        }
        
        let base_path = parts[0];
        let item_path = parts[1].trim_start_matches('.');
        
        // Ensure value is an array
        if !value.is_array() {
            return Err(format!("Value must be an array for array path: {}", path));
        }
        
        // Create array in target if it doesn't exist
        if base_path.is_empty() {
            // Root level array
            *data = value;
        } else {
            // Nested array
            let mut target_array = Vec::new();
            
            if let Some(items) = value.as_array() {
                for item in items {
                    if item_path.is_empty() {
                        target_array.push(item.clone());
                    } else {
                        let mut obj = serde_json::json!({});
                        self.set_value(&mut obj, item_path, item.clone())?;
                        target_array.push(obj);
                    }
                }
            }
            
            self.set_value(data, base_path, JsonValue::Array(target_array))?;
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mappers::schema::FieldMap;
    
    #[test]
    fn test_extract_simple_value() {
        let engine = MappingEngine::new(TransformationRegistry::new());
        let data = serde_json::json!({
            "name": "John Doe",
            "email": "john@example.com"
        });
        
        let value = engine.extract_value(&data, "name").unwrap();
        assert_eq!(value, "John Doe");
    }
    
    #[test]
    fn test_extract_nested_value() {
        let engine = MappingEngine::new(TransformationRegistry::new());
        let data = serde_json::json!({
            "billing": {
                "email": "john@example.com",
                "phone": "123-456-7890"
            }
        });
        
        let value = engine.extract_value(&data, "billing.email").unwrap();
        assert_eq!(value, "john@example.com");
    }
    
    #[test]
    fn test_extract_array_values() {
        let engine = MappingEngine::new(TransformationRegistry::new());
        let data = serde_json::json!({
            "line_items": [
                {"name": "Item 1", "price": 10.0},
                {"name": "Item 2", "price": 20.0}
            ]
        });
        
        let value = engine.extract_value(&data, "line_items[].name").unwrap();
        assert!(value.is_array());
        let array = value.as_array().unwrap();
        assert_eq!(array.len(), 2);
        assert_eq!(array[0], "Item 1");
        assert_eq!(array[1], "Item 2");
    }
    
    #[test]
    fn test_set_simple_value() {
        let engine = MappingEngine::new(TransformationRegistry::new());
        let mut data = serde_json::json!({});
        
        engine.set_value(&mut data, "name", serde_json::json!("John Doe")).unwrap();
        assert_eq!(data["name"], "John Doe");
    }
    
    #[test]
    fn test_set_nested_value() {
        let engine = MappingEngine::new(TransformationRegistry::new());
        let mut data = serde_json::json!({});
        
        engine.set_value(&mut data, "billing.email", serde_json::json!("john@example.com")).unwrap();
        assert_eq!(data["billing"]["email"], "john@example.com");
    }
    
    #[test]
    fn test_apply_mapping() {
        let engine = MappingEngine::new(TransformationRegistry::new());
        let mut mapping = FieldMapping::new(
            "tenant-1".to_string(),
            "test".to_string(),
            "source".to_string(),
            "target".to_string(),
            "entity".to_string(),
        );
        
        mapping.add_mapping(FieldMap::new(
            "billing.email".to_string(),
            "BillEmail.Address".to_string(),
            true,
        ));
        
        mapping.add_mapping(FieldMap::new(
            "customer_name".to_string(),
            "DisplayName".to_string(),
            true,
        ));
        
        let source_data = serde_json::json!({
            "billing": {
                "email": "john@example.com"
            },
            "customer_name": "John Doe"
        });
        
        let result = engine.apply_mapping(&mapping, &source_data).unwrap();
        assert_eq!(result["BillEmail"]["Address"], "john@example.com");
        assert_eq!(result["DisplayName"], "John Doe");
    }
    
    #[test]
    fn test_missing_required_field() {
        let engine = MappingEngine::new(TransformationRegistry::new());
        let mut mapping = FieldMapping::new(
            "tenant-1".to_string(),
            "test".to_string(),
            "source".to_string(),
            "target".to_string(),
            "entity".to_string(),
        );
        
        mapping.add_mapping(FieldMap::new(
            "required_field".to_string(),
            "TargetField".to_string(),
            true,
        ));
        
        let source_data = serde_json::json!({
            "other_field": "value"
        });
        
        let result = engine.apply_mapping(&mapping, &source_data);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Required field"));
    }
    
    #[test]
    fn test_default_value() {
        let engine = MappingEngine::new(TransformationRegistry::new());
        let mut mapping = FieldMapping::new(
            "tenant-1".to_string(),
            "test".to_string(),
            "source".to_string(),
            "target".to_string(),
            "entity".to_string(),
        );
        
        mapping.add_mapping(
            FieldMap::new(
                "optional_field".to_string(),
                "TargetField".to_string(),
                false,
            )
            .with_default(serde_json::json!("default_value"))
        );
        
        let source_data = serde_json::json!({
            "other_field": "value"
        });
        
        let result = engine.apply_mapping(&mapping, &source_data).unwrap();
        assert_eq!(result["TargetField"], "default_value");
    }
}
