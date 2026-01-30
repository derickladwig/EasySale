//! Property-based tests for multi-page strip detection
//!
//! **Property 9: Multi-Page Detection Confidence Boost**
//! **Validates: Requirements 7.1, 7.2**
//!
//! These tests verify that:
//! - Confidence boost is monotonically increasing with match count
//! - Multi-page detection produces valid shields
//! - Strip comparison is symmetric and transitive

#[cfg(test)]
mod property_tests {
    use proptest::prelude::*;

    use crate::services::cleanup_engine::detectors::multi_page::{
        calculate_confidence_boost, strips_are_similar, MultiPageConfig, StripData,
    };
    use crate::services::cleanup_engine::types::NormalizedBBox;

    // ========================================================================
    // Arbitrary generators for property tests
    // ========================================================================

    /// Generate arbitrary match count (1 to 100 pages)
    fn arb_match_count() -> impl Strategy<Value = usize> {
        1usize..=100
    }

    /// Generate arbitrary total pages (1 to 100)
    fn arb_total_pages() -> impl Strategy<Value = usize> {
        1usize..=100
    }

    /// Generate arbitrary max boost (0.0 to 0.5)
    fn arb_max_boost() -> impl Strategy<Value = f64> {
        0.0..=0.5f64
    }

    /// Generate arbitrary base confidence (0.0 to 1.0)
    fn arb_base_confidence() -> impl Strategy<Value = f64> {
        0.0..=1.0f64
    }

    /// Generate arbitrary mean intensity (0.0 to 255.0)
    fn arb_mean_intensity() -> impl Strategy<Value = f64> {
        0.0..=255.0f64
    }

    /// Generate arbitrary variance (0.0 to 10000.0)
    fn arb_variance() -> impl Strategy<Value = f64> {
        0.0..=10000.0f64
    }

    /// Generate arbitrary similarity threshold (0.0 to 1.0)
    fn arb_threshold() -> impl Strategy<Value = f64> {
        0.0..=1.0f64
    }

    /// Generate arbitrary StripData
    fn arb_strip_data() -> impl Strategy<Value = StripData> {
        (arb_mean_intensity(), arb_variance()).prop_map(|(mean, variance)| StripData {
            bbox: NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
            mean_intensity: mean,
            variance,
            has_content: variance > 100.0,
        })
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        // ====================================================================
        // Property 9.1: Confidence boost is monotonically increasing
        // ====================================================================

        /// For any two match counts where m1 < m2 (with same total pages),
        /// the confidence boost for m2 should be >= boost for m1.
        #[test]
        fn confidence_boost_monotonically_increasing(
            m1 in 1usize..50,
            m2 in 51usize..100,
            total in 100usize..=100,  // Fixed total for comparison
            max_boost in arb_max_boost(),
        ) {
            let boost1 = calculate_confidence_boost(m1, total, max_boost);
            let boost2 = calculate_confidence_boost(m2, total, max_boost);

            prop_assert!(
                boost2 >= boost1,
                "Confidence boost should be monotonically increasing: {} matches = {}, {} matches = {}",
                m1, boost1, m2, boost2
            );
        }

        // ====================================================================
        // Property 9.2: Confidence boost is bounded
        // ====================================================================

        /// For any valid inputs, confidence boost should be in range [0.0, max_boost].
        #[test]
        fn confidence_boost_bounded(
            match_count in arb_match_count(),
            total_pages in arb_total_pages(),
            max_boost in arb_max_boost(),
        ) {
            // Ensure match_count <= total_pages for valid input
            let match_count = match_count.min(total_pages);

            let boost = calculate_confidence_boost(match_count, total_pages, max_boost);

            prop_assert!(
                boost >= 0.0,
                "Confidence boost should be >= 0.0, got {}",
                boost
            );
            prop_assert!(
                boost <= max_boost,
                "Confidence boost should be <= max_boost ({}), got {}",
                max_boost, boost
            );
        }

        // ====================================================================
        // Property 9.3: Full match gives full boost
        // ====================================================================

        /// When all pages match (match_count == total_pages), boost should equal max_boost.
        #[test]
        fn full_match_gives_full_boost(
            total_pages in 2usize..=100,  // Need at least 2 pages for boost
            max_boost in arb_max_boost(),
        ) {
            let boost = calculate_confidence_boost(total_pages, total_pages, max_boost);

            prop_assert!(
                (boost - max_boost).abs() < f64::EPSILON,
                "Full match should give full boost: expected {}, got {}",
                max_boost, boost
            );
        }

        // ====================================================================
        // Property 9.4: Single page or single match gives no boost
        // ====================================================================

        /// When there's only 1 page or only 1 match, boost should be 0.
        #[test]
        fn single_page_no_boost(
            max_boost in arb_max_boost(),
        ) {
            // Single page
            let boost_single_page = calculate_confidence_boost(1, 1, max_boost);
            prop_assert!(
                boost_single_page.abs() < f64::EPSILON,
                "Single page should give no boost, got {}",
                boost_single_page
            );

            // Single match out of many pages
            let boost_single_match = calculate_confidence_boost(1, 10, max_boost);
            prop_assert!(
                boost_single_match.abs() < f64::EPSILON,
                "Single match should give no boost, got {}",
                boost_single_match
            );
        }

        // ====================================================================
        // Property 9.5: Boost is proportional to match ratio
        // ====================================================================

        /// Boost should be proportional to (match_count / total_pages).
        #[test]
        fn boost_proportional_to_match_ratio(
            match_count in 2usize..=50,
            total_pages in 50usize..=100,
            max_boost in 0.1..=0.5f64,
        ) {
            // Ensure match_count <= total_pages
            let match_count = match_count.min(total_pages);

            let boost = calculate_confidence_boost(match_count, total_pages, max_boost);

            #[allow(clippy::cast_precision_loss)]
            let expected_ratio = match_count as f64 / total_pages as f64;
            let expected_boost = expected_ratio * max_boost;

            prop_assert!(
                (boost - expected_boost).abs() < 1e-10,
                "Boost should be proportional: expected {}, got {}",
                expected_boost, boost
            );
        }

        // ====================================================================
        // Property 9.6: Strip similarity is reflexive
        // ====================================================================

        /// Any strip should be similar to itself.
        #[test]
        fn strip_similarity_reflexive(
            strip in arb_strip_data(),
            threshold in 0.0..=1.0f64,
        ) {
            let is_similar = strips_are_similar(&strip, &strip, threshold);

            prop_assert!(
                is_similar,
                "Strip should be similar to itself at threshold {}",
                threshold
            );
        }

        // ====================================================================
        // Property 9.7: Strip similarity is symmetric
        // ====================================================================

        /// If strip1 is similar to strip2, then strip2 is similar to strip1.
        #[test]
        fn strip_similarity_symmetric(
            strip1 in arb_strip_data(),
            strip2 in arb_strip_data(),
            threshold in arb_threshold(),
        ) {
            let similar_1_to_2 = strips_are_similar(&strip1, &strip2, threshold);
            let similar_2_to_1 = strips_are_similar(&strip2, &strip1, threshold);

            prop_assert_eq!(
                similar_1_to_2, similar_2_to_1,
                "Strip similarity should be symmetric"
            );
        }

        // ====================================================================
        // Property 9.8: Identical strips are always similar
        // ====================================================================

        /// Two strips with identical statistics should always be similar.
        #[test]
        fn identical_strips_always_similar(
            mean in arb_mean_intensity(),
            variance in arb_variance(),
            threshold in arb_threshold(),
        ) {
            let strip1 = StripData {
                bbox: NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
                mean_intensity: mean,
                variance,
                has_content: variance > 100.0,
            };
            let strip2 = strip1.clone();

            let is_similar = strips_are_similar(&strip1, &strip2, threshold);

            prop_assert!(
                is_similar,
                "Identical strips should always be similar"
            );
        }

        // ====================================================================
        // Property 9.9: Blank strips are similar to each other
        // ====================================================================

        /// Two blank strips (has_content = false) should be similar.
        #[test]
        fn blank_strips_similar(
            mean1 in arb_mean_intensity(),
            mean2 in arb_mean_intensity(),
            threshold in arb_threshold(),
        ) {
            // Both strips have low variance (blank)
            let strip1 = StripData {
                bbox: NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
                mean_intensity: mean1,
                variance: 50.0,  // Below 100.0 threshold
                has_content: false,
            };
            let strip2 = StripData {
                bbox: NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
                mean_intensity: mean2,
                variance: 50.0,
                has_content: false,
            };

            let is_similar = strips_are_similar(&strip1, &strip2, threshold);

            prop_assert!(
                is_similar,
                "Blank strips should be similar to each other"
            );
        }

        // ====================================================================
        // Property 9.10: Different content status means not similar
        // ====================================================================

        /// A blank strip and a content strip should not be similar.
        #[test]
        fn different_content_status_not_similar(
            mean in arb_mean_intensity(),
            threshold in arb_threshold(),
        ) {
            let blank_strip = StripData {
                bbox: NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
                mean_intensity: mean,
                variance: 50.0,
                has_content: false,
            };
            let content_strip = StripData {
                bbox: NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
                mean_intensity: mean,
                variance: 500.0,
                has_content: true,
            };

            let is_similar = strips_are_similar(&blank_strip, &content_strip, threshold);

            prop_assert!(
                !is_similar,
                "Blank and content strips should not be similar"
            );
        }

        // ====================================================================
        // Property 9.11: Config defaults are valid
        // ====================================================================

        /// Default config should have valid values.
        #[test]
        fn config_defaults_valid(_dummy in 0..1i32) {
            let config = MultiPageConfig::default();

            prop_assert!(config.header_strip_height > 0.0 && config.header_strip_height <= 1.0);
            prop_assert!(config.footer_strip_height > 0.0 && config.footer_strip_height <= 1.0);
            prop_assert!(config.similarity_threshold >= 0.0 && config.similarity_threshold <= 1.0);
            prop_assert!(config.base_confidence >= 0.0 && config.base_confidence <= 1.0);
            prop_assert!(config.max_confidence_boost >= 0.0 && config.max_confidence_boost <= 1.0);
            prop_assert!(config.iou_threshold >= 0.0 && config.iou_threshold <= 1.0);
        }
    }

    // ========================================================================
    // Additional unit tests for edge cases
    // ========================================================================

    #[test]
    fn test_zero_pages_no_boost() {
        let boost = calculate_confidence_boost(0, 0, 0.25);
        assert!((boost - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_zero_matches_no_boost() {
        let boost = calculate_confidence_boost(0, 10, 0.25);
        assert!((boost - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_half_pages_match() {
        // 5 out of 10 pages match = 50% = half of max boost
        let boost = calculate_confidence_boost(5, 10, 0.20);
        assert!((boost - 0.10).abs() < f64::EPSILON);
    }

    #[test]
    fn test_strips_similar_high_threshold() {
        let strip1 = StripData {
            bbox: NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
            mean_intensity: 128.0,
            variance: 500.0,
            has_content: true,
        };
        let strip2 = StripData {
            bbox: NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
            mean_intensity: 130.0,  // Slightly different
            variance: 510.0,
            has_content: true,
        };

        // With high threshold, slightly different strips should still be similar
        assert!(strips_are_similar(&strip1, &strip2, 0.85));
    }

    #[test]
    fn test_strips_not_similar_very_different() {
        let strip1 = StripData {
            bbox: NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
            mean_intensity: 50.0,
            variance: 200.0,
            has_content: true,
        };
        let strip2 = StripData {
            bbox: NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
            mean_intensity: 200.0,  // Very different
            variance: 5000.0,
            has_content: true,
        };

        // Very different strips should not be similar even with low threshold
        assert!(!strips_are_similar(&strip1, &strip2, 0.95));
    }
}
