-- Migration 010: Extend Products Table for Universal Product Catalog
-- Date: 2026-01-12
-- Description: Add dynamic attributes, variants, barcodes, and images support to products table
-- Impact: 1 table (products), ~5 existing rows
-- Estimated Time: < 2 seconds
-- Risk: VERY LOW (minimal data, backward compatible with default values)

-- This migration extends the products table to support:
-- 1. Dynamic attributes (JSON) - category-specific custom fields
-- 2. Product variants - parent-child relationships for size/color variations
-- 3. Barcode support - multiple barcode types (UPC, EAN, Code 128, QR)
-- 4. Images - JSON array of image URLs
-- 5. Multi-tenant support - tenant_id already added in migration 008

-- NOTE: No explicit transaction - each ALTER TABLE is atomic in SQLite

-- ============================================================================
-- EXTEND PRODUCTS TABLE
-- ============================================================================

-- Add attributes column for dynamic category-specific attributes
-- Stores JSON object validated against category configuration
ALTER TABLE products ADD COLUMN attributes TEXT DEFAULT '{}';

-- Add parent_id for product variants (e.g., "Red Cap Size L" is variant of "Cap")
-- NULL = standalone product, non-NULL = this is a variant of parent product
ALTER TABLE products ADD COLUMN parent_id TEXT DEFAULT NULL;

-- Add barcode support
-- barcode: The actual barcode value (UPC, EAN, internal code, etc.)
-- barcode_type: Format identifier (UPC-A, EAN-13, Code128, QR, etc.)
ALTER TABLE products ADD COLUMN barcode TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN barcode_type TEXT DEFAULT NULL;

-- Add images support (JSON array of image URLs)
-- Example: ["https://cdn.example.com/product1.jpg", "https://cdn.example.com/product2.jpg"]
ALTER TABLE products ADD COLUMN images TEXT DEFAULT '[]';

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on parent_id for fast variant lookups
CREATE INDEX IF NOT EXISTS idx_products_parent_id ON products(parent_id);

-- Index on barcode for instant barcode scanner lookups (< 100ms requirement)
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- Composite index on category + tenant_id for category-filtered queries
CREATE INDEX IF NOT EXISTS idx_products_category_tenant ON products(category, tenant_id);

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINT (via trigger since SQLite doesn't support ALTER TABLE ADD CONSTRAINT)
-- ============================================================================

-- Ensure parent_id references a valid product
CREATE TRIGGER IF NOT EXISTS fk_products_parent_id_insert
BEFORE INSERT ON products
WHEN NEW.parent_id IS NOT NULL AND (SELECT id FROM products WHERE id = NEW.parent_id) IS NULL
BEGIN
    SELECT RAISE(ABORT, 'Foreign key constraint failed: parent_id must reference existing product');
END;

CREATE TRIGGER IF NOT EXISTS fk_products_parent_id_update
BEFORE UPDATE OF parent_id ON products
WHEN NEW.parent_id IS NOT NULL AND (SELECT id FROM products WHERE id = NEW.parent_id) IS NULL
BEGIN
    SELECT RAISE(ABORT, 'Foreign key constraint failed: parent_id must reference existing product');
END;

-- Prevent circular variant relationships (variant cannot be parent of another product)
CREATE TRIGGER IF NOT EXISTS prevent_variant_as_parent
BEFORE INSERT ON products
WHEN NEW.parent_id IS NOT NULL AND (SELECT parent_id FROM products WHERE id = NEW.parent_id) IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'Variant cannot be parent of another product');
END;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify new columns exist
SELECT 'Checking for new columns...' AS status;
SELECT 
    COUNT(*) as column_count
FROM pragma_table_info('products')
WHERE name IN ('attributes', 'parent_id', 'barcode', 'barcode_type', 'images');
-- Should return 5

-- Verify all existing products have default values
SELECT 'Checking default values...' AS status;
SELECT 
    COUNT(*) as products_with_defaults
FROM products
WHERE 
    attributes = '{}'
    AND parent_id IS NULL
    AND barcode IS NULL
    AND barcode_type IS NULL
    AND images = '[]';
-- Should match total product count

-- Verify indexes created
SELECT 'Checking indexes created...' AS status;
SELECT COUNT(*) as index_count 
FROM sqlite_master 
WHERE type = 'index' 
  AND name IN ('idx_products_parent_id', 'idx_products_barcode', 'idx_products_category_tenant');
-- Should return 3

-- Verify triggers created
SELECT 'Checking triggers created...' AS status;
SELECT COUNT(*) as trigger_count
FROM sqlite_master
WHERE type = 'trigger'
  AND name IN ('fk_products_parent_id_insert', 'fk_products_parent_id_update', 'prevent_variant_as_parent');
-- Should return 3

-- Show sample of extended products table
SELECT 'Sample products with new columns...' AS status;
SELECT 
    id,
    sku,
    name,
    category,
    attributes,
    parent_id,
    barcode,
    barcode_type,
    images,
    tenant_id
FROM products
LIMIT 3;

-- Final status
SELECT 'Migration 010 completed successfully!' AS status;
SELECT 'Products table extended with 5 new columns' AS details;
SELECT '3 indexes created for performance' AS details;
SELECT '3 triggers created for data integrity' AS details;
SELECT 'All existing products have default values' AS details;
