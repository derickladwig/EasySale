-- Migration 015: Product Templates Table
-- Date: 2026-01-12
-- Description: Create table for storing reusable product templates
-- Impact: New table for product templates
-- Estimated Time: < 1 second
-- Risk: VERY LOW (new table, no existing data)

-- This migration creates infrastructure for product templates:
-- 1. Reusable templates for common products
-- 2. Pre-filled attributes for faster product creation
-- 3. Category-specific templates
-- 4. Shared templates across stores in same tenant
-- 5. Support up to 50 templates per category

-- Use cases:
-- - Fast product entry: "Create from template" instead of filling all fields
-- - Consistency: Ensure similar products have same attributes
-- - Training: New staff can use templates to learn product structure
-- - Bulk operations: Create multiple similar products quickly
-- - Category defaults: Pre-fill common values for category

-- ============================================================================
-- CREATE PRODUCT TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    template_attributes TEXT NOT NULL DEFAULT '{}', -- JSON: all template field values
    is_shared INTEGER NOT NULL DEFAULT 1, -- 1 = shared across stores, 0 = store-specific
    created_by TEXT NOT NULL, -- User ID who created the template
    tenant_id TEXT NOT NULL,
    store_id TEXT, -- NULL if shared, specific store_id if store-specific
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Ensure template name is unique per category per tenant
    UNIQUE(tenant_id, category, name),
    
    -- Foreign keys
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on category for fast "get templates for category X" queries
CREATE INDEX IF NOT EXISTS idx_templates_category ON product_templates(category);

-- Index on tenant_id for multi-tenant isolation
CREATE INDEX IF NOT EXISTS idx_templates_tenant ON product_templates(tenant_id);

-- Index on created_by for user activity tracking
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON product_templates(created_by);

-- Index on store_id for store-specific templates
CREATE INDEX IF NOT EXISTS idx_templates_store ON product_templates(store_id);

-- Composite index for tenant + category queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_templates_tenant_category ON product_templates(tenant_id, category);

-- Composite index for shared templates
CREATE INDEX IF NOT EXISTS idx_templates_shared ON product_templates(is_shared, tenant_id, category);

-- ============================================================================
-- CREATE TRIGGERS FOR DATA INTEGRITY
-- ============================================================================

-- Trigger: Limit templates per category to 50
CREATE TRIGGER IF NOT EXISTS limit_templates_per_category
BEFORE INSERT ON product_templates
BEGIN
    SELECT CASE
        WHEN (
            SELECT COUNT(*) 
            FROM product_templates 
            WHERE tenant_id = NEW.tenant_id 
              AND category = NEW.category
        ) >= 50
        THEN RAISE(ABORT, 'Maximum 50 templates per category exceeded')
    END;
END;

-- Trigger: Ensure store_id matches tenant_id
CREATE TRIGGER IF NOT EXISTS enforce_template_store_tenant_match
BEFORE INSERT ON product_templates
WHEN NEW.store_id IS NOT NULL
BEGIN
    SELECT CASE
        WHEN (
            SELECT tenant_id FROM stores WHERE id = NEW.store_id
        ) != NEW.tenant_id
        THEN RAISE(ABORT, 'Store must belong to same tenant as template')
    END;
END;

-- Trigger: Ensure shared templates have NULL store_id
CREATE TRIGGER IF NOT EXISTS enforce_shared_template_no_store
BEFORE INSERT ON product_templates
WHEN NEW.is_shared = 1 AND NEW.store_id IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'Shared templates cannot have store_id (must be NULL)');
END;

-- Trigger: Ensure store-specific templates have store_id
CREATE TRIGGER IF NOT EXISTS enforce_store_template_has_store
BEFORE INSERT ON product_templates
WHEN NEW.is_shared = 0 AND NEW.store_id IS NULL
BEGIN
    SELECT RAISE(ABORT, 'Store-specific templates must have store_id');
END;

-- Trigger: Update updated_at timestamp on changes
CREATE TRIGGER IF NOT EXISTS update_template_timestamp
AFTER UPDATE ON product_templates
BEGIN
    UPDATE product_templates 
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

-- Trigger: Validate template_attributes is valid JSON
CREATE TRIGGER IF NOT EXISTS validate_template_attributes_json
BEFORE INSERT ON product_templates
BEGIN
    SELECT CASE
        WHEN json_valid(NEW.template_attributes) = 0
        THEN RAISE(ABORT, 'template_attributes must be valid JSON')
    END;
END;

-- ============================================================================
-- CREATE VIEW FOR EASY TEMPLATE QUERIES
-- ============================================================================

-- View: Templates with creator information
CREATE VIEW IF NOT EXISTS v_product_templates AS
SELECT 
    t.id,
    t.name,
    t.description,
    t.category,
    t.subcategory,
    t.template_attributes,
    t.is_shared,
    CASE 
        WHEN t.is_shared = 1 THEN 'Shared across all stores'
        ELSE 'Store-specific'
    END as sharing_type,
    t.created_by,
    u.username as created_by_username,
    t.tenant_id,
    t.store_id,
    s.name as store_name,
    t.created_at,
    t.updated_at,
    -- Count how many times this template has been used (if we track that)
    0 as usage_count -- Placeholder for future usage tracking
FROM product_templates t
LEFT JOIN users u ON t.created_by = u.id
LEFT JOIN stores s ON t.store_id = s.id;

-- ============================================================================
-- INSERT SAMPLE TEMPLATES
-- ============================================================================

-- Sample template for automotive oil products
INSERT OR IGNORE INTO product_templates (
    id,
    name,
    description,
    category,
    subcategory,
    template_attributes,
    is_shared,
    created_by,
    tenant_id
)
VALUES (
    'template-001',
    'Standard Motor Oil',
    'Template for motor oil products',
    'Automotive',
    'Fluids',
    json_object(
        'viscosity', '5W-30',
        'volume', '5L',
        'type', 'Synthetic',
        'brand', '',
        'specifications', 'API SN, ILSAC GF-5'
    ),
    1,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    'default-tenant'
);

-- Sample template for automotive filters
INSERT OR IGNORE INTO product_templates (
    id,
    name,
    description,
    category,
    subcategory,
    template_attributes,
    is_shared,
    created_by,
    tenant_id
)
VALUES (
    'template-002',
    'Standard Oil Filter',
    'Template for oil filter products',
    'Automotive',
    'Filters',
    json_object(
        'filterType', 'Oil',
        'thread', 'M20x1.5',
        'gasketDiameter', '62mm',
        'height', '76mm',
        'brand', ''
    ),
    1,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    'default-tenant'
);

-- Sample template for brake pads
INSERT OR IGNORE INTO product_templates (
    id,
    name,
    description,
    category,
    subcategory,
    template_attributes,
    is_shared,
    created_by,
    tenant_id
)
VALUES (
    'template-003',
    'Brake Pads',
    'Template for brake pad products',
    'Automotive',
    'Brakes',
    json_object(
        'position', 'Front',
        'material', 'Ceramic',
        'includesHardware', true,
        'brand', '',
        'warranty', '12 months'
    ),
    1,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    'default-tenant'
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table created
SELECT 'Checking product_templates table created...' AS status;
SELECT COUNT(*) as table_exists
FROM sqlite_master
WHERE type = 'table' AND name = 'product_templates';
-- Should return 1

-- Verify indexes created
SELECT 'Checking indexes created...' AS status;
SELECT COUNT(*) as index_count
FROM sqlite_master
WHERE type = 'index'
  AND name IN (
      'idx_templates_category',
      'idx_templates_tenant',
      'idx_templates_created_by',
      'idx_templates_store',
      'idx_templates_tenant_category',
      'idx_templates_shared'
  );
-- Should return 6

-- Verify triggers created
SELECT 'Checking triggers created...' AS status;
SELECT COUNT(*) as trigger_count
FROM sqlite_master
WHERE type = 'trigger'
  AND name IN (
      'limit_templates_per_category',
      'enforce_template_store_tenant_match',
      'enforce_shared_template_no_store',
      'enforce_store_template_has_store',
      'update_template_timestamp',
      'validate_template_attributes_json'
  );
-- Should return 6

-- Verify view created
SELECT 'Checking view created...' AS status;
SELECT COUNT(*) as view_exists
FROM sqlite_master
WHERE type = 'view' AND name = 'v_product_templates';
-- Should return 1

-- Verify table structure
SELECT 'Checking table structure...' AS status;
SELECT 
    COUNT(*) as column_count
FROM pragma_table_info('product_templates')
WHERE name IN (
    'id', 'name', 'description', 'category', 'subcategory',
    'template_attributes', 'is_shared', 'created_by', 'tenant_id',
    'store_id', 'created_at', 'updated_at'
);
-- Should return 12

-- Verify sample templates inserted
SELECT 'Checking sample templates...' AS status;
SELECT COUNT(*) as template_count FROM product_templates;
-- Should return 3 (three sample templates)

-- Show sample templates
SELECT 'Sample templates...' AS status;
SELECT 
    name,
    category,
    subcategory,
    is_shared,
    template_attributes
FROM product_templates;

-- Test template retrieval by category
SELECT 'Testing category filtering...' AS status;
SELECT COUNT(*) as automotive_templates
FROM product_templates
WHERE category = 'Automotive';
-- Should return 3

-- Final status
SELECT 'Migration 015 completed successfully!' AS status;
SELECT 'Product templates table created' AS details;
SELECT '6 indexes created for performance' AS details;
SELECT '6 triggers created for data integrity' AS details;
SELECT '1 view created for easy template queries' AS details;
SELECT '3 sample templates inserted' AS details;
SELECT 'Supports up to 50 templates per category' AS details;
SELECT 'Ready for fast product creation from templates' AS details;
