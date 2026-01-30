-- Migration 012: Product Variants Table
-- Date: 2026-01-12
-- Description: Create table for managing product variants (size, color, etc.)
-- Impact: New table for parent-child product relationships
-- Estimated Time: < 1 second
-- Risk: VERY LOW (new table, no existing data)

-- This migration creates infrastructure for product variants:
-- 1. Parent-child relationships (e.g., "Cap" parent with "Red Cap Size L" variant)
-- 2. Variant-specific attributes (only attributes that differ from parent)
-- 3. Display ordering for variant presentation
-- 4. Support up to 100 variants per parent product

-- Use cases:
-- - Clothing: Different sizes/colors of same item
-- - Auto parts: Same part for different vehicle years
-- - Paint: Same color in different sizes/finishes
-- - Electronics: Different storage capacities

-- ============================================================================
-- CREATE PRODUCT VARIANTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    parent_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    variant_attributes TEXT DEFAULT '{}', -- JSON: attributes that differ from parent
    display_order INTEGER DEFAULT 0,
    tenant_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Ensure parent and variant are different products
    CHECK (parent_id != variant_id),
    
    -- Ensure unique parent-variant combinations
    UNIQUE(parent_id, variant_id),
    
    -- Foreign keys
    FOREIGN KEY (parent_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on parent_id for fast "get all variants of product X" queries
CREATE INDEX IF NOT EXISTS idx_variants_parent ON product_variants(parent_id);

-- Index on variant_id for fast "get parent of variant X" queries
CREATE INDEX IF NOT EXISTS idx_variants_variant ON product_variants(variant_id);

-- Index on tenant_id for multi-tenant isolation
CREATE INDEX IF NOT EXISTS idx_variants_tenant ON product_variants(tenant_id);

-- Composite index for tenant + parent queries
CREATE INDEX IF NOT EXISTS idx_variants_tenant_parent ON product_variants(tenant_id, parent_id);

-- ============================================================================
-- CREATE TRIGGERS FOR DATA INTEGRITY
-- ============================================================================

-- Trigger: Prevent variant from being a parent
-- A product that is itself a variant cannot be the parent of another variant
CREATE TRIGGER IF NOT EXISTS prevent_nested_variants
BEFORE INSERT ON product_variants
BEGIN
    SELECT CASE
        WHEN (SELECT parent_id FROM products WHERE id = NEW.parent_id) IS NOT NULL
        THEN RAISE(ABORT, 'A variant cannot be the parent of another variant')
    END;
END;

-- Trigger: Limit variants per parent to 100
CREATE TRIGGER IF NOT EXISTS limit_variants_per_parent
BEFORE INSERT ON product_variants
BEGIN
    SELECT CASE
        WHEN (SELECT COUNT(*) FROM product_variants WHERE parent_id = NEW.parent_id) >= 100
        THEN RAISE(ABORT, 'Maximum 100 variants per parent product exceeded')
    END;
END;

-- Trigger: Ensure parent and variant are in same tenant
CREATE TRIGGER IF NOT EXISTS enforce_variant_tenant_match
BEFORE INSERT ON product_variants
BEGIN
    SELECT CASE
        WHEN (
            SELECT tenant_id FROM products WHERE id = NEW.parent_id
        ) != (
            SELECT tenant_id FROM products WHERE id = NEW.variant_id
        )
        THEN RAISE(ABORT, 'Parent and variant must belong to same tenant')
    END;
END;

-- Trigger: Update updated_at timestamp on changes
CREATE TRIGGER IF NOT EXISTS update_variant_timestamp
AFTER UPDATE ON product_variants
BEGIN
    UPDATE product_variants 
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

-- Trigger: Sync parent_id in products table when variant relationship created
CREATE TRIGGER IF NOT EXISTS sync_product_parent_id_insert
AFTER INSERT ON product_variants
BEGIN
    UPDATE products
    SET parent_id = NEW.parent_id
    WHERE id = NEW.variant_id;
END;

-- Trigger: Clear parent_id in products table when variant relationship deleted
CREATE TRIGGER IF NOT EXISTS sync_product_parent_id_delete
AFTER DELETE ON product_variants
BEGIN
    UPDATE products
    SET parent_id = NULL
    WHERE id = OLD.variant_id;
END;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table created
SELECT 'Checking product_variants table created...' AS status;
SELECT COUNT(*) as table_exists
FROM sqlite_master
WHERE type = 'table' AND name = 'product_variants';
-- Should return 1

-- Verify indexes created
SELECT 'Checking indexes created...' AS status;
SELECT COUNT(*) as index_count
FROM sqlite_master
WHERE type = 'index'
  AND name IN (
      'idx_variants_parent',
      'idx_variants_variant',
      'idx_variants_tenant',
      'idx_variants_tenant_parent'
  );
-- Should return 4

-- Verify triggers created
SELECT 'Checking triggers created...' AS status;
SELECT COUNT(*) as trigger_count
FROM sqlite_master
WHERE type = 'trigger'
  AND name IN (
      'prevent_nested_variants',
      'limit_variants_per_parent',
      'enforce_variant_tenant_match',
      'update_variant_timestamp',
      'sync_product_parent_id_insert',
      'sync_product_parent_id_delete'
  );
-- Should return 6

-- Verify table structure
SELECT 'Checking table structure...' AS status;
SELECT 
    COUNT(*) as column_count
FROM pragma_table_info('product_variants')
WHERE name IN (
    'id', 'parent_id', 'variant_id', 'variant_attributes',
    'display_order', 'tenant_id', 'created_at', 'updated_at'
);
-- Should return 8

-- Verify constraints
SELECT 'Checking constraints...' AS status;
SELECT sql
FROM sqlite_master
WHERE type = 'table' AND name = 'product_variants';
-- Should show CHECK and UNIQUE constraints

-- Show table is empty (no initial data)
SELECT 'Checking initial data...' AS status;
SELECT COUNT(*) as row_count FROM product_variants;
-- Should return 0

-- Final status
SELECT 'Migration 012 completed successfully!' AS status;
SELECT 'Product variants table created' AS details;
SELECT '4 indexes created for performance' AS details;
SELECT '6 triggers created for data integrity' AS details;
SELECT 'Supports up to 100 variants per parent product' AS details;
SELECT 'Ready for variant management (sizes, colors, etc.)' AS details;
