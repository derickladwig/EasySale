-- Field Mappings Migration
-- Stores field mapping configurations for cross-system data sync
-- Requirements: 3.1, 3.2

-- Field mappings table
CREATE TABLE IF NOT EXISTS field_mappings (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    mapping_id TEXT NOT NULL,  -- e.g., "woo-to-qbo-invoice"
    source_connector TEXT NOT NULL,  -- "woocommerce", "quickbooks", "supabase"
    target_connector TEXT NOT NULL,
    entity_type TEXT NOT NULL,  -- "order-to-invoice", "customer", "product"
    mappings_json TEXT NOT NULL,  -- JSON array of FieldMap objects
    transformations_json TEXT,  -- JSON array of Transformation objects (optional)
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_field_mappings_tenant ON field_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_field_mappings_mapping_id ON field_mappings(mapping_id);
CREATE INDEX IF NOT EXISTS idx_field_mappings_connectors ON field_mappings(source_connector, target_connector);
CREATE INDEX IF NOT EXISTS idx_field_mappings_entity ON field_mappings(entity_type);
CREATE INDEX IF NOT EXISTS idx_field_mappings_active ON field_mappings(is_active);

-- Unique constraint: one active mapping per tenant/mapping_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_field_mappings_unique_active 
ON field_mappings(tenant_id, mapping_id) 
WHERE is_active = 1;

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_field_mappings_timestamp 
AFTER UPDATE ON field_mappings
BEGIN
    UPDATE field_mappings 
    SET updated_at = datetime('now') 
    WHERE id = NEW.id;
END;
