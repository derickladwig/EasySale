-- Tax rules table for configurable tax rates
-- Migration: 047_tax_rules.sql

CREATE TABLE IF NOT EXISTS tax_rules (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    rate REAL NOT NULL DEFAULT 13.0,
    category TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Index for querying by tenant and store
CREATE INDEX IF NOT EXISTS idx_tax_rules_tenant ON tax_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_rules_store ON tax_rules(store_id);

-- Insert default tax rule for each tenant
INSERT OR IGNORE INTO tax_rules (id, tenant_id, store_id, name, rate, is_default)
SELECT 
    'default-' || id,
    id,
    'default',
    'Default Tax (GST/HST)',
    13.0,
    1
FROM tenants;
