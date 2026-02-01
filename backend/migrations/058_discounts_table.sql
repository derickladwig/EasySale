-- Discounts table for configurable discount rules
-- Migration: 058_discounts_table.sql

CREATE TABLE IF NOT EXISTS discounts (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL DEFAULT 'default',
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    discount_type TEXT NOT NULL CHECK(discount_type IN ('percent', 'fixed', 'fixed_cart')),
    amount REAL NOT NULL,
    description TEXT,
    min_purchase_amount REAL,
    max_discount_amount REAL,
    start_date TEXT,
    end_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Index for querying by tenant and store
CREATE INDEX IF NOT EXISTS idx_discounts_tenant ON discounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_discounts_store ON discounts(store_id);
CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts(code);
CREATE INDEX IF NOT EXISTS idx_discounts_active ON discounts(is_active);

-- Unique constraint on code per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_discounts_code_tenant ON discounts(tenant_id, code);
