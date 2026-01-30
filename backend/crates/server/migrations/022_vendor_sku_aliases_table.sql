-- Migration 020: Vendor SKU Aliases Table
-- Creates the vendor_sku_aliases table for mapping vendor SKUs to internal SKUs

-- Vendor SKU aliases table
CREATE TABLE IF NOT EXISTS vendor_sku_aliases (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL,
    vendor_sku_norm TEXT NOT NULL, -- Normalized vendor SKU (uppercase, trimmed, no special chars)
    internal_sku TEXT NOT NULL, -- Internal SKU from products table
    
    -- Unit conversion configuration (JSON)
    -- Example: {"multiplier": 12, "from_unit": "CASE", "to_unit": "EA"}
    -- NULL if no conversion needed (1:1 mapping)
    unit_conversion TEXT,
    
    -- Priority for multiple aliases (higher = preferred)
    -- Used when multiple vendor SKUs map to same internal SKU
    priority INTEGER NOT NULL DEFAULT 0,
    
    -- Usage tracking for learning
    last_seen_at TEXT NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    
    -- Audit fields
    created_by TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Foreign keys
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (internal_sku) REFERENCES products(sku) ON DELETE CASCADE,
    
    -- Unique constraint: one vendor SKU maps to one internal SKU per vendor per tenant
    UNIQUE(vendor_id, vendor_sku_norm, tenant_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sku_aliases_vendor ON vendor_sku_aliases(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sku_aliases_vendor_sku ON vendor_sku_aliases(vendor_sku_norm);
CREATE INDEX IF NOT EXISTS idx_sku_aliases_internal ON vendor_sku_aliases(internal_sku);
CREATE INDEX IF NOT EXISTS idx_sku_aliases_tenant ON vendor_sku_aliases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sku_aliases_priority ON vendor_sku_aliases(priority DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sku_aliases_vendor_norm ON vendor_sku_aliases(vendor_id, vendor_sku_norm);
CREATE INDEX IF NOT EXISTS idx_sku_aliases_tenant_vendor ON vendor_sku_aliases(tenant_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_sku_aliases_usage ON vendor_sku_aliases(usage_count DESC, last_seen_at DESC);

-- Insert sample aliases for testing
INSERT OR IGNORE INTO vendor_sku_aliases (
    id, vendor_id, vendor_sku_norm, internal_sku, unit_conversion, 
    priority, last_seen_at, usage_count, created_by, tenant_id
)
VALUES 
    (
        'alias-001',
        'vendor-001',
        'ACME-OIL-5W30',
        'OIL-5W30-5L',
        NULL,
        10,
        datetime('now'),
        5,
        'user-admin-001',
        'default-tenant'
    ),
    (
        'alias-002',
        'vendor-001',
        'ACME-FILTER-STD',
        'FILTER-OIL-STD',
        NULL,
        10,
        datetime('now'),
        3,
        'user-admin-001',
        'default-tenant'
    ),
    (
        'alias-003',
        'vendor-002',
        'APD-BRAKE-FRONT',
        'BRAKE-PAD-FRONT',
        '{"multiplier": 1, "from_unit": "SET", "to_unit": "SET"}',
        10,
        datetime('now'),
        2,
        'user-admin-001',
        'default-tenant'
    );
