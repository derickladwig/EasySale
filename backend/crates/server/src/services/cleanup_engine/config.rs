//! Configuration for the Document Cleanup Engine

use serde::{Deserialize, Serialize};

/// Configuration for cleanup engine
///
/// Controls which detection algorithms are enabled and their parameters.
#[allow(clippy::struct_excessive_bools)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupEngineConfig {
    /// Enable auto-detection of logos
    pub auto_detect_logos: bool,
    /// Enable auto-detection of watermarks
    pub auto_detect_watermarks: bool,
    /// Enable auto-detection of repetitive headers/footers
    pub auto_detect_repetitive: bool,
    /// Enable auto-detection of stamps
    pub auto_detect_stamps: bool,
    /// Use text-aware detection (requires OCR)
    pub use_text_aware_detection: bool,
    /// Minimum confidence for auto-detection
    pub min_auto_confidence: f64,
    /// Maximum processing time in milliseconds
    pub max_processing_time_ms: u64,
    /// Critical zones that trigger risk elevation
    pub critical_zones: Vec<String>,
}

impl Default for CleanupEngineConfig {
    fn default() -> Self {
        Self {
            auto_detect_logos: true,
            auto_detect_watermarks: true,
            auto_detect_repetitive: true,
            auto_detect_stamps: false, // Disabled by default (requires more processing)
            use_text_aware_detection: false, // Disabled by default (requires OCR)
            min_auto_confidence: 0.6,
            max_processing_time_ms: 2000, // 2 seconds
            critical_zones: vec![
                "LineItems".to_string(),
                "Totals".to_string(),
            ],
        }
    }
}

impl CleanupEngineConfig {
    /// Create a new config with default values
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Create a config with all detection enabled
    #[must_use]
    pub fn all_detection() -> Self {
        Self {
            auto_detect_logos: true,
            auto_detect_watermarks: true,
            auto_detect_repetitive: true,
            auto_detect_stamps: true,
            use_text_aware_detection: true,
            ..Self::default()
        }
    }

    /// Create a config with minimal detection (fast mode)
    #[must_use]
    pub fn minimal() -> Self {
        Self {
            auto_detect_logos: true,
            auto_detect_watermarks: false,
            auto_detect_repetitive: false,
            auto_detect_stamps: false,
            use_text_aware_detection: false,
            max_processing_time_ms: 500,
            ..Self::default()
        }
    }

    /// Builder method to set logo detection
    #[must_use]
    #[allow(clippy::missing_const_for_fn)]
    pub fn with_logo_detection(mut self, enabled: bool) -> Self {
        self.auto_detect_logos = enabled;
        self
    }

    /// Builder method to set watermark detection
    #[must_use]
    #[allow(clippy::missing_const_for_fn)]
    pub fn with_watermark_detection(mut self, enabled: bool) -> Self {
        self.auto_detect_watermarks = enabled;
        self
    }

    /// Builder method to set repetitive detection
    #[must_use]
    #[allow(clippy::missing_const_for_fn)]
    pub fn with_repetitive_detection(mut self, enabled: bool) -> Self {
        self.auto_detect_repetitive = enabled;
        self
    }

    /// Builder method to set minimum confidence
    #[must_use]
    #[allow(clippy::missing_const_for_fn)]
    pub fn with_min_confidence(mut self, confidence: f64) -> Self {
        self.min_auto_confidence = confidence;
        self
    }

    /// Builder method to set max processing time
    #[must_use]
    #[allow(clippy::missing_const_for_fn)]
    pub fn with_max_processing_time(mut self, ms: u64) -> Self {
        self.max_processing_time_ms = ms;
        self
    }

    /// Builder method to set critical zones
    #[must_use]
    pub fn with_critical_zones(mut self, zones: Vec<String>) -> Self {
        self.critical_zones = zones;
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = CleanupEngineConfig::default();
        assert!(config.auto_detect_logos);
        assert!(config.auto_detect_watermarks);
        assert!(config.auto_detect_repetitive);
        assert!(!config.auto_detect_stamps);
        assert!(!config.use_text_aware_detection);
        assert_eq!(config.min_auto_confidence, 0.6);
        assert_eq!(config.max_processing_time_ms, 2000);
    }

    #[test]
    fn test_builder_pattern() {
        let config = CleanupEngineConfig::new()
            .with_logo_detection(false)
            .with_min_confidence(0.8)
            .with_max_processing_time(1000);

        assert!(!config.auto_detect_logos);
        assert_eq!(config.min_auto_confidence, 0.8);
        assert_eq!(config.max_processing_time_ms, 1000);
    }

    #[test]
    fn test_all_detection_config() {
        let config = CleanupEngineConfig::all_detection();
        assert!(config.auto_detect_logos);
        assert!(config.auto_detect_watermarks);
        assert!(config.auto_detect_repetitive);
        assert!(config.auto_detect_stamps);
        assert!(config.use_text_aware_detection);
    }

    #[test]
    fn test_minimal_config() {
        let config = CleanupEngineConfig::minimal();
        assert!(config.auto_detect_logos);
        assert!(!config.auto_detect_watermarks);
        assert!(!config.auto_detect_repetitive);
        assert_eq!(config.max_processing_time_ms, 500);
    }
}
