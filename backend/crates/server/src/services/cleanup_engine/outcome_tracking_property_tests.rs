//! Property-Based Tests for Outcome Tracking
//!
//! **Property 13: Outcome Tracking**
//! **Validates: Requirements 12.1, 12.2, 12.3**
//!
//! Tests that:
//! - Review outcomes correctly track edits made
//! - Confidence improvements are calculated correctly
//! - Threshold adjustments are retrievable and applicable

use proptest::prelude::*;

use super::outcome_tracking::*;
use super::types::*;
use chrono::Utc;

// ============================================================================
// Arbitrary Generators
// ============================================================================

fn arb_shield_source() -> impl Strategy<Value = ShieldSource> {
    prop_oneof![
        Just(ShieldSource::AutoDetected),
        Just(ShieldSource::VendorRule),
        Just(ShieldSource::TemplateRule),
        Just(ShieldSource::SessionOverride),
    ]
}

fn arb_apply_mode() -> impl Strategy<Value = ApplyMode> {
    prop_oneof![
        Just(ApplyMode::Applied),
        Just(ApplyMode::Suggested),
        Just(ApplyMode::Disabled),
    ]
}

fn arb_normalized_bbox() -> impl Strategy<Value = NormalizedBBox> {
    (0.0..0.8f64, 0.0..0.8f64, 0.05..0.3f64, 0.05..0.3f64).prop_map(|(x, y, w, h)| {
        NormalizedBBox {
            x,
            y,
            width: w.min(1.0 - x),
            height: h.min(1.0 - y),
        }
    })
}

fn arb_cleanup_shield(id: String) -> impl Strategy<Value = CleanupShield> {
    (arb_shield_source(), arb_apply_mode(), arb_normalized_bbox(), 0.5..1.0f64).prop_map(
        move |(source, apply_mode, bbox, confidence)| CleanupShield {
            id: id.clone(),
            shield_type: ShieldType::Logo,
            normalized_bbox: bbox,
            page_target: PageTarget::All,
            zone_target: ZoneTarget::default(),
            apply_mode,
            risk_level: RiskLevel::Low,
            confidence,
            min_confidence: 0.6,
            why_detected: "Test shield".to_string(),
            provenance: ShieldProvenance {
                source,
                user_id: None,
                vendor_id: None,
                template_id: None,
                created_at: Utc::now(),
                updated_at: None,
            },
        },
    )
}

fn arb_shield_list(count: usize) -> impl Strategy<Value = Vec<CleanupShield>> {
    prop::collection::vec(
        (0..1000u32).prop_flat_map(|i| arb_cleanup_shield(format!("shield-{}", i))),
        0..=count,
    )
}

fn arb_confidence() -> impl Strategy<Value = f64> {
    0.0..1.0f64
}

// ============================================================================
// Property Tests
// ============================================================================

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    /// **Property 13.1: Edit Tracking Accuracy**
    ///
    /// For any initial and final shield sets, the edit metrics should accurately
    /// reflect the differences:
    /// - Added = shields in final but not in initial
    /// - Removed = shields in initial but not in final
    #[test]
    fn prop_edit_tracking_accuracy(
        initial_count in 0..10usize,
        final_count in 0..10usize,
    ) {
        // Create initial shields with known IDs
        let initial: Vec<CleanupShield> = (0..initial_count)
            .map(|i| create_test_shield(&format!("shield-{}", i), ShieldSource::AutoDetected))
            .collect();

        // Create final shields - some overlap, some new
        let overlap_count = initial_count.min(final_count) / 2;
        let mut final_shields: Vec<CleanupShield> = (0..overlap_count)
            .map(|i| create_test_shield(&format!("shield-{}", i), ShieldSource::AutoDetected))
            .collect();

        // Add new shields
        for i in 0..(final_count - overlap_count) {
            final_shields.push(create_test_shield(
                &format!("new-shield-{}", i),
                ShieldSource::SessionOverride,
            ));
        }

        // Build outcome
        let outcome = OutcomeBuilder::new()
            .review_case_id("test-case")
            .initial_shields(initial.clone())
            .final_shields(final_shields.clone())
            .build("tenant-1", "store-1")
            .unwrap();

        // Verify edit counts
        let expected_added = final_count.saturating_sub(overlap_count) as u32;
        let expected_removed = initial_count.saturating_sub(overlap_count) as u32;

        prop_assert_eq!(outcome.shields_added, expected_added,
            "Added count mismatch: expected {}, got {}", expected_added, outcome.shields_added);
        prop_assert_eq!(outcome.shields_removed, expected_removed,
            "Removed count mismatch: expected {}, got {}", expected_removed, outcome.shields_removed);
    }

    /// **Property 13.2: Confidence Delta Calculation**
    ///
    /// For any initial and final confidence values, the delta should be
    /// correctly calculated as (final - initial).
    #[test]
    fn prop_confidence_delta_calculation(
        initial_conf in arb_confidence(),
        final_conf in arb_confidence(),
    ) {
        let outcome = OutcomeBuilder::new()
            .review_case_id("test-case")
            .initial_confidence(initial_conf)
            .final_confidence(final_conf)
            .build("tenant-1", "store-1")
            .unwrap();

        let expected_delta = final_conf - initial_conf;

        prop_assert!(outcome.confidence_delta.is_some(),
            "Confidence delta should be calculated when both values provided");

        let actual_delta = outcome.confidence_delta.unwrap();
        prop_assert!((actual_delta - expected_delta).abs() < 1e-10,
            "Delta mismatch: expected {}, got {}", expected_delta, actual_delta);
    }

    /// **Property 13.3: Shield Source Counting**
    ///
    /// For any set of shields, the source counts should sum to the total count.
    #[test]
    fn prop_shield_source_counting(shields in arb_shield_list(20)) {
        let outcome = OutcomeBuilder::new()
            .review_case_id("test-case")
            .initial_shields(shields.clone())
            .build("tenant-1", "store-1")
            .unwrap();

        let total_counted = outcome.auto_detected_count
            + outcome.vendor_rule_count
            + outcome.template_rule_count
            + outcome.session_override_count;

        prop_assert_eq!(total_counted, shields.len() as u32,
            "Source counts should sum to total shields: {} != {}",
            total_counted, shields.len());
    }

    /// **Property 13.4: Threshold Adjustment Bounds**
    ///
    /// For any set of outcomes, the calculated threshold adjustment should
    /// be within reasonable bounds [-0.15, 0.15].
    #[test]
    fn prop_threshold_adjustment_bounds(
        outcome_count in 1..20usize,
        avg_edits in 0.0..10.0f64,
        avg_improvement in -0.2..0.3f64,
    ) {
        // Create mock outcomes with specified characteristics
        let outcomes: Vec<CleanupReviewOutcome> = (0..outcome_count)
            .map(|i| {
                let edits = (avg_edits * (0.5 + (i as f64 / outcome_count as f64))).round() as u32;
                CleanupReviewOutcome {
                    id: format!("outcome-{}", i),
                    tenant_id: "tenant-1".to_string(),
                    store_id: "store-1".to_string(),
                    review_case_id: format!("case-{}", i),
                    vendor_id: Some("vendor-1".to_string()),
                    template_id: None,
                    auto_detected_count: 5,
                    vendor_rule_count: 2,
                    template_rule_count: 0,
                    session_override_count: edits,
                    shields_added: edits / 2,
                    shields_removed: edits / 3,
                    shields_adjusted: edits / 4,
                    apply_mode_changes: 0,
                    initial_confidence: Some(0.7),
                    final_confidence: Some(0.7 + avg_improvement),
                    confidence_delta: Some(avg_improvement),
                    fields_extracted: 10,
                    fields_corrected: 2,
                    fields_failed: 0,
                    review_duration_ms: Some(30000),
                    extraction_duration_ms: Some(5000),
                    outcome_status: OutcomeStatus::Completed,
                    user_satisfaction: None,
                    created_at: Utc::now(),
                    completed_at: Some(Utc::now()),
                    user_id: None,
                }
            })
            .collect();

        let adjustment = calculate_threshold_adjustment(&outcomes, ShieldType::Logo);

        prop_assert!(adjustment >= -0.15 && adjustment <= 0.15,
            "Threshold adjustment {} should be within [-0.15, 0.15]", adjustment);
    }

    /// **Property 13.5: Empty Outcomes Return Zero Adjustment**
    ///
    /// When no outcomes are provided, the threshold adjustment should be zero.
    #[test]
    fn prop_empty_outcomes_zero_adjustment(_dummy in 0..1i32) {
        let outcomes: Vec<CleanupReviewOutcome> = vec![];
        let adjustment = calculate_threshold_adjustment(&outcomes, ShieldType::Logo);

        prop_assert_eq!(adjustment, 0.0,
            "Empty outcomes should return zero adjustment");
    }

    /// **Property 13.6: Outcome Builder Requires Review Case ID**
    ///
    /// Building an outcome without a review_case_id should fail.
    #[test]
    fn prop_outcome_requires_review_case_id(_dummy in 0..1i32) {
        let result = OutcomeBuilder::new()
            .vendor_id("vendor-1")
            .build("tenant-1", "store-1");

        prop_assert!(result.is_err(),
            "Building without review_case_id should fail");
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

fn create_test_shield(id: &str, source: ShieldSource) -> CleanupShield {
    CleanupShield {
        id: id.to_string(),
        shield_type: ShieldType::Logo,
        normalized_bbox: NormalizedBBox {
            x: 0.1,
            y: 0.1,
            width: 0.2,
            height: 0.1,
        },
        page_target: PageTarget::All,
        zone_target: ZoneTarget::default(),
        apply_mode: ApplyMode::Suggested,
        risk_level: RiskLevel::Low,
        confidence: 0.8,
        min_confidence: 0.6,
        why_detected: "Test".to_string(),
        provenance: ShieldProvenance {
            source,
            user_id: None,
            vendor_id: None,
            template_id: None,
            created_at: Utc::now(),
            updated_at: None,
        },
    }
}
