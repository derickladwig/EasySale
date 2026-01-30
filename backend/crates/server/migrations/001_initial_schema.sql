-- Initial database schema for EasySale System
-- SQLite database with tenants, users, roles, permissions, and sessions

-- ============================================================================
-- TENANTS TABLE (Multi-Tenant Foundation)
-- ============================================================================
-- This is the foundational table for multi-tenancy.
-- Tenant configuration comes from JSON files, but runtime tenant data
-- (status, settings, audit info) is stored in the database.

CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,                    -- Matches tenant_id used throughout system
    name TEXT NOT NULL,                     -- Tenant/company name
    slug TEXT NOT NULL UNIQUE,              -- URL-safe identifier
    domain TEXT,                            -- Custom domain (if applicable)
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT 1,   -- Active/suspended status
    subscription_tier TEXT,                 -- Subscription level (if applicable)
    
    -- Configuration reference
    config_path TEXT,                       -- Path to tenant config file
    config_version TEXT,                    -- Config version for cache invalidation
    
    -- Limits and quotas
    max_stores INTEGER,                     -- Maximum stores allowed
    max_users INTEGER,                      -- Maximum users allowed
    max_products INTEGER,                   -- Maximum products allowed
    storage_limit_mb INTEGER,               -- Storage limit in MB
    
    -- Audit fields
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    last_login_at TEXT,
    
    -- Metadata (JSON)
    metadata TEXT                           -- Additional tenant-specific data
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_tenants_timestamp 
AFTER UPDATE ON tenants
BEGIN
    UPDATE tenants SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Insert default tenant for development/testing
-- This matches the TENANT_ID environment variable default
INSERT OR IGNORE INTO tenants (id, name, slug, is_active, config_path)
VALUES ('tenant_default', 'Default Tenant', 'default', 1, 'configs/default.json');

-- ============================================================================
-- USERS TABLE
-- ============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Sessions table for JWT token management
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index on token for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Insert default admin user
-- Password: admin123 (hashed with bcrypt cost 12)
INSERT OR IGNORE INTO users (id, username, email, password_hash, role, first_name, last_name, is_active)
VALUES (
    'user-admin-001',
    'admin',
    'admin@EasySale.local',
    '$2b$12$2UrDfkRjiqBvTeTP0BZkJOPW3mApbAA10eZuCU40kgJ9lbTEt7eE2',
    'admin',
    'System',
    'Administrator',
    1
);

-- Insert test cashier user
-- Password: cashier123 (hashed with bcrypt cost 12)
INSERT OR IGNORE INTO users (id, username, email, password_hash, role, first_name, last_name, is_active)
VALUES (
    'user-cashier-001',
    'cashier',
    'cashier@EasySale.local',
    '$2b$12$6P8ou8yPu.DohNBhRyhQz.Xhl0RP6OHm32XBQNNrjvsFXcS.WrcdW',
    'cashier',
    'Jane',
    'Cashier',
    1
);

-- Insert test manager user
-- Password: manager123 (hashed with bcrypt cost 12)
INSERT OR IGNORE INTO users (id, username, email, password_hash, role, first_name, last_name, is_active)
VALUES (
    'user-manager-001',
    'manager',
    'manager@EasySale.local',
    '$2b$12$wv97c3pGP1cy7ugkeyUkVeOY7ooTR0qk/abW6wcrOmo3FabNN8KxW',
    'manager',
    'John',
    'Manager',
    1
);
