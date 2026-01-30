//! API Contract Tests for Cleanup Endpoints
//!
//! **Property 12: Backward Compatible API**
//! **Validates: Requirements 11.2, 11.3**
//!
//! Tests that:
//! - /api/masks/* endpoints produce equivalent results to /api/cleanup/*
//! - Terminology translation is bidirectional and lossless
//! - Response structures match expected contracts

#[cfg(test)]
mod contract_tests {
    use super::super::cleanup::*;
    use proptest::prelude::*;

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

    /// Generate arbitrary shield type string
    fn arb_shield_type_str() -> impl Strategy<Value = String> {
        prop_oneof![
            Just("Logo".to_string()),
            Just("Watermark".to_string()),
            Just("RepetitiveHeader".to_string()),
            Just("RepetitiveFooter".to_string()),
            Just("Stamp".to_string()),
            Just("UserDefined".to_string()),
        ]
    }


    /// Generate arbitrary apply mode string
    fn arb_apply_mode_str() -> impl Strategy<Value = String> {
        prop_oneof![
            Just("Applied".to_string()),
            Just("Suggested".to_string()),
            Just("Disabled".to_string()),
        ]
    }

    /// Generate arbitrary source string
    fn arb_source_str() -> impl Strategy<Value = String> {
        prop_oneof![
            Just("AutoDetected".to_string()),
            Just("VendorRule".to_string()),
            Just("TemplateRule".to_string()),
            Just("SessionOverride".to_string()),
        ]
    }

    /// Generate arbitrary page target DTO
    fn arb_page_target_dto() -> impl Strategy<Value = PageTargetDto> {
        prop_oneof![
            Just(PageTargetDto::All),
            Just(PageTargetDto::First),
            Just(PageTargetDto::Last),
            prop::collection::vec(1u32..=10, 1..=3).prop_map(PageTargetDto::Specific),
        ]
    }

    /// Generate a valid NormalizedBBoxDto
    fn arb_bbox_dto() -> impl Strategy<Value = NormalizedBBoxDto> {
        (arb_coord(), arb_coord(), arb_small_dim(), arb_small_dim()).prop_map(
            |(x, y, w, h)| {
                // Ensure bbox fits within [0, 1] bounds
                let x = x.min(1.0 - w);
                let y = y.min(1.0 - h);
                NormalizedBBoxDto {
                    x,
                    y,
                    width: w,
                    height: h,
                }
            },
        )
    }

    /// Generate a CleanupShieldDto
    fn arb_cleanup_shield_dto() -> impl Strategy<Value = CleanupShieldDto> {
        (
            "[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}",
            arb_shield_type_str(),
            arb_bbox_dto(),
            arb_page_target_dto(),
            arb_apply_mode_str(),
            arb_confidence(),
            "[a-zA-Z0-9 ]{1,20}",
            arb_source_str(),
        )
            .prop_map(
                |(id, shield_type, bbox, page_target, apply_mode, confidence, why, source)| {
                    CleanupShieldDto {
                        id,
                        shield_type,
                        normalized_bbox: bbox,
                        page_target,
                        zone_target: ZoneTargetDto::default(),
                        apply_mode,
                        risk_level: "Low".to_string(),
                        confidence,
                        why_detected: why,
                        source,
                    }
                },
            )
    }

    /// Generate a MaskDto
    fn arb_mask_dto() -> impl Strategy<Value = MaskDto> {
        arb_cleanup_shield_dto().prop_map(MaskDto::from)
    }


    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        // ====================================================================
        // Property 12.1: MaskDto ↔ CleanupShieldDto round-trip is lossless
        // ====================================================================

        /// Converting CleanupShieldDto → MaskDto → CleanupShieldDto should preserve all fields.
        #[test]
        fn cleanup_to_mask_roundtrip(shield in arb_cleanup_shield_dto()) {
            let mask = MaskDto::from(shield.clone());
            let back = CleanupShieldDto::from(mask);

            prop_assert_eq!(shield.id, back.id, "ID should be preserved");
            prop_assert_eq!(shield.shield_type, back.shield_type, "Shield type should be preserved");
            prop_assert_eq!(shield.apply_mode, back.apply_mode, "Apply mode should be preserved");
            prop_assert_eq!(shield.source, back.source, "Source should be preserved");
            prop_assert!(
                (shield.confidence - back.confidence).abs() < f64::EPSILON,
                "Confidence should be preserved"
            );
            prop_assert_eq!(shield.why_detected, back.why_detected, "Why detected should be preserved");
        }

        // ====================================================================
        // Property 12.2: MaskDto → CleanupShieldDto → MaskDto round-trip is lossless
        // ====================================================================

        /// Converting MaskDto → CleanupShieldDto → MaskDto should preserve all fields.
        #[test]
        fn mask_to_cleanup_roundtrip(mask in arb_mask_dto()) {
            let shield = CleanupShieldDto::from(mask.clone());
            let back = MaskDto::from(shield);

            prop_assert_eq!(mask.id, back.id, "ID should be preserved");
            prop_assert_eq!(mask.mask_type, back.mask_type, "Mask type should be preserved");
            prop_assert_eq!(mask.apply_mode, back.apply_mode, "Apply mode should be preserved");
            prop_assert_eq!(mask.source, back.source, "Source should be preserved");
            prop_assert!(
                (mask.confidence - back.confidence).abs() < f64::EPSILON,
                "Confidence should be preserved"
            );
        }

        // ====================================================================
        // Property 12.3: Terminology mapping is consistent
        // ====================================================================

        /// The shield_type field in CleanupShieldDto maps to mask_type in MaskDto.
        #[test]
        fn terminology_mapping_consistent(shield in arb_cleanup_shield_dto()) {
            let mask = MaskDto::from(shield.clone());

            // shield_type → mask_type
            prop_assert_eq!(
                shield.shield_type,
                mask.mask_type,
                "shield_type should map to mask_type"
            );
        }

        // ====================================================================
        // Property 12.4: BBox coordinates are preserved exactly
        // ====================================================================

        /// Bounding box coordinates should be preserved exactly through conversion.
        #[test]
        fn bbox_preserved_exactly(shield in arb_cleanup_shield_dto()) {
            let mask = MaskDto::from(shield.clone());
            let back = CleanupShieldDto::from(mask);

            prop_assert!(
                (shield.normalized_bbox.x - back.normalized_bbox.x).abs() < f64::EPSILON,
                "X coordinate should be preserved"
            );
            prop_assert!(
                (shield.normalized_bbox.y - back.normalized_bbox.y).abs() < f64::EPSILON,
                "Y coordinate should be preserved"
            );
            prop_assert!(
                (shield.normalized_bbox.width - back.normalized_bbox.width).abs() < f64::EPSILON,
                "Width should be preserved"
            );
            prop_assert!(
                (shield.normalized_bbox.height - back.normalized_bbox.height).abs() < f64::EPSILON,
                "Height should be preserved"
            );
        }
    }


    // ========================================================================
    // Unit tests for edge cases
    // ========================================================================

    #[test]
    fn test_page_target_all_preserved() {
        let shield = CleanupShieldDto {
            id: "test-id".to_string(),
            shield_type: "Logo".to_string(),
            normalized_bbox: NormalizedBBoxDto {
                x: 0.1,
                y: 0.1,
                width: 0.2,
                height: 0.2,
            },
            page_target: PageTargetDto::All,
            zone_target: ZoneTargetDto::default(),
            apply_mode: "Applied".to_string(),
            risk_level: "Low".to_string(),
            confidence: 0.9,
            why_detected: "Test".to_string(),
            source: "AutoDetected".to_string(),
        };

        let mask = MaskDto::from(shield.clone());
        let back = CleanupShieldDto::from(mask);

        match back.page_target {
            PageTargetDto::All => {}
            _ => panic!("Expected PageTargetDto::All"),
        }
    }

    #[test]
    fn test_page_target_specific_preserved() {
        let shield = CleanupShieldDto {
            id: "test-id".to_string(),
            shield_type: "Watermark".to_string(),
            normalized_bbox: NormalizedBBoxDto {
                x: 0.0,
                y: 0.0,
                width: 0.5,
                height: 0.5,
            },
            page_target: PageTargetDto::Specific(vec![1, 3, 5]),
            zone_target: ZoneTargetDto::default(),
            apply_mode: "Suggested".to_string(),
            risk_level: "Medium".to_string(),
            confidence: 0.75,
            why_detected: "Watermark pattern".to_string(),
            source: "VendorRule".to_string(),
        };

        let mask = MaskDto::from(shield.clone());
        let back = CleanupShieldDto::from(mask);

        match back.page_target {
            PageTargetDto::Specific(pages) => {
                assert_eq!(pages, vec![1, 3, 5]);
            }
            _ => panic!("Expected PageTargetDto::Specific"),
        }
    }

    #[test]
    fn test_zone_target_preserved() {
        let shield = CleanupShieldDto {
            id: "test-id".to_string(),
            shield_type: "RepetitiveHeader".to_string(),
            normalized_bbox: NormalizedBBoxDto {
                x: 0.0,
                y: 0.0,
                width: 1.0,
                height: 0.1,
            },
            page_target: PageTargetDto::All,
            zone_target: ZoneTargetDto {
                include_zones: Some(vec!["Header".to_string()]),
                exclude_zones: vec!["Totals".to_string()],
            },
            apply_mode: "Applied".to_string(),
            risk_level: "Low".to_string(),
            confidence: 0.95,
            why_detected: "Repetitive header".to_string(),
            source: "TemplateRule".to_string(),
        };

        let mask = MaskDto::from(shield.clone());
        let back = CleanupShieldDto::from(mask);

        assert_eq!(
            back.zone_target.include_zones,
            Some(vec!["Header".to_string()])
        );
        assert_eq!(back.zone_target.exclude_zones, vec!["Totals".to_string()]);
    }

    #[test]
    fn test_all_shield_types_map_correctly() {
        let types = vec![
            "Logo",
            "Watermark",
            "RepetitiveHeader",
            "RepetitiveFooter",
            "Stamp",
            "UserDefined",
            "VendorSpecific",
            "TemplateSpecific",
        ];

        for shield_type in types {
            let shield = CleanupShieldDto {
                id: "test".to_string(),
                shield_type: shield_type.to_string(),
                normalized_bbox: NormalizedBBoxDto {
                    x: 0.0,
                    y: 0.0,
                    width: 0.1,
                    height: 0.1,
                },
                page_target: PageTargetDto::All,
                zone_target: ZoneTargetDto::default(),
                apply_mode: "Applied".to_string(),
                risk_level: "Low".to_string(),
                confidence: 0.9,
                why_detected: "Test".to_string(),
                source: "AutoDetected".to_string(),
            };

            let mask = MaskDto::from(shield.clone());
            assert_eq!(mask.mask_type, shield_type);

            let back = CleanupShieldDto::from(mask);
            assert_eq!(back.shield_type, shield_type);
        }
    }

    #[test]
    fn test_all_apply_modes_map_correctly() {
        let modes = vec!["Applied", "Suggested", "Disabled"];

        for mode in modes {
            let shield = CleanupShieldDto {
                id: "test".to_string(),
                shield_type: "Logo".to_string(),
                normalized_bbox: NormalizedBBoxDto {
                    x: 0.0,
                    y: 0.0,
                    width: 0.1,
                    height: 0.1,
                },
                page_target: PageTargetDto::All,
                zone_target: ZoneTargetDto::default(),
                apply_mode: mode.to_string(),
                risk_level: "Low".to_string(),
                confidence: 0.9,
                why_detected: "Test".to_string(),
                source: "AutoDetected".to_string(),
            };

            let mask = MaskDto::from(shield.clone());
            assert_eq!(mask.apply_mode, mode);

            let back = CleanupShieldDto::from(mask);
            assert_eq!(back.apply_mode, mode);
        }
    }

    #[test]
    fn test_all_sources_map_correctly() {
        let sources = vec![
            "AutoDetected",
            "VendorRule",
            "TemplateRule",
            "SessionOverride",
        ];

        for source in sources {
            let shield = CleanupShieldDto {
                id: "test".to_string(),
                shield_type: "Logo".to_string(),
                normalized_bbox: NormalizedBBoxDto {
                    x: 0.0,
                    y: 0.0,
                    width: 0.1,
                    height: 0.1,
                },
                page_target: PageTargetDto::All,
                zone_target: ZoneTargetDto::default(),
                apply_mode: "Applied".to_string(),
                risk_level: "Low".to_string(),
                confidence: 0.9,
                why_detected: "Test".to_string(),
                source: source.to_string(),
            };

            let mask = MaskDto::from(shield.clone());
            assert_eq!(mask.source, source);

            let back = CleanupShieldDto::from(mask);
            assert_eq!(back.source, source);
        }
    }
}
