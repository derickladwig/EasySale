-- Migration: Integration Sync State Enhancement
-- Requirements: Multi-page fetching, progress tracking, resume capability
-- Date: 2026-01-19

-- Add integration sync fields to sync_state table
ALTER TABLE sync_state ADD COLUMN id TEXT;
ALTER TABLE sync_state ADD COLUMN connector_id TEXT;
ALTER TABLE sync_state ADD COLUMN sync_mode TEXT;  -- 'full' or 'incremental'
ALTER TABLE sync_state ADD COLUMN status TEXT;  -- 'pending', 'running', 'completed', 'partial', 'failed', 'cancelled'
ALTER TABLE sync_state ADD COLUMN dry_run BOOLEAN DEFAULT 0;
ALTER TABLE sync_state ADD COLUMN records_processed INTEGER DEFAULT 0;
ALTER TABLE sync_state ADD COLUMN records_created INTEGER DEFAULT 0;
ALTER TABLE sync_state ADD COLUMN records_updated INTEGER DEFAULT 0;
ALTER TABLE sync_state ADD COLUMN records_failed INTEGER DEFAULT 0;
ALTER TABLE sync_state ADD COLUMN resume_checkpoint TEXT;  -- JSON with last processed entity info
ALTER TABLE sync_state ADD COLUMN started_at TEXT;
ALTER TABLE sync_state ADD COLUMN completed_at TEXT;

-- Create indexes for integration sync queries
CREATE INDEX IF NOT EXISTS idx_sync_state_id ON sync_state(id);
CREATE INDEX IF NOT EXISTS idx_sync_state_connector ON sync_state(connector_id);
CREATE INDEX IF NOT EXISTS idx_sync_state_status ON sync_state(status);
CREATE INDEX IF NOT EXISTS idx_sync_state_tenant_connector ON sync_state(tenant_id, connector_id);
CREATE INDEX IF NOT EXISTS idx_sync_state_tenant_status ON sync_state(tenant_id, status);

