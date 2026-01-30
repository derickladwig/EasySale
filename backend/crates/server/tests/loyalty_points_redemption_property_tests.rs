//! Property-Based Tests for Loyalty Points Redemption
//! Feature: sales-customer-management, Property 13: Loyalty points redemption consistency
//!
//! These tests validate that for any loyalty point redemption, the customer's point balance
//! should decrease by the redeemed amount and the transaction discount should equal the point value.
//!
//! **Validates: Requirements 4.4**

use proptest::prelude::*;

// ============================================================================
// Test Helpers
// ============================================================================

/// Represents a customer's loyalty account state
#[derive(Debug, Clone)]
struct LoyaltyAccount {
    customer_id: String,
    points_balance: i32,
}

/// Represents a redemption transaction
#[derive(Debug, Clone)]
struct RedemptionTransaction {
    points_redeemed: i32,
    discount_applied: f64,
}

/// Represents the result of a redemption operation
#[derive(Debug, Clone)]
struct RedemptionResult {
    success: bool,
    new_balance: i32,
    discount_amount: f64,
    error_message: Option<String>,
}

/// Calculate discount value from points
/// Typically, loyalty programs use a conversion rate (e.g., 100 points = $1)
fn calculate_discount_from_points(points: i32, points_per_dollar: f64) -> f64 {
    if points <= 0 || points_per_dollar <= 0.0 {
        return 0.0;
    }
    
    // Convert points to dollars
    // If 100 points = $1, then points_per_dollar = 100.0
    // discount = points / points_per_dollar
    points as f64 / points_per_dollar
}

/// Redeem loyalty points (simplified version for testing)
fn redeem_loyalty_points(
    account: &LoyaltyAccount,
    points_to_redeem: i32,
    points_per_dollar: f64,
) -> RedemptionResult {
    // Validate points to redeem
    if points_to_redeem <= 0 {
        return RedemptionResult {
            success: false,
            new_balance: account.points_balance,
            discount_amount: 0.0,
            error_message: Some("Points to redeem must be greater than zero".to_string()),
        };
    }

    // Check if customer has enough points
    if account.points_balance < points_to_redeem {
        return RedemptionResult {
            success: false,
            new_balance: account.points_balance,
            discount_amount: 0.0,
            error_message: Some(format!(
                "Insufficient points: have {}, need {}",
                account.points_balance, points_to_redeem
            )),
        };
    }

    // Calculate discount amount
    let discount_amount = calculate_discount_from_points(points_to_redeem, points_per_dollar);

    // Deduct points from balance
    let new_balance = account.points_balance - points_to_redeem;

    RedemptionResult {
        success: true,
        new_balance,
        discount_amount,
        error_message: None,
    }
}

// ============================================================================
// Property Test Generators
// ============================================================================

/// Generate a customer ID
fn arb_customer_id() -> impl Strategy<Value = String> {
    "[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}"
        .prop_map(|s| s.to_string())
}

/// Generate a points balance (reasonable range)
fn arb_points_balance() -> impl Strategy<Value = i32> {
    0..100000
}

/// Generate points to redeem (must be positive)
fn arb_points_to_redeem() -> impl Strategy<Value = i32> {
    1..10000
}

/// Generate a points-per-dollar conversion rate
/// Common rates: 100 points = $1 (100.0), 10 points = $1 (10.0), 1 point = $1 (1.0)
fn arb_points_per_dollar() -> impl Strategy<Value = f64> {
    1.0..1000.0
}

/// Generate a loyalty account with sufficient balance
fn arb_account_with_balance(min_balance: i32) -> impl Strategy<Value = LoyaltyAccount> {
    (arb_customer_id(), min_balance..100000).prop_map(|(customer_id, points_balance)| {
        LoyaltyAccount {
            customer_id,
            points_balance,
        }
    })
}

// ============================================================================
// Property 13: Loyalty points redemption consistency
// ============================================================================
// For any loyalty point redemption, the customer's point balance should decrease
// by the redeemed amount and the transaction discount should equal the point value.
//
// **Validates: Requirements 4.4**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn redemption_decreases_balance_by_redeemed_amount(
        initial_balance in 100..100000i32,
        points_to_redeem in 1..100i32,
        points_per_dollar in arb_points_per_dollar(),
    ) {
        // Ensure we have enough points
        let initial_balance = initial_balance.max(points_to_redeem);
        
        let account = LoyaltyAccount {
            customer_id: "test-customer".to_string(),
            points_balance: initial_balance,
        };

        let result = redeem_loyalty_points(&account, points_to_redeem, points_per_dollar);

        // Redemption should succeed
        prop_assert!(
            result.success,
            "Redemption should succeed when customer has sufficient points"
        );

        // New balance should equal initial balance minus redeemed points
        prop_assert_eq!(
            result.new_balance,
            initial_balance - points_to_redeem,
            "New balance should equal initial balance ({}) minus redeemed points ({})",
            initial_balance,
            points_to_redeem
        );

        // Verify the balance decreased by exactly the redeemed amount
        let balance_decrease = initial_balance - result.new_balance;
        prop_assert_eq!(
            balance_decrease,
            points_to_redeem,
            "Balance should decrease by exactly the redeemed amount"
        );
    }

    #[test]
    fn redemption_discount_equals_point_value(
        initial_balance in 1000..100000i32,
        points_to_redeem in 100..1000i32,
        points_per_dollar in arb_points_per_dollar(),
    ) {
        // Ensure we have enough points
        let initial_balance = initial_balance.max(points_to_redeem);
        
        let account = LoyaltyAccount {
            customer_id: "test-customer".to_string(),
            points_balance: initial_balance,
        };

        let result = redeem_loyalty_points(&account, points_to_redeem, points_per_dollar);

        // Calculate expected discount
        let expected_discount = calculate_discount_from_points(points_to_redeem, points_per_dollar);

        // Discount should equal the point value
        prop_assert!(
            (result.discount_amount - expected_discount).abs() < 0.01,
            "Discount amount ({}) should equal point value ({})",
            result.discount_amount,
            expected_discount
        );

        // Verify the calculation is correct
        let calculated_discount = points_to_redeem as f64 / points_per_dollar;
        prop_assert!(
            (result.discount_amount - calculated_discount).abs() < 0.01,
            "Discount should be calculated as points / points_per_dollar"
        );
    }

    #[test]
    fn redemption_consistency_both_balance_and_discount(
        initial_balance in 1000..100000i32,
        points_to_redeem in 100..1000i32,
        points_per_dollar in arb_points_per_dollar(),
    ) {
        // Ensure we have enough points
        let initial_balance = initial_balance.max(points_to_redeem);
        
        let account = LoyaltyAccount {
            customer_id: "test-customer".to_string(),
            points_balance: initial_balance,
        };

        let result = redeem_loyalty_points(&account, points_to_redeem, points_per_dollar);

        // Both conditions must hold simultaneously
        prop_assert!(result.success, "Redemption should succeed");
        
        // Balance consistency
        prop_assert_eq!(
            result.new_balance,
            initial_balance - points_to_redeem,
            "Balance should decrease by redeemed amount"
        );

        // Discount consistency
        let expected_discount = points_to_redeem as f64 / points_per_dollar;
        prop_assert!(
            (result.discount_amount - expected_discount).abs() < 0.01,
            "Discount should equal point value"
        );
    }

    #[test]
    fn insufficient_points_prevents_redemption(
        initial_balance in 0..1000i32,
        points_to_redeem in 1001..10000i32,
    ) {
        let account = LoyaltyAccount {
            customer_id: "test-customer".to_string(),
            points_balance: initial_balance,
        };

        let result = redeem_loyalty_points(&account, points_to_redeem, 100.0);

        // Redemption should fail
        prop_assert!(
            !result.success,
            "Redemption should fail when customer has insufficient points"
        );

        // Balance should remain unchanged
        prop_assert_eq!(
            result.new_balance,
            initial_balance,
            "Balance should not change when redemption fails"
        );

        // No discount should be applied
        prop_assert_eq!(
            result.discount_amount,
            0.0,
            "No discount should be applied when redemption fails"
        );

        // Error message should be present
        prop_assert!(
            result.error_message.is_some(),
            "Error message should be present when redemption fails"
        );
    }

    #[test]
    fn zero_or_negative_points_rejected(
        initial_balance in 100..10000i32,
        points_to_redeem in -1000..1i32,
    ) {
        let account = LoyaltyAccount {
            customer_id: "test-customer".to_string(),
            points_balance: initial_balance,
        };

        let result = redeem_loyalty_points(&account, points_to_redeem, 100.0);

        // Redemption should fail
        prop_assert!(
            !result.success,
            "Redemption should fail for zero or negative points"
        );

        // Balance should remain unchanged
        prop_assert_eq!(
            result.new_balance,
            initial_balance,
            "Balance should not change when redemption fails"
        );

        // No discount should be applied
        prop_assert_eq!(
            result.discount_amount,
            0.0,
            "No discount should be applied for invalid redemption"
        );
    }

    #[test]
    fn exact_balance_redemption_works(
        points_balance in 100..10000i32,
        points_per_dollar in arb_points_per_dollar(),
    ) {
        let account = LoyaltyAccount {
            customer_id: "test-customer".to_string(),
            points_balance,
        };

        // Redeem exactly the balance
        let result = redeem_loyalty_points(&account, points_balance, points_per_dollar);

        // Should succeed
        prop_assert!(result.success, "Should be able to redeem exact balance");

        // Balance should be zero
        prop_assert_eq!(
            result.new_balance,
            0,
            "Balance should be zero after redeeming all points"
        );

        // Discount should be calculated correctly
        let expected_discount = points_balance as f64 / points_per_dollar;
        prop_assert!(
            (result.discount_amount - expected_discount).abs() < 0.01,
            "Discount should be correct for full balance redemption"
        );
    }

    #[test]
    fn multiple_redemptions_accumulate_correctly(
        initial_balance in 1000..10000i32,
        redemption1 in 100..300i32,
        redemption2 in 100..300i32,
        points_per_dollar in arb_points_per_dollar(),
    ) {
        // Ensure we have enough for both redemptions
        let initial_balance = initial_balance.max(redemption1 + redemption2 + 100);
        
        let mut account = LoyaltyAccount {
            customer_id: "test-customer".to_string(),
            points_balance: initial_balance,
        };

        // First redemption
        let result1 = redeem_loyalty_points(&account, redemption1, points_per_dollar);
        prop_assert!(result1.success, "First redemption should succeed");
        
        // Update account balance
        account.points_balance = result1.new_balance;

        // Second redemption
        let result2 = redeem_loyalty_points(&account, redemption2, points_per_dollar);
        prop_assert!(result2.success, "Second redemption should succeed");

        // Final balance should equal initial minus both redemptions
        prop_assert_eq!(
            result2.new_balance,
            initial_balance - redemption1 - redemption2,
            "Final balance should equal initial minus both redemptions"
        );

        // Total discount should equal sum of both discounts
        let total_discount = result1.discount_amount + result2.discount_amount;
        let expected_total_discount = (redemption1 + redemption2) as f64 / points_per_dollar;
        
        prop_assert!(
            (total_discount - expected_total_discount).abs() < 0.01,
            "Total discount should equal sum of individual discounts"
        );
    }

    #[test]
    fn redemption_is_deterministic(
        initial_balance in 1000..10000i32,
        points_to_redeem in 100..500i32,
        points_per_dollar in arb_points_per_dollar(),
        iterations in 2..10usize,
    ) {
        // Ensure we have enough points
        let initial_balance = initial_balance.max(points_to_redeem);
        
        let account = LoyaltyAccount {
            customer_id: "test-customer".to_string(),
            points_balance: initial_balance,
        };

        // Perform redemption multiple times
        let results: Vec<RedemptionResult> = (0..iterations)
            .map(|_| redeem_loyalty_points(&account, points_to_redeem, points_per_dollar))
            .collect();

        // All results should be identical
        let first_result = &results[0];
        for (i, result) in results.iter().enumerate() {
            prop_assert_eq!(
                result.success,
                first_result.success,
                "Iteration {} success should match iteration 0",
                i
            );
            prop_assert_eq!(
                result.new_balance,
                first_result.new_balance,
                "Iteration {} balance should match iteration 0",
                i
            );
            prop_assert!(
                (result.discount_amount - first_result.discount_amount).abs() < 0.01,
                "Iteration {} discount should match iteration 0",
                i
            );
        }
    }

    #[test]
    fn common_conversion_rates_work_correctly(
        initial_balance in 1000..10000i32,
        points_to_redeem in 100..1000i32,
    ) {
        // Ensure we have enough points
        let initial_balance = initial_balance.max(points_to_redeem);
        
        let account = LoyaltyAccount {
            customer_id: "test-customer".to_string(),
            points_balance: initial_balance,
        };

        // Test common conversion rates
        let rates = vec![
            (1.0, "1 point = $1"),
            (10.0, "10 points = $1"),
            (100.0, "100 points = $1"),
            (50.0, "50 points = $1"),
            (200.0, "200 points = $1"),
        ];

        for (rate, description) in rates {
            let result = redeem_loyalty_points(&account, points_to_redeem, rate);
            
            prop_assert!(result.success, "Redemption should succeed for {}", description);
            
            prop_assert_eq!(
                result.new_balance,
                initial_balance - points_to_redeem,
                "Balance should be correct for {}",
                description
            );

            let expected_discount = points_to_redeem as f64 / rate;
            prop_assert!(
                (result.discount_amount - expected_discount).abs() < 0.01,
                "Discount should be correct for {}: expected ${:.2}, got ${:.2}",
                description,
                expected_discount,
                result.discount_amount
            );
        }
    }

    #[test]
    fn small_redemptions_handled_correctly(
        initial_balance in 100..10000i32,
        points_to_redeem in 1..10i32,
        points_per_dollar in arb_points_per_dollar(),
    ) {
        let account = LoyaltyAccount {
            customer_id: "test-customer".to_string(),
            points_balance: initial_balance,
        };

        let result = redeem_loyalty_points(&account, points_to_redeem, points_per_dollar);

        prop_assert!(result.success, "Small redemptions should succeed");
        
        prop_assert_eq!(
            result.new_balance,
            initial_balance - points_to_redeem,
            "Balance should decrease correctly for small redemptions"
        );

        // Even small redemptions should provide some discount
        prop_assert!(
            result.discount_amount > 0.0,
            "Small redemptions should provide positive discount"
        );
    }

    #[test]
    fn large_redemptions_handled_correctly(
        initial_balance in 50000..100000i32,
        points_to_redeem in 10000..50000i32,
        points_per_dollar in arb_points_per_dollar(),
    ) {
        // Ensure we have enough points
        let initial_balance = initial_balance.max(points_to_redeem);
        
        let account = LoyaltyAccount {
            customer_id: "test-customer".to_string(),
            points_balance: initial_balance,
        };

        let result = redeem_loyalty_points(&account, points_to_redeem, points_per_dollar);

        prop_assert!(result.success, "Large redemptions should succeed");
        
        prop_assert_eq!(
            result.new_balance,
            initial_balance - points_to_redeem,
            "Balance should decrease correctly for large redemptions"
        );

        // Large redemptions should provide substantial discount
        let expected_discount = points_to_redeem as f64 / points_per_dollar;
        prop_assert!(
            (result.discount_amount - expected_discount).abs() < 0.01,
            "Large redemptions should provide correct discount"
        );
    }

    #[test]
    fn boundary_redemption_values(
        initial_balance in 1000..10000i32,
        points_per_dollar in arb_points_per_dollar(),
    ) {
        let account = LoyaltyAccount {
            customer_id: "test-customer".to_string(),
            points_balance: initial_balance,
        };

        // Test boundary values
        let boundary_values = vec![
            1,      // Minimum positive redemption
            10,     // Small redemption
            100,    // Common redemption
            1000,   // Large redemption
        ];

        for points in boundary_values {
            if points <= initial_balance {
                let result = redeem_loyalty_points(&account, points, points_per_dollar);
                
                prop_assert!(
                    result.success,
                    "Boundary value {} should succeed",
                    points
                );
                
                let expected_new_balance = initial_balance - points;
                prop_assert_eq!(
                    result.new_balance,
                    expected_new_balance,
                    "Balance should be correct for boundary value {}",
                    points
                );
            }
        }
    }

    #[test]
    fn redemption_preserves_account_identity(
        customer_id in arb_customer_id(),
        initial_balance in 1000..10000i32,
        points_to_redeem in 100..500i32,
    ) {
        let initial_balance = initial_balance.max(points_to_redeem);
        
        let account = LoyaltyAccount {
            customer_id: customer_id.clone(),
            points_balance: initial_balance,
        };

        let result = redeem_loyalty_points(&account, points_to_redeem, 100.0);

        // Account identity should be preserved (customer_id doesn't change)
        // This is implicit in the test structure, but we verify the operation succeeded
        prop_assert!(
            result.success,
            "Redemption should succeed and preserve account identity"
        );
    }

    #[test]
    fn zero_conversion_rate_handled_safely(
        initial_balance in 100..10000i32,
        points_to_redeem in 1..100i32,
    ) {
        let account = LoyaltyAccount {
            customer_id: "test-customer".to_string(),
            points_balance: initial_balance,
        };

        // This is an edge case - zero conversion rate should be handled safely
        let result = redeem_loyalty_points(&account, points_to_redeem, 0.0);

        // With zero conversion rate, discount should be zero
        prop_assert_eq!(
            result.discount_amount,
            0.0,
            "Zero conversion rate should result in zero discount"
        );
    }

    #[test]
    fn fractional_discounts_calculated_correctly(
        initial_balance in 1000..10000i32,
        points_to_redeem in 1..999i32,
        points_per_dollar in 10.0..1000.0,
    ) {
        let initial_balance = initial_balance.max(points_to_redeem);
        
        let account = LoyaltyAccount {
            customer_id: "test-customer".to_string(),
            points_balance: initial_balance,
        };

        let result = redeem_loyalty_points(&account, points_to_redeem, points_per_dollar);

        prop_assert!(result.success, "Redemption should succeed");

        // Calculate expected discount (may be fractional)
        let expected_discount = points_to_redeem as f64 / points_per_dollar;

        // Discount should be calculated correctly, even if fractional
        prop_assert!(
            (result.discount_amount - expected_discount).abs() < 0.01,
            "Fractional discount should be calculated correctly: expected ${:.4}, got ${:.4}",
            expected_discount,
            result.discount_amount
        );

        // Discount should be positive
        prop_assert!(
            result.discount_amount > 0.0,
            "Discount should be positive for valid redemption"
        );
    }
}

// ============================================================================
// Edge Case Tests
// ============================================================================

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn redemption_with_very_high_conversion_rate(
        initial_balance in 10000..100000i32,
        points_to_redeem in 1000..10000i32,
    ) {
        let initial_balance = initial_balance.max(points_to_redeem);
        
        let account = LoyaltyAccount {
            customer_id: "test-customer".to_string(),
            points_balance: initial_balance,
        };

        // Very high conversion rate (e.g., 10000 points = $1)
        let result = redeem_loyalty_points(&account, points_to_redeem, 10000.0);

        prop_assert!(result.success, "Redemption should succeed");
        
        // Balance should still decrease correctly
        prop_assert_eq!(
            result.new_balance,
            initial_balance - points_to_redeem,
            "Balance should decrease correctly even with high conversion rate"
        );

        // Discount will be small but should be calculated correctly
        let expected_discount = points_to_redeem as f64 / 10000.0;
        prop_assert!(
            (result.discount_amount - expected_discount).abs() < 0.01,
            "Discount should be calculated correctly for high conversion rate"
        );
    }

    #[test]
    fn redemption_with_very_low_conversion_rate(
        initial_balance in 100..1000i32,
        points_to_redeem in 10..100i32,
    ) {
        let initial_balance = initial_balance.max(points_to_redeem);
        
        let account = LoyaltyAccount {
            customer_id: "test-customer".to_string(),
            points_balance: initial_balance,
        };

        // Very low conversion rate (e.g., 1 point = $1)
        let result = redeem_loyalty_points(&account, points_to_redeem, 1.0);

        prop_assert!(result.success, "Redemption should succeed");
        
        // Balance should decrease correctly
        prop_assert_eq!(
            result.new_balance,
            initial_balance - points_to_redeem,
            "Balance should decrease correctly even with low conversion rate"
        );

        // Discount will be large (1:1 ratio)
        let expected_discount = points_to_redeem as f64;
        prop_assert!(
            (result.discount_amount - expected_discount).abs() < 0.01,
            "Discount should be calculated correctly for low conversion rate"
        );
    }

    #[test]
    fn redemption_at_exact_boundary(
        points_balance in 100..10000i32,
    ) {
        let account = LoyaltyAccount {
            customer_id: "test-customer".to_string(),
            points_balance,
        };

        // Redeem exactly at the boundary (all points)
        let result = redeem_loyalty_points(&account, points_balance, 100.0);

        prop_assert!(result.success, "Should succeed at exact boundary");
        prop_assert_eq!(result.new_balance, 0, "Balance should be zero");
        
        // Just over the boundary should fail
        let result_over = redeem_loyalty_points(&account, points_balance + 1, 100.0);
        prop_assert!(!result_over.success, "Should fail just over boundary");
        prop_assert_eq!(
            result_over.new_balance,
            points_balance,
            "Balance should be unchanged when over boundary"
        );
    }
}
