-- Migration 024: Field Mappings Table
-- Create table for storing field mapping configurations

CREATE TABLE IF NOT EXISTS field_mappings (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    mapping_id TEXT NOT NULL, -- e.g., 'woo-to-qbo-invoice'
    source_connector TEXT NOT NULL, -- e.g., 'woocommerce'
    target_connector TEXT NOT NULL, -- e.g., 'quickbooks'
    entity_type TEXT NOT NULL, -- e.g., 'order-to-invoice'
    mappings_json TEXT NOT NULL, -- JSON array of FieldMap objects
    transformations_json TEXT, -- JSON array of Transformation objects (optional)
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_field_mappings_tenant_id ON field_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_field_mappings_mapping_id ON field_mappings(tenant_id, mapping_id);
CREATE INDEX IF NOT EXISTS idx_field_mappings_connectors ON field_mappings(tenant_id, source_connector, target_connector);
CREATE INDEX IF NOT EXISTS idx_field_mappings_entity_type ON field_mappings(tenant_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_field_mappings_active ON field_mappings(tenant_id, is_active);

-- Unique constraint: one active mapping per tenant/mapping_id combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_field_mappings_unique_active 
ON field_mappings(tenant_id, mapping_id) 
WHERE is_active = 1;

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_field_mappings_timestamp 
AFTER UPDATE ON field_mappings
BEGIN
    UPDATE field_mappings SET updated_at = datetime('now') WHERE id = NEW.id;
END;
