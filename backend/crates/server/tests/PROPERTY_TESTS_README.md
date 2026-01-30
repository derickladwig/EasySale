# Property-Based Tests for Universal Product Catalog

## Overview

This directory contains property-based tests for the Universal Product Catalog system using the `proptest` crate. Property-based testing validates that correctness properties hold across all valid inputs, providing stronger guarantees than example-based unit tests.

## Implemented Properties

The following properties have been implemented in `product_property_tests.rs`:

### Property 1: Attribute Validation Consistency
**Validates: Requirements 2.2, 17.1, 17.6**

For any product and category configuration, if the product's attributes pass validation, then saving and reloading the product should pass validation again with the same configuration.

This ensures that the validation logic is consistent and that serialization/deserialization doesn't introduce validation failures.

### Property 2: SKU Uniqueness
**Validates: Requirements 17.2**

For any two products in the same tenant, their SKUs must be different. This property ensures that the SKU uniqueness constraint is properly enforced at the business logic level.

### Property 4: Category Configuration Compliance
**Validates: Requirements 1.2, 2.2**

For any product in a category, all required attributes defined in the category configuration must be present in the product's attributes. This validates that the configuration-driven attribute system correctly enforces required fields.

### Property 5: Price Non-Negativity
**Validates: Requirements 17.3, 17.4**

For any product, the unit_price and cost must be non-negative numbers. This is a fundamental business rule that must hold for all products.

### Property 6: Variant Parent Relationship
**Validates: Requirements 6.1, 6.3**

For any product variant, if it has a parent_id, then a product with that ID must exist and must not itself be a variant. This ensures the integrity of the parent-child relationship for product variants.

### Property 13: Barcode Uniqueness
**Validates: Requirements 8.6**

For any two products in the same tenant, if both have barcodes, the barcodes must be different. This ensures barcode uniqueness within a tenant.

## Test Configuration

All property tests are configured to run with **100 iterations** per test, as specified in the design document. This provides comprehensive coverage across the input space.

```rust
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]
    // ... test implementation
}
```

## Generators

The test file includes several custom generators for creating valid test data:

- `arb_category_config()`: Generates valid category configurations
- `arb_attribute_config()`: Generates valid attribute configurations
- `arb_valid_attributes()`: Generates attributes that match a category configuration
- `arb_product()`: Generates valid products

These generators ensure that the property tests explore a wide range of valid inputs while maintaining data consistency.

## Running the Tests

**IMPORTANT**: Before running these tests, you must fix the compilation errors in the existing codebase. There are numerous syntax errors in format strings throughout the services layer (e.g., `{, code: None}` should be `{}`).

Once the compilation errors are fixed, run the property tests with:

```bash
cargo test --test product_property_tests
```

To run with verbose output:

```bash
cargo test --test product_property_tests -- --nocapture
```

## Remaining Properties

The following properties from the design document have not yet been implemented:

- **Property 3**: Search Index Consistency (requires database integration)
- **Property 7**: Hierarchy Filter Correctness (requires search service integration)
- **Property 8**: Bulk Operation Atomicity (requires transaction testing)
- **Property 9**: Offline Queue Consistency (requires sync engine integration)
- **Property 10**: Tenant Isolation (requires database integration)
- **Properties 11-15**: Additional properties requiring full system integration

These properties require more complex setup with database connections and service integrations. They can be implemented as integration tests once the core compilation issues are resolved.

## Known Issues

### Compilation Errors

The project currently has compilation errors that prevent running any tests. These errors are in the existing codebase and are not related to the property tests:

1. **Format String Errors**: Multiple files have malformed format strings with `{, code: None}` instead of `{}`
   - `src/services/attribute_validator.rs`
   - `src/services/search_service.rs`
   - `src/services/variant_service.rs`

2. **Type Mismatches**: Several handlers have type mismatches with `ConfigLoader`
   - `src/handlers/product.rs`
   - `src/handlers/fresh_install.rs`

These issues must be resolved before the property tests can be executed.

## Next Steps

1. **Fix Compilation Errors**: Resolve all syntax and type errors in the existing codebase
2. **Run Property Tests**: Execute the implemented property tests to verify correctness
3. **Implement Remaining Properties**: Add the remaining 9 properties as integration tests
4. **Add More Generators**: Enhance generators to cover edge cases and boundary conditions
5. **Performance Testing**: Implement the performance tests (Task 25)

## References

- [Proptest Documentation](https://docs.rs/proptest/)
- [Property-Based Testing Guide](https://hypothesis.works/articles/what-is-property-based-testing/)
- Design Document: `.kiro/specs/universal-product-catalog/design.md`
- Requirements Document: `.kiro/specs/universal-product-catalog/requirements.md`

