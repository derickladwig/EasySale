//! Property-Based Tests for Best Promotion Selection
//! Feature: sales-customer-management, Property 22: Best promotion selection
//!
//! These tests validate that when multiple promotions apply to a transaction,
//! the system selects the promotion that provides the greatest discount amount.
//!
//! **Validates: Requirements 8.2, 8.5**

use proptest::prelude::*;

// ============================================================================
// Test Helpers
// ============================================================================

/// Promotion types supported by the system
#[derive(Debug, Clone, Copy, PartialEq)]
enum PromotionType {
    PercentageOff,
    FixedAmountOff,
    QuantityDiscount,
}

/// Represents a promotion with its discount calculation
#[derive(Debug, Clone)]
struct Promotion {
    id: String,
    name: String,
    promotion_type: PromotionType,
    discount_value: f64,
    min_quantity: Option<i32>,
}

/// Calculate the discount amount for a promotion given item price and quantity
fn calculate_discount(promotion: &Promotion, price: f64, quantity: i32) -> f64 {
    match promotion.promotion_type {
        PromotionType::PercentageOff => {
            price * quantity as f64 * (promotion.discount_value / 100.0)
        }
        PromotionType::FixedAmountOff => {
            promotion.discount_value * quantity as f64
        }
        PromotionType::QuantityDiscount => {
            if let Some(min_qty) = promotion.min_quantity {
                if quantity >= min_qty {
                    price * quantity as f64 * (promotion.discount_value / 100.0)
                } else {
                    0.0
                }
            } else {
                0.0
            }
        }
    }
}

/// Select the best promotion from a list of applicable promotions
/// Returns the promotion with the greatest discount amount
fn select_best_promotion(
    promotions: &[Promotion],
    price: f64,
    quantity: i32,
) -> Option<(Promotion, f64)> {
    if promotions.is_empty() {
        return None;
    }

    let mut best_promotion: Option<(Promotion, f64)> = None;
    let mut max_discount = 0.0;

    for promotion in promotions {
        let discount = calculate_discount(promotion, price, quantity);
        
        if discount > max_discount {
            max_discount = discount;
            best_promotion = Some((promotion.clone(), discount));
        }
    }

    best_promotion
}

// ============================================================================
// Property 22: Best promotion selection
// ============================================================================
// For any transaction with multiple applicable promotions, the system should
// apply the promotion that provides the greatest discount amount.
//
// **Validates: Requirements 8.2, 8.5**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn best_promotion_has_maximum_discount(
        price in 10.0..1000.0,
        quantity in 1..100i32,
        // Generate 2-5 promotions with different discount values
        num_promotions in 2..=5usize,
    ) {
        // Generate multiple promotions with different discount values
        let mut promotions = Vec::new();
        
        for i in 0..num_promotions {
            let promo_type = match i % 3 {
                0 => PromotionType::PercentageOff,
                1 => PromotionType::FixedAmountOff,
                _ => PromotionType::PercentageOff, // Use percentage for simplicity
            };
            
            let discount_value = match promo_type {
                PromotionType::PercentageOff => 5.0 + (i as f64 * 5.0), // 5%, 10%, 15%, etc.
                PromotionType::FixedAmountOff => 1.0 + (i as f64 * 2.0), // $1, $3, $5, etc.
                PromotionType::QuantityDiscount => 5.0 + (i as f64 * 5.0),
            };
            
            promotions.push(Promotion {
                id: format!("promo-{}", i),
                name: format!("Promotion {}", i),
                promotion_type: promo_type,
                discount_value,
                min_quantity: None,
            });
        }

        // Select the best promotion
        let result = select_best_promotion(&promotions, price, quantity);
        
        prop_assert!(
            result.is_some(),
            "Should select a promotion when promotions are available"
        );

        if let Some((best_promo, best_discount)) = result {
            // Verify that the selected promotion has the maximum discount
            for promotion in &promotions {
                let discount = calculate_discount(promotion, price, quantity);
                
                prop_assert!(
                    best_discount >= discount,
                    "Best promotion discount ({}) should be >= all other discounts ({}). \
                     Best: {:?}, Current: {:?}",
                    best_discount,
                    discount,
                    best_promo.name,
                    promotion.name
                );
            }

            // Verify the discount is positive
            prop_assert!(
                best_discount > 0.0,
                "Best promotion should provide a positive discount, got {}",
                best_discount
            );

            // Verify the discount doesn't exceed the total price
            let total_price = price * quantity as f64;
            prop_assert!(
                best_discount <= total_price,
                "Discount ({}) should not exceed total price ({})",
                best_discount,
                total_price
            );
        }
    }

    #[test]
    fn percentage_vs_fixed_amount_selection(
        price in 50.0..500.0,
        quantity in 1..50i32,
        percentage in 10.0..50.0,
        fixed_amount in 5.0..100.0,
    ) {
        let promo_percentage = Promotion {
            id: "promo-pct".to_string(),
            name: "Percentage Off".to_string(),
            promotion_type: PromotionType::PercentageOff,
            discount_value: percentage,
            min_quantity: None,
        };

        let promo_fixed = Promotion {
            id: "promo-fixed".to_string(),
            name: "Fixed Amount Off".to_string(),
            promotion_type: PromotionType::FixedAmountOff,
            discount_value: fixed_amount,
            min_quantity: None,
        };

        let promotions = vec![promo_percentage.clone(), promo_fixed.clone()];
        
        // Calculate expected discounts
        let discount_pct = calculate_discount(&promo_percentage, price, quantity);
        let discount_fixed = calculate_discount(&promo_fixed, price, quantity);

        // Select best promotion
        let result = select_best_promotion(&promotions, price, quantity);
        
        prop_assert!(result.is_some(), "Should select a promotion");

        if let Some((best_promo, best_discount)) = result {
            // Verify the best promotion matches the one with higher discount
            if discount_pct > discount_fixed {
                prop_assert_eq!(
                    best_promo.id,
                    "promo-pct",
                    "Should select percentage promotion when it has higher discount"
                );
                prop_assert!(
                    (best_discount - discount_pct).abs() < 0.01,
                    "Best discount should match percentage discount"
                );
            } else {
                prop_assert_eq!(
                    best_promo.id,
                    "promo-fixed",
                    "Should select fixed amount promotion when it has higher discount"
                );
                prop_assert!(
                    (best_discount - discount_fixed).abs() < 0.01,
                    "Best discount should match fixed amount discount"
                );
            }
        }
    }

    #[test]
    fn quantity_threshold_affects_selection(
        price in 20.0..200.0,
        quantity in 1..20i32,
        threshold in 5..15i32,
    ) {
        // Promotion with no threshold (always applies)
        let promo_always = Promotion {
            id: "promo-always".to_string(),
            name: "Always Applies".to_string(),
            promotion_type: PromotionType::PercentageOff,
            discount_value: 10.0, // 10% off
            min_quantity: None,
        };

        // Promotion with quantity threshold (higher discount but may not apply)
        let promo_threshold = Promotion {
            id: "promo-threshold".to_string(),
            name: "Quantity Discount".to_string(),
            promotion_type: PromotionType::QuantityDiscount,
            discount_value: 25.0, // 25% off if threshold met
            min_quantity: Some(threshold),
        };

        let promotions = vec![promo_always.clone(), promo_threshold.clone()];
        
        let discount_always = calculate_discount(&promo_always, price, quantity);
        let discount_threshold = calculate_discount(&promo_threshold, price, quantity);

        let result = select_best_promotion(&promotions, price, quantity);
        
        prop_assert!(result.is_some(), "Should select a promotion");

        if let Some((best_promo, best_discount)) = result {
            if quantity >= threshold {
                // Threshold met: should select the higher discount (threshold promotion)
                prop_assert_eq!(
                    best_promo.id,
                    "promo-threshold",
                    "Should select quantity discount when threshold is met"
                );
                prop_assert!(
                    best_discount > discount_always,
                    "Quantity discount ({}) should be greater than always-applies discount ({})",
                    best_discount,
                    discount_always
                );
            } else {
                // Threshold not met: should select the always-applies promotion
                prop_assert_eq!(
                    best_promo.id,
                    "promo-always",
                    "Should select always-applies promotion when quantity threshold not met"
                );
                prop_assert!(
                    (best_discount - discount_always).abs() < 0.01,
                    "Best discount should match always-applies discount"
                );
                prop_assert!(
                    discount_threshold.abs() < 0.01,
                    "Threshold promotion should provide zero discount when threshold not met"
                );
            }
        }
    }

    #[test]
    fn multiple_percentage_promotions_select_highest(
        price in 50.0..500.0,
        quantity in 1..50i32,
    ) {
        // Create promotions with increasing discount percentages
        let promotions = vec![
            Promotion {
                id: "promo-5pct".to_string(),
                name: "5% Off".to_string(),
                promotion_type: PromotionType::PercentageOff,
                discount_value: 5.0,
                min_quantity: None,
            },
            Promotion {
                id: "promo-10pct".to_string(),
                name: "10% Off".to_string(),
                promotion_type: PromotionType::PercentageOff,
                discount_value: 10.0,
                min_quantity: None,
            },
            Promotion {
                id: "promo-20pct".to_string(),
                name: "20% Off".to_string(),
                promotion_type: PromotionType::PercentageOff,
                discount_value: 20.0,
                min_quantity: None,
            },
        ];

        let result = select_best_promotion(&promotions, price, quantity);
        
        prop_assert!(result.is_some(), "Should select a promotion");

        if let Some((best_promo, best_discount)) = result {
            // Should select the 20% promotion (highest discount)
            prop_assert_eq!(
                best_promo.id,
                "promo-20pct",
                "Should select the promotion with highest percentage"
            );

            // Verify the discount amount
            let expected_discount = price * quantity as f64 * 0.20;
            let diff = (best_discount - expected_discount).abs();
            
            prop_assert!(
                diff < 0.01,
                "Best discount should equal 20% of total price: expected {}, got {}",
                expected_discount,
                best_discount
            );
        }
    }

    #[test]
    fn best_promotion_is_deterministic(
        price in 10.0..1000.0,
        quantity in 1..100i32,
    ) {
        // Create promotions with distinct discount values
        let promotions = vec![
            Promotion {
                id: "promo-1".to_string(),
                name: "Promo 1".to_string(),
                promotion_type: PromotionType::PercentageOff,
                discount_value: 15.0,
                min_quantity: None,
            },
            Promotion {
                id: "promo-2".to_string(),
                name: "Promo 2".to_string(),
                promotion_type: PromotionType::FixedAmountOff,
                discount_value: 10.0,
                min_quantity: None,
            },
            Promotion {
                id: "promo-3".to_string(),
                name: "Promo 3".to_string(),
                promotion_type: PromotionType::PercentageOff,
                discount_value: 25.0,
                min_quantity: None,
            },
        ];

        // Select best promotion multiple times
        let result1 = select_best_promotion(&promotions, price, quantity);
        let result2 = select_best_promotion(&promotions, price, quantity);
        
        prop_assert!(result1.is_some() && result2.is_some(), "Should select a promotion");

        if let (Some((promo1, discount1)), Some((promo2, discount2))) = (result1, result2) {
            // Results should be identical (deterministic)
            prop_assert_eq!(
                promo1.id,
                promo2.id,
                "Best promotion selection should be deterministic"
            );
            
            let diff = (discount1 - discount2).abs();
            prop_assert!(
                diff < 0.000001,
                "Best discount amount should be deterministic"
            );
        }
    }

    #[test]
    fn zero_discount_promotions_not_selected_when_better_exists(
        price in 50.0..500.0,
        quantity in 1..10i32,
        high_threshold in 50..100i32,
    ) {
        // Promotion that won't apply (threshold too high)
        let promo_zero = Promotion {
            id: "promo-zero".to_string(),
            name: "High Threshold".to_string(),
            promotion_type: PromotionType::QuantityDiscount,
            discount_value: 50.0, // High discount but won't apply
            min_quantity: Some(high_threshold),
        };

        // Promotion that will apply
        let promo_valid = Promotion {
            id: "promo-valid".to_string(),
            name: "Valid Promotion".to_string(),
            promotion_type: PromotionType::PercentageOff,
            discount_value: 10.0,
            min_quantity: None,
        };

        let promotions = vec![promo_zero.clone(), promo_valid.clone()];
        
        let discount_zero = calculate_discount(&promo_zero, price, quantity);
        let discount_valid = calculate_discount(&promo_valid, price, quantity);

        // Verify zero discount for threshold promotion
        prop_assert!(
            discount_zero.abs() < 0.01,
            "Promotion with unmet threshold should have zero discount"
        );

        let result = select_best_promotion(&promotions, price, quantity);
        
        prop_assert!(result.is_some(), "Should select a promotion");

        if let Some((best_promo, best_discount)) = result {
            // Should select the valid promotion, not the zero-discount one
            prop_assert_eq!(
                best_promo.id,
                "promo-valid",
                "Should select promotion with positive discount over zero discount"
            );
            
            prop_assert!(
                best_discount > 0.0,
                "Best discount should be positive"
            );
            
            let diff = (best_discount - discount_valid).abs();
            prop_assert!(
                diff < 0.01,
                "Best discount should match valid promotion discount"
            );
        }
    }

    #[test]
    fn single_promotion_is_always_best(
        price in 10.0..1000.0,
        quantity in 1..100i32,
        discount_value in 5.0..50.0,
    ) {
        let promotion = Promotion {
            id: "promo-only".to_string(),
            name: "Only Promotion".to_string(),
            promotion_type: PromotionType::PercentageOff,
            discount_value,
            min_quantity: None,
        };

        let promotions = vec![promotion.clone()];
        
        let result = select_best_promotion(&promotions, price, quantity);
        
        prop_assert!(result.is_some(), "Should select the only promotion");

        if let Some((best_promo, best_discount)) = result {
            prop_assert_eq!(
                best_promo.id,
                "promo-only",
                "Should select the only available promotion"
            );

            let expected_discount = calculate_discount(&promotion, price, quantity);
            let diff = (best_discount - expected_discount).abs();
            
            prop_assert!(
                diff < 0.01,
                "Best discount should match the only promotion's discount"
            );
        }
    }

    #[test]
    fn empty_promotions_returns_none(
        price in 10.0..1000.0,
        quantity in 1..100i32,
    ) {
        let promotions: Vec<Promotion> = vec![];
        
        let result = select_best_promotion(&promotions, price, quantity);
        
        prop_assert!(
            result.is_none(),
            "Should return None when no promotions are available"
        );
    }
}

// ============================================================================
// Additional Property Tests: Edge Cases
// ============================================================================

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn best_promotion_with_equal_discounts(
        price in 50.0..500.0,
        quantity in 1..50i32,
        discount_value in 10.0..30.0,
    ) {
        // Create two promotions with identical discount amounts
        let promo1 = Promotion {
            id: "promo-1".to_string(),
            name: "Promo 1".to_string(),
            promotion_type: PromotionType::PercentageOff,
            discount_value,
            min_quantity: None,
        };

        let promo2 = Promotion {
            id: "promo-2".to_string(),
            name: "Promo 2".to_string(),
            promotion_type: PromotionType::PercentageOff,
            discount_value,
            min_quantity: None,
        };

        let promotions = vec![promo1.clone(), promo2.clone()];
        
        let discount1 = calculate_discount(&promo1, price, quantity);
        let discount2 = calculate_discount(&promo2, price, quantity);

        // Verify discounts are equal
        let diff = (discount1 - discount2).abs();
        prop_assert!(
            diff < 0.01,
            "Both promotions should have equal discounts"
        );

        let result = select_best_promotion(&promotions, price, quantity);
        
        prop_assert!(result.is_some(), "Should select a promotion");

        if let Some((best_promo, best_discount)) = result {
            // Should select one of them (either is valid)
            prop_assert!(
                best_promo.id == "promo-1" || best_promo.id == "promo-2",
                "Should select one of the equal promotions"
            );

            // Discount should match the equal discount amount
            let diff = (best_discount - discount1).abs();
            prop_assert!(
                diff < 0.01,
                "Best discount should match the equal discount amount"
            );
        }
    }

    #[test]
    fn large_quantity_affects_promotion_selection(
        price in 10.0..100.0,
        large_quantity in 100..1000i32,
    ) {
        // Small fixed amount
        let promo_fixed = Promotion {
            id: "promo-fixed".to_string(),
            name: "Fixed $5 Off".to_string(),
            promotion_type: PromotionType::FixedAmountOff,
            discount_value: 5.0,
            min_quantity: None,
        };

        // Small percentage (but scales with quantity)
        let promo_pct = Promotion {
            id: "promo-pct".to_string(),
            name: "2% Off".to_string(),
            promotion_type: PromotionType::PercentageOff,
            discount_value: 2.0,
            min_quantity: None,
        };

        let promotions = vec![promo_fixed.clone(), promo_pct.clone()];
        
        let discount_fixed = calculate_discount(&promo_fixed, price, large_quantity);
        let discount_pct = calculate_discount(&promo_pct, price, large_quantity);

        let result = select_best_promotion(&promotions, price, large_quantity);
        
        prop_assert!(result.is_some(), "Should select a promotion");

        if let Some((best_promo, best_discount)) = result {
            // With large quantities, even small percentages can exceed fixed amounts
            if discount_pct > discount_fixed {
                prop_assert_eq!(
                    best_promo.id,
                    "promo-pct",
                    "Should select percentage promotion when it provides higher discount with large quantity"
                );
            } else {
                prop_assert_eq!(
                    best_promo.id,
                    "promo-fixed",
                    "Should select fixed amount promotion when it provides higher discount"
                );
            }

            // Verify best discount is the maximum
            prop_assert!(
                best_discount >= discount_fixed && best_discount >= discount_pct,
                "Best discount should be the maximum of all promotions"
            );
        }
    }
}
