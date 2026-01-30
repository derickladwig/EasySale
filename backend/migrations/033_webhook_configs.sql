-- Migration: Webhook Configuration Storage
-- Task 20.1: Store webhook configurations per tenant and platform
-- Created: 2026-01-17

-- Webhook configurations table
CREATE TABLE IF NOT EXISTS webhook_configs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id TEXT NOT NULL,
    platform TEXT NOT NULL, -- 'woocommerce', 'quickbooks', 'supabase'
    event_type TEXT, -- Optional: specific event type (e.g., 'order.created', 'invoice.updated')
    enabled INTEGER NOT NULL DEFAULT 1, -- 1 = enabled, 0 = disabled
    url TEXT, -- Optional: custom webhook URL (if different from default)
    secret TEXT NOT NULL, -- Webhook secret for signature validation (encrypted)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Ensure one config per tenant+platform+event_type combination
    UNIQUE(tenant_id, platform, event_type)
);

-- Index for fast lookups by tenant and platform
CREATE INDEX IF NOT EXISTS idx_webhook_configs_tenant_platform 
ON webhook_configs(tenant_id, platform);

-- Index for enabled webhooks only (for fast filtering)
CREATE INDEX IF NOT EXISTS idx_webhook_configs_enabled 
ON webhook_configs(tenant_id, platform, enabled) WHERE enabled = 1;

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_webhook_configs_timestamp 
AFTER UPDATE ON webhook_configs
BEGIN
    UPDATE webhook_configs SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Note: Default webhook configs should be inserted by application code when tenants are created
-- The tenants table is managed by the application, not migrations
