-- Migration: Create cleanup outcome tracking tables
-- Purpose: Track review outcomes for cleanup shield effectiveness analysis
-- Policy: NO DELETES - all records preserved for historical analysis

-- ============================================================================
-- Cleanup Review Outcomes
-- Tracks the outcome of each review case with cleanup shields applied
-- Used to measure shield effectiveness and adjust thresholds
-- ============================================================================
CREATE TABLE IF NOT EXISTS cleanup_review_outcomes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    review_case_id TEXT NOT NULL,
    vendor_id TEXT,
    template_id TEXT,
    
    -- Shield statistics
    auto_detected_count INTEGER NOT NULL DEFAULT 0,
    vendor_rule_count INTEGER NOT NULL DEFAULT 0,
    template_rule_count INTEGER NOT NULL DEFAULT 0,
    session_override_count INTEGER NOT NULL DEFAULT 0,
    
    -- User edits during review
    shields_added INTEGER NOT NULL DEFAULT 0,
    shields_removed INTEGER NOT NULL DEFAULT 0,
    shields_adjusted INTEGER NOT NULL DEFAULT 0,
    apply_mode_changes INTEGER NOT NULL DEFAULT 0,
    
    -- Extraction quality metrics
    initial_confidence REAL,  -- Confidence before cleanup
    final_confidence REAL,    -- Confidence after cleanup
    confidence_delta REAL,    -- Improvement (final - initial)
    
    -- Field-level metrics
    fields_extracted INTEGER NOT NULL DEFAULT 0,
    fields_corrected INTEGER NOT NULL DEFAULT 0,
    fields_failed INTEGER NOT NULL DEFAULT 0,
    
    -- Timing
    review_duration_ms INTEGER,  -- Time spent in review
    extraction_duration_ms INTEGER,  -- Time for extraction
    
    -- Outcome classification
    outcome_status TEXT NOT NULL DEFAULT 'completed',  -- completed, abandoned, error
    user_satisfaction TEXT,  -- good, acceptable, poor (optional feedback)
    
    -- Metadata
    created_at TEXT NOT NULL,
    completed_at TEXT,
    user_id TEXT,
    
    FOREIGN KEY (review_case_id) REFERENCES review_cases(id)
);

-- Indexes for cleanup_review_outcomes
CREATE INDEX IF NOT EXISTS idx_cleanup_outcomes_tenant ON cleanup_review_outcomes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_outcomes_store ON cleanup_review_outcomes(tenant_id, store_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_outcomes_vendor ON cleanup_review_outcomes(vendor_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_outcomes_template ON cleanup_review_outcomes(template_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_outcomes_case ON cleanup_review_outcomes(review_case_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_outcomes_time ON cleanup_review_outcomes(created_at);

-- ============================================================================
-- Vendor Threshold Adjustments
-- Stores learned threshold adjustments per vendor based on outcomes
-- Used to fine-tune auto-detection confidence thresholds
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendor_threshold_adjustments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    
    -- Threshold adjustments by shield type
    logo_threshold_delta REAL DEFAULT 0.0,
    watermark_threshold_delta REAL DEFAULT 0.0,
    header_threshold_delta REAL DEFAULT 0.0,
    footer_threshold_delta REAL DEFAULT 0.0,
    stamp_threshold_delta REAL DEFAULT 0.0,
    
    -- Statistics used to calculate adjustments
    sample_count INTEGER NOT NULL DEFAULT 0,
    avg_confidence_improvement REAL,
    avg_edits_per_review REAL,
    
    -- Metadata
    last_calculated_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    
    UNIQUE(tenant_id, store_id, vendor_id)
);

-- Indexes for vendor_threshold_adjustments
CREATE INDEX IF NOT EXISTS idx_vendor_thresholds_tenant ON vendor_threshold_adjustments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendor_thresholds_store ON vendor_threshold_adjustments(tenant_id, store_id);
CREATE INDEX IF NOT EXISTS idx_vendor_thresholds_vendor ON vendor_threshold_adjustments(vendor_id);

-- ============================================================================
-- Shield Effectiveness Log
-- Detailed log of individual shield effectiveness per review
-- Used for granular analysis and machine learning
-- ============================================================================
CREATE TABLE IF NOT EXISTS shield_effectiveness_log (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    outcome_id TEXT NOT NULL,  -- Links to cleanup_review_outcomes
    shield_id TEXT NOT NULL,
    
    -- Shield details
    shield_type TEXT NOT NULL,
    shield_source TEXT NOT NULL,  -- AutoDetected, VendorRule, TemplateRule, SessionOverride
    initial_apply_mode TEXT NOT NULL,
    final_apply_mode TEXT NOT NULL,
    
    -- Effectiveness metrics
    was_modified BOOLEAN NOT NULL DEFAULT FALSE,
    was_removed BOOLEAN NOT NULL DEFAULT FALSE,
    confidence_at_detection REAL,
    
    -- Zone interaction
    overlapped_critical_zone BOOLEAN NOT NULL DEFAULT FALSE,
    critical_zone_id TEXT,
    overlap_ratio REAL,
    
    -- Metadata
    created_at TEXT NOT NULL,
    
    FOREIGN KEY (outcome_id) REFERENCES cleanup_review_outcomes(id)
);

-- Indexes for shield_effectiveness_log
CREATE INDEX IF NOT EXISTS idx_shield_effectiveness_tenant ON shield_effectiveness_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shield_effectiveness_outcome ON shield_effectiveness_log(outcome_id);
CREATE INDEX IF NOT EXISTS idx_shield_effectiveness_type ON shield_effectiveness_log(shield_type);
CREATE INDEX IF NOT EXISTS idx_shield_effectiveness_source ON shield_effectiveness_log(shield_source);
