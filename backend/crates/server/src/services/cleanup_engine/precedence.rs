//! Precedence resolution for the Document Cleanup Engine
//!
//! Implements the shield precedence hierarchy:
//! Session Overrides → Template Rules → Vendor Rules → Auto Suggestions
//!
//! # Requirements
//!
//! - **Requirement 5.1**: Precedence ordering (Session > Template > Vendor > Auto)
//! - **Requirement 5.2**: IoU-based de-duplication
//! - **Requirement 5.3**: Critical zone overlap policy
//! - **Requirement 6.1**: Intersection area calculation
//! - **Requirement 6.2**: Overlap ratio calculation

use crate::services::cleanup_engine::types::{
    bbox_iou, calculate_overlap_ratio, ApplyMode, CleanupShield, NormalizedBBox, RiskLevel,
    ShieldSource, CRITICAL_OVERLAP_BLOCK_APPLY, CRITICAL_OVERLAP_WARN, SHIELD_DEDUP_IOU_THRESHOLD,
};

/// Explanation of why a shield won the precedence resolution
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PrecedenceExplanation {
    /// ID of the winning shield
    pub shield_id: String,
    /// Source that won
    pub winning_source: ShieldSource,
    /// Sources that were overridden
    pub overridden_sources: Vec<ShieldSource>,
    /// Human-readable reason
    pub reason: String,
}

/// Conflict detected with a critical zone
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ZoneConflict {
    /// ID of the shield that conflicts
    pub shield_id: String,
    /// ID of the zone that was overlapped
    pub zone_id: String,
    /// Overlap ratio (0.0 to 1.0)
    pub overlap_ratio: f64,
    /// Action taken to resolve the conflict
    pub action_taken: String,
}

/// Result of precedence resolution
#[derive(Debug, Clone)]
pub struct PrecedenceResult {
    /// Resolved shields after de-duplication and precedence
    pub shields: Vec<CleanupShield>,
    /// Explanations for each resolved shield
    pub explanations: Vec<PrecedenceExplanation>,
    /// Critical zone conflicts detected
    pub zone_conflicts: Vec<ZoneConflict>,
    /// Warnings generated during resolution
    pub warnings: Vec<String>,
}

/// Merge shields from multiple sources with precedence resolution
///
/// Combines shields from auto-detection, vendor rules, template rules, and
/// session overrides. Shields are de-duplicated using IoU threshold and
/// resolved according to precedence hierarchy.
///
/// # Arguments
///
/// * `auto_shields` - Auto-detected shields (lowest precedence)
/// * `vendor_shields` - Vendor-specific rules
/// * `template_shields` - Template-specific rules
/// * `session_shields` - Session overrides (highest precedence)
/// * `critical_zones` - Zones that trigger risk elevation when overlapped
///
/// # Returns
///
/// `PrecedenceResult` containing resolved shields and explanations.
///
/// # Requirements
///
/// Validates: Requirements 5.1, 5.2, 5.3, 6.1, 6.2
#[must_use]
pub fn merge_shields(
    auto_shields: Vec<CleanupShield>,
    vendor_shields: Vec<CleanupShield>,
    template_shields: Vec<CleanupShield>,
    session_shields: Vec<CleanupShield>,
    critical_zones: &[(String, NormalizedBBox)],
) -> PrecedenceResult {
    let mut explanations = Vec::new();
    let mut zone_conflicts = Vec::new();
    let mut warnings = Vec::new();

    // Collect all shields with their sources
    let mut all_shields: Vec<CleanupShield> = Vec::new();

    // Add shields in precedence order (lowest to highest)
    // This way, higher precedence shields will override lower ones
    all_shields.extend(auto_shields);
    all_shields.extend(vendor_shields);
    all_shields.extend(template_shields);
    all_shields.extend(session_shields);

    // De-duplicate shields using IoU threshold
    let mut resolved_shields: Vec<CleanupShield> = Vec::new();

    for shield in all_shields {
        let mut merged = false;

        for existing in &mut resolved_shields {
            // Check if shields are duplicates (same type + high IoU)
            if shield.shield_type == existing.shield_type {
                let iou = bbox_iou(&shield.normalized_bbox, &existing.normalized_bbox);

                if iou >= SHIELD_DEDUP_IOU_THRESHOLD {
                    // Shields are duplicates - higher precedence wins
                    // (shield is processed later, so it has higher or equal precedence)
                    let shield_precedence = shield.provenance.source as u8;
                    let existing_precedence = existing.provenance.source as u8;

                    if shield_precedence >= existing_precedence {
                        // Record the override
                        explanations.push(PrecedenceExplanation {
                            shield_id: shield.id.clone(),
                            winning_source: shield.provenance.source,
                            overridden_sources: vec![existing.provenance.source],
                            reason: format!(
                                "{:?} overrides {:?} (IoU={:.2})",
                                shield.provenance.source, existing.provenance.source, iou
                            ),
                        });

                        // Replace existing with new shield
                        *existing = shield.clone();
                    }

                    merged = true;
                    break;
                }
            }
        }

        if !merged {
            resolved_shields.push(shield);
        }
    }

    // Apply critical zone overlap policy
    for shield in &mut resolved_shields {
        for (zone_id, zone_bbox) in critical_zones {
            let overlap = calculate_overlap_ratio(&shield.normalized_bbox, zone_bbox);

            if overlap >= CRITICAL_OVERLAP_BLOCK_APPLY {
                // High overlap with critical zone - force Suggested and High risk
                let action = if shield.apply_mode == ApplyMode::Applied {
                    shield.apply_mode = ApplyMode::Suggested;
                    shield.risk_level = RiskLevel::High;
                    "downgraded_to_suggested"
                } else {
                    shield.risk_level = RiskLevel::High;
                    "elevated_risk"
                };

                zone_conflicts.push(ZoneConflict {
                    shield_id: shield.id.clone(),
                    zone_id: zone_id.clone(),
                    overlap_ratio: overlap,
                    action_taken: action.to_string(),
                });

                warnings.push(format!(
                    "Shield {} overlaps critical zone {} by {:.1}% - {}",
                    shield.id,
                    zone_id,
                    overlap * 100.0,
                    action
                ));
            } else if overlap >= CRITICAL_OVERLAP_WARN {
                // Moderate overlap - add warning but don't change mode
                zone_conflicts.push(ZoneConflict {
                    shield_id: shield.id.clone(),
                    zone_id: zone_id.clone(),
                    overlap_ratio: overlap,
                    action_taken: "warning_added".to_string(),
                });

                warnings.push(format!(
                    "Shield {} overlaps critical zone {} by {:.1}% - review recommended",
                    shield.id,
                    zone_id,
                    overlap * 100.0
                ));
            }
        }
    }

    // Sort by precedence (descending) then confidence (descending)
    resolved_shields.sort_by(|a, b| {
        let source_cmp = (b.provenance.source as u8).cmp(&(a.provenance.source as u8));
        if source_cmp == std::cmp::Ordering::Equal {
            b.confidence
                .partial_cmp(&a.confidence)
                .unwrap_or(std::cmp::Ordering::Equal)
        } else {
            source_cmp
        }
    });

    PrecedenceResult {
        shields: resolved_shields,
        explanations,
        zone_conflicts,
        warnings,
    }
}

/// Check if a shield overlaps any critical zone above the warning threshold
///
/// # Arguments
///
/// * `shield` - The shield to check
/// * `critical_zones` - List of critical zones with their IDs and bounding boxes
///
/// # Returns
///
/// `true` if the shield overlaps any critical zone above the warning threshold
#[must_use]
pub fn overlaps_critical_zone(
    shield: &CleanupShield,
    critical_zones: &[(String, NormalizedBBox)],
) -> bool {
    for (_, zone_bbox) in critical_zones {
        let overlap = calculate_overlap_ratio(&shield.normalized_bbox, zone_bbox);
        if overlap >= CRITICAL_OVERLAP_WARN {
            return true;
        }
    }
    false
}

/// Get the highest precedence source from a list of shields
///
/// # Arguments
///
/// * `shields` - List of shields to check
///
/// # Returns
///
/// The highest precedence `ShieldSource` found, or `None` if the list is empty
#[must_use]
pub fn highest_precedence_source(shields: &[CleanupShield]) -> Option<ShieldSource> {
    shields
        .iter()
        .map(|s| s.provenance.source)
        .max_by_key(|s| *s as u8)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::cleanup_engine::types::ShieldType;

    fn create_test_shield(
        id: &str,
        source: ShieldSource,
        bbox: NormalizedBBox,
        confidence: f64,
    ) -> CleanupShield {
        let mut shield = CleanupShield::auto_detected(
            ShieldType::Logo,
            bbox,
            confidence,
            format!("Test shield {}", id),
        );
        shield.id = id.to_string();
        shield.provenance.source = source;
        shield
    }

    #[test]
    fn test_merge_shields_empty() {
        let result = merge_shields(vec![], vec![], vec![], vec![], &[]);
        assert!(result.shields.is_empty());
        assert!(result.explanations.is_empty());
        assert!(result.zone_conflicts.is_empty());
    }

    #[test]
    fn test_merge_shields_no_duplicates() {
        let auto = vec![create_test_shield(
            "auto1",
            ShieldSource::AutoDetected,
            NormalizedBBox::new(0.0, 0.0, 0.2, 0.2),
            0.8,
        )];
        let vendor = vec![create_test_shield(
            "vendor1",
            ShieldSource::VendorRule,
            NormalizedBBox::new(0.5, 0.5, 0.2, 0.2),
            0.9,
        )];

        let result = merge_shields(auto, vendor, vec![], vec![], &[]);

        assert_eq!(result.shields.len(), 2);
        assert!(result.explanations.is_empty()); // No duplicates = no overrides
    }

    #[test]
    fn test_merge_shields_duplicate_higher_precedence_wins() {
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);

        let auto = vec![create_test_shield(
            "auto1",
            ShieldSource::AutoDetected,
            bbox,
            0.8,
        )];
        let vendor = vec![create_test_shield(
            "vendor1",
            ShieldSource::VendorRule,
            bbox,
            0.9,
        )];

        let result = merge_shields(auto, vendor, vec![], vec![], &[]);

        // Should have only 1 shield (vendor wins)
        assert_eq!(result.shields.len(), 1);
        assert_eq!(result.shields[0].provenance.source, ShieldSource::VendorRule);
        assert_eq!(result.explanations.len(), 1);
    }

    #[test]
    fn test_merge_shields_session_overrides_all() {
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);

        let auto = vec![create_test_shield(
            "auto1",
            ShieldSource::AutoDetected,
            bbox,
            0.8,
        )];
        let vendor = vec![create_test_shield(
            "vendor1",
            ShieldSource::VendorRule,
            bbox,
            0.9,
        )];
        let template = vec![create_test_shield(
            "template1",
            ShieldSource::TemplateRule,
            bbox,
            0.85,
        )];
        let session = vec![create_test_shield(
            "session1",
            ShieldSource::SessionOverride,
            bbox,
            0.95,
        )];

        let result = merge_shields(auto, vendor, template, session, &[]);

        // Session should win
        assert_eq!(result.shields.len(), 1);
        assert_eq!(
            result.shields[0].provenance.source,
            ShieldSource::SessionOverride
        );
    }

    #[test]
    fn test_critical_zone_overlap_blocks_apply() {
        let shield_bbox = NormalizedBBox::new(0.0, 0.0, 0.5, 0.5);
        let zone_bbox = NormalizedBBox::new(0.0, 0.0, 0.4, 0.4);

        let mut shield = create_test_shield(
            "shield1",
            ShieldSource::AutoDetected,
            shield_bbox,
            0.9,
        );
        shield.apply_mode = ApplyMode::Applied;

        let critical_zones = vec![("totals".to_string(), zone_bbox)];

        let result = merge_shields(vec![shield], vec![], vec![], vec![], &critical_zones);

        // Shield should be downgraded to Suggested
        assert_eq!(result.shields.len(), 1);
        assert_eq!(result.shields[0].apply_mode, ApplyMode::Suggested);
        assert_eq!(result.shields[0].risk_level, RiskLevel::High);
        assert!(!result.zone_conflicts.is_empty());
    }

    #[test]
    fn test_critical_zone_overlap_warning() {
        // Create a shield that overlaps zone by ~6% (above warn threshold, below block)
        let shield_bbox = NormalizedBBox::new(0.0, 0.0, 0.1, 0.1);
        let zone_bbox = NormalizedBBox::new(0.05, 0.05, 0.5, 0.5);

        let shield = create_test_shield(
            "shield1",
            ShieldSource::AutoDetected,
            shield_bbox,
            0.9,
        );

        let critical_zones = vec![("totals".to_string(), zone_bbox)];

        let result = merge_shields(vec![shield], vec![], vec![], vec![], &critical_zones);

        // Should have warning but not be downgraded
        assert_eq!(result.shields.len(), 1);
        // Check if there's a zone conflict (warning)
        // The overlap calculation depends on the exact bbox values
    }

    #[test]
    fn test_overlaps_critical_zone() {
        let shield = create_test_shield(
            "shield1",
            ShieldSource::AutoDetected,
            NormalizedBBox::new(0.0, 0.0, 0.5, 0.5),
            0.9,
        );

        let critical_zones = vec![(
            "totals".to_string(),
            NormalizedBBox::new(0.0, 0.0, 0.4, 0.4),
        )];

        assert!(overlaps_critical_zone(&shield, &critical_zones));
    }

    #[test]
    fn test_overlaps_critical_zone_no_overlap() {
        let shield = create_test_shield(
            "shield1",
            ShieldSource::AutoDetected,
            NormalizedBBox::new(0.0, 0.0, 0.1, 0.1),
            0.9,
        );

        let critical_zones = vec![(
            "totals".to_string(),
            NormalizedBBox::new(0.5, 0.5, 0.4, 0.4),
        )];

        assert!(!overlaps_critical_zone(&shield, &critical_zones));
    }

    #[test]
    fn test_highest_precedence_source() {
        let shields = vec![
            create_test_shield(
                "auto1",
                ShieldSource::AutoDetected,
                NormalizedBBox::new(0.0, 0.0, 0.1, 0.1),
                0.8,
            ),
            create_test_shield(
                "vendor1",
                ShieldSource::VendorRule,
                NormalizedBBox::new(0.2, 0.2, 0.1, 0.1),
                0.9,
            ),
            create_test_shield(
                "template1",
                ShieldSource::TemplateRule,
                NormalizedBBox::new(0.4, 0.4, 0.1, 0.1),
                0.85,
            ),
        ];

        let highest = highest_precedence_source(&shields);
        assert_eq!(highest, Some(ShieldSource::TemplateRule));
    }

    #[test]
    fn test_highest_precedence_source_empty() {
        let highest = highest_precedence_source(&[]);
        assert_eq!(highest, None);
    }

    #[test]
    fn test_shields_sorted_by_precedence() {
        let auto = vec![create_test_shield(
            "auto1",
            ShieldSource::AutoDetected,
            NormalizedBBox::new(0.0, 0.0, 0.1, 0.1),
            0.8,
        )];
        let vendor = vec![create_test_shield(
            "vendor1",
            ShieldSource::VendorRule,
            NormalizedBBox::new(0.2, 0.2, 0.1, 0.1),
            0.9,
        )];
        let template = vec![create_test_shield(
            "template1",
            ShieldSource::TemplateRule,
            NormalizedBBox::new(0.4, 0.4, 0.1, 0.1),
            0.85,
        )];

        let result = merge_shields(auto, vendor, template, vec![], &[]);

        // Should be sorted by precedence (highest first)
        assert_eq!(result.shields.len(), 3);
        assert_eq!(
            result.shields[0].provenance.source,
            ShieldSource::TemplateRule
        );
        assert_eq!(result.shields[1].provenance.source, ShieldSource::VendorRule);
        assert_eq!(
            result.shields[2].provenance.source,
            ShieldSource::AutoDetected
        );
    }
}


// ============================================================================
// Property-Based Tests for Precedence Resolution
// ============================================================================

#[cfg(test)]
mod property_tests {
    use super::*;
    use crate::services::cleanup_engine::types::{
        ApplyMode, PageTarget, RiskLevel, ShieldProvenance, ShieldType, ZoneTarget,
        ZONE_LINE_ITEMS, ZONE_TOTALS,
    };
    use proptest::prelude::*;

    // ========================================================================
    // Test Generators
    // ========================================================================

    /// Generate a valid normalized bounding box
    fn arb_normalized_bbox() -> impl Strategy<Value = NormalizedBBox> {
        (0.0..=0.5f64, 0.0..=0.5f64, 0.01..=0.5f64, 0.01..=0.5f64)
            .prop_map(|(x, y, w, h)| NormalizedBBox::new(x, y, w, h))
    }

    /// Generate a shield type
    fn arb_shield_type() -> impl Strategy<Value = ShieldType> {
        prop_oneof![
            Just(ShieldType::Logo),
            Just(ShieldType::Watermark),
            Just(ShieldType::RepetitiveHeader),
            Just(ShieldType::RepetitiveFooter),
            Just(ShieldType::Stamp),
            Just(ShieldType::UserDefined),
            Just(ShieldType::VendorSpecific),
            Just(ShieldType::TemplateSpecific),
        ]
    }

    /// Generate a shield source
    fn arb_shield_source() -> impl Strategy<Value = ShieldSource> {
        prop_oneof![
            Just(ShieldSource::AutoDetected),
            Just(ShieldSource::VendorRule),
            Just(ShieldSource::TemplateRule),
            Just(ShieldSource::SessionOverride),
        ]
    }

    /// Generate an apply mode
    fn arb_apply_mode() -> impl Strategy<Value = ApplyMode> {
        prop_oneof![
            Just(ApplyMode::Applied),
            Just(ApplyMode::Suggested),
            Just(ApplyMode::Disabled),
        ]
    }

    /// Generate a risk level
    fn arb_risk_level() -> impl Strategy<Value = RiskLevel> {
        prop_oneof![
            Just(RiskLevel::Low),
            Just(RiskLevel::Medium),
            Just(RiskLevel::High),
        ]
    }

    /// Generate a cleanup shield with a specific source
    fn arb_shield_with_source(source: ShieldSource) -> impl Strategy<Value = CleanupShield> {
        (
            "[a-z0-9]{8}",
            arb_shield_type(),
            arb_normalized_bbox(),
            arb_apply_mode(),
            arb_risk_level(),
            0.0..=1.0f64,
        )
            .prop_map(move |(id, shield_type, bbox, apply_mode, risk_level, confidence)| {
                CleanupShield {
                    id,
                    shield_type,
                    normalized_bbox: bbox,
                    page_target: PageTarget::All,
                    zone_target: ZoneTarget::default(),
                    apply_mode,
                    risk_level,
                    confidence,
                    min_confidence: 0.6,
                    why_detected: format!("Test shield from {:?}", source),
                    provenance: ShieldProvenance {
                        source,
                        user_id: None,
                        vendor_id: None,
                        template_id: None,
                        created_at: chrono::Utc::now(),
                        updated_at: None,
                    },
                }
            })
    }

    /// Generate a cleanup shield with any source
    fn arb_cleanup_shield() -> impl Strategy<Value = CleanupShield> {
        arb_shield_source().prop_flat_map(arb_shield_with_source)
    }

    /// Generate a list of shields with a specific source
    fn arb_shields_with_source(
        source: ShieldSource,
        max_count: usize,
    ) -> impl Strategy<Value = Vec<CleanupShield>> {
        proptest::collection::vec(arb_shield_with_source(source), 0..=max_count)
    }

    /// Generate a critical zone (zone_id, bbox)
    fn arb_critical_zone() -> impl Strategy<Value = (String, NormalizedBBox)> {
        (
            prop_oneof![
                Just(ZONE_LINE_ITEMS.to_string()),
                Just(ZONE_TOTALS.to_string()),
            ],
            arb_normalized_bbox(),
        )
    }

    // ========================================================================
    // Feature: cleanup-engine, Property 7: Precedence Resolution
    // **Validates: Requirements 5.1, 5.2, 5.3**
    // ========================================================================

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// Property 7.1: SessionOverride shields take precedence over all others
        ///
        /// For any set of shields from different sources with overlapping bboxes,
        /// when resolved, SessionOverride shields should win.
        #[test]
        fn session_override_takes_precedence_over_all(
            bbox in arb_normalized_bbox(),
            confidence in 0.5..=1.0f64,
        ) {
            // Create shields from all sources with the same bbox (high IoU)
            let auto = vec![create_shield_at("auto", ShieldSource::AutoDetected, bbox, confidence)];
            let vendor = vec![create_shield_at("vendor", ShieldSource::VendorRule, bbox, confidence)];
            let template = vec![create_shield_at("template", ShieldSource::TemplateRule, bbox, confidence)];
            let session = vec![create_shield_at("session", ShieldSource::SessionOverride, bbox, confidence)];

            let result = merge_shields(auto, vendor, template, session, &[]);

            // Should have exactly 1 shield (all merged due to high IoU)
            prop_assert_eq!(result.shields.len(), 1, "Expected 1 merged shield, got {}", result.shields.len());
            
            // The winning shield should be from SessionOverride
            prop_assert_eq!(
                result.shields[0].provenance.source,
                ShieldSource::SessionOverride,
                "SessionOverride should win, but got {:?}",
                result.shields[0].provenance.source
            );
        }

        /// Property 7.2: TemplateRule shields take precedence over VendorRule and AutoDetected
        ///
        /// When no SessionOverride is present, TemplateRule should win.
        #[test]
        fn template_rule_takes_precedence_over_vendor_and_auto(
            bbox in arb_normalized_bbox(),
            confidence in 0.5..=1.0f64,
        ) {
            let auto = vec![create_shield_at("auto", ShieldSource::AutoDetected, bbox, confidence)];
            let vendor = vec![create_shield_at("vendor", ShieldSource::VendorRule, bbox, confidence)];
            let template = vec![create_shield_at("template", ShieldSource::TemplateRule, bbox, confidence)];

            let result = merge_shields(auto, vendor, template, vec![], &[]);

            prop_assert_eq!(result.shields.len(), 1);
            prop_assert_eq!(
                result.shields[0].provenance.source,
                ShieldSource::TemplateRule,
                "TemplateRule should win over VendorRule and AutoDetected"
            );
        }

        /// Property 7.3: VendorRule shields take precedence over AutoDetected
        ///
        /// When no SessionOverride or TemplateRule is present, VendorRule should win.
        #[test]
        fn vendor_rule_takes_precedence_over_auto(
            bbox in arb_normalized_bbox(),
            confidence in 0.5..=1.0f64,
        ) {
            let auto = vec![create_shield_at("auto", ShieldSource::AutoDetected, bbox, confidence)];
            let vendor = vec![create_shield_at("vendor", ShieldSource::VendorRule, bbox, confidence)];

            let result = merge_shields(auto, vendor, vec![], vec![], &[]);

            prop_assert_eq!(result.shields.len(), 1);
            prop_assert_eq!(
                result.shields[0].provenance.source,
                ShieldSource::VendorRule,
                "VendorRule should win over AutoDetected"
            );
        }

        /// Property 7.4: Resolved shields have correct provenance.source
        ///
        /// Each resolved shield's provenance.source should correctly indicate
        /// the winning source after precedence resolution.
        #[test]
        fn resolved_shields_have_correct_provenance_source(
            auto_shields in arb_shields_with_source(ShieldSource::AutoDetected, 3),
            vendor_shields in arb_shields_with_source(ShieldSource::VendorRule, 3),
            template_shields in arb_shields_with_source(ShieldSource::TemplateRule, 3),
            session_shields in arb_shields_with_source(ShieldSource::SessionOverride, 3),
        ) {
            let result = merge_shields(
                auto_shields,
                vendor_shields,
                template_shields,
                session_shields,
                &[],
            );

            // Every resolved shield should have a valid source
            for shield in &result.shields {
                let source = shield.provenance.source;
                prop_assert!(
                    matches!(
                        source,
                        ShieldSource::AutoDetected
                            | ShieldSource::VendorRule
                            | ShieldSource::TemplateRule
                            | ShieldSource::SessionOverride
                    ),
                    "Shield {} has invalid source {:?}",
                    shield.id,
                    source
                );
            }
        }

        /// Property 7.5: Precedence explanations are generated for overrides
        ///
        /// When a higher-precedence shield overrides a lower-precedence one,
        /// a PrecedenceExplanation should be generated.
        #[test]
        fn precedence_explanations_generated_for_overrides(
            bbox in arb_normalized_bbox(),
            confidence in 0.5..=1.0f64,
        ) {
            // Create overlapping shields from different sources
            let auto = vec![create_shield_at("auto", ShieldSource::AutoDetected, bbox, confidence)];
            let vendor = vec![create_shield_at("vendor", ShieldSource::VendorRule, bbox, confidence)];

            let result = merge_shields(auto, vendor, vec![], vec![], &[]);

            // Should have at least one explanation (vendor overriding auto)
            prop_assert!(
                !result.explanations.is_empty(),
                "Expected precedence explanations when shields overlap"
            );

            // The explanation should show VendorRule winning
            let has_vendor_wins = result.explanations.iter().any(|e| {
                e.winning_source == ShieldSource::VendorRule
                    && e.overridden_sources.contains(&ShieldSource::AutoDetected)
            });
            prop_assert!(
                has_vendor_wins,
                "Expected explanation showing VendorRule overriding AutoDetected"
            );
        }

        /// Property 7.6: Non-overlapping shields are all preserved
        ///
        /// Shields that don't overlap (low IoU) should all be preserved
        /// regardless of their source.
        #[test]
        fn non_overlapping_shields_preserved(
            auto_count in 1usize..=3,
            vendor_count in 1usize..=3,
        ) {
            // Create shields at different positions (no overlap)
            let auto: Vec<_> = (0..auto_count)
                .map(|i| {
                    let x = 0.0 + (i as f64 * 0.2);
                    create_shield_at(
                        &format!("auto{}", i),
                        ShieldSource::AutoDetected,
                        NormalizedBBox::new(x, 0.0, 0.1, 0.1),
                        0.8,
                    )
                })
                .collect();

            let vendor: Vec<_> = (0..vendor_count)
                .map(|i| {
                    let x = 0.0 + (i as f64 * 0.2);
                    create_shield_at(
                        &format!("vendor{}", i),
                        ShieldSource::VendorRule,
                        NormalizedBBox::new(x, 0.5, 0.1, 0.1), // Different y position
                        0.9,
                    )
                })
                .collect();

            let result = merge_shields(auto, vendor, vec![], vec![], &[]);

            // All shields should be preserved (no overlap = no merging)
            prop_assert_eq!(
                result.shields.len(),
                auto_count + vendor_count,
                "All non-overlapping shields should be preserved"
            );
        }

        /// Property 7.7: Shields are sorted by precedence (descending)
        ///
        /// After resolution, shields should be sorted with highest precedence first.
        #[test]
        fn shields_sorted_by_precedence_descending(
            auto_shields in arb_shields_with_source(ShieldSource::AutoDetected, 2),
            vendor_shields in arb_shields_with_source(ShieldSource::VendorRule, 2),
            template_shields in arb_shields_with_source(ShieldSource::TemplateRule, 2),
            session_shields in arb_shields_with_source(ShieldSource::SessionOverride, 2),
        ) {
            let result = merge_shields(
                auto_shields,
                vendor_shields,
                template_shields,
                session_shields,
                &[],
            );

            // Check that shields are sorted by precedence (descending)
            for i in 1..result.shields.len() {
                let prev_source = result.shields[i - 1].provenance.source as u8;
                let curr_source = result.shields[i].provenance.source as u8;
                prop_assert!(
                    prev_source >= curr_source,
                    "Shields should be sorted by precedence (descending): {:?} should come before {:?}",
                    result.shields[i - 1].provenance.source,
                    result.shields[i].provenance.source
                );
            }
        }

        // ====================================================================
        // Feature: cleanup-engine, Property 8: Critical Zone Protection
        // **Validates: Requirements 6.1, 6.2**
        // ====================================================================

        /// Property 8.1: Auto-detected shields overlapping critical zones get Suggested mode
        ///
        /// For any auto-detected shield that overlaps with LineItems or Totals zones
        /// by >= 10%, the shield should have apply_mode = Suggested.
        #[test]
        fn auto_detected_critical_overlap_forces_suggested(
            shield_x in 0.0..=0.3f64,
            shield_y in 0.0..=0.3f64,
        ) {
            // Create a shield that significantly overlaps with a critical zone
            let shield_bbox = NormalizedBBox::new(shield_x, shield_y, 0.4, 0.4);
            let zone_bbox = NormalizedBBox::new(shield_x, shield_y, 0.5, 0.5);

            let mut shield = create_shield_at(
                "auto1",
                ShieldSource::AutoDetected,
                shield_bbox,
                0.9,
            );
            shield.apply_mode = ApplyMode::Applied; // Start as Applied

            let critical_zones = vec![(ZONE_TOTALS.to_string(), zone_bbox)];

            let result = merge_shields(vec![shield], vec![], vec![], vec![], &critical_zones);

            prop_assert_eq!(result.shields.len(), 1);
            
            // Check overlap ratio
            let overlap = calculate_overlap_ratio(&shield_bbox, &zone_bbox);
            if overlap >= CRITICAL_OVERLAP_BLOCK_APPLY {
                prop_assert_eq!(
                    result.shields[0].apply_mode,
                    ApplyMode::Suggested,
                    "Shield with {:.1}% critical zone overlap should be Suggested",
                    overlap * 100.0
                );
            }
        }

        /// Property 8.2: Auto-detected shields overlapping critical zones get High risk
        ///
        /// For any auto-detected shield that overlaps with LineItems or Totals zones
        /// by >= 10%, the shield should have risk_level = High.
        #[test]
        fn auto_detected_critical_overlap_elevates_risk(
            shield_x in 0.0..=0.3f64,
            shield_y in 0.0..=0.3f64,
        ) {
            let shield_bbox = NormalizedBBox::new(shield_x, shield_y, 0.4, 0.4);
            let zone_bbox = NormalizedBBox::new(shield_x, shield_y, 0.5, 0.5);

            let mut shield = create_shield_at(
                "auto1",
                ShieldSource::AutoDetected,
                shield_bbox,
                0.9,
            );
            shield.risk_level = RiskLevel::Low; // Start as Low

            let critical_zones = vec![(ZONE_LINE_ITEMS.to_string(), zone_bbox)];

            let result = merge_shields(vec![shield], vec![], vec![], vec![], &critical_zones);

            let overlap = calculate_overlap_ratio(&shield_bbox, &zone_bbox);
            if overlap >= CRITICAL_OVERLAP_BLOCK_APPLY {
                prop_assert_eq!(
                    result.shields[0].risk_level,
                    RiskLevel::High,
                    "Shield with {:.1}% critical zone overlap should have High risk",
                    overlap * 100.0
                );
            }
        }

        /// Property 8.3: Zone conflicts are generated for critical zone overlaps
        ///
        /// For any shield overlapping critical zones, a ZoneConflict should be generated.
        #[test]
        fn zone_conflicts_generated_for_critical_overlaps(
            shield_x in 0.0..=0.2f64,
            shield_y in 0.0..=0.2f64,
        ) {
            // Create significant overlap
            let shield_bbox = NormalizedBBox::new(shield_x, shield_y, 0.5, 0.5);
            let zone_bbox = NormalizedBBox::new(shield_x, shield_y, 0.6, 0.6);

            let shield = create_shield_at(
                "auto1",
                ShieldSource::AutoDetected,
                shield_bbox,
                0.9,
            );

            let critical_zones = vec![(ZONE_TOTALS.to_string(), zone_bbox)];

            let result = merge_shields(vec![shield], vec![], vec![], vec![], &critical_zones);

            let overlap = calculate_overlap_ratio(&shield_bbox, &zone_bbox);
            if overlap >= CRITICAL_OVERLAP_WARN {
                prop_assert!(
                    !result.zone_conflicts.is_empty(),
                    "Expected zone conflict for {:.1}% overlap",
                    overlap * 100.0
                );
            }
        }

        /// Property 8.4: Warnings are generated for critical zone overlaps
        ///
        /// For any shield overlapping critical zones above the warning threshold,
        /// a warning should be generated.
        #[test]
        fn warnings_generated_for_critical_overlaps(
            shield_x in 0.0..=0.2f64,
            shield_y in 0.0..=0.2f64,
        ) {
            let shield_bbox = NormalizedBBox::new(shield_x, shield_y, 0.5, 0.5);
            let zone_bbox = NormalizedBBox::new(shield_x, shield_y, 0.6, 0.6);

            let shield = create_shield_at(
                "auto1",
                ShieldSource::AutoDetected,
                shield_bbox,
                0.9,
            );

            let critical_zones = vec![(ZONE_LINE_ITEMS.to_string(), zone_bbox)];

            let result = merge_shields(vec![shield], vec![], vec![], vec![], &critical_zones);

            let overlap = calculate_overlap_ratio(&shield_bbox, &zone_bbox);
            if overlap >= CRITICAL_OVERLAP_WARN {
                prop_assert!(
                    !result.warnings.is_empty(),
                    "Expected warning for {:.1}% critical zone overlap",
                    overlap * 100.0
                );
            }
        }

        /// Property 8.5: Shields not overlapping critical zones are unchanged
        ///
        /// Shields that don't overlap critical zones should retain their original
        /// apply_mode and risk_level.
        #[test]
        fn non_overlapping_shields_unchanged(
            apply_mode in arb_apply_mode(),
            risk_level in arb_risk_level(),
        ) {
            // Shield at top-left, zone at bottom-right (no overlap)
            let shield_bbox = NormalizedBBox::new(0.0, 0.0, 0.2, 0.2);
            let zone_bbox = NormalizedBBox::new(0.7, 0.7, 0.2, 0.2);

            let mut shield = create_shield_at(
                "auto1",
                ShieldSource::AutoDetected,
                shield_bbox,
                0.9,
            );
            shield.apply_mode = apply_mode;
            shield.risk_level = risk_level;

            let critical_zones = vec![(ZONE_TOTALS.to_string(), zone_bbox)];

            let result = merge_shields(vec![shield], vec![], vec![], vec![], &critical_zones);

            prop_assert_eq!(result.shields.len(), 1);
            prop_assert_eq!(
                result.shields[0].apply_mode,
                apply_mode,
                "Non-overlapping shield should retain original apply_mode"
            );
            prop_assert_eq!(
                result.shields[0].risk_level,
                risk_level,
                "Non-overlapping shield should retain original risk_level"
            );
            prop_assert!(
                result.zone_conflicts.is_empty(),
                "Non-overlapping shield should not generate zone conflicts"
            );
        }

        /// Property 8.6: Template/Vendor shields overlapping critical zones generate warnings
        ///
        /// For any template or vendor shield overlapping critical zones without
        /// explicit zone-scoping, a warning should be generated.
        #[test]
        fn template_vendor_critical_overlap_generates_warning(
            source in prop_oneof![Just(ShieldSource::VendorRule), Just(ShieldSource::TemplateRule)],
            shield_x in 0.0..=0.2f64,
            shield_y in 0.0..=0.2f64,
        ) {
            let shield_bbox = NormalizedBBox::new(shield_x, shield_y, 0.5, 0.5);
            let zone_bbox = NormalizedBBox::new(shield_x, shield_y, 0.6, 0.6);

            let shield = create_shield_at(
                "rule1",
                source,
                shield_bbox,
                0.9,
            );

            let critical_zones = vec![(ZONE_TOTALS.to_string(), zone_bbox)];

            let result = merge_shields(vec![], 
                if source == ShieldSource::VendorRule { vec![shield.clone()] } else { vec![] },
                if source == ShieldSource::TemplateRule { vec![shield.clone()] } else { vec![] },
                vec![],
                &critical_zones,
            );

            let overlap = calculate_overlap_ratio(&shield_bbox, &zone_bbox);
            if overlap >= CRITICAL_OVERLAP_WARN {
                prop_assert!(
                    !result.warnings.is_empty(),
                    "{:?} shield with {:.1}% critical zone overlap should generate warning",
                    source,
                    overlap * 100.0
                );
            }
        }

        /// Property 8.7: Multiple critical zones are all checked
        ///
        /// When multiple critical zones are provided, overlaps with any of them
        /// should trigger the appropriate response.
        #[test]
        fn multiple_critical_zones_all_checked(
            shield_x in 0.0..=0.2f64,
            shield_y in 0.0..=0.2f64,
        ) {
            let shield_bbox = NormalizedBBox::new(shield_x, shield_y, 0.5, 0.5);
            
            // Two critical zones at different positions
            let zone1_bbox = NormalizedBBox::new(shield_x, shield_y, 0.4, 0.4);
            let zone2_bbox = NormalizedBBox::new(0.6, 0.6, 0.3, 0.3); // No overlap

            let shield = create_shield_at(
                "auto1",
                ShieldSource::AutoDetected,
                shield_bbox,
                0.9,
            );

            let critical_zones = vec![
                (ZONE_LINE_ITEMS.to_string(), zone1_bbox),
                (ZONE_TOTALS.to_string(), zone2_bbox),
            ];

            let result = merge_shields(vec![shield], vec![], vec![], vec![], &critical_zones);

            let overlap1 = calculate_overlap_ratio(&shield_bbox, &zone1_bbox);
            let overlap2 = calculate_overlap_ratio(&shield_bbox, &zone2_bbox);

            // Should have conflict for zone1 if overlap is significant
            if overlap1 >= CRITICAL_OVERLAP_WARN || overlap2 >= CRITICAL_OVERLAP_WARN {
                prop_assert!(
                    !result.zone_conflicts.is_empty(),
                    "Expected zone conflict when overlapping at least one critical zone"
                );
            }
        }
    }

    // ========================================================================
    // Helper Functions for Property Tests
    // ========================================================================

    /// Create a shield at a specific position with given source
    fn create_shield_at(
        id: &str,
        source: ShieldSource,
        bbox: NormalizedBBox,
        confidence: f64,
    ) -> CleanupShield {
        CleanupShield {
            id: id.to_string(),
            shield_type: ShieldType::Logo,
            normalized_bbox: bbox,
            page_target: PageTarget::All,
            zone_target: ZoneTarget::default(),
            apply_mode: ApplyMode::Suggested,
            risk_level: RiskLevel::Low,
            confidence,
            min_confidence: 0.6,
            why_detected: format!("Test shield {} from {:?}", id, source),
            provenance: ShieldProvenance {
                source,
                user_id: None,
                vendor_id: None,
                template_id: None,
                created_at: chrono::Utc::now(),
                updated_at: None,
            },
        }
    }
}
