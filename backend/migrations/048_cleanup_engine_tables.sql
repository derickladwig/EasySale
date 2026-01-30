-- Migration: Create cleanup engine tables
-- Purpose: Support Document Cleanup Engine (DCE) for shield-based document cleanup
-- Policy: NO DELETES - all records use archived_at for soft deletion

-- ============================================================================
-- Vendor Cleanup Rules
-- Stores cleanup shield rules associated with specific vendors
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendor_cleanup_rules (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    doc_type TEXT,  -- invoice, statement, bill, packing_slip
    rules_json TEXT NOT NULL,  -- JSON array of CleanupShield
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    archived_at TEXT,  -- NULL = active, timestamp = archived (NO DELETES)
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    created_by TEXT,
    UNIQUE(tenant_id, store_id, vendor_id, doc_type)
);

-- Indexes for vendor_cleanup_rules
CREATE INDEX IF NOT EXISTS idx_vendor_cleanup_tenant ON vendor_cleanup_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendor_cleanup_store ON vendor_cleanup_rules(tenant_id, store_id);
CREATE INDEX IF NOT EXISTS idx_vendor_cleanup_vendor ON vendor_cleanup_rules(vendor_id);

-- ============================================================================
-- Template Cleanup Rules
-- Stores cleanup shield rules associated with document templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS template_cleanup_rules (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    template_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    doc_type TEXT,
    rules_json TEXT NOT NULL,  -- JSON array of CleanupShield
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    archived_at TEXT,  -- NULL = active, timestamp = archived (NO DELETES)
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    created_by TEXT,
    UNIQUE(tenant_id, store_id, template_id, doc_type)
);

-- Indexes for template_cleanup_rules
CREATE INDEX IF NOT EXISTS idx_template_cleanup_tenant ON template_cleanup_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_template_cleanup_store ON template_cleanup_rules(tenant_id, store_id);
CREATE INDEX IF NOT EXISTS idx_template_cleanup_template ON template_cleanup_rules(template_id);
CREATE INDEX IF NOT EXISTS idx_template_cleanup_vendor ON template_cleanup_rules(vendor_id);

-- ============================================================================
-- Cleanup Audit Log
-- Records all changes to cleanup rules (NO DELETES - action is never 'delete')
-- Valid actions: 'create', 'update', 'disable', 'archive', 'supersede'
-- ============================================================================
CREATE TABLE IF NOT EXISTS cleanup_audit_log (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,  -- 'vendor' or 'template'
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,  -- 'create', 'update', 'disable', 'archive', 'supersede'
    diff_json TEXT,  -- JSON diff of changes
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Indexes for cleanup_audit_log
CREATE INDEX IF NOT EXISTS idx_cleanup_audit_tenant ON cleanup_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_audit_entity ON cleanup_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_audit_user ON cleanup_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_audit_time ON cleanup_audit_log(created_at);

-- ============================================================================
-- Review Case Shields
-- Stores snapshots of resolved shields used for each review case
-- Links to existing review_cases table
-- ============================================================================
CREATE TABLE IF NOT EXISTS review_case_shields (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    review_case_id TEXT NOT NULL,
    resolved_shields_json TEXT NOT NULL,  -- Snapshot of shields used
    overlay_artifact_path TEXT,  -- Optional path to rendered overlay
    created_at TEXT NOT NULL,
    FOREIGN KEY (review_case_id) REFERENCES review_cases(id)
);

-- Indexes for review_case_shields
CREATE INDEX IF NOT EXISTS idx_review_shields_tenant ON review_case_shields(tenant_id);
CREATE INDEX IF NOT EXISTS idx_review_shields_case ON review_case_shields(review_case_id);
