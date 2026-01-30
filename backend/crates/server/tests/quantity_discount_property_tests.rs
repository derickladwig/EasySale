//! Property-Based Tests for Quantity Discount Threshold
//! Feature: sales-customer-management, Property 23: Quantity discount threshold
//!
//! These tests validate that for any quantity-based promotion, the discount
//! should only apply when the quantity meets or exceeds the minimum quantity threshold.
//!
//! **Validates: Requirements 8.3**

use proptest::prelude::*;

// ============================================================================
// Test Helpers
// ============================================================================

/// Represents a quantity-based promotion with a minimum quantity threshold
#[derive(Debug, Clone)]
struct QuantityPromotion {
    id: String,
    name: String,
    discount_percentage: f64,
    min_quantity: i32,
}

/// Calculate the discount for a quantity-based promotion
/// Returns the discount amount if threshold is met, otherwise 0.0
fn calculate_quantity_discount(
    promotion: &QuantityPromotion,
    price: f64,
    quantity: i32,
) -> f64 {
    if quantity >= promotion.min_quantity {
        // Threshold met: apply discount
        price * quantity as f64 * (promotion.discount_percentage / 100.0)
    } else {
        // Threshold not met: no discount
        0.0
    }
}

/// Check if a discount should apply based on quantity threshold
fn should_apply_discount(promotion: &QuantityPromotion, quantity: i32) -> bool {
    quantity >= promotion.min_quantity
}

// ============================================================================
// Property 23: Quantity discount threshold
// ============================================================================
// For any quantity-based promotion, the discount should only apply when the
// quantity meets or exceeds the minimum quantity threshold.
//
// **Validates: Requirements 8.3**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn discount_applies_only_when_threshold_met(
        price in 10.0..1000.0,
        quantity in 1..100i32,
        threshold in 2..50i32,
        discount_pct in 5.0..50.0,
    ) {
        let promotion = QuantityPromotion {
            id: "promo-qty".to_string(),
            name: "Quantity Discount".to_string(),
            discount_percentage: discount_pct,
            min_quantity: threshold,
        };

        let discount = calculate_quantity_discount(&promotion, price, quantity);

        if quantity >= threshold {
            // Threshold met: discount should be positive
            let expected_discount = price * quantity as f64 * (discount_pct / 100.0);
            let diff = (discount - expected_discount).abs();
            
            prop_assert!(
                discount > 0.0,
                "Discount should be positive when quantity ({}) >= threshold ({})",
                quantity,
                threshold
            );
            
            prop_assert!(
                diff < 0.01,
                "Discount should equal price * quantity * percentage when threshold met. \
                 Expected: {}, Got: {}",
                expected_discount,
                discount
            );
        } else {
            // Threshold not met: discount should be zero
            prop_assert!(
                discount.abs() < 0.000001,
                "Discount should be zero when quantity ({}) < threshold ({}), got {}",
                quantity,
                threshold,
                discount
            );
        }
    }

    #[test]
    fn exact_threshold_quantity_applies_discount(
        price in 10.0..1000.0,
        threshold in 2..50i32,
        discount_pct in 5.0..50.0,
    ) {
        let promotion = QuantityPromotion {
            id: "promo-exact".to_string(),
            name: "Exact Threshold".to_string(),
            discount_percentage: discount_pct,
            min_quantity: threshold,
        };

        // Test with exact threshold quantity
        let discount = calculate_quantity_discount(&promotion, price, threshold);
        let expected_discount = price * threshold as f64 * (discount_pct / 100.0);

        prop_assert!(
            discount > 0.0,
            "Discount should apply when quantity exactly equals threshold"
        );

        let diff = (discount - expected_discount).abs();
        prop_assert!(
            diff < 0.01,
            "Discount should be calculated correctly at exact threshold. \
             Expected: {}, Got: {}",
            expected_discount,
            discount
        );
    }

    #[test]
    fn one_below_threshold_no_discount(
        price in 10.0..1000.0,
        threshold in 3..50i32,
        discount_pct in 5.0..50.0,
    ) {
        let promotion = QuantityPromotion {
            id: "promo-below".to_string(),
            name: "Below Threshold".to_string(),
            discount_percentage: discount_pct,
            min_quantity: threshold,
        };

        // Test with one less than threshold
        let quantity = threshold - 1;
        let discount = calculate_quantity_discount(&promotion, price, quantity);

        prop_assert!(
            discount.abs() < 0.000001,
            "Discount should be zero when quantity ({}) is one below threshold ({}), got {}",
            quantity,
            threshold,
            discount
        );
    }

    #[test]
    fn one_above_threshold_applies_discount(
        price in 10.0..1000.0,
        threshold in 2..49i32,
        discount_pct in 5.0..50.0,
    ) {
        let promotion = QuantityPromotion {
            id: "promo-above".to_string(),
            name: "Above Threshold".to_string(),
            discount_percentage: discount_pct,
            min_quantity: threshold,
        };

        // Test with one more than threshold
        let quantity = threshold + 1;
        let discount = calculate_quantity_discount(&promotion, price, quantity);
        let expected_discount = price * quantity as f64 * (discount_pct / 100.0);

        prop_assert!(
            discount > 0.0,
            "Discount should apply when quantity ({}) is one above threshold ({})",
            quantity,
            threshold
        );

        let diff = (discount - expected_discount).abs();
        prop_assert!(
            diff < 0.01,
            "Discount should be calculated correctly when one above threshold. \
             Expected: {}, Got: {}",
            expected_discount,
            discount
        );
    }

    #[test]
    fn threshold_check_is_consistent(
        quantity in 1..100i32,
        threshold in 2..50i32,
    ) {
        let promotion = QuantityPromotion {
            id: "promo-consistent".to_string(),
            name: "Consistency Check".to_string(),
            discount_percentage: 10.0,
            min_quantity: threshold,
        };

        // Check multiple times - should be deterministic
        let should_apply_1 = should_apply_discount(&promotion, quantity);
        let should_apply_2 = should_apply_discount(&promotion, quantity);
        let should_apply_3 = should_apply_discount(&promotion, quantity);

        prop_assert_eq!(
            should_apply_1,
            should_apply_2,
            "Threshold check should be deterministic"
        );
        
        prop_assert_eq!(
            should_apply_2,
            should_apply_3,
            "Threshold check should be deterministic"
        );

        // Verify the result matches expected logic
        let expected = quantity >= threshold;
        prop_assert_eq!(
            should_apply_1,
            expected,
            "Threshold check should match quantity >= min_quantity logic"
        );
    }

    #[test]
    fn discount_scales_with_quantity_above_threshold(
        price in 10.0..100.0,
        threshold in 2..10i32,
        quantity_above in 1..20i32,
        discount_pct in 5.0..50.0,
    ) {
        let promotion = QuantityPromotion {
            id: "promo-scale".to_string(),
            name: "Scaling Discount".to_string(),
            discount_percentage: discount_pct,
            min_quantity: threshold,
        };

        let quantity = threshold + quantity_above;
        let discount = calculate_quantity_discount(&promotion, price, quantity);

        // Discount should be positive
        prop_assert!(
            discount > 0.0,
            "Discount should be positive when quantity exceeds threshold"
        );

        // Discount should scale with quantity
        let expected_discount = price * quantity as f64 * (discount_pct / 100.0);
        let diff = (discount - expected_discount).abs();
        
        prop_assert!(
            diff < 0.01,
            "Discount should scale with quantity. Expected: {}, Got: {}",
            expected_discount,
            discount
        );

        // Verify discount increases with quantity
        if quantity_above > 0 {
            let smaller_quantity = threshold;
            let smaller_discount = calculate_quantity_discount(&promotion, price, smaller_quantity);
            
            prop_assert!(
                discount > smaller_discount,
                "Discount for quantity {} should be greater than discount for quantity {}",
                quantity,
                smaller_quantity
            );
        }
    }

    #[test]
    fn threshold_of_one_always_applies(
        price in 10.0..1000.0,
        quantity in 1..100i32,
        discount_pct in 5.0..50.0,
    ) {
        let promotion = QuantityPromotion {
            id: "promo-one".to_string(),
            name: "Threshold One".to_string(),
            discount_percentage: discount_pct,
            min_quantity: 1,
        };

        let discount = calculate_quantity_discount(&promotion, price, quantity);
        let expected_discount = price * quantity as f64 * (discount_pct / 100.0);

        // With threshold of 1, any positive quantity should get discount
        prop_assert!(
            discount > 0.0,
            "Discount should always apply when threshold is 1 and quantity is {}",
            quantity
        );

        let diff = (discount - expected_discount).abs();
        prop_assert!(
            diff < 0.01,
            "Discount should be calculated correctly with threshold of 1. \
             Expected: {}, Got: {}",
            expected_discount,
            discount
        );
    }

    #[test]
    fn high_threshold_prevents_discount_for_small_quantities(
        price in 10.0..1000.0,
        small_quantity in 1..10i32,
        high_threshold in 50..100i32,
        discount_pct in 5.0..50.0,
    ) {
        let promotion = QuantityPromotion {
            id: "promo-high".to_string(),
            name: "High Threshold".to_string(),
            discount_percentage: discount_pct,
            min_quantity: high_threshold,
        };

        let discount = calculate_quantity_discount(&promotion, price, small_quantity);

        // Small quantity should never meet high threshold
        prop_assert!(
            small_quantity < high_threshold,
            "Test precondition: small quantity should be less than high threshold"
        );

        prop_assert!(
            discount.abs() < 0.000001,
            "Discount should be zero when small quantity ({}) is far below high threshold ({}), got {}",
            small_quantity,
            high_threshold,
            discount
        );
    }

    #[test]
    fn discount_amount_never_exceeds_total_price(
        price in 10.0..1000.0,
        quantity in 1..100i32,
        threshold in 2..50i32,
        discount_pct in 5.0..100.0,
    ) {
        let promotion = QuantityPromotion {
            id: "promo-cap".to_string(),
            name: "Capped Discount".to_string(),
            discount_percentage: discount_pct,
            min_quantity: threshold,
        };

        let discount = calculate_quantity_discount(&promotion, price, quantity);
        let total_price = price * quantity as f64;

        if quantity >= threshold {
            // Discount should not exceed total price
            prop_assert!(
                discount <= total_price,
                "Discount ({}) should not exceed total price ({})",
                discount,
                total_price
            );
        } else {
            // No discount when threshold not met
            prop_assert!(
                discount.abs() < 0.000001,
                "Discount should be zero when threshold not met"
            );
        }
    }

    #[test]
    fn multiple_threshold_checks_with_same_promotion(
        price in 10.0..1000.0,
        threshold in 5..20i32,
        discount_pct in 5.0..50.0,
    ) {
        let promotion = QuantityPromotion {
            id: "promo-multi".to_string(),
            name: "Multiple Checks".to_string(),
            discount_percentage: discount_pct,
            min_quantity: threshold,
        };

        // Test quantities below, at, and above threshold
        let below = threshold - 1;
        let exact = threshold;
        let above = threshold + 1;

        let discount_below = calculate_quantity_discount(&promotion, price, below);
        let discount_exact = calculate_quantity_discount(&promotion, price, exact);
        let discount_above = calculate_quantity_discount(&promotion, price, above);

        // Below threshold: no discount
        prop_assert!(
            discount_below.abs() < 0.000001,
            "No discount when quantity ({}) is below threshold ({})",
            below,
            threshold
        );

        // At threshold: discount applies
        prop_assert!(
            discount_exact > 0.0,
            "Discount should apply when quantity ({}) equals threshold ({})",
            exact,
            threshold
        );

        // Above threshold: discount applies and is greater
        prop_assert!(
            discount_above > 0.0,
            "Discount should apply when quantity ({}) exceeds threshold ({})",
            above,
            threshold
        );

        prop_assert!(
            discount_above > discount_exact,
            "Discount for quantity {} should be greater than discount for quantity {}",
            above,
            exact
        );
    }
}

// ============================================================================
// Additional Property Tests: Edge Cases and Boundary Conditions
// ============================================================================

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn zero_quantity_never_gets_discount(
        price in 10.0..1000.0,
        threshold in 1..50i32,
        discount_pct in 5.0..50.0,
    ) {
        let promotion = QuantityPromotion {
            id: "promo-zero".to_string(),
            name: "Zero Quantity".to_string(),
            discount_percentage: discount_pct,
            min_quantity: threshold,
        };

        let discount = calculate_quantity_discount(&promotion, price, 0);

        prop_assert!(
            discount.abs() < 0.000001,
            "Zero quantity should never receive discount, got {}",
            discount
        );
    }

    #[test]
    fn threshold_boundary_is_inclusive(
        price in 10.0..1000.0,
        threshold in 2..50i32,
        discount_pct in 5.0..50.0,
    ) {
        let promotion = QuantityPromotion {
            id: "promo-boundary".to_string(),
            name: "Boundary Test".to_string(),
            discount_percentage: discount_pct,
            min_quantity: threshold,
        };

        // Test the boundary: threshold - 1, threshold, threshold + 1
        let below = threshold - 1;
        let at = threshold;
        let above = threshold + 1;

        let discount_below = calculate_quantity_discount(&promotion, price, below);
        let discount_at = calculate_quantity_discount(&promotion, price, at);
        let discount_above = calculate_quantity_discount(&promotion, price, above);

        // Below: no discount
        prop_assert!(
            discount_below.abs() < 0.000001,
            "Quantity {} (below threshold {}) should not get discount",
            below,
            threshold
        );

        // At: discount applies (inclusive boundary)
        prop_assert!(
            discount_at > 0.0,
            "Quantity {} (at threshold {}) should get discount (inclusive boundary)",
            at,
            threshold
        );

        // Above: discount applies
        prop_assert!(
            discount_above > 0.0,
            "Quantity {} (above threshold {}) should get discount",
            above,
            threshold
        );

        // Verify the boundary is exactly at threshold (inclusive)
        prop_assert!(
            should_apply_discount(&promotion, threshold),
            "Threshold should be inclusive: quantity == threshold should apply discount"
        );

        prop_assert!(
            !should_apply_discount(&promotion, threshold - 1),
            "Quantity below threshold should not apply discount"
        );
    }

    #[test]
    fn different_thresholds_produce_different_results(
        price in 10.0..1000.0,
        quantity in 5..15i32,
        discount_pct in 10.0..30.0,
    ) {
        let low_threshold = 3;
        let high_threshold = 20;

        let promo_low = QuantityPromotion {
            id: "promo-low".to_string(),
            name: "Low Threshold".to_string(),
            discount_percentage: discount_pct,
            min_quantity: low_threshold,
        };

        let promo_high = QuantityPromotion {
            id: "promo-high".to_string(),
            name: "High Threshold".to_string(),
            discount_percentage: discount_pct,
            min_quantity: high_threshold,
        };

        let discount_low = calculate_quantity_discount(&promo_low, price, quantity);
        let discount_high = calculate_quantity_discount(&promo_high, price, quantity);

        // For quantities between low and high threshold
        if quantity >= low_threshold && quantity < high_threshold {
            // Low threshold promotion should apply
            prop_assert!(
                discount_low > 0.0,
                "Low threshold promotion should apply for quantity {}",
                quantity
            );

            // High threshold promotion should not apply
            prop_assert!(
                discount_high.abs() < 0.000001,
                "High threshold promotion should not apply for quantity {}",
                quantity
            );
        }
    }

    #[test]
    fn discount_percentage_affects_amount_not_threshold_logic(
        price in 10.0..100.0,
        quantity in 1..50i32,
        threshold in 5..20i32,
        low_pct in 5.0..15.0,
        high_pct in 20.0..50.0,
    ) {
        let promo_low_pct = QuantityPromotion {
            id: "promo-low-pct".to_string(),
            name: "Low Percentage".to_string(),
            discount_percentage: low_pct,
            min_quantity: threshold,
        };

        let promo_high_pct = QuantityPromotion {
            id: "promo-high-pct".to_string(),
            name: "High Percentage".to_string(),
            discount_percentage: high_pct,
            min_quantity: threshold,
        };

        let discount_low_pct = calculate_quantity_discount(&promo_low_pct, price, quantity);
        let discount_high_pct = calculate_quantity_discount(&promo_high_pct, price, quantity);

        if quantity >= threshold {
            // Both should apply (same threshold)
            prop_assert!(
                discount_low_pct > 0.0 && discount_high_pct > 0.0,
                "Both promotions should apply when threshold is met"
            );

            // Higher percentage should give higher discount
            prop_assert!(
                discount_high_pct > discount_low_pct,
                "Higher percentage ({}) should give higher discount than lower percentage ({})",
                high_pct,
                low_pct
            );
        } else {
            // Neither should apply (threshold not met)
            prop_assert!(
                discount_low_pct.abs() < 0.000001 && discount_high_pct.abs() < 0.000001,
                "Neither promotion should apply when threshold not met"
            );
        }
    }
}
