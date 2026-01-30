-- Migration: Feature Flags Table
-- Purpose: Store feature flags for A/B testing and gradual rollouts
-- Created: 2026-01-18

-- Feature flags table for controlling feature availability
CREATE TABLE IF NOT EXISTS feature_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0, -- 0 = disabled, 1 = enabled
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Ensure unique flag name per tenant
    UNIQUE(tenant_id, name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant ON feature_flags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(name);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(tenant_id, enabled);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_feature_flags_timestamp 
AFTER UPDATE ON feature_flags
BEGIN
    UPDATE feature_flags SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Insert default feature flags for the default tenant
INSERT OR IGNORE INTO feature_flags (tenant_id, name, enabled, description)
VALUES 
    ('tenant_default', 'advanced_search', 1, 'Enable advanced product search features'),
    ('tenant_default', 'multi_pass_ocr', 1, 'Enable multi-pass OCR for bill processing'),
    ('tenant_default', 'vendor_bill_automation', 1, 'Enable automated vendor bill processing'),
    ('tenant_default', 'sync_scheduler', 1, 'Enable automatic sync scheduling'),
    ('tenant_default', 'webhook_notifications', 1, 'Enable webhook notifications');
