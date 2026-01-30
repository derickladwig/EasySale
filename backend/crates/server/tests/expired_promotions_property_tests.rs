//! Property-Based Tests for Expired Promotions
//! Feature: sales-customer-management, Property 24: Expired promotions do not apply
//!
//! These tests validate that for any promotion, if the current date is after
//! the end date, the promotion should not be applied to any transaction.
//!
//! **Validates: Requirements 8.7**

use proptest::prelude::*;
use chrono::{NaiveDate, Duration};

// ============================================================================
// Test Helpers
// ============================================================================

/// Represents a promotion with date range
#[derive(Debug, Clone)]
struct Promotion {
    id: String,
    name: String,
    discount_value: f64,
    start_date: NaiveDate,
    end_date: NaiveDate,
    is_active: bool,
}

/// Check if a promotion is applicable on a given date
/// A promotion applies if:
/// 1. It is marked as active
/// 2. The current date is >= start_date
/// 3. The current date is <= end_date
fn is_promotion_applicable(promotion: &Promotion, current_date: NaiveDate) -> bool {
    if !promotion.is_active {
        return false;
    }

    current_date >= promotion.start_date && current_date <= promotion.end_date
}

/// Check if a promotion is expired on a given date
fn is_promotion_expired(promotion: &Promotion, current_date: NaiveDate) -> bool {
    current_date > promotion.end_date
}

/// Check if a promotion is in the future on a given date
fn is_promotion_future(promotion: &Promotion, current_date: NaiveDate) -> bool {
    current_date < promotion.start_date
}

/// Apply promotion if applicable, return discount amount
fn apply_promotion(promotion: &Promotion, current_date: NaiveDate, price: f64) -> f64 {
    if is_promotion_applicable(promotion, current_date) {
        price * (promotion.discount_value / 100.0)
    } else {
        0.0
    }
}

// ============================================================================
// Property 24: Expired promotions do not apply
// ============================================================================
// For any promotion, if the current date is after the end date, the promotion
// should not be applied to any transaction.
//
// **Validates: Requirements 8.7**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn expired_promotion_does_not_apply(
        price in 10.0..1000.0,
        discount_pct in 5.0..50.0,
        days_after_end in 1..365i64,
    ) {
        // Create a promotion that ended in the past
        let end_date = NaiveDate::from_ymd_opt(2024, 6, 30).unwrap();
        let start_date = NaiveDate::from_ymd_opt(2024, 6, 1).unwrap();
        let current_date = end_date + Duration::days(days_after_end);

        let promotion = Promotion {
            id: "promo-expired".to_string(),
            name: "Expired Promotion".to_string(),
            discount_value: discount_pct,
            start_date,
            end_date,
            is_active: true,
        };

        // Verify the promotion is expired
        prop_assert!(
            is_promotion_expired(&promotion, current_date),
            "Promotion should be expired when current date ({}) is after end date ({})",
            current_date,
            end_date
        );

        // Verify the promotion does not apply
        prop_assert!(
            !is_promotion_applicable(&promotion, current_date),
            "Expired promotion should not be applicable"
        );

        // Verify no discount is applied
        let discount = apply_promotion(&promotion, current_date, price);
        prop_assert!(
            discount.abs() < 0.000001,
            "Expired promotion should not provide any discount, got {}",
            discount
        );
    }

    #[test]
    fn promotion_applies_within_date_range(
        price in 10.0..1000.0,
        discount_pct in 5.0..50.0,
        days_into_period in 0..30i64,
    ) {
        // Create a promotion with a valid date range
        let start_date = NaiveDate::from_ymd_opt(2024, 6, 1).unwrap();
        let end_date = NaiveDate::from_ymd_opt(2024, 6, 30).unwrap();
        let current_date = start_date + Duration::days(days_into_period);

        let promotion = Promotion {
            id: "promo-active".to_string(),
            name: "Active Promotion".to_string(),
            discount_value: discount_pct,
            start_date,
            end_date,
            is_active: true,
        };

        // Verify current date is within range
        prop_assert!(
            current_date >= start_date && current_date <= end_date,
            "Current date should be within promotion period"
        );

        // Verify the promotion is not expired
        prop_assert!(
            !is_promotion_expired(&promotion, current_date),
            "Promotion should not be expired when current date is within range"
        );

        // Verify the promotion applies
        prop_assert!(
            is_promotion_applicable(&promotion, current_date),
            "Promotion should be applicable when current date is within range"
        );

        // Verify discount is applied
        let discount = apply_promotion(&promotion, current_date, price);
        let expected_discount = price * (discount_pct / 100.0);
        let diff = (discount - expected_discount).abs();

        prop_assert!(
            discount > 0.0,
            "Active promotion should provide a positive discount"
        );

        prop_assert!(
            diff < 0.01,
            "Discount should be calculated correctly. Expected: {}, Got: {}",
            expected_discount,
            discount
        );
    }

    #[test]
    fn promotion_on_end_date_still_applies(
        price in 10.0..1000.0,
        discount_pct in 5.0..50.0,
    ) {
        let start_date = NaiveDate::from_ymd_opt(2024, 6, 1).unwrap();
        let end_date = NaiveDate::from_ymd_opt(2024, 6, 30).unwrap();
        let current_date = end_date; // Exactly on end date

        let promotion = Promotion {
            id: "promo-end-date".to_string(),
            name: "End Date Promotion".to_string(),
            discount_value: discount_pct,
            start_date,
            end_date,
            is_active: true,
        };

        // Verify the promotion is not expired on end date (inclusive)
        prop_assert!(
            !is_promotion_expired(&promotion, current_date),
            "Promotion should not be expired on the end date (inclusive boundary)"
        );

        // Verify the promotion applies
        prop_assert!(
            is_promotion_applicable(&promotion, current_date),
            "Promotion should apply on the end date (inclusive boundary)"
        );

        // Verify discount is applied
        let discount = apply_promotion(&promotion, current_date, price);
        prop_assert!(
            discount > 0.0,
            "Promotion should provide discount on end date"
        );
    }

    #[test]
    fn promotion_day_after_end_date_does_not_apply(
        price in 10.0..1000.0,
        discount_pct in 5.0..50.0,
    ) {
        let start_date = NaiveDate::from_ymd_opt(2024, 6, 1).unwrap();
        let end_date = NaiveDate::from_ymd_opt(2024, 6, 30).unwrap();
        let current_date = end_date + Duration::days(1); // One day after end

        let promotion = Promotion {
            id: "promo-day-after".to_string(),
            name: "Day After End".to_string(),
            discount_value: discount_pct,
            start_date,
            end_date,
            is_active: true,
        };

        // Verify the promotion is expired
        prop_assert!(
            is_promotion_expired(&promotion, current_date),
            "Promotion should be expired one day after end date"
        );

        // Verify the promotion does not apply
        prop_assert!(
            !is_promotion_applicable(&promotion, current_date),
            "Promotion should not apply one day after end date"
        );

        // Verify no discount is applied
        let discount = apply_promotion(&promotion, current_date, price);
        prop_assert!(
            discount.abs() < 0.000001,
            "Promotion should not provide discount one day after end date, got {}",
            discount
        );
    }

    #[test]
    fn future_promotion_does_not_apply(
        price in 10.0..1000.0,
        discount_pct in 5.0..50.0,
        days_before_start in 1..365i64,
    ) {
        let start_date = NaiveDate::from_ymd_opt(2024, 6, 1).unwrap();
        let end_date = NaiveDate::from_ymd_opt(2024, 6, 30).unwrap();
        let current_date = start_date - Duration::days(days_before_start);

        let promotion = Promotion {
            id: "promo-future".to_string(),
            name: "Future Promotion".to_string(),
            discount_value: discount_pct,
            start_date,
            end_date,
            is_active: true,
        };

        // Verify the promotion is in the future
        prop_assert!(
            is_promotion_future(&promotion, current_date),
            "Promotion should be in the future when current date ({}) is before start date ({})",
            current_date,
            start_date
        );

        // Verify the promotion does not apply
        prop_assert!(
            !is_promotion_applicable(&promotion, current_date),
            "Future promotion should not be applicable"
        );

        // Verify no discount is applied
        let discount = apply_promotion(&promotion, current_date, price);
        prop_assert!(
            discount.abs() < 0.000001,
            "Future promotion should not provide any discount, got {}",
            discount
        );
    }

    #[test]
    fn promotion_on_start_date_applies(
        price in 10.0..1000.0,
        discount_pct in 5.0..50.0,
    ) {
        let start_date = NaiveDate::from_ymd_opt(2024, 6, 1).unwrap();
        let end_date = NaiveDate::from_ymd_opt(2024, 6, 30).unwrap();
        let current_date = start_date; // Exactly on start date

        let promotion = Promotion {
            id: "promo-start-date".to_string(),
            name: "Start Date Promotion".to_string(),
            discount_value: discount_pct,
            start_date,
            end_date,
            is_active: true,
        };

        // Verify the promotion is not in the future on start date (inclusive)
        prop_assert!(
            !is_promotion_future(&promotion, current_date),
            "Promotion should not be in the future on the start date (inclusive boundary)"
        );

        // Verify the promotion applies
        prop_assert!(
            is_promotion_applicable(&promotion, current_date),
            "Promotion should apply on the start date (inclusive boundary)"
        );

        // Verify discount is applied
        let discount = apply_promotion(&promotion, current_date, price);
        prop_assert!(
            discount > 0.0,
            "Promotion should provide discount on start date"
        );
    }

    #[test]
    fn inactive_promotion_does_not_apply_even_within_dates(
        price in 10.0..1000.0,
        discount_pct in 5.0..50.0,
        days_into_period in 0..30i64,
    ) {
        let start_date = NaiveDate::from_ymd_opt(2024, 6, 1).unwrap();
        let end_date = NaiveDate::from_ymd_opt(2024, 6, 30).unwrap();
        let current_date = start_date + Duration::days(days_into_period);

        let promotion = Promotion {
            id: "promo-inactive".to_string(),
            name: "Inactive Promotion".to_string(),
            discount_value: discount_pct,
            start_date,
            end_date,
            is_active: false, // Marked as inactive
        };

        // Verify current date is within range
        prop_assert!(
            current_date >= start_date && current_date <= end_date,
            "Current date should be within promotion period"
        );

        // Verify the promotion does not apply (because it's inactive)
        prop_assert!(
            !is_promotion_applicable(&promotion, current_date),
            "Inactive promotion should not apply even when date is within range"
        );

        // Verify no discount is applied
        let discount = apply_promotion(&promotion, current_date, price);
        prop_assert!(
            discount.abs() < 0.000001,
            "Inactive promotion should not provide any discount, got {}",
            discount
        );
    }

    #[test]
    fn expired_inactive_promotion_does_not_apply(
        price in 10.0..1000.0,
        discount_pct in 5.0..50.0,
        days_after_end in 1..365i64,
    ) {
        let start_date = NaiveDate::from_ymd_opt(2024, 6, 1).unwrap();
        let end_date = NaiveDate::from_ymd_opt(2024, 6, 30).unwrap();
        let current_date = end_date + Duration::days(days_after_end);

        let promotion = Promotion {
            id: "promo-expired-inactive".to_string(),
            name: "Expired Inactive Promotion".to_string(),
            discount_value: discount_pct,
            start_date,
            end_date,
            is_active: false, // Both expired and inactive
        };

        // Verify the promotion is expired
        prop_assert!(
            is_promotion_expired(&promotion, current_date),
            "Promotion should be expired"
        );

        // Verify the promotion does not apply
        prop_assert!(
            !is_promotion_applicable(&promotion, current_date),
            "Expired and inactive promotion should not apply"
        );

        // Verify no discount is applied
        let discount = apply_promotion(&promotion, current_date, price);
        prop_assert!(
            discount.abs() < 0.000001,
            "Expired and inactive promotion should not provide any discount, got {}",
            discount
        );
    }

    #[test]
    fn date_comparison_is_consistent(
        days_offset in -365..365i64,
    ) {
        let start_date = NaiveDate::from_ymd_opt(2024, 6, 1).unwrap();
        let end_date = NaiveDate::from_ymd_opt(2024, 6, 30).unwrap();
        let current_date = NaiveDate::from_ymd_opt(2024, 6, 15).unwrap() + Duration::days(days_offset);

        let promotion = Promotion {
            id: "promo-consistent".to_string(),
            name: "Consistency Check".to_string(),
            discount_value: 10.0,
            start_date,
            end_date,
            is_active: true,
        };

        // Check multiple times - should be deterministic
        let expired_1 = is_promotion_expired(&promotion, current_date);
        let expired_2 = is_promotion_expired(&promotion, current_date);
        let expired_3 = is_promotion_expired(&promotion, current_date);

        prop_assert_eq!(
            expired_1,
            expired_2,
            "Expiration check should be deterministic"
        );

        prop_assert_eq!(
            expired_2,
            expired_3,
            "Expiration check should be deterministic"
        );

        // Verify the result matches expected logic
        let expected_expired = current_date > end_date;
        prop_assert_eq!(
            expired_1,
            expected_expired,
            "Expiration check should match current_date > end_date logic"
        );

        // Verify applicability is consistent
        let applicable_1 = is_promotion_applicable(&promotion, current_date);
        let applicable_2 = is_promotion_applicable(&promotion, current_date);

        prop_assert_eq!(
            applicable_1,
            applicable_2,
            "Applicability check should be deterministic"
        );
    }

    #[test]
    fn long_expired_promotion_never_applies(
        price in 10.0..1000.0,
        discount_pct in 5.0..50.0,
        years_after_end in 1..10i64,
    ) {
        let start_date = NaiveDate::from_ymd_opt(2020, 1, 1).unwrap();
        let end_date = NaiveDate::from_ymd_opt(2020, 12, 31).unwrap();
        let current_date = end_date + Duration::days(years_after_end * 365);

        let promotion = Promotion {
            id: "promo-long-expired".to_string(),
            name: "Long Expired Promotion".to_string(),
            discount_value: discount_pct,
            start_date,
            end_date,
            is_active: true,
        };

        // Verify the promotion is expired
        prop_assert!(
            is_promotion_expired(&promotion, current_date),
            "Promotion should be expired years after end date"
        );

        // Verify the promotion does not apply
        prop_assert!(
            !is_promotion_applicable(&promotion, current_date),
            "Long expired promotion should not apply"
        );

        // Verify no discount is applied
        let discount = apply_promotion(&promotion, current_date, price);
        prop_assert!(
            discount.abs() < 0.000001,
            "Long expired promotion should not provide any discount, got {}",
            discount
        );
    }
}

// ============================================================================
// Additional Property Tests: Multiple Promotions with Different States
// ============================================================================

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn only_active_non_expired_promotions_apply(
        price in 10.0..1000.0,
    ) {
        let current_date = NaiveDate::from_ymd_opt(2024, 7, 15).unwrap();

        // Expired promotion
        let promo_expired = Promotion {
            id: "promo-expired".to_string(),
            name: "Expired".to_string(),
            discount_value: 20.0,
            start_date: NaiveDate::from_ymd_opt(2024, 6, 1).unwrap(),
            end_date: NaiveDate::from_ymd_opt(2024, 6, 30).unwrap(),
            is_active: true,
        };

        // Active promotion
        let promo_active = Promotion {
            id: "promo-active".to_string(),
            name: "Active".to_string(),
            discount_value: 15.0,
            start_date: NaiveDate::from_ymd_opt(2024, 7, 1).unwrap(),
            end_date: NaiveDate::from_ymd_opt(2024, 7, 31).unwrap(),
            is_active: true,
        };

        // Future promotion
        let promo_future = Promotion {
            id: "promo-future".to_string(),
            name: "Future".to_string(),
            discount_value: 25.0,
            start_date: NaiveDate::from_ymd_opt(2024, 8, 1).unwrap(),
            end_date: NaiveDate::from_ymd_opt(2024, 8, 31).unwrap(),
            is_active: true,
        };

        let promotions = vec![promo_expired.clone(), promo_active.clone(), promo_future.clone()];

        // Check each promotion
        let discount_expired = apply_promotion(&promo_expired, current_date, price);
        let discount_active = apply_promotion(&promo_active, current_date, price);
        let discount_future = apply_promotion(&promo_future, current_date, price);

        // Expired promotion should not apply
        prop_assert!(
            discount_expired.abs() < 0.000001,
            "Expired promotion should not provide discount"
        );

        // Active promotion should apply
        prop_assert!(
            discount_active > 0.0,
            "Active promotion should provide discount"
        );

        // Future promotion should not apply
        prop_assert!(
            discount_future.abs() < 0.000001,
            "Future promotion should not provide discount"
        );

        // Count applicable promotions
        let applicable_count = promotions.iter()
            .filter(|p| is_promotion_applicable(p, current_date))
            .count();

        prop_assert_eq!(
            applicable_count,
            1,
            "Only one promotion (the active one) should be applicable"
        );
    }

    #[test]
    fn promotion_state_transitions_correctly(
        price in 10.0..1000.0,
        discount_pct in 10.0..30.0,
    ) {
        let start_date = NaiveDate::from_ymd_opt(2024, 6, 15).unwrap();
        let end_date = NaiveDate::from_ymd_opt(2024, 6, 20).unwrap();

        let promotion = Promotion {
            id: "promo-transition".to_string(),
            name: "Transition Test".to_string(),
            discount_value: discount_pct,
            start_date,
            end_date,
            is_active: true,
        };

        // Before start: should not apply
        let before_start = start_date - Duration::days(1);
        let discount_before = apply_promotion(&promotion, before_start, price);
        prop_assert!(
            discount_before.abs() < 0.000001,
            "Promotion should not apply before start date"
        );

        // On start: should apply
        let on_start = start_date;
        let discount_on_start = apply_promotion(&promotion, on_start, price);
        prop_assert!(
            discount_on_start > 0.0,
            "Promotion should apply on start date"
        );

        // During: should apply
        let during = start_date + Duration::days(2);
        let discount_during = apply_promotion(&promotion, during, price);
        prop_assert!(
            discount_during > 0.0,
            "Promotion should apply during valid period"
        );

        // On end: should apply
        let on_end = end_date;
        let discount_on_end = apply_promotion(&promotion, on_end, price);
        prop_assert!(
            discount_on_end > 0.0,
            "Promotion should apply on end date"
        );

        // After end: should not apply
        let after_end = end_date + Duration::days(1);
        let discount_after = apply_promotion(&promotion, after_end, price);
        prop_assert!(
            discount_after.abs() < 0.000001,
            "Promotion should not apply after end date"
        );
    }

    #[test]
    fn auto_deactivation_prevents_expired_promotion_application(
        price in 10.0..1000.0,
        discount_pct in 10.0..30.0,
        days_after_end in 1..100i64,
    ) {
        let start_date = NaiveDate::from_ymd_opt(2024, 6, 1).unwrap();
        let end_date = NaiveDate::from_ymd_opt(2024, 6, 30).unwrap();
        let current_date = end_date + Duration::days(days_after_end);

        // Simulate auto-deactivation: when a promotion expires, is_active is set to false
        let mut promotion = Promotion {
            id: "promo-auto-deactivate".to_string(),
            name: "Auto Deactivate".to_string(),
            discount_value: discount_pct,
            start_date,
            end_date,
            is_active: true,
        };

        // Check if expired and auto-deactivate
        if is_promotion_expired(&promotion, current_date) {
            promotion.is_active = false;
        }

        // Verify the promotion was deactivated
        prop_assert!(
            !promotion.is_active,
            "Expired promotion should be auto-deactivated"
        );

        // Verify the promotion does not apply
        prop_assert!(
            !is_promotion_applicable(&promotion, current_date),
            "Auto-deactivated expired promotion should not apply"
        );

        // Verify no discount is applied
        let discount = apply_promotion(&promotion, current_date, price);
        prop_assert!(
            discount.abs() < 0.000001,
            "Auto-deactivated expired promotion should not provide discount, got {}",
            discount
        );
    }
}
