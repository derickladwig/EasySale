//! Property-based tests for precedence resolution
//!
//! **Property 7: Precedence Resolution**
//! **Property 8: Critical Zone Protection**
//! **Validates: Requirements 5.1, 5.2, 5.3, 6.1, 6.2**

#[cfg(test)]
mod property_tests {
    use proptest::prelude::*;

    use crate::services::cleanup_engine::precedence::{
        highest_precedence_source, merge_shields, overlaps_critical_zone,
    };
    use crate::services::cleanup_engine::types::{
        ApplyMode, CleanupShield, NormalizedBBox, RiskLevel, ShieldSource, ShieldType,
        CRITICAL_OVERLAP_BLOCK_APPLY, CRITICAL_OVERLAP_WARN,
    };

    // ========================================================================
    // Arbitrary generators for property tests
    // ========================================================================

    /// Generate arbitrary normalized coordinate (0.0 to 1.0)
    fn arb_coord() -> impl Strategy<Value = f64> {
        0.0..=1.0f64
    }

    /// Generate arbitrary small dimension (0.01 to 0.3)
    fn arb_small_dim() -> impl Strategy<Value = f64> {
        0.01..=0.3f64
    }

    /// Generate arbitrary confidence (0.0 to 1.0)
    fn arb_confidence() -> impl Strategy<Value = f64> {
        0.0..=1.0f64
    }

    /// Generate arbitrary ShieldSource
    fn arb_shield_source() -> impl Strategy<Value = ShieldSource> {
        prop_oneof![
            Just(ShieldSource::AutoDetected),
            Just(ShieldSource::VendorRule),
            Just(ShieldSource::TemplateRule),
            Just(ShieldSource::SessionOverride),
        ]
    }

    /// Generate arbitrary ShieldType
    fn arb_shield_type() -> impl Strategy<Value = ShieldType> {
        prop_oneof![
            Just(ShieldType::Logo),
            Just(ShieldType::Watermark),
            Just(ShieldType::RepetitiveHeader),
            Just(ShieldType::RepetitiveFooter),
            Just(ShieldType::Stamp),
            Just(ShieldType::UserDefined),
        ]
    }

    /// Generate a valid NormalizedBBox that fits within bounds
    fn arb_valid_bbox() -> impl Strategy<Value = NormalizedBBox> {
        (arb_coord(), arb_coord(), arb_small_dim(), arb_small_dim()).prop_map(
            |(x, y, w, h)| {
                // Ensure bbox fits within [0, 1] bounds
                let x = x.min(1.0 - w);
                let y = y.min(1.0 - h);
                NormalizedBBox::new(x, y, w, h)
            },
        )
    }

    /// Generate a test shield with arbitrary properties
    fn arb_shield() -> impl Strategy<Value = CleanupShield> {
        (
            arb_shield_type(),
            arb_valid_bbox(),
            arb_confidence(),
            arb_shield_source(),
        )
            .prop_map(|(shield_type, bbox, confidence, source)| {
                let mut shield =
                    CleanupShield::auto_detected(shield_type, bbox, confidence, "Test".to_string());
                shield.provenance.source = source;
                shield
            })
    }

    /// Generate a vector of shields (0 to 5)
    fn arb_shield_vec() -> impl Strategy<Value = Vec<CleanupShield>> {
        prop::collection::vec(arb_shield(), 0..=5)
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        // ====================================================================
        // Property 7.1: Precedence ordering is deterministic
        // ====================================================================

        /// For any set of shields, merge_shields should produce deterministic output.
        #[test]
        fn precedence_is_deterministic(
            auto in arb_shield_vec(),
            vendor in arb_shield_vec(),
            template in arb_shield_vec(),
            session in arb_shield_vec(),
        ) {
            let result1 = merge_shields(
                auto.clone(),
                vendor.clone(),
                template.clone(),
                session.clone(),
                &[],
            );
            let result2 = merge_shields(auto, vendor, template, session, &[]);

            prop_assert_eq!(
                result1.shields.len(),
                result2.shields.len(),
                "Merge should be deterministic"
            );
        }

        // ====================================================================
        // Property 7.2: Higher precedence source always wins for duplicates
        // ====================================================================

        /// When two shields have the same bbox and type, the higher precedence wins.
        #[test]
        fn higher_precedence_wins(
            bbox in arb_valid_bbox(),
            shield_type in arb_shield_type(),
            conf1 in arb_confidence(),
            conf2 in arb_confidence(),
        ) {
            let mut auto_shield = CleanupShield::auto_detected(
                shield_type,
                bbox,
                conf1,
                "Auto".to_string(),
            );
            auto_shield.provenance.source = ShieldSource::AutoDetected;

            let mut session_shield = CleanupShield::auto_detected(
                shield_type,
                bbox,
                conf2,
                "Session".to_string(),
            );
            session_shield.provenance.source = ShieldSource::SessionOverride;

            let result = merge_shields(
                vec![auto_shield],
                vec![],
                vec![],
                vec![session_shield],
                &[],
            );

            // Should have only 1 shield (session wins)
            prop_assert_eq!(result.shields.len(), 1);
            prop_assert_eq!(
                result.shields[0].provenance.source,
                ShieldSource::SessionOverride,
                "Session should override Auto"
            );
        }

        // ====================================================================
        // Property 7.3: Non-overlapping shields are all preserved
        // ====================================================================

        /// Shields with different positions should all be preserved.
        #[test]
        fn non_overlapping_preserved(
            shield_type in arb_shield_type(),
            conf in arb_confidence(),
        ) {
            // Create shields in different corners
            let shield1 = {
                let mut s = CleanupShield::auto_detected(
                    shield_type,
                    NormalizedBBox::new(0.0, 0.0, 0.1, 0.1),
                    conf,
                    "Corner 1".to_string(),
                );
                s.provenance.source = ShieldSource::AutoDetected;
                s
            };
            let shield2 = {
                let mut s = CleanupShield::auto_detected(
                    shield_type,
                    NormalizedBBox::new(0.9, 0.9, 0.1, 0.1),
                    conf,
                    "Corner 2".to_string(),
                );
                s.provenance.source = ShieldSource::VendorRule;
                s
            };

            let result = merge_shields(vec![shield1], vec![shield2], vec![], vec![], &[]);

            prop_assert_eq!(
                result.shields.len(),
                2,
                "Non-overlapping shields should both be preserved"
            );
        }

        // ====================================================================
        // Property 7.4: Result is sorted by precedence
        // ====================================================================

        /// Merged shields should be sorted by precedence (highest first).
        #[test]
        fn result_sorted_by_precedence(
            auto in arb_shield_vec(),
            vendor in arb_shield_vec(),
            template in arb_shield_vec(),
            session in arb_shield_vec(),
        ) {
            let result = merge_shields(auto, vendor, template, session, &[]);

            // Check that shields are sorted by precedence (descending)
            for i in 1..result.shields.len() {
                let prev_precedence = result.shields[i - 1].provenance.source as u8;
                let curr_precedence = result.shields[i].provenance.source as u8;
                prop_assert!(
                    prev_precedence >= curr_precedence,
                    "Shields should be sorted by precedence"
                );
            }
        }

        // ====================================================================
        // Property 8.1: Critical zone overlap forces Suggested mode
        // ====================================================================

        /// Shields with high overlap on critical zones should be forced to Suggested.
        #[test]
        fn critical_zone_forces_suggested(
            conf in arb_confidence(),
        ) {
            // Create a shield that significantly overlaps a critical zone
            let shield_bbox = NormalizedBBox::new(0.0, 0.0, 0.5, 0.5);
            let zone_bbox = NormalizedBBox::new(0.0, 0.0, 0.4, 0.4);

            let mut shield = CleanupShield::auto_detected(
                ShieldType::Logo,
                shield_bbox,
                conf,
                "Test".to_string(),
            );
            shield.apply_mode = ApplyMode::Applied;

            let critical_zones = vec![("totals".to_string(), zone_bbox)];

            let result = merge_shields(vec![shield], vec![], vec![], vec![], &critical_zones);

            prop_assert_eq!(result.shields.len(), 1);
            prop_assert_eq!(
                result.shields[0].apply_mode,
                ApplyMode::Suggested,
                "High overlap should force Suggested mode"
            );
            prop_assert_eq!(
                result.shields[0].risk_level,
                RiskLevel::High,
                "High overlap should set High risk"
            );
        }

        // ====================================================================
        // Property 8.2: No overlap means no zone conflicts
        // ====================================================================

        /// Shields that don't overlap critical zones should have no conflicts.
        #[test]
        fn no_overlap_no_conflicts(
            conf in arb_confidence(),
        ) {
            // Create a shield far from the critical zone
            let shield_bbox = NormalizedBBox::new(0.0, 0.0, 0.1, 0.1);
            let zone_bbox = NormalizedBBox::new(0.8, 0.8, 0.2, 0.2);

            let shield = CleanupShield::auto_detected(
                ShieldType::Logo,
                shield_bbox,
                conf,
                "Test".to_string(),
            );

            let critical_zones = vec![("totals".to_string(), zone_bbox)];

            let result = merge_shields(vec![shield], vec![], vec![], vec![], &critical_zones);

            prop_assert!(
                result.zone_conflicts.is_empty(),
                "No overlap should mean no conflicts"
            );
        }

        // ====================================================================
        // Property 8.3: overlaps_critical_zone is consistent with merge_shields
        // ====================================================================

        /// The overlaps_critical_zone function should be consistent with merge behavior.
        #[test]
        fn overlaps_function_consistent(
            shield in arb_shield(),
            zone_bbox in arb_valid_bbox(),
        ) {
            let critical_zones = vec![("test_zone".to_string(), zone_bbox)];

            let overlaps = overlaps_critical_zone(&shield, &critical_zones);
            let result = merge_shields(vec![shield.clone()], vec![], vec![], vec![], &critical_zones);

            // If overlaps_critical_zone returns true, there should be zone conflicts
            // (unless overlap is below warning threshold)
            if overlaps {
                // The function returns true for any overlap >= CRITICAL_OVERLAP_WARN
                // So we should have at least a warning
                prop_assert!(
                    !result.zone_conflicts.is_empty() || !result.warnings.is_empty(),
                    "overlaps_critical_zone=true should produce conflicts or warnings"
                );
            }
        }

        // ====================================================================
        // Property 8.4: highest_precedence_source returns correct source
        // ====================================================================

        /// highest_precedence_source should return the highest source in the list.
        #[test]
        fn highest_precedence_correct(
            shields in arb_shield_vec(),
        ) {
            let highest = highest_precedence_source(&shields);

            if shields.is_empty() {
                prop_assert!(highest.is_none());
            } else {
                let expected = shields
                    .iter()
                    .map(|s| s.provenance.source)
                    .max_by_key(|s| *s as u8);
                prop_assert_eq!(highest, expected);
            }
        }

        // ====================================================================
        // Property 8.5: Zone conflict action is appropriate for overlap level
        // ====================================================================

        /// Zone conflicts should have appropriate actions based on overlap level.
        #[test]
        fn zone_conflict_action_appropriate(
            conf in arb_confidence(),
        ) {
            // High overlap case
            let high_overlap_shield = CleanupShield::auto_detected(
                ShieldType::Logo,
                NormalizedBBox::new(0.0, 0.0, 0.5, 0.5),
                conf,
                "High overlap".to_string(),
            );

            let zone_bbox = NormalizedBBox::new(0.0, 0.0, 0.4, 0.4);
            let critical_zones = vec![("totals".to_string(), zone_bbox)];

            let result = merge_shields(
                vec![high_overlap_shield],
                vec![],
                vec![],
                vec![],
                &critical_zones,
            );

            // Should have a zone conflict with appropriate action
            if !result.zone_conflicts.is_empty() {
                let action = &result.zone_conflicts[0].action_taken;
                prop_assert!(
                    action == "downgraded_to_suggested"
                        || action == "elevated_risk"
                        || action == "warning_added",
                    "Action should be one of the expected values, got: {}",
                    action
                );
            }
        }
    }

    // ========================================================================
    // Additional unit tests for edge cases
    // ========================================================================

    #[test]
    fn test_empty_inputs() {
        let result = merge_shields(vec![], vec![], vec![], vec![], &[]);
        assert!(result.shields.is_empty());
        assert!(result.explanations.is_empty());
        assert!(result.zone_conflicts.is_empty());
        assert!(result.warnings.is_empty());
    }

    #[test]
    fn test_precedence_order() {
        // Verify: Session > Template > Vendor > Auto
        assert!(ShieldSource::SessionOverride as u8 > ShieldSource::TemplateRule as u8);
        assert!(ShieldSource::TemplateRule as u8 > ShieldSource::VendorRule as u8);
        assert!(ShieldSource::VendorRule as u8 > ShieldSource::AutoDetected as u8);
    }

    #[test]
    fn test_critical_overlap_thresholds() {
        // Verify threshold values are sensible
        assert!(CRITICAL_OVERLAP_WARN > 0.0);
        assert!(CRITICAL_OVERLAP_WARN < CRITICAL_OVERLAP_BLOCK_APPLY);
        assert!(CRITICAL_OVERLAP_BLOCK_APPLY <= 1.0);
    }
}
