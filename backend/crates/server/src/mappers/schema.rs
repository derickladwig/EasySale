use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Field mapping configuration for syncing data between connectors
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldMapping {
    pub id: String,
    pub tenant_id: String,
    pub mapping_id: String, // e.g., "woo-to-qbo-invoice"
    pub source_connector: String,
    pub target_connector: String,
    pub entity_type: String,
    pub mappings: Vec<FieldMap>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transformations: Option<Vec<Transformation>>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Individual field mapping from source to target
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldMap {
    /// Source field path with dot notation (e.g., "billing.email", "line_items[].name")
    pub source_field: String,
    
    /// Target field path with dot notation (e.g., "CustomerRef.value")
    pub target_field: String,
    
    /// Whether this field is required
    pub required: bool,
    
    /// Default value if source field is missing
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_value: Option<serde_json::Value>,
    
    /// Name of transformation function to apply
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transform: Option<String>,
}

/// Transformation function configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transformation {
    pub name: String,
    
    #[serde(rename = "type")]
    pub transformation_type: TransformationType,
    
    /// Configuration parameters for the transformation
    pub config: HashMap<String, serde_json::Value>,
}

/// Types of transformations available
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TransformationType {
    /// Concatenate multiple fields
    Concat,
    
    /// Split a field into multiple parts
    Split,
    
    /// Format a value (e.g., date formatting)
    Format,
    
    /// Lookup a value in another system
    Lookup,
    
    /// Custom transformation function
    Custom,
}

impl FieldMapping {
    /// Create a new field mapping
    pub fn new(
        tenant_id: String,
        mapping_id: String,
        source_connector: String,
        target_connector: String,
        entity_type: String,
    ) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            tenant_id,
            mapping_id,
            source_connector,
            target_connector,
            entity_type,
            mappings: Vec::new(),
            transformations: None,
            is_active: true,
            created_at: now.clone(),
            updated_at: now,
        }
    }
    
    /// Add a field mapping
    pub fn add_mapping(&mut self, mapping: FieldMap) {
        self.mappings.push(mapping);
        self.updated_at = chrono::Utc::now().to_rfc3339();
    }
    
    /// Add a transformation
    pub fn add_transformation(&mut self, transformation: Transformation) {
        if let Some(ref mut transformations) = self.transformations {
            transformations.push(transformation);
        } else {
            self.transformations = Some(vec![transformation]);
        }
        self.updated_at = chrono::Utc::now().to_rfc3339();
    }
    
    /// Get all required field mappings
    pub fn required_mappings(&self) -> Vec<&FieldMap> {
        self.mappings.iter().filter(|m| m.required).collect()
    }
    
    /// Check if a field is mapped
    pub fn has_mapping(&self, source_field: &str) -> bool {
        self.mappings.iter().any(|m| m.source_field == source_field)
    }
}

impl FieldMap {
    /// Create a new field map
    pub fn new(source_field: String, target_field: String, required: bool) -> Self {
        Self {
            source_field,
            target_field,
            required,
            default_value: None,
            transform: None,
        }
    }
    
    /// Set default value
    pub fn with_default(mut self, value: serde_json::Value) -> Self {
        self.default_value = Some(value);
        self
    }
    
    /// Set transformation function
    pub fn with_transform(mut self, transform: String) -> Self {
        self.transform = Some(transform);
        self
    }
    
    /// Check if this is an array field (contains [])
    pub fn is_array_field(&self) -> bool {
        self.source_field.contains("[]") || self.target_field.contains("[]")
    }
    
    /// Get the base field name without array notation
    pub fn base_field_name(&self) -> &str {
        if let Some(idx) = self.source_field.find("[]") {
            &self.source_field[..idx]
        } else {
            &self.source_field
        }
    }
}

impl Transformation {
    /// Create a new transformation
    pub fn new(name: String, transformation_type: TransformationType) -> Self {
        Self {
            name,
            transformation_type,
            config: HashMap::new(),
        }
    }
    
    /// Add a configuration parameter
    pub fn with_config(mut self, key: String, value: serde_json::Value) -> Self {
        self.config.insert(key, value);
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_field_mapping_creation() {
        let mapping = FieldMapping::new(
            "tenant-1".to_string(),
            "woo-to-qbo-invoice".to_string(),
            "woocommerce".to_string(),
            "quickbooks".to_string(),
            "order-to-invoice".to_string(),
        );
        
        assert_eq!(mapping.tenant_id, "tenant-1");
        assert_eq!(mapping.mapping_id, "woo-to-qbo-invoice");
        assert_eq!(mapping.source_connector, "woocommerce");
        assert_eq!(mapping.target_connector, "quickbooks");
        assert!(mapping.is_active);
        assert_eq!(mapping.mappings.len(), 0);
    }
    
    #[test]
    fn test_add_field_mapping() {
        let mut mapping = FieldMapping::new(
            "tenant-1".to_string(),
            "test".to_string(),
            "source".to_string(),
            "target".to_string(),
            "entity".to_string(),
        );
        
        let field_map = FieldMap::new(
            "billing.email".to_string(),
            "BillEmail.Address".to_string(),
            true,
        );
        
        mapping.add_mapping(field_map);
        assert_eq!(mapping.mappings.len(), 1);
        assert_eq!(mapping.mappings[0].source_field, "billing.email");
    }
    
    #[test]
    fn test_array_field_detection() {
        let field_map = FieldMap::new(
            "line_items[].name".to_string(),
            "Line[].Description".to_string(),
            true,
        );
        
        assert!(field_map.is_array_field());
        assert_eq!(field_map.base_field_name(), "line_items");
    }
    
    #[test]
    fn test_required_mappings() {
        let mut mapping = FieldMapping::new(
            "tenant-1".to_string(),
            "test".to_string(),
            "source".to_string(),
            "target".to_string(),
            "entity".to_string(),
        );
        
        mapping.add_mapping(FieldMap::new("field1".to_string(), "target1".to_string(), true));
        mapping.add_mapping(FieldMap::new("field2".to_string(), "target2".to_string(), false));
        mapping.add_mapping(FieldMap::new("field3".to_string(), "target3".to_string(), true));
        
        let required = mapping.required_mappings();
        assert_eq!(required.len(), 2);
    }
    
    #[test]
    fn test_transformation_creation() {
        let transform = Transformation::new(
            "dateFormat".to_string(),
            TransformationType::Format,
        )
        .with_config("format".to_string(), serde_json::json!("YYYY-MM-DD"));
        
        assert_eq!(transform.name, "dateFormat");
        assert_eq!(transform.transformation_type, TransformationType::Format);
        assert_eq!(transform.config.len(), 1);
    }
}
