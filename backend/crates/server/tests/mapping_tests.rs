/**
 * Mapping Engine Integration Tests
 * 
 * Tests for field mapping, transformations, and validation
 * 
 * Requirements: 3.1, 3.3, 3.4
 */

use easysale_server::{
    MappingEngine,
    FieldMapping,
    FieldMap,
    TransformationRegistry,
    TransformationContext,
    MappingValidator,
};
use serde_json::json;
use std::collections::HashMap;

#[test]
fn test_simple_field_mapping() {
    let engine = MappingEngine::new(TransformationRegistry::new());
    let mut mapping = FieldMapping::new(
        "tenant-1".to_string(),
        "test-simple".to_string(),
        "source".to_string(),
        "target".to_string(),
        "entity".to_string(),
    );
    
    mapping.add_mapping(FieldMap::new(
        "email".to_string(),
        "EmailAddress".to_string(),
        true,
    ));
    
    mapping.add_mapping(FieldMap::new(
        "name".to_string(),
        "DisplayName".to_string(),
        true,
    ));
    
    let source_data = json!({
        "email": "test@example.com",
        "name": "Test User"
    });
    
    let result = engine.apply_mapping(&mapping, &source_data).unwrap();
    
    assert_eq!(result["EmailAddress"], "test@example.com");
    assert_eq!(result["DisplayName"], "Test User");
}

#[test]
fn test_nested_field_mapping_with_dot_notation() {
    let engine = MappingEngine::new(TransformationRegistry::new());
    let mut mapping = FieldMapping::new(
        "tenant-1".to_string(),
        "test-nested".to_string(),
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
        "billing.address.city".to_string(),
        "BillAddr.City".to_string(),
        false,
    ));
    
    let source_data = json!({
        "billing": {
            "email": "john@example.com",
            "address": {
                "city": "Springfield",
                "state": "IL"
            }
        }
    });
    
    let result = engine.apply_mapping(&mapping, &source_data).unwrap();
    
    assert_eq!(result["BillEmail"]["Address"], "john@example.com");
    assert_eq!(result["BillAddr"]["City"], "Springfield");
}

#[test]
fn test_array_mapping_for_line_items() {
    let engine = MappingEngine::new(TransformationRegistry::new());
    let mut mapping = FieldMapping::new(
        "tenant-1".to_string(),
        "test-array".to_string(),
        "source".to_string(),
        "target".to_string(),
        "entity".to_string(),
    );
    
    mapping.add_mapping(FieldMap::new(
        "line_items[].name".to_string(),
        "items[].product_name".to_string(),
        false,
    ));
    
    let source_data = json!({
        "line_items": [
            {"name": "Product A", "price": 10.0},
            {"name": "Product B", "price": 20.0},
            {"name": "Product C", "price": 30.0}
        ]
    });
    
    let result = engine.apply_mapping(&mapping, &source_data).unwrap();
    
    assert!(result["items"].is_array());
    let items = result["items"].as_array().unwrap();
    assert_eq!(items.len(), 3);
    assert_eq!(items[0]["product_name"], "Product A");
    assert_eq!(items[1]["product_name"], "Product B");
    assert_eq!(items[2]["product_name"], "Product C");
}

#[test]
fn test_transformation_uppercase() {
    let registry = TransformationRegistry::new();
    let engine = MappingEngine::new(registry);
    
    let mut mapping = FieldMapping::new(
        "tenant-1".to_string(),
        "test-transform".to_string(),
        "source".to_string(),
        "target".to_string(),
        "entity".to_string(),
    );
    
    mapping.add_mapping(
        FieldMap::new(
            "code".to_string(),
            "ProductCode".to_string(),
            true,
        )
        .with_transform("uppercase".to_string())
    );
    
    let source_data = json!({
        "code": "abc123"
    });
    
    let result = engine.apply_mapping(&mapping, &source_data).unwrap();
    
    assert_eq!(result["ProductCode"], "ABC123");
}

#[test]
fn test_transformation_lowercase() {
    let registry = TransformationRegistry::new();
    let engine = MappingEngine::new(registry);
    
    let mut mapping = FieldMapping::new(
        "tenant-1".to_string(),
        "test-transform".to_string(),
        "source".to_string(),
        "target".to_string(),
        "entity".to_string(),
    );
    
    mapping.add_mapping(
        FieldMap::new(
            "email".to_string(),
            "EmailAddress".to_string(),
            true,
        )
        .with_transform("lowercase".to_string())
    );
    
    let source_data = json!({
        "email": "TEST@EXAMPLE.COM"
    });
    
    let result = engine.apply_mapping(&mapping, &source_data).unwrap();
    
    assert_eq!(result["EmailAddress"], "test@example.com");
}

#[test]
fn test_transformation_date_format() {
    let registry = TransformationRegistry::new();
    let engine = MappingEngine::new(registry);
    
    let mut mapping = FieldMapping::new(
        "tenant-1".to_string(),
        "test-date".to_string(),
        "source".to_string(),
        "target".to_string(),
        "entity".to_string(),
    );
    
    mapping.add_mapping(
        FieldMap::new(
            "created_at".to_string(),
            "TxnDate".to_string(),
            true,
        )
        .with_transform("dateFormat(ISO8601, YYYY-MM-DD)".to_string())
    );
    
    let source_data = json!({
        "created_at": "2026-01-17T10:30:00Z"
    });
    
    let result = engine.apply_mapping(&mapping, &source_data).unwrap();
    
    assert_eq!(result["TxnDate"], "2026-01-17");
}

#[test]
fn test_default_value_for_missing_field() {
    let engine = MappingEngine::new(TransformationRegistry::new());
    let mut mapping = FieldMapping::new(
        "tenant-1".to_string(),
        "test-default".to_string(),
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
        .with_default(json!("default_value"))
    );
    
    let source_data = json!({
        "other_field": "value"
    });
    
    let result = engine.apply_mapping(&mapping, &source_data).unwrap();
    
    assert_eq!(result["TargetField"], "default_value");
}

#[test]
fn test_required_field_missing_error() {
    let engine = MappingEngine::new(TransformationRegistry::new());
    let mut mapping = FieldMapping::new(
        "tenant-1".to_string(),
        "test-required".to_string(),
        "source".to_string(),
        "target".to_string(),
        "entity".to_string(),
    );
    
    mapping.add_mapping(FieldMap::new(
        "required_field".to_string(),
        "TargetField".to_string(),
        true,
    ));
    
    let source_data = json!({
        "other_field": "value"
    });
    
    let result = engine.apply_mapping(&mapping, &source_data);
    
    assert!(result.is_err());
    let error = result.unwrap_err();
    assert!(error.contains("Required field"));
    assert!(error.contains("required_field"));
}

#[test]
fn test_validator_accepts_valid_mapping() {
    let validator = MappingValidator::new();
    let mut mapping = FieldMapping::new(
        "tenant-1".to_string(),
        "test-valid".to_string(),
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
        "customer_name".to_string(),
        "DisplayName".to_string(),
        true,
    ));
    
    let result = validator.validate(&mapping);
    assert!(result.is_ok());
}

#[test]
fn test_validator_rejects_empty_tenant_id() {
    let validator = MappingValidator::new();
    let mut mapping = FieldMapping::new(
        "".to_string(),
        "test-invalid".to_string(),
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
fn test_validator_rejects_empty_mappings() {
    let validator = MappingValidator::new();
    let mapping = FieldMapping::new(
        "tenant-1".to_string(),
        "test-empty".to_string(),
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
fn test_validator_rejects_duplicate_source_fields() {
    let validator = MappingValidator::new();
    let mut mapping = FieldMapping::new(
        "tenant-1".to_string(),
        "test-duplicate".to_string(),
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
fn test_validator_enforces_qbo_custom_field_limit() {
    let validator = MappingValidator::new();
    let mut mapping = FieldMapping::new(
        "tenant-1".to_string(),
        "test-custom-fields".to_string(),
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
    assert!(errors.iter().any(|e| {
        e.code == Some("QBO_CUSTOM_FIELD_LIMIT".to_string())
    }));
}

#[test]
fn test_validator_accepts_max_3_qbo_custom_fields() {
    let validator = MappingValidator::new();
    let mut mapping = FieldMapping::new(
        "tenant-1".to_string(),
        "test-custom-fields-ok".to_string(),
        "woocommerce".to_string(),
        "quickbooks".to_string(),
        "order-to-invoice".to_string(),
    );
    
    // Add exactly 3 custom fields (at the limit)
    for i in 1..=3 {
        mapping.add_mapping(FieldMap::new(
            format!("custom{}", i),
            format!("CustomField{}", i),
            false,
        ));
    }
    
    let result = validator.validate(&mapping);
    assert!(result.is_ok());
}

#[test]
fn test_validator_accepts_valid_field_paths() {
    let validator = MappingValidator::new();
    
    // Test various valid field path formats
    let valid_paths = vec![
        "simple_field",
        "billing.email",
        "line_items[].name",
        "nested.deep.field",
        "CustomerRef.value",
        "array[].nested.field",
    ];
    
    for path in valid_paths {
        let mut mapping = FieldMapping::new(
            "tenant-1".to_string(),
            "test-path".to_string(),
            "source".to_string(),
            "target".to_string(),
            "entity".to_string(),
        );
        
        mapping.add_mapping(FieldMap::new(
            path.to_string(),
            "target".to_string(),
            false,
        ));
        
        let result = validator.validate(&mapping);
        assert!(result.is_ok(), "Path '{}' should be valid", path);
    }
}

#[test]
fn test_validator_rejects_invalid_field_paths() {
    let validator = MappingValidator::new();
    
    // Test various invalid field path formats
    let invalid_paths = vec![
        "",                      // Empty
        ".starts_with_dot",      // Starts with dot
        "ends_with_dot.",        // Ends with dot
        "double..dots",          // Consecutive dots
        "has spaces",            // Contains spaces
        "has-dashes",            // Contains dashes
        "invalid[0]",            // Array notation with index
    ];
    
    for path in invalid_paths {
        let mut mapping = FieldMapping::new(
            "tenant-1".to_string(),
            "test-invalid-path".to_string(),
            "source".to_string(),
            "target".to_string(),
            "entity".to_string(),
        );
        
        mapping.add_mapping(FieldMap::new(
            path.to_string(),
            "target".to_string(),
            false,
        ));
        
        let result = validator.validate(&mapping);
        assert!(result.is_err(), "Path '{}' should be invalid", path);
    }
}

#[test]
fn test_transformation_with_context_lookup_customer() {
    let mut id_mappings = HashMap::new();
    id_mappings.insert(
        "woocommerce:customer:john@example.com:quickbooks".to_string(),
        "123".to_string(),
    );
    
    let context = TransformationContext {
        id_mappings,
        tenant_id: "tenant-1".to_string(),
    };
    
    let registry = TransformationRegistry::with_context(context);
    let engine = MappingEngine::new(registry);
    
    let mut mapping = FieldMapping::new(
        "tenant-1".to_string(),
        "test-lookup".to_string(),
        "woocommerce".to_string(),
        "quickbooks".to_string(),
        "customer".to_string(),
    );
    
    mapping.add_mapping(
        FieldMap::new(
            "email".to_string(),
            "CustomerRef.value".to_string(),
            true,
        )
        .with_transform("lookupQBOCustomer".to_string())
    );
    
    let source_data = json!({
        "email": "john@example.com"
    });
    
    let result = engine.apply_mapping(&mapping, &source_data).unwrap();
    
    assert_eq!(result["CustomerRef"]["value"], "123");
}

#[test]
fn test_transformation_with_context_lookup_item() {
    let mut id_mappings = HashMap::new();
    id_mappings.insert(
        "woocommerce:product:SKU123:quickbooks".to_string(),
        "456".to_string(),
    );
    
    let context = TransformationContext {
        id_mappings,
        tenant_id: "tenant-1".to_string(),
    };
    
    let registry = TransformationRegistry::with_context(context);
    let engine = MappingEngine::new(registry);
    
    let mut mapping = FieldMapping::new(
        "tenant-1".to_string(),
        "test-lookup-item".to_string(),
        "woocommerce".to_string(),
        "quickbooks".to_string(),
        "product".to_string(),
    );
    
    mapping.add_mapping(
        FieldMap::new(
            "sku".to_string(),
            "ItemRef.value".to_string(),
            true,
        )
        .with_transform("lookupQBOItem".to_string())
    );
    
    let source_data = json!({
        "sku": "SKU123"
    });
    
    let result = engine.apply_mapping(&mapping, &source_data).unwrap();
    
    assert_eq!(result["ItemRef"]["value"], "456");
}

#[test]
fn test_complex_woocommerce_to_quickbooks_mapping() {
    // Simulate a realistic WooCommerce order to QuickBooks invoice mapping
    let mut id_mappings = HashMap::new();
    id_mappings.insert(
        "woocommerce:customer:john@example.com:quickbooks".to_string(),
        "100".to_string(),
    );
    id_mappings.insert(
        "woocommerce:product:SKU-001:quickbooks".to_string(),
        "200".to_string(),
    );
    
    let context = TransformationContext {
        id_mappings,
        tenant_id: "tenant-1".to_string(),
    };
    
    let registry = TransformationRegistry::with_context(context);
    let engine = MappingEngine::new(registry);
    
    let mut mapping = FieldMapping::new(
        "tenant-1".to_string(),
        "woo-to-qbo-invoice".to_string(),
        "woocommerce".to_string(),
        "quickbooks".to_string(),
        "order-to-invoice".to_string(),
    );
    
    // Map customer email to CustomerRef
    mapping.add_mapping(
        FieldMap::new(
            "billing.email".to_string(),
            "CustomerRef.value".to_string(),
            true,
        )
        .with_transform("lookupQBOCustomer".to_string())
    );
    
    // Map order number to DocNumber
    mapping.add_mapping(FieldMap::new(
        "number".to_string(),
        "DocNumber".to_string(),
        true,
    ));
    
    // Map order date to TxnDate
    mapping.add_mapping(
        FieldMap::new(
            "date_created".to_string(),
            "TxnDate".to_string(),
            true,
        )
        .with_transform("dateFormat(ISO8601, YYYY-MM-DD)".to_string())
    );
    
    let source_data = json!({
        "number": "12345",
        "date_created": "2026-01-17T10:30:00Z",
        "billing": {
            "email": "john@example.com"
        }
    });
    
    let result = engine.apply_mapping(&mapping, &source_data).unwrap();
    
    assert_eq!(result["CustomerRef"]["value"], "100");
    assert_eq!(result["DocNumber"], "12345");
    assert_eq!(result["TxnDate"], "2026-01-17");
}
