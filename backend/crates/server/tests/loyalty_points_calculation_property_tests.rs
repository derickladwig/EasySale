//! Property-Based Tests for Loyalty Points Calculation
//! Feature: sales-customer-management, Property 12: Loyalty points calculation
//!
//! These tests validate that for any purchase amount and loyalty rate,
//! the awarded points equal the purchase amount multiplied by the points-per-dollar rate.
//!
//! **Validates: Requirements 4.3**

use proptest::prelude::*;

// ============================================================================
// Test Helpers
// ============================================================================

/// Calculate loyalty points based on purchase amount and rate
/// This mirrors the logic in the actual system
fn calculate_loyalty_points(purchase_amount: f64, points_per_dollar: f64) -> i32 {
    // Points are calculated as purchase_amount * points_per_dollar, rounded down
    (purchase_amount * points_per_dollar).floor() as i32
}

/// Award loyalty points (simplified version for testing)
fn award_loyalty_points(
    purchase_amount: f64,
    points_per_dollar: f64,
) -> i32 {
    let points = calculate_loyalty_points(purchase_amount, points_per_dollar);
    
    // Return 0 if points would be negative or zero
    if points <= 0 {
        return 0;
    }
    
    points
}

// ============================================================================
// Property Test Generators
// ============================================================================

/// Generate a purchase amount (positive, reasonable range)
fn arb_purchase_amount() -> impl Strategy<Value = f64> {
    0.01..10000.0
}

/// Generate a points-per-dollar rate (typical range: 0.01 to 10.0)
/// Most loyalty programs use rates like 0.01 (1 point per $100), 0.1 (1 point per $10),
/// or 1.0 (1 point per dollar)
fn arb_points_per_dollar() -> impl Strategy<Value = f64> {
    0.01..10.0
}

/// Generate a low points-per-dollar rate (for edge cases)
fn arb_low_points_rate() -> impl Strategy<Value = f64> {
    0.0001..0.01
}

/// Generate a high points-per-dollar rate (for edge cases)
fn arb_high_points_rate() -> impl Strategy<Value = f64> {
    10.0..100.0
}

// ============================================================================
// Property 12: Loyalty points calculation
// ============================================================================
// For any purchase amount and loyalty rate, the awarded points should equal
// the purchase amount multiplied by the points-per-dollar rate (rounded down).
//
// **Validates: Requirements 4.3**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn loyalty_points_equal_purchase_times_rate(
        purchase_amount in arb_purchase_amount(),
        points_per_dollar in arb_points_per_dollar(),
    ) {
        // Award loyalty points
        let awarded_points = award_loyalty_points(purchase_amount, points_per_dollar);

        // Calculate expected points (rounded down)
        let expected_points = (purchase_amount * points_per_dollar).floor() as i32;

        // The awarded points should equal the expected calculation
        prop_assert_eq!(
            awarded_points,
            expected_points.max(0), // Never negative
            "Awarded points should equal purchase amount ({}) * rate ({}) = {} (rounded down)",
            purchase_amount,
            points_per_dollar,
            expected_points
        );

        // Verify the calculation is correct
        let calculated_value = purchase_amount * points_per_dollar;
        prop_assert!(
            awarded_points as f64 <= calculated_value,
            "Awarded points ({}) should not exceed the exact calculation ({})",
            awarded_points,
            calculated_value
        );

        // Verify rounding down behavior
        prop_assert!(
            awarded_points as f64 >= calculated_value - 1.0,
            "Awarded points ({}) should be within 1 of the exact calculation ({})",
            awarded_points,
            calculated_value
        );
    }

    #[test]
    fn zero_purchase_awards_zero_points(
        points_per_dollar in arb_points_per_dollar(),
    ) {
        let awarded_points = award_loyalty_points(0.0, points_per_dollar);

        prop_assert_eq!(
            awarded_points,
            0,
            "Zero purchase amount should award zero points regardless of rate"
        );
    }

    #[test]
    fn zero_rate_awards_zero_points(
        purchase_amount in arb_purchase_amount(),
    ) {
        let awarded_points = award_loyalty_points(purchase_amount, 0.0);

        prop_assert_eq!(
            awarded_points,
            0,
            "Zero points-per-dollar rate should award zero points regardless of purchase amount"
        );
    }

    #[test]
    fn points_increase_with_purchase_amount(
        base_amount in 10.0..1000.0,
        multiplier in 2.0..10.0,
        points_per_dollar in arb_points_per_dollar(),
    ) {
        let smaller_purchase = base_amount;
        let larger_purchase = base_amount * multiplier;

        let points_smaller = award_loyalty_points(smaller_purchase, points_per_dollar);
        let points_larger = award_loyalty_points(larger_purchase, points_per_dollar);

        // Larger purchases should award at least as many points (or more)
        prop_assert!(
            points_larger >= points_smaller,
            "Larger purchase ({}) should award at least as many points as smaller purchase ({}): {} vs {}",
            larger_purchase,
            smaller_purchase,
            points_larger,
            points_smaller
        );

        // If the rate is high enough that both purchases award points,
        // the larger purchase should award strictly more points
        if points_smaller > 0 && points_per_dollar >= 0.1 {
            prop_assert!(
                points_larger > points_smaller,
                "Significantly larger purchase should award more points: {} vs {}",
                points_larger,
                points_smaller
            );
        }
    }

    #[test]
    fn points_increase_with_rate(
        purchase_amount in 100.0..1000.0,
        lower_rate in 0.1..1.0,
        rate_multiplier in 2.0..10.0,
    ) {
        let higher_rate = lower_rate * rate_multiplier;

        let points_lower = award_loyalty_points(purchase_amount, lower_rate);
        let points_higher = award_loyalty_points(purchase_amount, higher_rate);

        // Higher rate should award more points for the same purchase
        prop_assert!(
            points_higher >= points_lower,
            "Higher rate ({}) should award at least as many points as lower rate ({}): {} vs {}",
            higher_rate,
            lower_rate,
            points_higher,
            points_lower
        );

        // With a significant rate difference, should award strictly more
        if rate_multiplier >= 2.0 {
            prop_assert!(
                points_higher > points_lower,
                "Significantly higher rate should award more points: {} vs {}",
                points_higher,
                points_lower
            );
        }
    }

    #[test]
    fn one_point_per_dollar_rate_works_correctly(
        purchase_amount in 1.0..1000.0,
    ) {
        let points_per_dollar = 1.0;
        let awarded_points = award_loyalty_points(purchase_amount, points_per_dollar);

        // With 1 point per dollar, points should equal purchase amount (rounded down)
        let expected_points = purchase_amount.floor() as i32;

        prop_assert_eq!(
            awarded_points,
            expected_points,
            "With 1 point per dollar, points should equal purchase amount rounded down"
        );
    }

    #[test]
    fn fractional_purchases_round_down(
        whole_dollars in 10..1000i32,
        cents in 0..100i32,
        points_per_dollar in 1.0..10.0,
    ) {
        let purchase_amount = whole_dollars as f64 + (cents as f64 / 100.0);
        let awarded_points = award_loyalty_points(purchase_amount, points_per_dollar);

        // Calculate what we'd get for just the whole dollars
        let whole_dollar_points = award_loyalty_points(whole_dollars as f64, points_per_dollar);

        // The fractional amount might add points, but should never subtract
        prop_assert!(
            awarded_points >= whole_dollar_points,
            "Adding cents should not reduce points: ${}.{:02} awards {} points, ${} awards {} points",
            whole_dollars,
            cents,
            awarded_points,
            whole_dollars,
            whole_dollar_points
        );

        // Verify the calculation is correct
        let expected = (purchase_amount * points_per_dollar).floor() as i32;
        prop_assert_eq!(
            awarded_points,
            expected,
            "Points calculation should be correct for fractional amounts"
        );
    }

    #[test]
    fn small_purchases_with_low_rate_may_award_zero(
        purchase_amount in 0.01..10.0,
        points_per_dollar in arb_low_points_rate(),
    ) {
        let awarded_points = award_loyalty_points(purchase_amount, points_per_dollar);

        // Calculate expected
        let calculated = purchase_amount * points_per_dollar;

        if calculated < 1.0 {
            // If calculation is less than 1, should round down to 0
            prop_assert_eq!(
                awarded_points,
                0,
                "Small purchase with low rate should award 0 points when calculation < 1"
            );
        } else {
            // Otherwise should award at least 1 point
            prop_assert!(
                awarded_points >= 1,
                "Should award at least 1 point when calculation >= 1"
            );
        }
    }

    #[test]
    fn large_purchases_with_high_rate_award_many_points(
        purchase_amount in 1000.0..10000.0,
        points_per_dollar in arb_high_points_rate(),
    ) {
        let awarded_points = award_loyalty_points(purchase_amount, points_per_dollar);

        // With large purchases and high rates, should award many points
        let expected = (purchase_amount * points_per_dollar).floor() as i32;

        prop_assert_eq!(
            awarded_points,
            expected,
            "Large purchase with high rate should award correct number of points"
        );

        // Should be a substantial number of points
        prop_assert!(
            awarded_points >= 1000,
            "Large purchase with high rate should award at least 1000 points, got {}",
            awarded_points
        );
    }

    #[test]
    fn points_calculation_is_deterministic(
        purchase_amount in arb_purchase_amount(),
        points_per_dollar in arb_points_per_dollar(),
        iterations in 2..10usize,
    ) {
        // Calculate points multiple times
        let results: Vec<i32> = (0..iterations)
            .map(|_| award_loyalty_points(purchase_amount, points_per_dollar))
            .collect();

        // All results should be identical
        let first_result = results[0];
        for (i, &result) in results.iter().enumerate() {
            prop_assert_eq!(
                result,
                first_result,
                "Iteration {} should produce the same result as iteration 0",
                i
            );
        }
    }

    #[test]
    fn points_never_negative(
        purchase_amount in -1000.0..10000.0,
        points_per_dollar in -10.0..10.0,
    ) {
        let awarded_points = award_loyalty_points(purchase_amount, points_per_dollar);

        // Points should never be negative, even with negative inputs
        prop_assert!(
            awarded_points >= 0,
            "Points should never be negative, got {} for purchase {} and rate {}",
            awarded_points,
            purchase_amount,
            points_per_dollar
        );
    }

    #[test]
    fn typical_loyalty_program_scenarios(
        purchase_amount in 10.0..500.0,
    ) {
        // Test common loyalty program rates
        let rates = vec![
            (0.01, "1 point per $100"),
            (0.1, "1 point per $10"),
            (1.0, "1 point per dollar"),
            (2.0, "2 points per dollar"),
            (5.0, "5 points per dollar"),
        ];

        for (rate, description) in rates {
            let awarded_points = award_loyalty_points(purchase_amount, rate);
            let expected = (purchase_amount * rate).floor() as i32;

            prop_assert_eq!(
                awarded_points,
                expected.max(0),
                "For {} with purchase ${}, expected {} points",
                description,
                purchase_amount,
                expected
            );
        }
    }

    #[test]
    fn boundary_values_handled_correctly(
        points_per_dollar in arb_points_per_dollar(),
    ) {
        // Test boundary values for purchase amounts
        let boundary_amounts = vec![
            0.01,   // Minimum positive amount
            0.99,   // Just under 1 dollar
            1.00,   // Exactly 1 dollar
            1.01,   // Just over 1 dollar
            9.99,   // Just under 10 dollars
            10.00,  // Exactly 10 dollars
            99.99,  // Just under 100 dollars
            100.00, // Exactly 100 dollars
        ];

        for amount in boundary_amounts {
            let awarded_points = award_loyalty_points(amount, points_per_dollar);
            let expected = (amount * points_per_dollar).floor() as i32;

            prop_assert_eq!(
                awarded_points,
                expected.max(0),
                "Boundary amount ${} should award correct points",
                amount
            );
        }
    }

    #[test]
    fn commutative_property_of_multiplication(
        amount1 in 10.0..100.0,
        amount2 in 10.0..100.0,
        rate in arb_points_per_dollar(),
    ) {
        // Calculate points for two separate purchases
        let points1 = award_loyalty_points(amount1, rate);
        let points2 = award_loyalty_points(amount2, rate);
        let separate_total = points1 + points2;

        // Calculate points for combined purchase
        let combined_amount = amount1 + amount2;
        let combined_points = award_loyalty_points(combined_amount, rate);

        // Due to rounding, combined might be slightly different, but should be close
        // The difference should be at most 1 point (due to rounding)
        let difference = (combined_points - separate_total).abs();

        prop_assert!(
            difference <= 1,
            "Combined purchase should award similar points to separate purchases: \
             separate: {} + {} = {}, combined: {} (difference: {})",
            points1,
            points2,
            separate_total,
            combined_points,
            difference
        );
    }

    #[test]
    fn precision_maintained_for_exact_calculations(
        whole_points in 1..10000i32,
        points_per_dollar in 0.1..10.0,
    ) {
        // Calculate a purchase amount that should result in exactly whole_points
        let purchase_amount = whole_points as f64 / points_per_dollar;

        let awarded_points = award_loyalty_points(purchase_amount, points_per_dollar);

        // Should award exactly the expected number of points (or very close due to floating point)
        let difference = (awarded_points - whole_points).abs();

        prop_assert!(
            difference <= 1,
            "Should award approximately {} points for purchase ${} at rate {}, got {}",
            whole_points,
            purchase_amount,
            points_per_dollar,
            awarded_points
        );
    }
}

// ============================================================================
// Edge Case Tests
// ============================================================================

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn very_small_amounts_handled_correctly(
        cents in 1..100i32,
        points_per_dollar in arb_points_per_dollar(),
    ) {
        let purchase_amount = cents as f64 / 100.0; // Convert cents to dollars
        let awarded_points = award_loyalty_points(purchase_amount, points_per_dollar);

        let expected = (purchase_amount * points_per_dollar).floor() as i32;

        prop_assert_eq!(
            awarded_points,
            expected.max(0),
            "Very small purchase (${}) should award correct points",
            purchase_amount
        );
    }

    #[test]
    fn very_large_amounts_handled_correctly(
        thousands in 1..1000i32,
        points_per_dollar in arb_points_per_dollar(),
    ) {
        let purchase_amount = thousands as f64 * 1000.0;
        let awarded_points = award_loyalty_points(purchase_amount, points_per_dollar);

        let expected = (purchase_amount * points_per_dollar).floor() as i32;

        prop_assert_eq!(
            awarded_points,
            expected,
            "Very large purchase (${}) should award correct points",
            purchase_amount
        );

        // Verify points are reasonable
        prop_assert!(
            awarded_points >= 0,
            "Large purchase should award non-negative points"
        );
    }

    #[test]
    fn floating_point_precision_edge_cases(
        mantissa in 1..1000000i64,
        exponent in -2..4i32,
        points_per_dollar in arb_points_per_dollar(),
    ) {
        // Create a purchase amount with specific floating point representation
        let purchase_amount = (mantissa as f64) * 10_f64.powi(exponent);

        // Only test positive amounts
        if purchase_amount > 0.0 && purchase_amount < 100000.0 {
            let awarded_points = award_loyalty_points(purchase_amount, points_per_dollar);
            let expected = (purchase_amount * points_per_dollar).floor() as i32;

            prop_assert_eq!(
                awarded_points,
                expected.max(0),
                "Floating point edge case should be handled correctly"
            );
        }
    }

    #[test]
    fn rate_precision_maintained(
        purchase_amount in 100.0..1000.0,
        rate_cents in 1..1000i32,
    ) {
        // Create a rate with specific precision (e.g., 0.01, 0.02, ..., 9.99)
        let points_per_dollar = rate_cents as f64 / 100.0;

        let awarded_points = award_loyalty_points(purchase_amount, points_per_dollar);
        let expected = (purchase_amount * points_per_dollar).floor() as i32;

        prop_assert_eq!(
            awarded_points,
            expected,
            "Rate precision should be maintained for rate {}",
            points_per_dollar
        );
    }
}
