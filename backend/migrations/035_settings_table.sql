-- Migration: Generic Settings Table
-- Purpose: Store key-value settings with scope support
-- Created: 2026-01-18

-- Generic settings table for flexible configuration storage
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'global', -- 'global', 'tenant', 'store', 'user'
    scope_id TEXT,                        -- tenant_id, store_id, or user_id depending on scope
    data_type TEXT NOT NULL DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Ensure unique key per scope
    UNIQUE(key, scope, scope_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_scope ON settings(scope, scope_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_settings_timestamp 
AFTER UPDATE ON settings
BEGIN
    UPDATE settings SET updated_at = datetime('now') WHERE id = NEW.id;
END;
