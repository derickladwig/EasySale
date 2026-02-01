-- Migration 061: Inventory Counting System
-- Creates tables for inventory count sessions, items, and adjustments
-- Ported from POS project's inventory counting feature

-- ============================================================================
-- INVENTORY COUNT SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_count_sessions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    
    -- Count type: full (all products), cycle (subset), spot (specific items)
    count_type TEXT NOT NULL DEFAULT 'cycle',
    
    -- Workflow status
    status TEXT NOT NULL DEFAULT 'draft',
    -- draft: being set up
    -- in_progress: actively counting
    -- submitted: awaiting approval
    -- approved: adjustments applied
    -- cancelled: abandoned
    
    -- Optional filters for cycle/spot counts
    category_filter TEXT,
    bin_filter TEXT,
    product_type_filter TEXT,
    
    -- Workflow tracking
    started_by_user_id TEXT,
    started_at TEXT,
    submitted_by_user_id TEXT,
    submitted_at TEXT,
    approved_by_user_id TEXT,
    approved_at TEXT,
    cancelled_by_user_id TEXT,
    cancelled_at TEXT,
    
    -- Statistics (updated as counting progresses)
    total_items_expected INTEGER DEFAULT 0,
    total_items_counted INTEGER DEFAULT 0,
    total_variance_items INTEGER DEFAULT 0,
    total_variance_qty INTEGER DEFAULT 0,
    total_variance_value REAL DEFAULT 0,
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Foreign keys
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- Indexes for count sessions
CREATE INDEX IF NOT EXISTS idx_count_sessions_tenant ON inventory_count_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_count_sessions_store ON inventory_count_sessions(store_id);
CREATE INDEX IF NOT EXISTS idx_count_sessions_status ON inventory_count_sessions(status);
CREATE INDEX IF NOT EXISTS idx_count_sessions_type ON inventory_count_sessions(count_type);
CREATE INDEX IF NOT EXISTS idx_count_sessions_created ON inventory_count_sessions(created_at DESC);

-- ============================================================================
-- INVENTORY COUNT ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_count_items (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    
    -- Expected vs actual quantities
    expected_qty INTEGER NOT NULL DEFAULT 0,
    counted_qty INTEGER,
    variance INTEGER GENERATED ALWAYS AS (COALESCE(counted_qty, 0) - expected_qty) STORED,
    
    -- Variance value (for reporting)
    unit_cost REAL DEFAULT 0,
    variance_value REAL GENERATED ALWAYS AS ((COALESCE(counted_qty, 0) - expected_qty) * COALESCE(unit_cost, 0)) STORED,
    
    -- Who counted and when
    counted_by_user_id TEXT,
    counted_at TEXT,
    
    -- Location info (captured at time of count)
    bin_location TEXT,
    
    -- Recount flag
    recount_requested INTEGER NOT NULL DEFAULT 0,
    recount_reason TEXT,
    recount_by_user_id TEXT,
    recount_at TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Foreign keys
    FOREIGN KEY (session_id) REFERENCES inventory_count_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    
    -- One count per product per session
    UNIQUE(session_id, product_id)
);

-- Indexes for count items
CREATE INDEX IF NOT EXISTS idx_count_items_session ON inventory_count_items(session_id);
CREATE INDEX IF NOT EXISTS idx_count_items_product ON inventory_count_items(product_id);
CREATE INDEX IF NOT EXISTS idx_count_items_variance ON inventory_count_items(variance) WHERE variance != 0;
CREATE INDEX IF NOT EXISTS idx_count_items_recount ON inventory_count_items(recount_requested) WHERE recount_requested = 1;

-- ============================================================================
-- INVENTORY ADJUSTMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    
    -- Optional link to count session (null for manual adjustments)
    session_id TEXT,
    
    -- Product and location
    product_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    
    -- Adjustment details
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    adjustment_qty INTEGER GENERATED ALWAYS AS (quantity_after - quantity_before) STORED,
    
    -- Type: count (from counting), manual (direct adjustment), transfer (between stores), receiving (from PO)
    adjustment_type TEXT NOT NULL DEFAULT 'manual',
    
    -- Reason/reference
    reason TEXT,
    reference_type TEXT, -- po, transfer, count, shrinkage, damage, return
    reference_id TEXT,
    
    -- Approval workflow
    status TEXT NOT NULL DEFAULT 'pending',
    -- pending: awaiting approval
    -- approved: applied to inventory
    -- rejected: denied
    
    created_by_user_id TEXT NOT NULL,
    approved_by_user_id TEXT,
    approved_at TEXT,
    rejected_by_user_id TEXT,
    rejected_at TEXT,
    rejection_reason TEXT,
    
    -- Cost tracking
    unit_cost REAL DEFAULT 0,
    total_cost_impact REAL GENERATED ALWAYS AS ((quantity_after - quantity_before) * COALESCE(unit_cost, 0)) STORED,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Foreign keys
    FOREIGN KEY (session_id) REFERENCES inventory_count_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- Indexes for adjustments
CREATE INDEX IF NOT EXISTS idx_adjustments_tenant ON inventory_adjustments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_session ON inventory_adjustments(session_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_product ON inventory_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_store ON inventory_adjustments(store_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_status ON inventory_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_adjustments_type ON inventory_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_adjustments_created ON inventory_adjustments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adjustments_pending ON inventory_adjustments(status) WHERE status = 'pending';

-- ============================================================================
-- INVENTORY COUNT SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_count_settings (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    
    -- Cycle count frequency
    cycle_count_frequency_days INTEGER DEFAULT 30,
    
    -- Approval settings
    require_approval INTEGER NOT NULL DEFAULT 1,
    auto_approve_threshold INTEGER DEFAULT 0, -- Auto-approve if variance <= this
    approval_tier_required INTEGER DEFAULT 6, -- Minimum tier to approve (6 = Store Manager)
    
    -- Counting rules
    allow_blind_counts INTEGER NOT NULL DEFAULT 0, -- Hide expected qty during count
    require_double_count INTEGER NOT NULL DEFAULT 0, -- Require two people to count
    
    -- Notification settings
    notify_on_variance INTEGER NOT NULL DEFAULT 1,
    variance_notification_threshold INTEGER DEFAULT 5, -- Notify if variance > this
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- One settings record per store
    UNIQUE(tenant_id, store_id)
);

-- Index for settings
CREATE INDEX IF NOT EXISTS idx_count_settings_tenant ON inventory_count_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_count_settings_store ON inventory_count_settings(store_id);
