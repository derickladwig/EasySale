-- Migration: Integration Credentials Storage
-- Purpose: Store encrypted credentials for external platform integrations
-- Platforms: WooCommerce, QuickBooks Online, Supabase
-- Requirements: 10.1, 10.2, 10.5, 10.6

-- Integration Credentials Table
-- Stores encrypted credentials for external platforms
CREATE TABLE IF NOT EXISTS integration_credentials (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('woocommerce', 'quickbooks', 'supabase')),
    
    -- Encrypted credential data (JSON blob)
    -- WooCommerce: { consumer_key, consumer_secret, store_url }
    -- QuickBooks: { client_id, client_secret, realm_id }
    -- Supabase: { project_url, service_role_key }
    credentials_encrypted TEXT NOT NULL,
    
    -- OAuth tokens (encrypted JSON blob)
    -- QuickBooks: { access_token, refresh_token, expires_at }
    oauth_tokens_encrypted TEXT,
    
    -- Platform-specific identifiers
    realm_id TEXT,           -- QuickBooks realm ID
    store_url TEXT,          -- WooCommerce store URL
    project_url TEXT,        -- Supabase project URL
    
    -- Status tracking
    is_active BOOLEAN NOT NULL DEFAULT 1,
    last_verified_at TIMESTAMP,
    verification_error TEXT,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    
    -- Constraints
    UNIQUE(tenant_id, platform)  -- One credential set per platform per tenant
);

-- Integration Status Table
-- Tracks connection health and sync statistics
CREATE TABLE IF NOT EXISTS integration_status (
    id TEXT PRIMARY KEY,
    credential_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    
    -- Connection health
    is_connected BOOLEAN NOT NULL DEFAULT 0,
    last_connection_check TIMESTAMP,
    last_successful_sync TIMESTAMP,
    last_sync_error TEXT,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    
    -- Sync statistics
    total_syncs INTEGER NOT NULL DEFAULT 0,
    successful_syncs INTEGER NOT NULL DEFAULT 0,
    failed_syncs INTEGER NOT NULL DEFAULT 0,
    entities_synced INTEGER NOT NULL DEFAULT 0,
    
    -- Rate limiting
    requests_today INTEGER NOT NULL DEFAULT 0,
    rate_limit_reset_at TIMESTAMP,
    is_rate_limited BOOLEAN NOT NULL DEFAULT 0,
    
    -- Webhook status
    webhook_url TEXT,
    webhook_secret TEXT,
    webhook_last_received TIMESTAMP,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (credential_id) REFERENCES integration_credentials(id) ON DELETE CASCADE,
    UNIQUE(credential_id)  -- One status per credential
);

-- Field Mapping Configuration Table
-- Defines how fields map between POS and external platforms
CREATE TABLE IF NOT EXISTS integration_field_mappings (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    entity_type TEXT NOT NULL,  -- customer, product, invoice, payment, etc.
    
    -- Mapping configuration (JSON)
    -- Example: { "pos_field": "customer_name", "platform_field": "DisplayName", "transform": "uppercase" }
    mapping_config TEXT NOT NULL,
    
    -- Sync direction
    sync_direction TEXT NOT NULL CHECK (sync_direction IN ('pos_to_platform', 'platform_to_pos', 'bidirectional')),
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT 1,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    
    -- Constraints
    UNIQUE(tenant_id, platform, entity_type)
);

-- Sync Operations Log Table
-- Tracks individual sync operations for debugging and audit
CREATE TABLE IF NOT EXISTS integration_sync_operations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    credential_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    
    -- Operation details
    operation_type TEXT NOT NULL,  -- create, update, delete, sync
    entity_type TEXT NOT NULL,     -- customer, product, invoice, etc.
    entity_id TEXT,                -- POS entity ID
    platform_entity_id TEXT,       -- External platform entity ID
    
    -- Operation status
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')),
    direction TEXT NOT NULL CHECK (direction IN ('pos_to_platform', 'platform_to_pos')),
    
    -- Payload and response
    request_payload TEXT,          -- JSON payload sent
    response_data TEXT,            -- JSON response received
    error_message TEXT,
    error_code TEXT,
    
    -- Timing
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    
    -- Retry tracking
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMP,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (credential_id) REFERENCES integration_credentials(id) ON DELETE CASCADE
);

-- Webhook Events Table
-- Stores incoming webhook events from external platforms
CREATE TABLE IF NOT EXISTS integration_webhook_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    
    -- Event details
    event_type TEXT NOT NULL,
    event_id TEXT,                 -- Platform's event ID
    entity_type TEXT,
    entity_id TEXT,                -- Platform's entity ID
    
    -- Payload
    payload TEXT NOT NULL,         -- Full webhook payload (JSON)
    signature TEXT,                -- HMAC signature for verification
    signature_verified BOOLEAN NOT NULL DEFAULT 0,
    
    -- Processing status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'ignored')),
    processed_at TIMESTAMP,
    error_message TEXT,
    
    -- Audit fields
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(platform, event_id)  -- Prevent duplicate event processing
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_integration_credentials_tenant ON integration_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_platform ON integration_credentials(platform);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_active ON integration_credentials(is_active);

CREATE INDEX IF NOT EXISTS idx_integration_status_tenant ON integration_status(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_status_platform ON integration_status(platform);
CREATE INDEX IF NOT EXISTS idx_integration_status_credential ON integration_status(credential_id);

CREATE INDEX IF NOT EXISTS idx_integration_mappings_tenant ON integration_field_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_mappings_platform ON integration_field_mappings(platform);
CREATE INDEX IF NOT EXISTS idx_integration_mappings_entity ON integration_field_mappings(entity_type);

CREATE INDEX IF NOT EXISTS idx_integration_ops_tenant ON integration_sync_operations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_ops_platform ON integration_sync_operations(platform);
CREATE INDEX IF NOT EXISTS idx_integration_ops_status ON integration_sync_operations(status);
CREATE INDEX IF NOT EXISTS idx_integration_ops_entity ON integration_sync_operations(entity_type);
CREATE INDEX IF NOT EXISTS idx_integration_ops_created ON integration_sync_operations(created_at);

CREATE INDEX IF NOT EXISTS idx_integration_webhooks_tenant ON integration_webhook_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_platform ON integration_webhook_events(platform);
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_status ON integration_webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_received ON integration_webhook_events(received_at);

-- Triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_integration_credentials_timestamp
AFTER UPDATE ON integration_credentials
FOR EACH ROW
BEGIN
    UPDATE integration_credentials SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_integration_status_timestamp
AFTER UPDATE ON integration_status
FOR EACH ROW
BEGIN
    UPDATE integration_status SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_integration_mappings_timestamp
AFTER UPDATE ON integration_field_mappings
FOR EACH ROW
BEGIN
    UPDATE integration_field_mappings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
