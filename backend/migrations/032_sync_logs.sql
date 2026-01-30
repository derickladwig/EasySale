-- Migration: Sync Logs Table
-- Requirements: Task 14.1 - Sync logging infrastructure
-- Date: 2026-01-14

-- Sync logs table for comprehensive sync operation logging
CREATE TABLE IF NOT EXISTS sync_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    sync_id TEXT NOT NULL,
    connector_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,  -- 'create', 'update', 'delete', 'fetch'
    result TEXT NOT NULL,  -- 'success', 'warning', 'error'
    level TEXT NOT NULL,  -- 'debug', 'info', 'warn', 'error'
    message TEXT NOT NULL,
    error_details TEXT,
    duration_ms INTEGER,
    metadata TEXT,  -- JSON with additional context
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_logs_tenant ON sync_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_id ON sync_logs(sync_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_connector ON sync_logs(connector_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_result ON sync_logs(result);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON sync_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_tenant_sync ON sync_logs(tenant_id, sync_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_tenant_result ON sync_logs(tenant_id, result);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_tenant_connector_created 
ON sync_logs(tenant_id, connector_id, created_at DESC);
