-- Migration: 051_integrations_phase1.sql
-- Purpose: Add tables for Stripe Connect, integration logs, and data batches
-- Requirements: 1.3, 9.6, 11.5

-- Stripe Connected Accounts (for Stripe Connect OAuth)
CREATE TABLE IF NOT EXISTS stripe_connected_accounts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    stripe_user_id TEXT NOT NULL,  -- Connected account ID (acct_xxx)
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    scope TEXT NOT NULL,
    business_name TEXT,
    country TEXT,
    default_currency TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_connected_accounts_tenant 
ON stripe_connected_accounts(tenant_id);

-- Integration logs table for audit trail
CREATE TABLE IF NOT EXISTS integration_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error')),
    event TEXT NOT NULL,
    message TEXT NOT NULL,
    details TEXT,  -- JSON
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_integration_logs_tenant_platform 
ON integration_logs(tenant_id, platform, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_logs_level
ON integration_logs(level, created_at DESC);

-- Data batches for Data Manager (seed/upload/purge tracking)
CREATE TABLE IF NOT EXISTS data_batches (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    batch_type TEXT NOT NULL CHECK (batch_type IN ('seed', 'upload', 'purge')),
    entity_type TEXT NOT NULL,
    record_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_data_batches_tenant 
ON data_batches(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_batches_status
ON data_batches(status);

-- Square credentials extension (uses existing integration_credentials table)
-- Clover credentials extension (uses existing integration_credentials table)
-- Both use platform = 'square' or 'clover' in integration_credentials
