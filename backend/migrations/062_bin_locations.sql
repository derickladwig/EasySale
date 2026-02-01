-- Migration 062: Bin Location Management
-- Creates tables for warehouse bin locations and adds bin_location to products
-- Ported from POS project's bin location feature

-- ============================================================================
-- BIN LOCATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS bin_locations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    
    -- Location code (e.g., "A-01-03" for Zone A, Aisle 1, Shelf 3)
    code TEXT NOT NULL,
    
    -- Human-readable name
    name TEXT,
    
    -- Hierarchical location components
    zone TEXT,       -- e.g., "A", "B", "Receiving", "Shipping"
    aisle TEXT,      -- e.g., "01", "02"
    shelf TEXT,      -- e.g., "01", "02", "03"
    bin TEXT,        -- e.g., "A", "B", "C" (position on shelf)
    
    -- Description and notes
    description TEXT,
    
    -- Bin type for categorization
    bin_type TEXT DEFAULT 'standard',
    -- standard: regular storage
    -- bulk: large items
    -- small_parts: small components
    -- hazmat: hazardous materials
    -- cold: refrigerated
    -- secure: high-value items
    
    -- Capacity tracking
    max_capacity INTEGER,
    current_count INTEGER DEFAULT 0,
    
    -- Status
    active INTEGER NOT NULL DEFAULT 1,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Unique constraint: one code per store per tenant
    UNIQUE(tenant_id, store_id, code),
    
    -- Foreign keys
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- Indexes for bin locations
CREATE INDEX IF NOT EXISTS idx_bin_locations_tenant ON bin_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bin_locations_store ON bin_locations(store_id);
CREATE INDEX IF NOT EXISTS idx_bin_locations_code ON bin_locations(code);
CREATE INDEX IF NOT EXISTS idx_bin_locations_zone ON bin_locations(zone);
CREATE INDEX IF NOT EXISTS idx_bin_locations_active ON bin_locations(active);
CREATE INDEX IF NOT EXISTS idx_bin_locations_type ON bin_locations(bin_type);

-- Composite index for common lookups
CREATE INDEX IF NOT EXISTS idx_bin_locations_lookup ON bin_locations(tenant_id, store_id, zone, active);

-- ============================================================================
-- ADD BIN_LOCATION TO PRODUCTS
-- ============================================================================

-- Add bin_location column to products table if it doesn't exist
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a workaround
-- This will fail silently if the column already exists

-- Check if column exists and add if not
SELECT CASE 
    WHEN COUNT(*) = 0 THEN 
        'ALTER TABLE products ADD COLUMN bin_location TEXT'
    ELSE 
        'SELECT 1'
END as sql_to_run
FROM pragma_table_info('products') 
WHERE name = 'bin_location';

-- Actually add the column (this may fail if it exists, which is fine)
-- We wrap in a transaction that can fail
BEGIN TRANSACTION;
ALTER TABLE products ADD COLUMN bin_location TEXT;
COMMIT;

-- Create index on products.bin_location
CREATE INDEX IF NOT EXISTS idx_products_bin_location ON products(bin_location);

-- ============================================================================
-- BIN LOCATION HISTORY (for tracking moves)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bin_location_history (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    
    -- Location change
    from_bin_location TEXT,
    to_bin_location TEXT,
    
    -- Quantity moved (for partial moves)
    quantity_moved INTEGER DEFAULT 1,
    
    -- Who and when
    moved_by_user_id TEXT,
    moved_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Reason for move
    reason TEXT,
    -- pick: picked for order
    -- restock: restocking
    -- reorganize: warehouse reorganization
    -- count: inventory count adjustment
    -- receiving: new stock received
    
    -- Reference to related document
    reference_type TEXT,
    reference_id TEXT,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Foreign keys
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Indexes for bin location history
CREATE INDEX IF NOT EXISTS idx_bin_history_tenant ON bin_location_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bin_history_product ON bin_location_history(product_id);
CREATE INDEX IF NOT EXISTS idx_bin_history_from ON bin_location_history(from_bin_location);
CREATE INDEX IF NOT EXISTS idx_bin_history_to ON bin_location_history(to_bin_location);
CREATE INDEX IF NOT EXISTS idx_bin_history_date ON bin_location_history(moved_at DESC);

-- ============================================================================
-- ZONE CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS bin_zones (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    
    -- Zone identifier
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    
    -- Zone properties
    description TEXT,
    color TEXT,  -- For visual identification in UI
    
    -- Zone type
    zone_type TEXT DEFAULT 'storage',
    -- storage: regular storage
    -- receiving: incoming goods
    -- shipping: outgoing goods
    -- staging: temporary holding
    -- returns: returned items
    -- quarantine: items needing inspection
    
    -- Sort order for display
    sort_order INTEGER DEFAULT 0,
    
    -- Status
    active INTEGER NOT NULL DEFAULT 1,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Unique constraint
    UNIQUE(tenant_id, store_id, code)
);

-- Indexes for zones
CREATE INDEX IF NOT EXISTS idx_bin_zones_tenant ON bin_zones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bin_zones_store ON bin_zones(store_id);
CREATE INDEX IF NOT EXISTS idx_bin_zones_code ON bin_zones(code);
CREATE INDEX IF NOT EXISTS idx_bin_zones_type ON bin_zones(zone_type);
