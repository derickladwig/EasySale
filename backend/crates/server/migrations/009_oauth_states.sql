-- Migration: OAuth States Table
-- Description: Stores temporary OAuth state tokens for CSRF protection during OAuth flows

-- OAuth States: Temporary storage for OAuth CSRF tokens
CREATE TABLE IF NOT EXISTS oauth_states (
    state TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    platform TEXT NOT NULL,  -- 'google_drive', 'quickbooks', etc.
    destination_name TEXT,  -- For backup destinations
    folder_path TEXT,  -- For Google Drive folder path
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_tenant ON oauth_states(tenant_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_platform ON oauth_states(platform);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

-- Clean up expired OAuth states (older than 1 hour)
-- This should be run periodically by a cleanup job
-- DELETE FROM oauth_states WHERE datetime(expires_at) < datetime('now', '-1 hour');
