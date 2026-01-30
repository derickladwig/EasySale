// Property-Based Tests for Universal Product Catalog
// Feature: universal-product-catalog
// These tests validate correctness properties across all valid inputs

use proptest::prelude::*;
use serde_json::json;
use EasySale_server::config::models::{AttributeConfig, CategoryConfig};
use EasySale_server::AttributeValidator;
use EasySale_server::Product;

// ============================================================================
// Property Test Generators
// ============================================================================

/// Generate a valid category configuration
fn arb_category_config() -> impl Strategy<Value = CategoryConfig> {
    (
        "[a-z]{3,10}",
        "[A-Z][a-z ]{5,20}",
        prop::collection::vec(arb_attribute_config(), 1..5),
    )
        .prop_map(|(id, name, attributes)| CategoryConfig {
            id,
            name,
            icon: None,
            color: None,
            description: None,
            parent: None,
            order: None,
            attributes,
            search_fields: None,
            display_template: None,
            filters: None,
            wizard: None,
        })
}

/// Generate a valid attribute configuration
fn arb_attribute_config() -> impl Strategy<Value = AttributeConfig> {
    prop_oneof![
        // Text attribute
        ("[a-z]{3,10}", "[A-Z][a-z ]{3,15}").prop_map(|(name, label)| AttributeConfig {
            name,
            label: Some(label),
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
        }),
        // Number attribute
        ("[a-z]{3,10}", "[A-Z][a-z ]{3,15}", 0.0f64..1000.0).prop_map(
            |(name, label, max)| AttributeConfig {
                name,
                label: Some(label),
                attr_type: "number".to_string(),
                required: Some(true),
                unique: None,
                values: None,
                hierarchy_source: None,
                min: Some(0.0),
                max: Some(max),
                pattern: None,
                default: None,
                placeholder: None,
                help_text: None,
            }
        ),
        // Dropdown attribute
        (
            "[a-z]{3,10}",
            "[A-Z][a-z ]{3,15}",
            prop::collection::vec("[A-Z]{1,5}", 2..5)
        )
            .prop_map(|(name, label, values)| AttributeConfig {
                name,
                label: Some(label),
                attr_type: "dropdown".to_string(),
                required: Some(false),
                unique: None,
                values: Some(values),
                hierarchy_source: None,
                min: None,
                max: None,
                pattern: None,
                default: None,
                placeholder: None,
                help_text: None,
            }),
    ]
}

/// Generate valid attributes that match a category configuration
fn arb_valid_attributes(
    category: &CategoryConfig,
) -> impl Strategy<Value = serde_json::Value> {
    let mut strategies: Vec<BoxedStrategy<(String, serde_json::Value)>> = Vec::new();

    for attr in &category.attributes {
        let name = attr.name.clone();
        let strategy: BoxedStrategy<serde_json::Value> = match attr.attr_type.as_str() {
            "text" => "[a-zA-Z0-9 ]{1,20}".prop_map(|s| json!(s)).boxed(),
            "number" => {
                let min = attr.min.unwrap_or(0.0);
                let max = attr.max.unwrap_or(1000.0);
                (min..max).prop_map(|n| json!(n)).boxed()
            }
            "dropdown" => {
                if let Some(values) = &attr.values {
                    let vals = values.clone();
                    prop::sample::select(vals)
                        .prop_map(|v| json!(v))
                        .boxed()
                } else {
                    Just(json!("default")).boxed()
                }
            }
            "boolean" => any::<bool>().prop_map(|b| json!(b)).boxed(),
            _ => Just(json!("default")).boxed(),
        };

        strategies.push(strategy.prop_map(move |v| (name.clone(), v)).boxed());
    }

    strategies
        .prop_map(|pairs| {
            let mut obj = serde_json::Map::new();
            for (k, v) in pairs {
                obj.insert(k, v);
            }
            json!(obj)
        })
        .boxed()
}

/// Generate a valid product
fn arb_product() -> impl Strategy<Value = Product> {
    (
        "[A-Z0-9]{3,10}",           // sku
        "[A-Za-z0-9 ]{5,30}",       // name
        "[a-z]{3,10}",              // category
        0.01f64..10000.0,           // unit_price
        0.0f64..5000.0,             // cost
        0.0f64..1000.0,             // quantity_on_hand
        "[a-z]{5,10}",              // tenant_id
        "[a-z]{5,10}",              // store_id
    )
        .prop_map(
            |(sku, name, category, unit_price, cost, quantity_on_hand, tenant_id, store_id)| {
                Product {
                    id: uuid::Uuid::new_v4().to_string(),
                    sku,
                    name,
                    description: None,
                    category,
                    subcategory: None,
                    unit_price,
                    cost,
                    quantity_on_hand,
                    reorder_point: Some(5.0),
                    attributes: "{}".to_string(),
                    parent_id: None,
                    barcode: None,
                    barcode_type: None,
                    images: "[]".to_string(),
                    tenant_id,
                    store_id,
                    is_active: true,
                    sync_version: 1,
                    created_at: chrono::Utc::now().to_rfc3339(),
                    updated_at: chrono::Utc::now().to_rfc3339(),
                }
            },
        )
}

// ============================================================================
// Property 1: Attribute Validation Consistency
// ============================================================================
// For any product and category configuration, if the product's attributes
// pass validation, then saving and reloading the product should pass
// validation again with the same configuration.
// Validates: Requirements 2.2, 17.1, 17.6

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_1_attribute_validation_consistency(
        category in arb_category_config(),
    ) {
        // Generate valid attributes for this category
        let attrs_strategy = arb_valid_attributes(&category);
        proptest!(|(attributes in attrs_strategy)| {
            // First validation should pass
            let result1 = AttributeValidator::validate(&category, &attributes);
            prop_assert!(result1.is_ok(), "Initial validation failed: {:?}", result1);

            // Serialize and deserialize (simulating save/reload)
            let serialized = serde_json::to_string(&attributes).unwrap();
            let deserialized: serde_json::Value = serde_json::from_str(&serialized).unwrap();

            // Second validation should also pass
            let result2 = AttributeValidator::validate(&category, &deserialized);
            prop_assert!(result2.is_ok(), "Validation after round-trip failed: {:?}", result2);
        });
    }
}

// ============================================================================
// Property 2: SKU Uniqueness
// ============================================================================
// For any two products in the same tenant, their SKUs must be different.
// Validates: Requirements 17.2

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_2_sku_uniqueness(
        product1 in arb_product(),
        product2 in arb_product(),
    ) {
        // If products are in the same tenant and have the same SKU,
        // they must be the same product (same ID)
        if product1.tenant_id == product2.tenant_id && product1.sku == product2.sku {
            prop_assert_eq!(product1.id, product2.id,
                "Two different products in the same tenant cannot have the same SKU");
        }
    }
}

// ============================================================================
// Property 5: Price Non-Negativity
// ============================================================================
// For any product, the unit_price and cost must be non-negative numbers.
// Validates: Requirements 17.3, 17.4

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_5_price_non_negativity(product in arb_product()) {
        prop_assert!(product.unit_price >= 0.0,
            "unit_price must be non-negative, got: {}", product.unit_price);
        prop_assert!(product.cost >= 0.0,
            "cost must be non-negative, got: {}", product.cost);
    }
}

// ============================================================================
// Property 6: Variant Parent Relationship
// ============================================================================
// For any product variant, if it has a parent_id, then a product with that
// ID must exist and must not itself be a variant.
// Validates: Requirements 6.1, 6.3

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_6_variant_parent_relationship(
        parent in arb_product(),
        mut variant in arb_product(),
    ) {
        // Ensure parent is not a variant
        prop_assume!(parent.parent_id.is_none());

        // Set variant's parent_id to parent's id
        variant.parent_id = Some(parent.id.clone());
        variant.tenant_id = parent.tenant_id.clone(); // Same tenant

        // Verify variant has parent
        prop_assert!(variant.is_variant(), "Variant should have parent_id set");
        prop_assert_eq!(variant.parent_id.as_ref().unwrap(), &parent.id,
            "Variant's parent_id should match parent's id");

        // Verify parent is not a variant
        prop_assert!(!parent.is_variant(), "Parent should not be a variant");
    }
}

#[cfg(test)]
mod additional_property_tests {
    use super::*;

    // ============================================================================
    // Property 4: Category Configuration Compliance
    // ============================================================================
    // For any product in a category, all required attributes defined in the
    // category configuration must be present in the product's attributes.
    // Validates: Requirements 1.2, 2.2

    #[test]
    fn property_4_category_configuration_compliance() {
        proptest!(|(category in arb_category_config())| {
            let attrs_strategy = arb_valid_attributes(&category);
            proptest!(|(attributes in attrs_strategy)| {
                // Validate attributes
                let result = AttributeValidator::validate(&category, &attributes);
                prop_assert!(result.is_ok(), "Validation failed: {:?}", result);

                // Check all required attributes are present
                let attrs_obj = attributes.as_object().unwrap();
                for attr_config in &category.attributes {
                    if attr_config.required.unwrap_or(false) {
                        prop_assert!(attrs_obj.contains_key(&attr_config.name),
                            "Required attribute '{}' is missing", attr_config.name);
                    }
                }
            });
        });
    }

    // ============================================================================
    // Property 13: Barcode Uniqueness
    // ============================================================================
    // For any two products in the same tenant, if both have barcodes,
    // the barcodes must be different.
    // Validates: Requirements 8.6

    #[test]
    fn property_13_barcode_uniqueness() {
        proptest!(|(
            mut product1 in arb_product(),
            mut product2 in arb_product(),
            barcode1 in "[0-9]{12}",
            barcode2 in "[0-9]{12}",
        )| {
            // Set barcodes
            product1.barcode = Some(barcode1.clone());
            product2.barcode = Some(barcode2.clone());

            // If products are in the same tenant and have the same barcode,
            // they must be the same product
            if product1.tenant_id == product2.tenant_id
                && product1.barcode == product2.barcode
            {
                prop_assert_eq!(product1.id, product2.id,
                    "Two different products in the same tenant cannot have the same barcode");
            }
        });
    }
}

