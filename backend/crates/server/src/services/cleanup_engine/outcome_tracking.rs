//! Outcome Tracking for Document Cleanup Engine
//!
//! Tracks review outcomes to measure shield effectiveness and enable
//! vendor-specific threshold adjustments.
//!
//! # Features
//! - Track edits needed during review
//! - Track extraction confidence improvements
//! - Support vendor-specific threshold adjustments
//!
//! # Requirements Validated
//! - 12.1: Track edits needed in review
//! - 12.2: Track extraction confidence improvements
//! - 12.3: Support vendor-specific threshold adjustments

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::types::{ApplyMode, CleanupShield, ShieldSource, ShieldType};

// ============================================================================
// Types
// ============================================================================

/// Outcome of a review session with cleanup shields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupReviewOutcome {
    pub id: String,
    pub tenant_id: String,
    pub store_id: String,
    pub review_case_id: String,
    pub vendor_id: Option<String>,
    pub template_id: Option<String>,

    // Shield statistics
    pub auto_detected_count: u32,
    pub vendor_rule_count: u32,
    pub template_rule_count: u32,
    pub session_override_count: u32,

    // User edits during review
    pub shields_added: u32,
    pub shields_removed: u32,
    pub shields_adjusted: u32,
    pub apply_mode_changes: u32,

    // Extraction quality metrics
    pub initial_confidence: Option<f64>,
    pub final_confidence: Option<f64>,
    pub confidence_delta: Option<f64>,

    // Field-level metrics
    pub fields_extracted: u32,
    pub fields_corrected: u32,
    pub fields_failed: u32,

    // Timing
    pub review_duration_ms: Option<u64>,
    pub extraction_duration_ms: Option<u64>,

    // Outcome classification
    pub outcome_status: OutcomeStatus,
    pub user_satisfaction: Option<UserSatisfaction>,

    // Metadata
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub user_id: Option<String>,
}

/// Status of the review outcome
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum OutcomeStatus {
    #[default]
    InProgress,
    Completed,
    Abandoned,
    Error,
}

/// User satisfaction rating (optional feedback)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UserSatisfaction {
    Good,
    Acceptable,
    Poor,
}

/// Threshold adjustments learned for a vendor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VendorThresholdAdjustments {
    pub id: String,
    pub tenant_id: String,
    pub store_id: String,
    pub vendor_id: String,

    // Threshold deltas by shield type
    pub logo_threshold_delta: f64,
    pub watermark_threshold_delta: f64,
    pub header_threshold_delta: f64,
    pub footer_threshold_delta: f64,
    pub stamp_threshold_delta: f64,

    // Statistics
    pub sample_count: u32,
    pub avg_confidence_improvement: Option<f64>,
    pub avg_edits_per_review: Option<f64>,

    // Metadata
    pub last_calculated_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// Effectiveness record for a single shield
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShieldEffectivenessRecord {
    pub id: String,
    pub tenant_id: String,
    pub store_id: String,
    pub outcome_id: String,
    pub shield_id: String,

    // Shield details
    pub shield_type: ShieldType,
    pub shield_source: ShieldSource,
    pub initial_apply_mode: ApplyMode,
    pub final_apply_mode: ApplyMode,

    // Effectiveness metrics
    pub was_modified: bool,
    pub was_removed: bool,
    pub confidence_at_detection: Option<f64>,

    // Zone interaction
    pub overlapped_critical_zone: bool,
    pub critical_zone_id: Option<String>,
    pub overlap_ratio: Option<f64>,

    // Metadata
    pub created_at: DateTime<Utc>,
}

// ============================================================================
// Outcome Builder
// ============================================================================

/// Builder for creating review outcomes
#[derive(Debug, Default)]
pub struct OutcomeBuilder {
    review_case_id: Option<String>,
    vendor_id: Option<String>,
    template_id: Option<String>,
    initial_shields: Vec<CleanupShield>,
    final_shields: Vec<CleanupShield>,
    initial_confidence: Option<f64>,
    final_confidence: Option<f64>,
    fields_extracted: u32,
    fields_corrected: u32,
    fields_failed: u32,
    review_start: Option<DateTime<Utc>>,
    user_id: Option<String>,
}

impl OutcomeBuilder {
    /// Create a new outcome builder
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Set the review case ID
    #[must_use]
    pub fn review_case_id(mut self, id: impl Into<String>) -> Self {
        self.review_case_id = Some(id.into());
        self
    }

    /// Set the vendor ID
    #[must_use]
    pub fn vendor_id(mut self, id: impl Into<String>) -> Self {
        self.vendor_id = Some(id.into());
        self
    }

    /// Set the template ID
    #[must_use]
    pub fn template_id(mut self, id: impl Into<String>) -> Self {
        self.template_id = Some(id.into());
        self
    }

    /// Set the initial shields (before user edits)
    #[must_use]
    pub fn initial_shields(mut self, shields: Vec<CleanupShield>) -> Self {
        self.initial_shields = shields;
        self
    }

    /// Set the final shields (after user edits)
    #[must_use]
    pub fn final_shields(mut self, shields: Vec<CleanupShield>) -> Self {
        self.final_shields = shields;
        self
    }

    /// Set the initial extraction confidence
    #[must_use]
    pub fn initial_confidence(mut self, confidence: f64) -> Self {
        self.initial_confidence = Some(confidence);
        self
    }

    /// Set the final extraction confidence
    #[must_use]
    pub fn final_confidence(mut self, confidence: f64) -> Self {
        self.final_confidence = Some(confidence);
        self
    }

    /// Set field extraction metrics
    #[must_use]
    pub fn field_metrics(mut self, extracted: u32, corrected: u32, failed: u32) -> Self {
        self.fields_extracted = extracted;
        self.fields_corrected = corrected;
        self.fields_failed = failed;
        self
    }

    /// Set the review start time
    #[must_use]
    pub fn review_start(mut self, start: DateTime<Utc>) -> Self {
        self.review_start = Some(start);
        self
    }

    /// Set the user ID
    #[must_use]
    pub fn user_id(mut self, id: impl Into<String>) -> Self {
        self.user_id = Some(id.into());
        self
    }

    /// Build the outcome
    ///
    /// # Errors
    /// Returns an error if required fields are missing
    pub fn build(
        self,
        tenant_id: &str,
        store_id: &str,
    ) -> Result<CleanupReviewOutcome, OutcomeTrackingError> {
        let review_case_id = self
            .review_case_id
            .ok_or(OutcomeTrackingError::MissingField("review_case_id"))?;

        let now = Utc::now();

        // Count shields by source
        let (auto_detected, vendor_rule, template_rule, session_override) =
            count_shields_by_source(&self.initial_shields);

        // Calculate edit metrics
        let (added, removed, adjusted, mode_changes) =
            calculate_edit_metrics(&self.initial_shields, &self.final_shields);

        // Calculate confidence delta
        let confidence_delta = match (self.initial_confidence, self.final_confidence) {
            (Some(initial), Some(final_conf)) => Some(final_conf - initial),
            _ => None,
        };

        // Calculate review duration
        let review_duration_ms = self.review_start.map(|start| {
            let duration = now.signed_duration_since(start);
            duration.num_milliseconds().max(0) as u64
        });

        Ok(CleanupReviewOutcome {
            id: Uuid::new_v4().to_string(),
            tenant_id: tenant_id.to_string(),
            store_id: store_id.to_string(),
            review_case_id,
            vendor_id: self.vendor_id,
            template_id: self.template_id,
            auto_detected_count: auto_detected,
            vendor_rule_count: vendor_rule,
            template_rule_count: template_rule,
            session_override_count: session_override,
            shields_added: added,
            shields_removed: removed,
            shields_adjusted: adjusted,
            apply_mode_changes: mode_changes,
            initial_confidence: self.initial_confidence,
            final_confidence: self.final_confidence,
            confidence_delta,
            fields_extracted: self.fields_extracted,
            fields_corrected: self.fields_corrected,
            fields_failed: self.fields_failed,
            review_duration_ms,
            extraction_duration_ms: None,
            outcome_status: OutcomeStatus::Completed,
            user_satisfaction: None,
            created_at: self.review_start.unwrap_or(now),
            completed_at: Some(now),
            user_id: self.user_id,
        })
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Count shields by source type
fn count_shields_by_source(shields: &[CleanupShield]) -> (u32, u32, u32, u32) {
    let mut auto_detected = 0u32;
    let mut vendor_rule = 0u32;
    let mut template_rule = 0u32;
    let mut session_override = 0u32;

    for shield in shields {
        match shield.provenance.source {
            ShieldSource::AutoDetected => auto_detected += 1,
            ShieldSource::VendorRule => vendor_rule += 1,
            ShieldSource::TemplateRule => template_rule += 1,
            ShieldSource::SessionOverride => session_override += 1,
        }
    }

    (auto_detected, vendor_rule, template_rule, session_override)
}

/// Calculate edit metrics between initial and final shields
fn calculate_edit_metrics(
    initial: &[CleanupShield],
    final_shields: &[CleanupShield],
) -> (u32, u32, u32, u32) {
    let initial_ids: std::collections::HashSet<_> = initial.iter().map(|s| &s.id).collect();
    let final_ids: std::collections::HashSet<_> = final_shields.iter().map(|s| &s.id).collect();

    // Added: in final but not in initial
    let added = final_ids.difference(&initial_ids).count() as u32;

    // Removed: in initial but not in final
    let removed = initial_ids.difference(&final_ids).count() as u32;

    // Adjusted and mode changes: shields in both but modified
    let mut adjusted = 0u32;
    let mut mode_changes = 0u32;

    for final_shield in final_shields {
        if let Some(initial_shield) = initial.iter().find(|s| s.id == final_shield.id) {
            // Check if bbox changed
            if initial_shield.normalized_bbox.x != final_shield.normalized_bbox.x
                || initial_shield.normalized_bbox.y != final_shield.normalized_bbox.y
                || initial_shield.normalized_bbox.width != final_shield.normalized_bbox.width
                || initial_shield.normalized_bbox.height != final_shield.normalized_bbox.height
            {
                adjusted += 1;
            }

            // Check if apply mode changed
            if initial_shield.apply_mode != final_shield.apply_mode {
                mode_changes += 1;
            }
        }
    }

    (added, removed, adjusted, mode_changes)
}

/// Calculate threshold adjustment for a shield type based on outcomes
///
/// Returns a delta to apply to the base threshold.
/// Positive delta = increase threshold (fewer auto-detections)
/// Negative delta = decrease threshold (more auto-detections)
pub fn calculate_threshold_adjustment(
    outcomes: &[CleanupReviewOutcome],
    _shield_type: ShieldType,
) -> f64 {
    if outcomes.is_empty() {
        return 0.0;
    }

    // Calculate average edits per review for this shield type
    // More edits = threshold may need adjustment
    let total_edits: u32 = outcomes
        .iter()
        .map(|o| o.shields_added + o.shields_removed + o.shields_adjusted)
        .sum();

    let avg_edits = total_edits as f64 / outcomes.len() as f64;

    // Calculate average confidence improvement
    let confidence_improvements: Vec<f64> = outcomes
        .iter()
        .filter_map(|o| o.confidence_delta)
        .collect();

    let avg_improvement = if confidence_improvements.is_empty() {
        0.0
    } else {
        confidence_improvements.iter().sum::<f64>() / confidence_improvements.len() as f64
    };

    // Heuristic: if many edits and low improvement, increase threshold
    // If few edits and high improvement, decrease threshold
    let edit_factor = if avg_edits > 3.0 {
        0.05 // Increase threshold
    } else if avg_edits < 1.0 {
        -0.05 // Decrease threshold
    } else {
        0.0
    };

    let improvement_factor = if avg_improvement > 0.1 {
        -0.03 // Good improvement, slightly lower threshold
    } else if avg_improvement < -0.05 {
        0.03 // Negative improvement, raise threshold
    } else {
        0.0
    };

    // Clamp to reasonable range
    let result: f64 = edit_factor + improvement_factor;
    result.clamp(-0.15, 0.15)
}

// ============================================================================
// Errors
// ============================================================================

/// Errors for outcome tracking operations
#[derive(Debug, thiserror::Error)]
pub enum OutcomeTrackingError {
    #[error("Missing required field: {0}")]
    MissingField(&'static str),

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_count_shields_by_source() {
        let shields = vec![
            create_test_shield("1", ShieldSource::AutoDetected),
            create_test_shield("2", ShieldSource::AutoDetected),
            create_test_shield("3", ShieldSource::VendorRule),
            create_test_shield("4", ShieldSource::SessionOverride),
        ];

        let (auto, vendor, template, session) = count_shields_by_source(&shields);
        assert_eq!(auto, 2);
        assert_eq!(vendor, 1);
        assert_eq!(template, 0);
        assert_eq!(session, 1);
    }

    #[test]
    fn test_calculate_edit_metrics() {
        let initial = vec![
            create_test_shield("1", ShieldSource::AutoDetected),
            create_test_shield("2", ShieldSource::AutoDetected),
            create_test_shield("3", ShieldSource::VendorRule),
        ];

        let mut final_shields = vec![
            create_test_shield("1", ShieldSource::AutoDetected),
            create_test_shield("4", ShieldSource::SessionOverride), // Added
        ];
        // Shield 2 and 3 removed

        let (added, removed, adjusted, mode_changes) =
            calculate_edit_metrics(&initial, &final_shields);

        assert_eq!(added, 1);
        assert_eq!(removed, 2);
        assert_eq!(adjusted, 0);
        assert_eq!(mode_changes, 0);
    }

    fn create_test_shield(id: &str, source: ShieldSource) -> CleanupShield {
        use super::super::types::*;

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
}
