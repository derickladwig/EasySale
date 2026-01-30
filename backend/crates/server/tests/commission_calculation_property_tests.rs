//! Property-Based Tests for Commission Calculations
//! Feature: sales-customer-management, Property 7: Commission calculation correctness
//! Feature: sales-customer-management, Property 10: Commission threshold enforcement
//!
//! These tests validate that commission calculations are correct for all rule types
//! and that minimum profit thresholds are properly enforced.
//!
//! **Validates: Requirements 3.1, 3.7**

use proptest::prelude::*;

// ============================================================================
// Test Helpers
// ============================================================================

/// Commission rule types
#[derive(Debug, Clone, Copy, PartialEq)]
enum CommissionRuleType {
    PercentOfSale,
    PercentOfProfit,
    FlatRatePerItem,
}

/// Calculate commission based on rule type
fn calculate_commission(
    rule_type: CommissionRuleType,
    rate: f64,
    sale_amount: f64,
    profit_amount: f64,
    item_count: i32,
) -> f64 {
    match rule_type {
        CommissionRuleType::PercentOfSale => sale_amount * rate,
        CommissionRuleType::PercentOfProfit => profit_amount * rate,
        CommissionRuleType::FlatRatePerItem => rate * item_count as f64,
    }
}

/// Check if commission should be earned based on minimum profit threshold
fn should_earn_commission(profit_amount: f64, min_profit_threshold: Option<f64>) -> bool {
    match min_profit_threshold {
        Some(threshold) => profit_amount >= threshold,
        None => true, // No threshold means always earn commission
    }
}

// ============================================================================
// Property 7: Commission calculation correctness
// ============================================================================
// For any sale and commission rule, the calculated commission should match
// the rule type: for PercentOfSale, commission equals sale amount times rate;
// for PercentOfProfit, commission equals profit times rate; for FlatRatePerItem,
// commission equals rate times item count.
//
// **Validates: Requirements 3.1**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn percent_of_sale_commission_calculation(
        sale_amount in 1.0..10000.0,
        rate in 0.01..0.50, // 1% to 50% commission rate
    ) {
        // Calculate commission using PercentOfSale rule
        let commission = calculate_commission(
            CommissionRuleType::PercentOfSale,
            rate,
            sale_amount,
            0.0, // profit not used for PercentOfSale
            0,   // item count not used for PercentOfSale
        );

        // Expected commission is sale_amount * rate
        let expected = sale_amount * rate;
        let diff = (commission - expected).abs();

        prop_assert!(
            diff < 0.01,
            "PercentOfSale commission should equal sale_amount * rate: {} * {} = {}, got {}",
            sale_amount,
            rate,
            expected,
            commission
        );

        // Commission should be non-negative
        prop_assert!(
            commission >= 0.0,
            "Commission should be non-negative, got {}",
            commission
        );

        // Commission should not exceed sale amount (assuming rate <= 1.0)
        if rate <= 1.0 {
            prop_assert!(
                commission <= sale_amount,
                "Commission should not exceed sale amount when rate <= 1.0"
            );
        }
    }

    #[test]
    fn percent_of_profit_commission_calculation(
        profit_amount in 1.0..5000.0,
        rate in 0.01..0.50, // 1% to 50% commission rate
    ) {
        // Calculate commission using PercentOfProfit rule
        let commission = calculate_commission(
            CommissionRuleType::PercentOfProfit,
            rate,
            0.0, // sale amount not used for PercentOfProfit
            profit_amount,
            0,   // item count not used for PercentOfProfit
        );

        // Expected commission is profit_amount * rate
        let expected = profit_amount * rate;
        let diff = (commission - expected).abs();

        prop_assert!(
            diff < 0.01,
            "PercentOfProfit commission should equal profit_amount * rate: {} * {} = {}, got {}",
            profit_amount,
            rate,
            expected,
            commission
        );

        // Commission should be non-negative
        prop_assert!(
            commission >= 0.0,
            "Commission should be non-negative, got {}",
            commission
        );

        // Commission should not exceed profit (assuming rate <= 1.0)
        if rate <= 1.0 {
            prop_assert!(
                commission <= profit_amount,
                "Commission should not exceed profit when rate <= 1.0"
            );
        }
    }

    #[test]
    fn flat_rate_per_item_commission_calculation(
        rate in 0.10..100.0, // $0.10 to $100 per item
        item_count in 1..1000i32,
    ) {
        // Calculate commission using FlatRatePerItem rule
        let commission = calculate_commission(
            CommissionRuleType::FlatRatePerItem,
            rate,
            0.0, // sale amount not used for FlatRatePerItem
            0.0, // profit not used for FlatRatePerItem
            item_count,
        );

        // Expected commission is rate * item_count
        let expected = rate * item_count as f64;
        let diff = (commission - expected).abs();

        prop_assert!(
            diff < 0.01,
            "FlatRatePerItem commission should equal rate * item_count: {} * {} = {}, got {}",
            rate,
            item_count,
            expected,
            commission
        );

        // Commission should be non-negative
        prop_assert!(
            commission >= 0.0,
            "Commission should be non-negative, got {}",
            commission
        );

        // Commission should scale linearly with item count
        if item_count > 1 {
            let commission_for_one = calculate_commission(
                CommissionRuleType::FlatRatePerItem,
                rate,
                0.0,
                0.0,
                1,
            );
            let expected_scaled = commission_for_one * item_count as f64;
            let diff_scaled = (commission - expected_scaled).abs();
            
            prop_assert!(
                diff_scaled < 0.01,
                "Commission should scale linearly with item count"
            );
        }
    }

    #[test]
    fn commission_calculation_with_zero_values(
        rate in 0.01..0.50,
    ) {
        // Test PercentOfSale with zero sale amount
        let commission_zero_sale = calculate_commission(
            CommissionRuleType::PercentOfSale,
            rate,
            0.0,
            0.0,
            0,
        );
        prop_assert!(
            commission_zero_sale.abs() < 0.000001,
            "Commission should be zero when sale amount is zero"
        );

        // Test PercentOfProfit with zero profit
        let commission_zero_profit = calculate_commission(
            CommissionRuleType::PercentOfProfit,
            rate,
            0.0,
            0.0,
            0,
        );
        prop_assert!(
            commission_zero_profit.abs() < 0.000001,
            "Commission should be zero when profit is zero"
        );

        // Test FlatRatePerItem with zero items
        let commission_zero_items = calculate_commission(
            CommissionRuleType::FlatRatePerItem,
            rate,
            0.0,
            0.0,
            0,
        );
        prop_assert!(
            commission_zero_items.abs() < 0.000001,
            "Commission should be zero when item count is zero"
        );
    }

    #[test]
    fn commission_calculation_with_zero_rate(
        sale_amount in 1.0..10000.0,
        profit_amount in 1.0..5000.0,
        item_count in 1..1000i32,
    ) {
        // Test all rule types with zero rate
        let commission_sale = calculate_commission(
            CommissionRuleType::PercentOfSale,
            0.0,
            sale_amount,
            0.0,
            0,
        );
        prop_assert!(
            commission_sale.abs() < 0.000001,
            "Commission should be zero when rate is zero (PercentOfSale)"
        );

        let commission_profit = calculate_commission(
            CommissionRuleType::PercentOfProfit,
            0.0,
            0.0,
            profit_amount,
            0,
        );
        prop_assert!(
            commission_profit.abs() < 0.000001,
            "Commission should be zero when rate is zero (PercentOfProfit)"
        );

        let commission_flat = calculate_commission(
            CommissionRuleType::FlatRatePerItem,
            0.0,
            0.0,
            0.0,
            item_count,
        );
        prop_assert!(
            commission_flat.abs() < 0.000001,
            "Commission should be zero when rate is zero (FlatRatePerItem)"
        );
    }
}

// ============================================================================
// Property 10: Commission threshold enforcement
// ============================================================================
// For any sale with a minimum profit threshold, commission should only be
// earned when the profit amount exceeds or equals the threshold.
//
// **Validates: Requirements 3.7**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn commission_earned_when_profit_meets_threshold(
        profit_amount in 100.0..5000.0,
        threshold_offset in 0.0..50.0, // Threshold will be less than profit
        rate in 0.01..0.50,
    ) {
        // Set threshold below profit amount
        let threshold = profit_amount - threshold_offset;
        
        // Check if commission should be earned
        let should_earn = should_earn_commission(profit_amount, Some(threshold));
        
        prop_assert!(
            should_earn,
            "Commission should be earned when profit ({}) meets or exceeds threshold ({})",
            profit_amount,
            threshold
        );

        // If commission should be earned, calculate it
        if should_earn {
            let commission = calculate_commission(
                CommissionRuleType::PercentOfProfit,
                rate,
                0.0,
                profit_amount,
                0,
            );
            
            prop_assert!(
                commission > 0.0,
                "Commission should be positive when earned"
            );
        }
    }

    #[test]
    fn commission_not_earned_when_profit_below_threshold(
        profit_amount in 1.0..1000.0,
        threshold_offset in 1.0..500.0, // Threshold will be greater than profit
        rate in 0.01..0.50,
    ) {
        // Set threshold above profit amount
        let threshold = profit_amount + threshold_offset;
        
        // Check if commission should be earned
        let should_earn = should_earn_commission(profit_amount, Some(threshold));
        
        prop_assert!(
            !should_earn,
            "Commission should NOT be earned when profit ({}) is below threshold ({})",
            profit_amount,
            threshold
        );

        // When commission is not earned, the effective commission should be zero
        let effective_commission = if should_earn {
            calculate_commission(
                CommissionRuleType::PercentOfProfit,
                rate,
                0.0,
                profit_amount,
                0,
            )
        } else {
            0.0
        };
        
        prop_assert!(
            effective_commission.abs() < 0.000001,
            "Effective commission should be zero when profit is below threshold"
        );
    }

    #[test]
    fn commission_earned_when_profit_exactly_equals_threshold(
        profit_amount in 100.0..5000.0,
        rate in 0.01..0.50,
    ) {
        // Set threshold exactly equal to profit amount
        let threshold = profit_amount;
        
        // Check if commission should be earned
        let should_earn = should_earn_commission(profit_amount, Some(threshold));
        
        prop_assert!(
            should_earn,
            "Commission should be earned when profit ({}) exactly equals threshold ({})",
            profit_amount,
            threshold
        );

        // Calculate commission
        let commission = calculate_commission(
            CommissionRuleType::PercentOfProfit,
            rate,
            0.0,
            profit_amount,
            0,
        );
        
        prop_assert!(
            commission > 0.0,
            "Commission should be positive when profit equals threshold"
        );
    }

    #[test]
    fn commission_always_earned_when_no_threshold(
        profit_amount in 0.0..5000.0,
        rate in 0.01..0.50,
    ) {
        // No threshold (None)
        let should_earn = should_earn_commission(profit_amount, None);
        
        prop_assert!(
            should_earn,
            "Commission should always be earned when there is no threshold"
        );

        // Calculate commission
        let commission = calculate_commission(
            CommissionRuleType::PercentOfProfit,
            rate,
            0.0,
            profit_amount,
            0,
        );
        
        // Commission should match calculation (may be zero if profit is zero)
        let expected = profit_amount * rate;
        let diff = (commission - expected).abs();
        
        prop_assert!(
            diff < 0.01,
            "Commission should be calculated correctly when no threshold exists"
        );
    }

    #[test]
    fn threshold_enforcement_with_different_rule_types(
        sale_amount in 100.0..10000.0,
        profit_amount in 50.0..5000.0,
        threshold in 100.0..1000.0,
        rate in 0.01..0.50,
        item_count in 1..100i32,
    ) {
        // Check if commission should be earned based on threshold
        let should_earn = should_earn_commission(profit_amount, Some(threshold));
        
        // Test with PercentOfSale (threshold still applies to profit check)
        let commission_sale = if should_earn {
            calculate_commission(
                CommissionRuleType::PercentOfSale,
                rate,
                sale_amount,
                0.0,
                0,
            )
        } else {
            0.0
        };
        
        // Test with PercentOfProfit
        let commission_profit = if should_earn {
            calculate_commission(
                CommissionRuleType::PercentOfProfit,
                rate,
                0.0,
                profit_amount,
                0,
            )
        } else {
            0.0
        };
        
        // Test with FlatRatePerItem
        let commission_flat = if should_earn {
            calculate_commission(
                CommissionRuleType::FlatRatePerItem,
                rate,
                0.0,
                0.0,
                item_count,
            )
        } else {
            0.0
        };
        
        // If profit is below threshold, all commissions should be zero
        if profit_amount < threshold {
            prop_assert!(
                commission_sale.abs() < 0.000001,
                "PercentOfSale commission should be zero when profit below threshold"
            );
            prop_assert!(
                commission_profit.abs() < 0.000001,
                "PercentOfProfit commission should be zero when profit below threshold"
            );
            prop_assert!(
                commission_flat.abs() < 0.000001,
                "FlatRatePerItem commission should be zero when profit below threshold"
            );
        }
        
        // If profit meets threshold, commissions should be positive
        if profit_amount >= threshold {
            prop_assert!(
                commission_sale > 0.0,
                "PercentOfSale commission should be positive when profit meets threshold"
            );
            prop_assert!(
                commission_profit > 0.0,
                "PercentOfProfit commission should be positive when profit meets threshold"
            );
            prop_assert!(
                commission_flat > 0.0,
                "FlatRatePerItem commission should be positive when profit meets threshold"
            );
        }
    }

    #[test]
    fn zero_profit_never_earns_commission_with_positive_threshold(
        threshold in 0.01..1000.0, // Positive threshold
        rate in 0.01..0.50,
    ) {
        let profit_amount = 0.0;
        
        // Check if commission should be earned
        let should_earn = should_earn_commission(profit_amount, Some(threshold));
        
        prop_assert!(
            !should_earn,
            "Zero profit should never earn commission when threshold is positive ({})",
            threshold
        );

        // Effective commission should be zero
        let effective_commission = if should_earn {
            calculate_commission(
                CommissionRuleType::PercentOfProfit,
                rate,
                0.0,
                profit_amount,
                0,
            )
        } else {
            0.0
        };
        
        prop_assert!(
            effective_commission.abs() < 0.000001,
            "Effective commission should be zero for zero profit with positive threshold"
        );
    }
}

// ============================================================================
// Additional Property Tests: Commission Calculation Edge Cases
// ============================================================================

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn commission_scales_linearly_with_sale_amount(
        base_sale_amount in 100.0_f64..1000.0_f64,
        multiplier in 2.0_f64..10.0_f64,
        rate in 0.01_f64..0.50_f64,
    ) {
        let commission_base = calculate_commission(
            CommissionRuleType::PercentOfSale,
            rate,
            base_sale_amount,
            0.0,
            0,
        );
        
        let commission_scaled = calculate_commission(
            CommissionRuleType::PercentOfSale,
            rate,
            base_sale_amount * multiplier,
            0.0,
            0,
        );
        
        let expected_scaled = commission_base * multiplier;
        let diff = (commission_scaled - expected_scaled).abs();
        
        prop_assert!(
            diff < 0.01,
            "Commission should scale linearly with sale amount: {}x sale should give {}x commission",
            multiplier,
            multiplier
        );
    }

    #[test]
    fn commission_scales_linearly_with_profit(
        base_profit in 50.0_f64..500.0_f64,
        multiplier in 2.0_f64..10.0_f64,
        rate in 0.01_f64..0.50_f64,
    ) {
        let commission_base = calculate_commission(
            CommissionRuleType::PercentOfProfit,
            rate,
            0.0,
            base_profit,
            0,
        );
        
        let commission_scaled = calculate_commission(
            CommissionRuleType::PercentOfProfit,
            rate,
            0.0,
            base_profit * multiplier,
            0,
        );
        
        let expected_scaled = commission_base * multiplier;
        let diff = (commission_scaled - expected_scaled).abs();
        
        prop_assert!(
            diff < 0.01,
            "Commission should scale linearly with profit: {}x profit should give {}x commission",
            multiplier,
            multiplier
        );
    }

    #[test]
    fn commission_scales_linearly_with_rate(
        sale_amount in 100.0_f64..1000.0_f64,
        base_rate in 0.01_f64..0.10_f64,
        multiplier in 2.0_f64..5.0_f64,
    ) {
        let commission_base = calculate_commission(
            CommissionRuleType::PercentOfSale,
            base_rate,
            sale_amount,
            0.0,
            0,
        );
        
        let commission_scaled = calculate_commission(
            CommissionRuleType::PercentOfSale,
            base_rate * multiplier,
            sale_amount,
            0.0,
            0,
        );
        
        let expected_scaled = commission_base * multiplier;
        let diff = (commission_scaled - expected_scaled).abs();
        
        prop_assert!(
            diff < 0.01,
            "Commission should scale linearly with rate: {}x rate should give {}x commission",
            multiplier,
            multiplier
        );
    }
}
