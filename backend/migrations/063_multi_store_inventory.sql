-- Migration 063: Multi-Store Inventory Levels
-- Creates table for tracking inventory per store
-- Ported from POS project's multi-store inventory feature

-- ============================================================================
-- STORE INVENTORY LEVELS
-- ============================================================================

CREATE TABLE IF NOT EXISTS store_inventory_levels (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    
    -- Quantities
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    
    -- Reorder settings
    minimum_quantity INTEGER DEFAULT 0,
    reorder_point INTEGER DEFAULT 0,
    reorder_quantity INTEGER DEFAULT 0,
    
    -- Location within store
    default_bin_location TEXT,
    
    -- Last count tracking
    last_counted_at TEXT,
    last_counted_by TEXT,
    
    -- Cost tracking (per store, may vary)
    average_cost REAL DEFAULT 0,
    last_purchase_cost REAL DEFAULT 0,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Unique constraint: one record per product per store per tenant
    UNIQUE(tenant_id, store_id, product_id),
    
    -- Foreign keys
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Indexes for store inventory levels
CREATE INDEX IF NOT EXISTS idx_store_inv_tenant ON store_inventory_levels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_inv_store ON store_inventory_levels(store_id);
CREATE INDEX IF NOT EXISTS idx_store_inv_product ON store_inventory_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_store_inv_qty ON store_inventory_levels(quantity_on_hand);
CREATE INDEX IF NOT EXISTS idx_store_inv_low ON store_inventory_levels(quantity_on_hand) 
    WHERE quantity_on_hand <= reorder_point;
CREATE INDEX IF NOT EXISTS idx_store_inv_bin ON store_inventory_levels(default_bin_location);

-- Composite index for common lookups
CREATE INDEX IF NOT EXISTS idx_store_inv_lookup ON store_inventory_levels(tenant_id, store_id, product_id);

-- ============================================================================
-- INVENTORY TRANSFERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_transfers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    
    -- Transfer number for reference
    transfer_number TEXT NOT NULL,
    
    -- Source and destination
    from_store_id TEXT NOT NULL,
    to_store_id TEXT NOT NULL,
    
    -- Status workflow
    status TEXT NOT NULL DEFAULT 'draft',
    -- draft: being created
    -- pending: awaiting shipment
    -- in_transit: shipped, not received
    -- partial: partially received
    -- completed: fully received
    -- cancelled: cancelled
    
    -- Workflow tracking
    created_by_user_id TEXT NOT NULL,
    shipped_by_user_id TEXT,
    shipped_at TEXT,
    received_by_user_id TEXT,
    received_at TEXT,
    
    -- Notes
    notes TEXT,
    shipping_notes TEXT,
    receiving_notes TEXT,
    
    -- Totals (calculated from items)
    total_items INTEGER DEFAULT 0,
    total_quantity INTEGER DEFAULT 0,
    total_value REAL DEFAULT 0,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Foreign keys
    FOREIGN KEY (from_store_id) REFERENCES stores(id) ON DELETE RESTRICT,
    FOREIGN KEY (to_store_id) REFERENCES stores(id) ON DELETE RESTRICT
);

-- Indexes for transfers
CREATE INDEX IF NOT EXISTS idx_transfers_tenant ON inventory_transfers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transfers_number ON inventory_transfers(transfer_number);
CREATE INDEX IF NOT EXISTS idx_transfers_from ON inventory_transfers(from_store_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON inventory_transfers(to_store_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON inventory_transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_created ON inventory_transfers(created_at DESC);

-- ============================================================================
-- INVENTORY TRANSFER ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_transfer_items (
    id TEXT PRIMARY KEY,
    transfer_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    
    -- Quantities
    quantity_requested INTEGER NOT NULL,
    quantity_shipped INTEGER DEFAULT 0,
    quantity_received INTEGER DEFAULT 0,
    
    -- Cost at time of transfer
    unit_cost REAL DEFAULT 0,
    total_cost REAL GENERATED ALWAYS AS (quantity_requested * COALESCE(unit_cost, 0)) STORED,
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Foreign keys
    FOREIGN KEY (transfer_id) REFERENCES inventory_transfers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    
    -- One item per product per transfer
    UNIQUE(transfer_id, product_id)
);

-- Indexes for transfer items
CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer ON inventory_transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_product ON inventory_transfer_items(product_id);

-- ============================================================================
-- STORE REORDER SUGGESTIONS
-- ============================================================================

-- View for products that need reordering per store
CREATE VIEW IF NOT EXISTS v_store_reorder_suggestions AS
SELECT 
    sil.tenant_id,
    sil.store_id,
    s.name as store_name,
    sil.product_id,
    p.name as product_name,
    p.sku as product_sku,
    sil.quantity_on_hand,
    sil.quantity_reserved,
    sil.quantity_available,
    sil.reorder_point,
    sil.reorder_quantity,
    (sil.reorder_point - sil.quantity_available) as shortage,
    sil.last_purchase_cost,
    (sil.reorder_quantity * sil.last_purchase_cost) as estimated_order_cost
FROM store_inventory_levels sil
JOIN products p ON sil.product_id = p.id
JOIN stores s ON sil.store_id = s.id
WHERE sil.quantity_available <= sil.reorder_point
AND sil.reorder_point > 0
ORDER BY sil.store_id, (sil.reorder_point - sil.quantity_available) DESC;

-- ============================================================================
-- AGGREGATE INVENTORY VIEW
-- ============================================================================

-- View for total inventory across all stores
CREATE VIEW IF NOT EXISTS v_aggregate_inventory AS
SELECT 
    sil.tenant_id,
    sil.product_id,
    p.name as product_name,
    p.sku as product_sku,
    SUM(sil.quantity_on_hand) as total_on_hand,
    SUM(sil.quantity_reserved) as total_reserved,
    SUM(sil.quantity_available) as total_available,
    COUNT(DISTINCT sil.store_id) as store_count,
    AVG(sil.average_cost) as avg_cost,
    GROUP_CONCAT(s.name || ':' || sil.quantity_on_hand, ', ') as store_breakdown
FROM store_inventory_levels sil
JOIN products p ON sil.product_id = p.id
JOIN stores s ON sil.store_id = s.id
GROUP BY sil.tenant_id, sil.product_id, p.name, p.sku;
