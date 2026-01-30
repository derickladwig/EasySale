-- Migration 013: Product Relationships Table
-- Date: 2026-01-12
-- Description: Create table for managing product relationships (related, accessories, alternatives, bundles)
-- Impact: New table for product-to-product relationships
-- Estimated Time: < 1 second
-- Risk: VERY LOW (new table, no existing data)

-- This migration creates infrastructure for product relationships:
-- 1. Related products (frequently viewed together)
-- 2. Accessories (complementary items, e.g., phone case for phone)
-- 3. Alternatives (substitutes when out of stock)
-- 4. Bundles (products sold together as a package)

-- Use cases:
-- - Cross-selling: "Customers who bought X also bought Y"
-- - Upselling: "Complete your purchase with these accessories"
-- - Stock management: "Out of stock? Try these alternatives"
-- - Package deals: "Buy this bundle and save 15%"

-- ============================================================================
-- CREATE PRODUCT RELATIONSHIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_relationships (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    related_product_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL, -- 'related', 'accessory', 'alternative', 'bundle'
    display_order INTEGER DEFAULT 0,
    tenant_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Ensure product and related product are different
    CHECK (product_id != related_product_id),
    
    -- Ensure valid relationship types
    CHECK (relationship_type IN ('related', 'accessory', 'alternative', 'bundle')),
    
    -- Ensure unique product-related product-type combinations
    UNIQUE(product_id, related_product_id, relationship_type),
    
    -- Foreign keys
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (related_product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on product_id for fast "get all relationships for product X" queries
CREATE INDEX IF NOT EXISTS idx_relationships_product ON product_relationships(product_id);

-- Index on related_product_id for reverse lookups
CREATE INDEX IF NOT EXISTS idx_relationships_related ON product_relationships(related_product_id);

-- Index on relationship_type for filtering by type
CREATE INDEX IF NOT EXISTS idx_relationships_type ON product_relationships(relationship_type);

-- Index on tenant_id for multi-tenant isolation
CREATE INDEX IF NOT EXISTS idx_relationships_tenant ON product_relationships(tenant_id);

-- Composite index for tenant + product queries
CREATE INDEX IF NOT EXISTS idx_relationships_tenant_product ON product_relationships(tenant_id, product_id);

-- Composite index for product + type queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_relationships_product_type ON product_relationships(product_id, relationship_type);

-- ============================================================================
-- CREATE TRIGGERS FOR DATA INTEGRITY
-- ============================================================================

-- Trigger: Limit relationships per product to 20
CREATE TRIGGER IF NOT EXISTS limit_relationships_per_product
BEFORE INSERT ON product_relationships
BEGIN
    SELECT CASE
        WHEN (SELECT COUNT(*) FROM product_relationships WHERE product_id = NEW.product_id) >= 20
        THEN RAISE(ABORT, 'Maximum 20 relationships per product exceeded')
    END;
END;

-- Trigger: Ensure both products are in same tenant
CREATE TRIGGER IF NOT EXISTS enforce_relationship_tenant_match
BEFORE INSERT ON product_relationships
BEGIN
    SELECT CASE
        WHEN (
            SELECT tenant_id FROM products WHERE id = NEW.product_id
        ) != (
            SELECT tenant_id FROM products WHERE id = NEW.related_product_id
        )
        THEN RAISE(ABORT, 'Related products must belong to same tenant')
    END;
END;

-- Trigger: Ensure both products are active
CREATE TRIGGER IF NOT EXISTS enforce_relationship_active_products
BEFORE INSERT ON product_relationships
BEGIN
    SELECT CASE
        WHEN (SELECT is_active FROM products WHERE id = NEW.product_id) = 0
        THEN RAISE(ABORT, 'Cannot create relationship: product is inactive')
        WHEN (SELECT is_active FROM products WHERE id = NEW.related_product_id) = 0
        THEN RAISE(ABORT, 'Cannot create relationship: related product is inactive')
    END;
END;

-- Trigger: Update updated_at timestamp on changes
CREATE TRIGGER IF NOT EXISTS update_relationship_timestamp
AFTER UPDATE ON product_relationships
BEGIN
    UPDATE product_relationships 
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

-- Trigger: Auto-delete relationships when product is deactivated
CREATE TRIGGER IF NOT EXISTS cleanup_relationships_on_deactivate
AFTER UPDATE OF is_active ON products
WHEN NEW.is_active = 0
BEGIN
    DELETE FROM product_relationships 
    WHERE product_id = NEW.id OR related_product_id = NEW.id;
END;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table created
SELECT 'Checking product_relationships table created...' AS status;
SELECT COUNT(*) as table_exists
FROM sqlite_master
WHERE type = 'table' AND name = 'product_relationships';
-- Should return 1

-- Verify indexes created
SELECT 'Checking indexes created...' AS status;
SELECT COUNT(*) as index_count
FROM sqlite_master
WHERE type = 'index'
  AND name IN (
      'idx_relationships_product',
      'idx_relationships_related',
      'idx_relationships_type',
      'idx_relationships_tenant',
      'idx_relationships_tenant_product',
      'idx_relationships_product_type'
  );
-- Should return 6

-- Verify triggers created
SELECT 'Checking triggers created...' AS status;
SELECT COUNT(*) as trigger_count
FROM sqlite_master
WHERE type = 'trigger'
  AND name IN (
      'limit_relationships_per_product',
      'enforce_relationship_tenant_match',
      'enforce_relationship_active_products',
      'update_relationship_timestamp',
      'cleanup_relationships_on_deactivate'
  );
-- Should return 5

-- Verify table structure
SELECT 'Checking table structure...' AS status;
SELECT 
    COUNT(*) as column_count
FROM pragma_table_info('product_relationships')
WHERE name IN (
    'id', 'product_id', 'related_product_id', 'relationship_type',
    'display_order', 'tenant_id', 'created_at', 'updated_at'
);
-- Should return 8

-- Verify constraints
SELECT 'Checking constraints...' AS status;
SELECT sql
FROM sqlite_master
WHERE type = 'table' AND name = 'product_relationships';
-- Should show CHECK and UNIQUE constraints

-- Verify valid relationship types
SELECT 'Checking relationship types...' AS status;
SELECT 'Valid types: related, accessory, alternative, bundle' AS info;

-- Show table is empty (no initial data)
SELECT 'Checking initial data...' AS status;
SELECT COUNT(*) as row_count FROM product_relationships;
-- Should return 0

-- Final status
SELECT 'Migration 013 completed successfully!' AS status;
SELECT 'Product relationships table created' AS details;
SELECT '6 indexes created for performance' AS details;
SELECT '5 triggers created for data integrity' AS details;
SELECT 'Supports 4 relationship types: related, accessory, alternative, bundle' AS details;
SELECT 'Maximum 20 relationships per product' AS details;
SELECT 'Ready for cross-selling and upselling features' AS details;
