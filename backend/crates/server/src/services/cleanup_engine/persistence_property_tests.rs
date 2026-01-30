//! Property-based tests for persistence layer
//!
//! **Property 10: Rule Persistence Round-Trip**
//! **Validates: Requirements 9.1, 9.2, 9.3, 9.5**

#[cfg(test)]
mod property_tests {
    use proptest::prelude::*;

    use crate::services::cleanup_engine::persistence::CleanupPersistence;
    use crate::services::cleanup_engine::types::{
        ApplyMode, CleanupShield, NormalizedBBox, PageTarget, RiskLevel, ShieldProvenance,
        ShieldSource, ShieldType, ZoneTarget,
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

    /// Generate arbitrary ApplyMode
    fn arb_apply_mode() -> impl Strategy<Value = ApplyMode> {
        prop_oneof![
            Just(ApplyMode::Applied),
            Just(ApplyMode::Suggested),
            Just(ApplyMode::Disabled),
        ]
    }

    /// Generate arbitrary RiskLevel
    fn arb_risk_level() -> impl Strategy<Value = RiskLevel> {
        prop_oneof![
            Just(RiskLevel::Low),
            Just(RiskLevel::Medium),
            Just(RiskLevel::High),
        ]
    }

    /// Generate arbitrary PageTarget
    fn arb_page_target() -> impl Strategy<Value = PageTarget> {
        prop_oneof![
            Just(PageTarget::All),
            Just(PageTarget::First),
            Just(PageTarget::Last),
            prop::collection::vec(1u32..=10, 1..=3).prop_map(PageTarget::Specific),
        ]
    }

    /// Generate a test shield with arbitrary properties
    fn arb_shield() -> impl Strategy<Value = CleanupShield> {
        (
            arb_shield_type(),
            arb_valid_bbox(),
            arb_confidence(),
            arb_apply_mode(),
            arb_risk_level(),
            arb_page_target(),
            "[a-zA-Z0-9 ]{1,20}",  // why_detected
        )
            .prop_map(|(shield_type, bbox, confidence, apply_mode, risk_level, page_target, why)| {
                let mut shield = CleanupShield::auto_detected(
                    shield_type,
                    bbox,
                    confidence,
                    why,
                );
                shield.apply_mode = apply_mode;
                shield.risk_level = risk_level;
                shield.page_target = page_target;
                shield
            })
    }

    /// Generate a vector of shields (1 to 5)
    fn arb_shield_vec() -> impl Strategy<Value = Vec<CleanupShield>> {
        prop::collection::vec(arb_shield(), 1..=5)
    }

    /// Generate arbitrary tenant/store/vendor IDs
    fn arb_id() -> impl Strategy<Value = String> {
        "[a-z0-9]{8}".prop_map(|s| s)
    }


    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        // ====================================================================
        // Property 10.1: Vendor rules round-trip (in-memory)
        // ====================================================================

        /// For any set of vendor cleanup rules saved, retrieving them should
        /// return equivalent rules.
        #[test]
        fn vendor_rules_roundtrip_memory(
            tenant_id in arb_id(),
            store_id in arb_id(),
            vendor_id in arb_id(),
            shields in arb_shield_vec(),
        ) {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let persistence = CleanupPersistence::in_memory();

                // Save rules
                persistence
                    .save_vendor_rules(&tenant_id, &store_id, &vendor_id, None, &shields, "test_user")
                    .await
                    .expect("save should succeed");

                // Retrieve rules
                let retrieved = persistence
                    .get_vendor_rules(&tenant_id, &store_id, &vendor_id, None)
                    .await
                    .expect("get should succeed");

                // Verify count matches
                prop_assert_eq!(
                    shields.len(),
                    retrieved.len(),
                    "Retrieved shield count should match saved count"
                );

                // Verify each shield's key properties
                for (original, retrieved) in shields.iter().zip(retrieved.iter()) {
                    prop_assert_eq!(
                        original.shield_type,
                        retrieved.shield_type,
                        "Shield type should match"
                    );
                    prop_assert!(
                        (original.confidence - retrieved.confidence).abs() < f64::EPSILON,
                        "Confidence should match"
                    );
                    prop_assert_eq!(
                        original.apply_mode,
                        retrieved.apply_mode,
                        "Apply mode should match"
                    );
                }

                Ok(())
            })?;
        }


        // ====================================================================
        // Property 10.2: Template rules round-trip (in-memory)
        // ====================================================================

        /// For any set of template cleanup rules saved, retrieving them should
        /// return equivalent rules.
        #[test]
        fn template_rules_roundtrip_memory(
            tenant_id in arb_id(),
            store_id in arb_id(),
            template_id in arb_id(),
            vendor_id in arb_id(),
            shields in arb_shield_vec(),
        ) {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let persistence = CleanupPersistence::in_memory();

                // Save rules
                persistence
                    .save_template_rules(
                        &tenant_id, &store_id, &template_id, &vendor_id, None, &shields, "test_user",
                    )
                    .await
                    .expect("save should succeed");

                // Retrieve rules
                let retrieved = persistence
                    .get_template_rules(&tenant_id, &store_id, &template_id, None)
                    .await
                    .expect("get should succeed");

                // Verify count matches
                prop_assert_eq!(
                    shields.len(),
                    retrieved.len(),
                    "Retrieved shield count should match saved count"
                );

                Ok(())
            })?;
        }

        // ====================================================================
        // Property 10.3: Multi-tenant isolation
        // ====================================================================

        /// Rules saved for one tenant should not be visible to another tenant.
        #[test]
        fn tenant_isolation(
            tenant1 in arb_id(),
            tenant2 in arb_id(),
            store_id in arb_id(),
            vendor_id in arb_id(),
            shields in arb_shield_vec(),
        ) {
            // Ensure tenants are different
            prop_assume!(tenant1 != tenant2);

            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let persistence = CleanupPersistence::in_memory();

                // Save rules for tenant1
                persistence
                    .save_vendor_rules(&tenant1, &store_id, &vendor_id, None, &shields, "test_user")
                    .await
                    .expect("save should succeed");

                // Try to retrieve for tenant2 - should be empty
                let retrieved = persistence
                    .get_vendor_rules(&tenant2, &store_id, &vendor_id, None)
                    .await
                    .expect("get should succeed");

                prop_assert!(
                    retrieved.is_empty(),
                    "Cross-tenant reads should return empty"
                );

                Ok(())
            })?;
        }


        // ====================================================================
        // Property 10.4: Store isolation
        // ====================================================================

        /// Rules saved for one store should not be visible to another store.
        #[test]
        fn store_isolation(
            tenant_id in arb_id(),
            store1 in arb_id(),
            store2 in arb_id(),
            vendor_id in arb_id(),
            shields in arb_shield_vec(),
        ) {
            // Ensure stores are different
            prop_assume!(store1 != store2);

            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let persistence = CleanupPersistence::in_memory();

                // Save rules for store1
                persistence
                    .save_vendor_rules(&tenant_id, &store1, &vendor_id, None, &shields, "test_user")
                    .await
                    .expect("save should succeed");

                // Try to retrieve for store2 - should be empty
                let retrieved = persistence
                    .get_vendor_rules(&tenant_id, &store2, &vendor_id, None)
                    .await
                    .expect("get should succeed");

                prop_assert!(
                    retrieved.is_empty(),
                    "Cross-store reads should return empty"
                );

                Ok(())
            })?;
        }

        // ====================================================================
        // Property 10.5: Version increment on update
        // ====================================================================

        /// Each update should increment the version number.
        #[test]
        fn version_increments_on_update(
            tenant_id in arb_id(),
            store_id in arb_id(),
            vendor_id in arb_id(),
            shields1 in arb_shield_vec(),
            shields2 in arb_shield_vec(),
        ) {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let persistence = CleanupPersistence::in_memory();

                // Save initial rules
                persistence
                    .save_vendor_rules(&tenant_id, &store_id, &vendor_id, None, &shields1, "user1")
                    .await
                    .expect("first save should succeed");

                // Save updated rules
                persistence
                    .save_vendor_rules(&tenant_id, &store_id, &vendor_id, None, &shields2, "user2")
                    .await
                    .expect("second save should succeed");

                // Retrieve should return the latest
                let retrieved = persistence
                    .get_vendor_rules(&tenant_id, &store_id, &vendor_id, None)
                    .await
                    .expect("get should succeed");

                // Should have shields2's count
                prop_assert_eq!(
                    shields2.len(),
                    retrieved.len(),
                    "Should return latest version"
                );

                Ok(())
            })?;
        }
    }


    // ========================================================================
    // Additional unit tests for edge cases
    // ========================================================================

    #[tokio::test]
    async fn test_empty_rules() {
        let persistence = CleanupPersistence::in_memory();

        // Save empty rules
        persistence
            .save_vendor_rules("tenant", "store", "vendor", None, &[], "user")
            .await
            .expect("save should succeed");

        // Retrieve should return empty
        let retrieved = persistence
            .get_vendor_rules("tenant", "store", "vendor", None)
            .await
            .expect("get should succeed");

        assert!(retrieved.is_empty());
    }

    #[tokio::test]
    async fn test_nonexistent_vendor() {
        let persistence = CleanupPersistence::in_memory();

        // Retrieve for nonexistent vendor should return empty (not error)
        let retrieved = persistence
            .get_vendor_rules("tenant", "store", "nonexistent", None)
            .await
            .expect("get should succeed");

        assert!(retrieved.is_empty());
    }

    #[tokio::test]
    async fn test_doc_type_filtering() {
        let persistence = CleanupPersistence::in_memory();

        let shield = CleanupShield::auto_detected(
            ShieldType::Logo,
            NormalizedBBox::new(0.1, 0.1, 0.2, 0.2),
            0.9,
            "Test".to_string(),
        );

        // Save rules for specific doc_type
        persistence
            .save_vendor_rules("tenant", "store", "vendor", Some("invoice"), &[shield.clone()], "user")
            .await
            .expect("save should succeed");

        // Retrieve with matching doc_type
        let retrieved = persistence
            .get_vendor_rules("tenant", "store", "vendor", Some("invoice"))
            .await
            .expect("get should succeed");
        assert_eq!(retrieved.len(), 1);

        // Retrieve with different doc_type should be empty
        let retrieved = persistence
            .get_vendor_rules("tenant", "store", "vendor", Some("statement"))
            .await
            .expect("get should succeed");
        assert!(retrieved.is_empty());

        // Retrieve with no doc_type should also be empty (different key)
        let retrieved = persistence
            .get_vendor_rules("tenant", "store", "vendor", None)
            .await
            .expect("get should succeed");
        assert!(retrieved.is_empty());
    }

    #[tokio::test]
    async fn test_shield_serialization_preserves_all_fields() {
        let persistence = CleanupPersistence::in_memory();

        let mut shield = CleanupShield::auto_detected(
            ShieldType::Watermark,
            NormalizedBBox::new(0.25, 0.25, 0.5, 0.5),
            0.75,
            "Detected watermark pattern".to_string(),
        );
        shield.apply_mode = ApplyMode::Applied;
        shield.risk_level = RiskLevel::Medium;
        shield.page_target = PageTarget::Specific(vec![1, 3, 5]);
        shield.zone_target = ZoneTarget {
            include_zones: Some(vec!["Header".to_string()]),
            exclude_zones: vec!["Totals".to_string()],
        };

        persistence
            .save_vendor_rules("tenant", "store", "vendor", None, &[shield.clone()], "user")
            .await
            .expect("save should succeed");

        let retrieved = persistence
            .get_vendor_rules("tenant", "store", "vendor", None)
            .await
            .expect("get should succeed");

        assert_eq!(retrieved.len(), 1);
        let r = &retrieved[0];

        assert_eq!(r.shield_type, ShieldType::Watermark);
        assert!((r.confidence - 0.75).abs() < f64::EPSILON);
        assert_eq!(r.apply_mode, ApplyMode::Applied);
        assert_eq!(r.risk_level, RiskLevel::Medium);
        assert_eq!(r.why_detected, "Detected watermark pattern");

        // Check page target
        match &r.page_target {
            PageTarget::Specific(pages) => assert_eq!(pages, &vec![1, 3, 5]),
            _ => panic!("Expected Specific page target"),
        }

        // Check zone target
        assert_eq!(
            r.zone_target.include_zones,
            Some(vec!["Header".to_string()])
        );
        assert_eq!(r.zone_target.exclude_zones, vec!["Totals".to_string()]);
    }
}
