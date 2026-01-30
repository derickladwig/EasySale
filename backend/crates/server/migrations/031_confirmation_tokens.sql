-- Migration: Confirmation Tokens for Bulk Operations
-- Requirements: Task 13.1 - Confirmation requirements
-- Date: 2026-01-14

-- Confirmation tokens table
CREATE TABLE IF NOT EXISTS confirmation_tokens (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    operation_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'sync'
    entity_type TEXT NOT NULL,
    affected_count INTEGER NOT NULL,
    operation_data TEXT NOT NULL, -- JSON with operation details
    expires_at TEXT NOT NULL, -- ISO 8601 timestamp
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_confirmation_tokens_token ON confirmation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_confirmation_tokens_tenant ON confirmation_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_confirmation_tokens_expires ON confirmation_tokens(expires_at);

-- Cleanup expired tokens (run periodically)
-- DELETE FROM confirmation_tokens WHERE datetime(expires_at) < datetime('now');
