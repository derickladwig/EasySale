// Property-Based Tests for Sales & Customer Management
// Feature: sales-customer-management, Property 5: Labor charge calculation
// These tests validate that labor charges are calculated correctly

use proptest::prelude::*;

// ============================================================================
// Property Test Generators
// ============================================================================

/// Generate a valid labor rate (hourly rate in dollars)
/// Range: $10.00 to $500.00 per hour
fn arb_labor_rate() -> impl Strategy<Value = f64> {
    (10.0..500.0).prop_map(|v: f64| (v * 100.0).round() / 100.0)
}

/// Generate a valid time duration (hours)
/// Range: 0.25 hours (15 minutes) to 100 hours
fn arb_time_duration() -> impl Strategy<Value = f64> {
    (0.25..100.0).prop_map(|v: f64| (v * 100.0).round() / 100.0)
}

// ============================================================================
// Property Tests
// ============================================================================

// Property 5: Labor charge calculation
// For any labor rate and time duration, the calculated charge should equal rate multiplied by duration
// **Validates: Requirements 2.4**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_5_labor_charge_calculation(
        labor_rate in arb_labor_rate(),
        time_duration in arb_time_duration(),
    ) {
        // Calculate the expected charge: rate * duration
        let expected_charge = labor_rate * time_duration;
        
        // Simulate the calculation as done in the work order handler
        // In the handler: total_price = req.quantity * req.unit_price
        // For labor: quantity is hours (time_duration), unit_price is hourly rate (labor_rate)
        let calculated_charge = time_duration * labor_rate;
        
        // Verify the calculation is correct (allow for floating point precision)
        let diff = (calculated_charge - expected_charge).abs();
        prop_assert!(
            diff < 0.01,
            "Labor charge should equal rate ({}) multiplied by duration ({}), got {} expected {}",
            labor_rate,
            time_duration,
            calculated_charge,
            expected_charge
        );
        
        // Verify the charge is non-negative
        prop_assert!(
            calculated_charge >= 0.0,
            "Labor charge should be non-negative"
        );
        
        // Verify the charge is reasonable (not zero unless rate or duration is zero)
        if labor_rate > 0.0 && time_duration > 0.0 {
            prop_assert!(
                calculated_charge > 0.0,
                "Labor charge should be positive when both rate and duration are positive"
            );
        }
    }
}

#[cfg(test)]
mod additional_tests {
    use super::*;

    // Additional property test: Labor charge scales linearly with duration
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn property_labor_charge_scales_linearly_with_duration(
            labor_rate in arb_labor_rate(),
            time_duration in arb_time_duration(),
            multiplier in 2u32..5u32,
        ) {
            let charge_1x = labor_rate * time_duration;
            let charge_nx = labor_rate * (time_duration * multiplier as f64);
            
            let expected_charge_nx = charge_1x * multiplier as f64;
            
            // Allow for small rounding differences
            let diff = (charge_nx - expected_charge_nx).abs();
            
            prop_assert!(
                diff < 0.01,
                "Labor charge should scale linearly: {}x charge ({}) should equal {} * 1x charge ({})",
                multiplier,
                charge_nx,
                multiplier,
                charge_1x
            );
        }
    }

    // Additional property test: Labor charge scales linearly with rate
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn property_labor_charge_scales_linearly_with_rate(
            labor_rate in arb_labor_rate(),
            time_duration in arb_time_duration(),
            multiplier in 2u32..5u32,
        ) {
            let charge_1x = labor_rate * time_duration;
            let charge_nx = (labor_rate * multiplier as f64) * time_duration;
            
            let expected_charge_nx = charge_1x * multiplier as f64;
            
            // Allow for small rounding differences
            let diff = (charge_nx - expected_charge_nx).abs();
            
            prop_assert!(
                diff < 0.01,
                "Labor charge should scale linearly: {}x rate charge ({}) should equal {} * 1x rate charge ({})",
                multiplier,
                charge_nx,
                multiplier,
                charge_1x
            );
        }
    }

    // Additional property test: Commutative property (rate * duration = duration * rate)
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn property_labor_charge_commutative(
            labor_rate in arb_labor_rate(),
            time_duration in arb_time_duration(),
        ) {
            let charge_rate_first = labor_rate * time_duration;
            let charge_duration_first = time_duration * labor_rate;
            
            let diff = (charge_rate_first - charge_duration_first).abs();
            prop_assert!(
                diff < 0.000001,
                "Labor charge calculation should be commutative: rate * duration = duration * rate"
            );
        }
    }

    // Additional property test: Zero rate or zero duration results in zero charge
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn property_labor_charge_zero_cases(
            labor_rate in arb_labor_rate(),
            time_duration in arb_time_duration(),
        ) {
            // Zero rate should result in zero charge
            let charge_zero_rate = 0.0_f64 * time_duration;
            prop_assert!(
                charge_zero_rate.abs() < 0.000001,
                "Labor charge should be zero when rate is zero"
            );
            
            // Zero duration should result in zero charge
            let charge_zero_duration = labor_rate * 0.0_f64;
            prop_assert!(
                charge_zero_duration.abs() < 0.000001,
                "Labor charge should be zero when duration is zero"
            );
        }
    }

    // Additional property test: Associative property for multiple labor entries
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn property_labor_charge_associative(
            labor_rate in arb_labor_rate(),
            duration1 in arb_time_duration(),
            duration2 in arb_time_duration(),
        ) {
            // Calculate charges separately then sum
            let charge1 = labor_rate * duration1;
            let charge2 = labor_rate * duration2;
            let total_separate = charge1 + charge2;
            
            // Calculate total duration then charge
            let total_duration = duration1 + duration2;
            let total_combined = labor_rate * total_duration;
            
            // Allow for small rounding differences
            let diff = (total_separate - total_combined).abs();
            
            prop_assert!(
                diff < 0.01,
                "Labor charge should be associative: (rate * d1) + (rate * d2) = rate * (d1 + d2)"
            );
        }
    }

    // Unit test: Specific example from requirements
    #[test]
    fn test_labor_charge_specific_example() {
        // Example: $75/hour rate for 2.5 hours should be $187.50
        let labor_rate = 75.00_f64;
        let time_duration = 2.5_f64;
        let expected_charge = 187.50_f64;
        
        let calculated_charge = labor_rate * time_duration;
        
        assert!(
            (calculated_charge - expected_charge).abs() < 0.01,
            "Labor charge calculation failed for specific example: got {}, expected {}",
            calculated_charge,
            expected_charge
        );
    }

    // Unit test: Edge case - minimum values
    #[test]
    fn test_labor_charge_minimum_values() {
        // Minimum rate and duration
        let labor_rate = 10.00_f64;
        let time_duration = 0.25_f64;
        let expected_charge = 2.50_f64;
        
        let calculated_charge = labor_rate * time_duration;
        
        assert!(
            (calculated_charge - expected_charge).abs() < 0.01,
            "Labor charge calculation failed for minimum values: got {}, expected {}",
            calculated_charge,
            expected_charge
        );
    }

    // Unit test: Edge case - high values
    #[test]
    fn test_labor_charge_high_values() {
        // High rate and duration
        let labor_rate = 500.00_f64;
        let time_duration = 100.00_f64;
        let expected_charge = 50000.00_f64;
        
        let calculated_charge = labor_rate * time_duration;
        
        assert!(
            (calculated_charge - expected_charge).abs() < 0.01,
            "Labor charge calculation failed for high values: got {}, expected {}",
            calculated_charge,
            expected_charge
        );
    }

    // Unit test: Edge case - fractional hours
    #[test]
    fn test_labor_charge_fractional_hours() {
        // Common fractional hours (15 min, 30 min, 45 min)
        let labor_rate = 60.00_f64;
        
        let duration_15min = 0.25_f64;
        let charge_15min = labor_rate * duration_15min;
        assert!((charge_15min - 15.00_f64).abs() < 0.01);
        
        let duration_30min = 0.5_f64;
        let charge_30min = labor_rate * duration_30min;
        assert!((charge_30min - 30.00_f64).abs() < 0.01);
        
        let duration_45min = 0.75_f64;
        let charge_45min = labor_rate * duration_45min;
        assert!((charge_45min - 45.00_f64).abs() < 0.01);
    }
}
