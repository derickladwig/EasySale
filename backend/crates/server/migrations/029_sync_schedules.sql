-- Migration: Sync Schedules and Webhook Events
-- Purpose: Add scheduling and webhook event tracking for sync operations
-- Requirements: 5.3, 5.4, 5.5, 5.6

-- Sync Schedules Table
-- Stores cron-based sync schedules
CREATE TABLE IF NOT EXISTS sync_schedules (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    credential_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    
    -- Schedule configuration
    cron_expression TEXT NOT NULL,
    sync_mode TEXT NOT NULL CHECK (sync_mode IN ('full', 'incremental')),
    timezone TEXT NOT NULL DEFAULT 'America/Edmonton',
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT 1,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (credential_id) REFERENCES integration_credentials(id) ON DELETE CASCADE
);

-- Webhook Events Table
-- Tracks webhook events for deduplication
CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    
    -- Event details
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    
    -- Processing status
    processed BOOLEAN NOT NULL DEFAULT 0,
    processed_at TIMESTAMP,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(platform, event_id)  -- Prevent duplicate event processing
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_schedules_tenant ON sync_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sync_schedules_credential ON sync_schedules(credential_id);
CREATE INDEX IF NOT EXISTS idx_sync_schedules_active ON sync_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_sync_schedules_platform ON sync_schedules(platform);
CREATE INDEX IF NOT EXISTS idx_sync_schedules_entity ON sync_schedules(entity_type);

CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant ON webhook_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_platform ON webhook_events(platform);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);

-- Trigger for updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_sync_schedules_timestamp
AFTER UPDATE ON sync_schedules
FOR EACH ROW
BEGIN
    UPDATE sync_schedules SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
