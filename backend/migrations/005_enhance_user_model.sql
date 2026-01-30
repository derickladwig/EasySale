-- Migration: Enhance User Model for Settings
-- Adds store/station assignment fields to support multi-store operations

-- Create stores table first (needed for foreign key references)
CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    phone TEXT,
    email TEXT,
    timezone TEXT NOT NULL DEFAULT 'America/Toronto',
    currency TEXT NOT NULL DEFAULT 'CAD',
    receipt_footer TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Sync metadata
    sync_version INTEGER NOT NULL DEFAULT 1,
    synced_at TEXT
);

-- Create stations table
CREATE TABLE IF NOT EXISTS stations (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    name TEXT NOT NULL,
    device_id TEXT,
    ip_address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    offline_mode_enabled BOOLEAN NOT NULL DEFAULT 0,
    last_seen_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Sync metadata
    sync_version INTEGER NOT NULL DEFAULT 1,
    synced_at TEXT,
    
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- Create indexes for performance (IF NOT EXISTS is supported for indexes)
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON stores(is_active);
CREATE INDEX IF NOT EXISTS idx_stations_store_id ON stations(store_id);
CREATE INDEX IF NOT EXISTS idx_stations_is_active ON stations(is_active);

-- Insert default store if not exists
INSERT OR IGNORE INTO stores (id, name, timezone, currency, is_active)
VALUES ('default-store', 'Main Store', 'America/Toronto', 'CAD', 1);

-- Insert default station for the default store if not exists
INSERT OR IGNORE INTO stations (id, store_id, name, is_active)
VALUES ('default-station', 'default-store', 'Main Terminal', 1);
