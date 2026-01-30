-- Migration 009: Create Settings Tables
-- Creates tables for storing user preferences and system settings

-- User preferences (per user, per tenant)
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    display_name TEXT,
    email TEXT,
    theme TEXT NOT NULL DEFAULT 'dark',
    email_notifications INTEGER NOT NULL DEFAULT 1,
    desktop_notifications INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, tenant_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_tenant ON user_preferences(tenant_id);

-- Localization settings (per tenant)
CREATE TABLE IF NOT EXISTS localization_settings (
    tenant_id TEXT PRIMARY KEY NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    currency TEXT NOT NULL DEFAULT 'CAD',
    currency_symbol TEXT NOT NULL DEFAULT '$',
    currency_position TEXT NOT NULL DEFAULT 'before',
    decimal_places INTEGER NOT NULL DEFAULT 2,
    tax_enabled INTEGER NOT NULL DEFAULT 1,
    tax_rate REAL NOT NULL DEFAULT 13.0,
    tax_name TEXT NOT NULL DEFAULT 'HST',
    date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
    time_format TEXT NOT NULL DEFAULT '24h',
    timezone TEXT NOT NULL DEFAULT 'America/Toronto',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Network and sync settings (per tenant)
CREATE TABLE IF NOT EXISTS network_settings (
    tenant_id TEXT PRIMARY KEY NOT NULL,
    sync_enabled INTEGER NOT NULL DEFAULT 1,
    sync_interval INTEGER NOT NULL DEFAULT 300,
    auto_resolve_conflicts INTEGER NOT NULL DEFAULT 1,
    offline_mode_enabled INTEGER NOT NULL DEFAULT 1,
    max_queue_size INTEGER NOT NULL DEFAULT 10000,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Performance monitoring settings (per tenant)
CREATE TABLE IF NOT EXISTS performance_settings (
    tenant_id TEXT PRIMARY KEY NOT NULL,
    monitoring_enabled INTEGER NOT NULL DEFAULT 0,
    monitoring_url TEXT,
    sentry_dsn TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default settings for existing tenant
INSERT OR IGNORE INTO localization_settings (tenant_id) VALUES ('caps-automotive');
INSERT OR IGNORE INTO network_settings (tenant_id) VALUES ('caps-automotive');
INSERT OR IGNORE INTO performance_settings (tenant_id) VALUES ('caps-automotive');
