-- Migration 047: Product Alternate SKUs Table
-- Creates a table for cross-linked SKUs (manufacturer SKUs, UPC codes, alternate barcodes)
-- This allows a single product to be found by multiple identifiers

CREATE TABLE IF NOT EXISTS product_alternate_skus (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    
    -- The alternate identifier
    alternate_sku TEXT NOT NULL,
    
    -- Type of alternate SKU
    -- 'manufacturer' - Manufacturer part number
    -- 'upc' - Universal Product Code
    -- 'ean' - European Article Number
    -- 'vendor' - Vendor-specific SKU (links to vendor_sku_aliases)
    -- 'internal' - Internal cross-reference
    -- 'superseded' - Old SKU that was replaced
    -- 'equivalent' - Equivalent/compatible product
    sku_type TEXT NOT NULL DEFAULT 'manufacturer',
    
    -- Optional vendor reference (for vendor-specific SKUs)
    vendor_id TEXT,
    
    -- Priority for lookups (higher = preferred when multiple matches)
    priority INTEGER NOT NULL DEFAULT 0,
    
    -- Whether this is the primary identifier for this type
    is_primary INTEGER NOT NULL DEFAULT 0,
    
    -- Notes about this alternate SKU
    notes TEXT,
    
    -- Multi-tenant
    tenant_id TEXT NOT NULL,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Foreign keys
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
    
    -- Unique constraint: one alternate SKU per type per tenant
    UNIQUE(alternate_sku, sku_type, tenant_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_alt_skus_product ON product_alternate_skus(product_id);
CREATE INDEX IF NOT EXISTS idx_alt_skus_alternate ON product_alternate_skus(alternate_sku);
CREATE INDEX IF NOT EXISTS idx_alt_skus_type ON product_alternate_skus(sku_type);
CREATE INDEX IF NOT EXISTS idx_alt_skus_vendor ON product_alternate_skus(vendor_id);
CREATE INDEX IF NOT EXISTS idx_alt_skus_tenant ON product_alternate_skus(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alt_skus_priority ON product_alternate_skus(priority DESC);

-- Composite index for the most common lookup pattern
CREATE INDEX IF NOT EXISTS idx_alt_skus_lookup ON product_alternate_skus(tenant_id, alternate_sku, sku_type);
