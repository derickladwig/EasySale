-- Migration: Offline Sync Infrastructure
-- Description: Creates tables for offline transaction queuing and sync management

-- Sync Queue: Tracks all operations that need to be synchronized
CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,  -- 'customer', 'layaway', 'work_order', etc.
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,    -- 'create', 'update', 'delete'
    payload TEXT NOT NULL,      -- JSON payload of the operation
    sync_status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'syncing', 'completed', 'failed'
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_retry_at TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    store_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);

-- Sync Log: Audit trail of all sync operations
CREATE TABLE IF NOT EXISTS sync_log (
    id TEXT PRIMARY KEY,
    sync_queue_id TEXT,
    operation TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    source_store_id TEXT NOT NULL,
    target_store_id TEXT,
    sync_status TEXT NOT NULL,  -- 'success', 'conflict', 'error'
    conflict_resolution TEXT,   -- 'local_wins', 'remote_wins', 'merged'
    error_message TEXT,
    synced_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (sync_queue_id) REFERENCES sync_queue(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_log_entity ON sync_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_log_synced ON sync_log(synced_at);

-- Sync State: Tracks last sync timestamp per store
CREATE TABLE IF NOT EXISTS sync_state (
    store_id TEXT PRIMARY KEY,
    last_sync_at TEXT NOT NULL,
    last_sync_version INTEGER NOT NULL DEFAULT 0,
    sync_enabled BOOLEAN NOT NULL DEFAULT 1,
    sync_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Conflict Resolution: Stores conflicts that need manual review
CREATE TABLE IF NOT EXISTS sync_conflicts (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    local_version TEXT NOT NULL,   -- JSON of local version
    remote_version TEXT NOT NULL,  -- JSON of remote version
    local_updated_at TEXT NOT NULL,
    remote_updated_at TEXT NOT NULL,
    local_store_id TEXT NOT NULL,
    remote_store_id TEXT NOT NULL,
    resolution_status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'resolved', 'ignored'
    resolved_by TEXT,
    resolved_at TEXT,
    resolution_notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entity ON sync_conflicts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON sync_conflicts(resolution_status);

-- Audit Log: Comprehensive audit trail for all operations
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,  -- 'create', 'update', 'delete'
    user_id TEXT,
    employee_id TEXT,
    changes TEXT,  -- JSON of what changed
    ip_address TEXT,
    user_agent TEXT,
    is_offline BOOLEAN NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    store_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_offline ON audit_log(is_offline);

-- Offline Credit Verifications: Tracks credit transactions made offline for verification
CREATE TABLE IF NOT EXISTS offline_credit_verifications (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    amount TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    verification_status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'verified', 'failed'
    verified_at TEXT,
    FOREIGN KEY (account_id) REFERENCES credit_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_offline_credit_account ON offline_credit_verifications(account_id);
CREATE INDEX IF NOT EXISTS idx_offline_credit_status ON offline_credit_verifications(verification_status);
