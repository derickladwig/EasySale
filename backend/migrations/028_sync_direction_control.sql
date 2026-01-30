-- Migration: Sync Direction Control
-- Purpose: Add sync direction and source-of-truth configuration
-- Requirements: 4.1, 4.2, 4.4, 4.6

-- Add sync direction fields to integration_credentials
ALTER TABLE integration_credentials ADD COLUMN sync_direction TEXT NOT NULL DEFAULT 'one_way' CHECK (sync_direction IN ('one_way', 'two_way'));
ALTER TABLE integration_credentials ADD COLUMN sync_config TEXT; -- JSON: { entity_type: { source_of_truth: 'pos'|'platform', conflict_strategy: 'source_wins'|'target_wins'|'newest_wins' } }

-- Add sync loop prevention fields to integration_sync_operations
ALTER TABLE integration_sync_operations ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE integration_sync_operations ADD COLUMN already_synced BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE integration_sync_operations ADD COLUMN sync_hash TEXT; -- Hash of entity data to detect changes

-- Create sync conflict resolution log table
CREATE TABLE IF NOT EXISTS integration_sync_conflicts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    credential_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    
    -- Conflict details
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,           -- POS entity ID
    platform_entity_id TEXT,           -- Platform entity ID
    
    -- Conflicting versions
    pos_version TEXT NOT NULL,         -- JSON snapshot of POS data
    platform_version TEXT NOT NULL,    -- JSON snapshot of platform data
    pos_updated_at TIMESTAMP NOT NULL,
    platform_updated_at TIMESTAMP NOT NULL,
    
    -- Resolution
    resolution_strategy TEXT NOT NULL CHECK (resolution_strategy IN ('source_wins', 'target_wins', 'newest_wins', 'manual')),
    resolved_version TEXT,             -- Which version was chosen
    resolved_data TEXT,                -- Final resolved data (JSON)
    resolved_at TIMESTAMP,
    resolved_by TEXT,                  -- User ID if manual resolution
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'failed')),
    error_message TEXT,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (credential_id) REFERENCES integration_credentials(id) ON DELETE CASCADE
);

-- Indexes for conflict resolution
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_tenant ON integration_sync_conflicts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_platform ON integration_sync_conflicts(platform);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON integration_sync_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entity ON integration_sync_conflicts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_created ON integration_sync_conflicts(created_at);

-- Trigger for updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_sync_conflicts_timestamp
AFTER UPDATE ON integration_sync_conflicts
FOR EACH ROW
BEGIN
    UPDATE integration_sync_conflicts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Add index for sync loop prevention
CREATE INDEX IF NOT EXISTS idx_integration_ops_sync_hash ON integration_sync_operations(sync_hash);
CREATE INDEX IF NOT EXISTS idx_integration_ops_already_synced ON integration_sync_operations(already_synced);
