-- Migration: Notification Configurations
-- Task 14.3: Error notification system
-- Date: 2026-01-17

-- Notification configurations table
CREATE TABLE IF NOT EXISTS notification_configs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'slack', 'webhook')),
    enabled BOOLEAN NOT NULL DEFAULT 1,
    config TEXT NOT NULL, -- JSON: channel-specific configuration
    filters TEXT NOT NULL, -- JSON: notification filters
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_configs_tenant ON notification_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_configs_enabled ON notification_configs(tenant_id, enabled);

-- Notification history table (for tracking sent notifications)
CREATE TABLE IF NOT EXISTS notification_history (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    config_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    connector_id TEXT,
    entity_type TEXT,
    error_type TEXT,
    details TEXT, -- JSON
    sent_at TEXT NOT NULL DEFAULT (datetime('now')),
    success BOOLEAN NOT NULL DEFAULT 1,
    error_message TEXT,
    FOREIGN KEY (config_id) REFERENCES notification_configs(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_history_tenant ON notification_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_history_severity ON notification_history(tenant_id, severity);
CREATE INDEX IF NOT EXISTS idx_notification_history_connector ON notification_history(tenant_id, connector_id);

-- Example notification config (commented out - for reference)
-- INSERT INTO notification_configs (id, tenant_id, notification_type, enabled, config, filters)
-- VALUES (
--     'notif_' || lower(hex(randomblob(16))),
--     'tenant_default',
--     'slack',
--     1,
--     json_object(
--         'type', 'Slack',
--         'webhook_url', 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
--         'channel', '#sync-alerts',
--         'username', 'EasySale Sync Monitor'
--     ),
--     json_object(
--         'min_severity', 'warning',
--         'connectors', json_array('quickbooks', 'woocommerce'),
--         'entity_types', NULL,
--         'error_types', NULL
--     )
-- );

