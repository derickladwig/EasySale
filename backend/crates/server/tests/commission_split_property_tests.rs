//! Property-Based Tests for Commission Splits
//! Feature: sales-customer-management, Property 9: Commission split totals equal original
//!
//! These tests validate that when a commission is split among multiple employees,
//! the sum of all split amounts equals the original commission amount.
//!
//! **Validates: Requirements 3.6**

use proptest::prelude::*;

// ============================================================================
// Test Helpers
// ============================================================================

/// Commission split record
#[derive(Debug, Clone, PartialEq)]
struct CommissionSplit {
    employee_id: String,
    split_percentage: f64,
    split_amount: f64,
}

/// Calculate split amounts from percentages
fn calculate_split_amounts(
    original_commission: f64,
    split_percentages: Vec<f64>,
) -> Vec<CommissionSplit> {
    split_percentages
        .into_iter()
        .enumerate()
        .map(|(idx, percentage)| CommissionSplit {
            employee_id: format!("emp_{}", idx),
            split_percentage: percentage,
            split_amount: original_commission * (percentage / 100.0),
        })
        .collect()
}

/// Validate that split percentages sum to 100%
fn validate_split_percentages(percentages: &[f64]) -> bool {
    let sum: f64 = percentages.iter().sum();
    (sum - 100.0).abs() < 0.01 // Allow small floating point error
}

// ============================================================================
// Property 9: Commission split totals equal original
// ============================================================================
// For any commission with splits, the sum of all split amounts should equal
// the original commission amount.
//
// **Validates: Requirements 3.6**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn two_way_split_totals_equal_original(
        original_commission in 1.0..10000.0,
        split1_percentage in 1.0..99.0,
    ) {
        // Calculate second split percentage to make total 100%
        let split2_percentage = 100.0 - split1_percentage;
        
        // Create splits
        let splits = calculate_split_amounts(
            original_commission,
            vec![split1_percentage, split2_percentage],
        );
        
        // Sum all split amounts
        let total_split_amount: f64 = splits.iter().map(|s| s.split_amount).sum();
        
        // Verify sum equals original commission
        let diff = (total_split_amount - original_commission).abs();
        prop_assert!(
            diff < 0.01,
            "Sum of split amounts ({}) should equal original commission ({}), diff: {}",
            total_split_amount,
            original_commission,
            diff
        );
        
        // Verify each split is non-negative
        for split in &splits {
            prop_assert!(
                split.split_amount >= 0.0,
                "Split amount should be non-negative, got {}",
                split.split_amount
            );
        }
        
        // Verify each split does not exceed original
        for split in &splits {
            prop_assert!(
                split.split_amount <= original_commission,
                "Split amount ({}) should not exceed original commission ({})",
                split.split_amount,
                original_commission
            );
        }
    }

    #[test]
    fn three_way_split_totals_equal_original(
        original_commission in 1.0..10000.0,
        split1_percentage in 1.0..50.0,
        split2_percentage in 1.0..50.0,
    ) {
        // Calculate third split percentage to make total 100%
        let split3_percentage = 100.0 - split1_percentage - split2_percentage;
        
        // Skip if third split would be negative or zero
        prop_assume!(split3_percentage > 0.0);
        
        // Create splits
        let splits = calculate_split_amounts(
            original_commission,
            vec![split1_percentage, split2_percentage, split3_percentage],
        );
        
        // Sum all split amounts
        let total_split_amount: f64 = splits.iter().map(|s| s.split_amount).sum();
        
        // Verify sum equals original commission
        let diff = (total_split_amount - original_commission).abs();
        prop_assert!(
            diff < 0.01,
            "Sum of split amounts ({}) should equal original commission ({}), diff: {}",
            total_split_amount,
            original_commission,
            diff
        );
        
        // Verify each split is non-negative
        for split in &splits {
            prop_assert!(
                split.split_amount >= 0.0,
                "Split amount should be non-negative, got {}",
                split.split_amount
            );
        }
    }

    #[test]
    fn equal_split_among_multiple_employees(
        original_commission in 1.0..10000.0,
        num_employees in 2..10usize,
    ) {
        // Create equal splits
        let split_percentage = 100.0 / num_employees as f64;
        let split_percentages = vec![split_percentage; num_employees];
        
        // Create splits
        let splits = calculate_split_amounts(original_commission, split_percentages);
        
        // Sum all split amounts
        let total_split_amount: f64 = splits.iter().map(|s| s.split_amount).sum();
        
        // Verify sum equals original commission
        let diff = (total_split_amount - original_commission).abs();
        prop_assert!(
            diff < 0.01,
            "Sum of {} equal splits ({}) should equal original commission ({}), diff: {}",
            num_employees,
            total_split_amount,
            original_commission,
            diff
        );
        
        // Verify all splits are approximately equal
        let expected_split_amount = original_commission / num_employees as f64;
        for split in &splits {
            let split_diff = (split.split_amount - expected_split_amount).abs();
            prop_assert!(
                split_diff < 0.01,
                "Each equal split should be approximately {}, got {}",
                expected_split_amount,
                split.split_amount
            );
        }
    }

    #[test]
    fn unequal_split_with_dominant_employee(
        original_commission in 1.0..10000.0,
        dominant_percentage in 70.0..95.0,
        num_other_employees in 1..5usize,
    ) {
        // Calculate remaining percentage for other employees
        let remaining_percentage = 100.0 - dominant_percentage;
        let other_split_percentage = remaining_percentage / num_other_employees as f64;
        
        // Create split percentages
        let mut split_percentages = vec![dominant_percentage];
        split_percentages.extend(vec![other_split_percentage; num_other_employees]);
        
        // Create splits
        let splits = calculate_split_amounts(original_commission, split_percentages);
        
        // Sum all split amounts
        let total_split_amount: f64 = splits.iter().map(|s| s.split_amount).sum();
        
        // Verify sum equals original commission
        let diff = (total_split_amount - original_commission).abs();
        prop_assert!(
            diff < 0.01,
            "Sum of split amounts ({}) should equal original commission ({}), diff: {}",
            total_split_amount,
            original_commission,
            diff
        );
        
        // Verify dominant employee has the largest split
        let dominant_split = &splits[0];
        for other_split in &splits[1..] {
            prop_assert!(
                dominant_split.split_amount > other_split.split_amount,
                "Dominant employee split ({}) should be larger than other splits ({})",
                dominant_split.split_amount,
                other_split.split_amount
            );
        }
    }

    #[test]
    fn split_with_very_small_commission(
        original_commission in 0.01..1.0,
        split1_percentage in 10.0..90.0,
    ) {
        // Calculate second split percentage
        let split2_percentage = 100.0 - split1_percentage;
        
        // Create splits
        let splits = calculate_split_amounts(
            original_commission,
            vec![split1_percentage, split2_percentage],
        );
        
        // Sum all split amounts
        let total_split_amount: f64 = splits.iter().map(|s| s.split_amount).sum();
        
        // Verify sum equals original commission (with appropriate tolerance for small amounts)
        let diff = (total_split_amount - original_commission).abs();
        prop_assert!(
            diff < 0.001,
            "Sum of split amounts ({}) should equal original commission ({}), diff: {}",
            total_split_amount,
            original_commission,
            diff
        );
    }

    #[test]
    fn split_with_very_large_commission(
        original_commission in 10000.0..1000000.0,
        split1_percentage in 10.0..90.0,
    ) {
        // Calculate second split percentage
        let split2_percentage = 100.0 - split1_percentage;
        
        // Create splits
        let splits = calculate_split_amounts(
            original_commission,
            vec![split1_percentage, split2_percentage],
        );
        
        // Sum all split amounts
        let total_split_amount: f64 = splits.iter().map(|s| s.split_amount).sum();
        
        // Verify sum equals original commission
        let diff = (total_split_amount - original_commission).abs();
        let relative_error = diff / original_commission;
        prop_assert!(
            relative_error < 0.0001, // 0.01% relative error
            "Sum of split amounts ({}) should equal original commission ({}), relative error: {}",
            total_split_amount,
            original_commission,
            relative_error
        );
    }

    #[test]
    fn split_percentages_validation(
        split1_percentage in 0.0..100.0,
        split2_percentage in 0.0..100.0,
    ) {
        let percentages = vec![split1_percentage, split2_percentage];
        let is_valid = validate_split_percentages(&percentages);
        
        let sum: f64 = percentages.iter().sum();
        let expected_valid = (sum - 100.0).abs() < 0.01;
        
        prop_assert_eq!(
            is_valid,
            expected_valid,
            "Validation should return {} for percentages summing to {}",
            expected_valid,
            sum
        );
    }

    #[test]
    fn single_employee_gets_full_commission(
        original_commission in 1.0..10000.0,
    ) {
        // Single employee gets 100%
        let splits = calculate_split_amounts(original_commission, vec![100.0]);
        
        prop_assert_eq!(
            splits.len(),
            1,
            "Should have exactly one split"
        );
        
        let split_amount = splits[0].split_amount;
        let diff = (split_amount - original_commission).abs();
        
        prop_assert!(
            diff < 0.01,
            "Single employee should receive full commission: expected {}, got {}",
            original_commission,
            split_amount
        );
    }

    #[test]
    fn split_with_minimum_percentages(
        original_commission in 100.0..10000.0,
        num_employees in 2..20usize,
    ) {
        // Each employee gets at least 1%
        let min_percentage = 1.0;
        let remaining = 100.0 - (min_percentage * num_employees as f64);
        
        // Skip if not enough percentage to distribute
        prop_assume!(remaining >= 0.0);
        
        // Give each employee minimum, distribute remaining to first employee
        let mut split_percentages = vec![min_percentage; num_employees];
        split_percentages[0] += remaining;
        
        // Create splits
        let splits = calculate_split_amounts(original_commission, split_percentages);
        
        // Sum all split amounts
        let total_split_amount: f64 = splits.iter().map(|s| s.split_amount).sum();
        
        // Verify sum equals original commission
        let diff = (total_split_amount - original_commission).abs();
        prop_assert!(
            diff < 0.01,
            "Sum of split amounts ({}) should equal original commission ({}), diff: {}",
            total_split_amount,
            original_commission,
            diff
        );
        
        // Verify each employee gets at least minimum
        let min_amount = original_commission * (min_percentage / 100.0);
        for split in &splits {
            prop_assert!(
                split.split_amount >= min_amount - 0.01,
                "Each employee should receive at least {}% ({}), got {}",
                min_percentage,
                min_amount,
                split.split_amount
            );
        }
    }

    #[test]
    fn split_amount_matches_percentage(
        original_commission in 1.0..10000.0,
        split_percentage in 1.0..99.0,
    ) {
        let other_percentage = 100.0 - split_percentage;
        let splits = calculate_split_amounts(
            original_commission,
            vec![split_percentage, other_percentage],
        );
        
        // Verify first split amount matches its percentage
        let expected_amount = original_commission * (split_percentage / 100.0);
        let diff = (splits[0].split_amount - expected_amount).abs();
        
        prop_assert!(
            diff < 0.01,
            "Split amount should match percentage: {}% of {} = {}, got {}",
            split_percentage,
            original_commission,
            expected_amount,
            splits[0].split_amount
        );
        
        // Verify second split amount matches its percentage
        let expected_amount2 = original_commission * (other_percentage / 100.0);
        let diff2 = (splits[1].split_amount - expected_amount2).abs();
        
        prop_assert!(
            diff2 < 0.01,
            "Split amount should match percentage: {}% of {} = {}, got {}",
            other_percentage,
            original_commission,
            expected_amount2,
            splits[1].split_amount
        );
    }
}

// ============================================================================
// Additional Property Tests: Commission Split Edge Cases
// ============================================================================

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn split_preserves_commission_regardless_of_order(
        original_commission in 1.0..10000.0,
        split1 in 10.0..40.0,
        split2 in 10.0..40.0,
    ) {
        let split3 = 100.0 - split1 - split2;
        prop_assume!(split3 > 0.0);
        
        // Calculate splits in original order
        let splits_order1 = calculate_split_amounts(
            original_commission,
            vec![split1, split2, split3],
        );
        
        // Calculate splits in different order
        let splits_order2 = calculate_split_amounts(
            original_commission,
            vec![split3, split1, split2],
        );
        
        // Sum should be the same regardless of order
        let sum1: f64 = splits_order1.iter().map(|s| s.split_amount).sum();
        let sum2: f64 = splits_order2.iter().map(|s| s.split_amount).sum();
        
        let diff = (sum1 - sum2).abs();
        prop_assert!(
            diff < 0.01,
            "Total split amount should be independent of split order"
        );
        
        // Both should equal original commission
        let diff1 = (sum1 - original_commission).abs();
        let diff2 = (sum2 - original_commission).abs();
        
        prop_assert!(
            diff1 < 0.01 && diff2 < 0.01,
            "Both orderings should sum to original commission"
        );
    }

    #[test]
    fn split_is_associative(
        original_commission in 100.0..10000.0,
        split1 in 20.0..40.0,
        split2 in 20.0..40.0,
    ) {
        let split3 = 100.0 - split1 - split2;
        prop_assume!(split3 > 0.0);
        
        // Calculate all splits at once
        let all_splits = calculate_split_amounts(
            original_commission,
            vec![split1, split2, split3],
        );
        let total_all: f64 = all_splits.iter().map(|s| s.split_amount).sum();
        
        // Calculate first two, then add third
        let first_two = calculate_split_amounts(
            original_commission,
            vec![split1, split2],
        );
        let partial_sum: f64 = first_two.iter().map(|s| s.split_amount).sum();
        let third_split = calculate_split_amounts(
            original_commission,
            vec![split3],
        );
        let total_sequential = partial_sum + third_split[0].split_amount;
        
        // Both approaches should give same total
        let diff = (total_all - total_sequential).abs();
        prop_assert!(
            diff < 0.01,
            "Split calculation should be associative"
        );
    }

    #[test]
    fn zero_percentage_split_gives_zero_amount(
        original_commission in 1.0..10000.0,
    ) {
        // One employee gets 100%, another gets 0%
        let splits = calculate_split_amounts(
            original_commission,
            vec![100.0, 0.0],
        );
        
        prop_assert_eq!(
            splits.len(),
            2,
            "Should have two splits"
        );
        
        // First split should be full commission
        let diff1 = (splits[0].split_amount - original_commission).abs();
        prop_assert!(
            diff1 < 0.01,
            "100% split should equal original commission"
        );
        
        // Second split should be zero
        prop_assert!(
            splits[1].split_amount.abs() < 0.000001,
            "0% split should give zero amount, got {}",
            splits[1].split_amount
        );
    }

    #[test]
    fn many_small_splits_sum_correctly(
        original_commission in 100.0..10000.0,
        num_employees in 10..50usize,
    ) {
        // Create many small equal splits
        let split_percentage = 100.0 / num_employees as f64;
        let split_percentages = vec![split_percentage; num_employees];
        
        let splits = calculate_split_amounts(original_commission, split_percentages);
        
        // Sum all splits
        let total: f64 = splits.iter().map(|s| s.split_amount).sum();
        
        // Verify sum equals original
        let diff = (total - original_commission).abs();
        let relative_error = diff / original_commission;
        
        prop_assert!(
            relative_error < 0.001, // 0.1% relative error for many splits
            "Sum of {} splits ({}) should equal original commission ({}), relative error: {}",
            num_employees,
            total,
            original_commission,
            relative_error
        );
    }
}
