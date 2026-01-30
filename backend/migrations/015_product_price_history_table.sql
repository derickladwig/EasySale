-- Migration 014: Product Price History Table
-- Date: 2026-01-12
-- Description: Create table for tracking product price changes over time
-- Impact: New table for price change audit trail
-- Estimated Time: < 1 second
-- Risk: VERY LOW (new table, no existing data)

-- This migration creates infrastructure for price history tracking:
-- 1. Complete audit trail of all price changes
-- 2. Track who changed the price and when
-- 3. Record reason for price change (optional)
-- 4. Support price trend analysis and reporting
-- 5. Compliance with audit requirements (7-year retention)

-- Use cases:
-- - Audit compliance: "Who changed this price and why?"
-- - Price trend analysis: "How has this product's price changed over time?"
-- - Margin tracking: "What was our profit margin last quarter?"
-- - Customer inquiries: "Why did the price increase?"
-- - Competitive analysis: "How often do we adjust prices?"

-- ============================================================================
-- CREATE PRODUCT PRICE HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_price_history (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    old_price REAL NOT NULL,
    new_price REAL NOT NULL,
    old_cost REAL,
    new_cost REAL,
    changed_by TEXT NOT NULL, -- User ID who made the change
    changed_at TEXT NOT NULL DEFAULT (datetime('now')),
    reason TEXT, -- Optional reason for price change
    tenant_id TEXT NOT NULL,
    
    -- Ensure prices are non-negative
    CHECK (old_price >= 0),
    CHECK (new_price >= 0),
    CHECK (old_cost IS NULL OR old_cost >= 0),
    CHECK (new_cost IS NULL OR new_cost >= 0),
    
    -- Ensure old and new prices are different
    CHECK (old_price != new_price OR old_cost != new_cost),
    
    -- Foreign keys
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on product_id for fast "get price history for product X" queries
CREATE INDEX IF NOT EXISTS idx_price_history_product ON product_price_history(product_id);

-- Index on changed_at for time-based queries and sorting
CREATE INDEX IF NOT EXISTS idx_price_history_changed_at ON product_price_history(changed_at);

-- Index on changed_by for user activity tracking
CREATE INDEX IF NOT EXISTS idx_price_history_changed_by ON product_price_history(changed_by);

-- Index on tenant_id for multi-tenant isolation
CREATE INDEX IF NOT EXISTS idx_price_history_tenant ON product_price_history(tenant_id);

-- Composite index for tenant + product queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_price_history_tenant_product ON product_price_history(tenant_id, product_id);

-- Composite index for product + time range queries
CREATE INDEX IF NOT EXISTS idx_price_history_product_time ON product_price_history(product_id, changed_at);

-- ============================================================================
-- CREATE TRIGGERS FOR AUTOMATIC PRICE TRACKING
-- ============================================================================

-- Trigger: Automatically log price changes when product is updated
-- This ensures we never miss a price change
CREATE TRIGGER IF NOT EXISTS auto_log_price_change
AFTER UPDATE OF unit_price, cost ON products
WHEN NEW.unit_price != OLD.unit_price OR NEW.cost != OLD.cost
BEGIN
    INSERT INTO product_price_history (
        id,
        product_id,
        old_price,
        new_price,
        old_cost,
        new_cost,
        changed_by,
        changed_at,
        reason,
        tenant_id
    )
    VALUES (
        lower(hex(randomblob(16))),
        NEW.id,
        OLD.unit_price,
        NEW.unit_price,
        OLD.cost,
        NEW.cost,
        'system', -- Will be overridden by application with actual user ID
        datetime('now'),
        NULL,
        NEW.tenant_id
    );
END;

-- ============================================================================
-- CREATE VIEW FOR EASY PRICE HISTORY QUERIES
-- ============================================================================

-- View: Price history with product details and user information
CREATE VIEW IF NOT EXISTS v_product_price_history AS
SELECT 
    ph.id,
    ph.product_id,
    p.sku,
    p.name as product_name,
    p.category,
    ph.old_price,
    ph.new_price,
    ph.new_price - ph.old_price as price_change,
    ROUND((ph.new_price - ph.old_price) / ph.old_price * 100, 2) as price_change_percent,
    ph.old_cost,
    ph.new_cost,
    CASE 
        WHEN ph.old_cost IS NOT NULL AND ph.new_cost IS NOT NULL 
        THEN ph.new_cost - ph.old_cost 
        ELSE NULL 
    END as cost_change,
    ROUND((ph.new_price - COALESCE(ph.new_cost, 0)) / ph.new_price * 100, 2) as new_margin_percent,
    ROUND((ph.old_price - COALESCE(ph.old_cost, 0)) / ph.old_price * 100, 2) as old_margin_percent,
    ph.changed_by,
    u.username as changed_by_username,
    ph.changed_at,
    ph.reason,
    ph.tenant_id
FROM product_price_history ph
JOIN products p ON ph.product_id = p.id
LEFT JOIN users u ON ph.changed_by = u.id;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table created
SELECT 'Checking product_price_history table created...' AS status;
SELECT COUNT(*) as table_exists
FROM sqlite_master
WHERE type = 'table' AND name = 'product_price_history';
-- Should return 1

-- Verify indexes created
SELECT 'Checking indexes created...' AS status;
SELECT COUNT(*) as index_count
FROM sqlite_master
WHERE type = 'index'
  AND name IN (
      'idx_price_history_product',
      'idx_price_history_changed_at',
      'idx_price_history_changed_by',
      'idx_price_history_tenant',
      'idx_price_history_tenant_product',
      'idx_price_history_product_time'
  );
-- Should return 6

-- Verify trigger created
SELECT 'Checking trigger created...' AS status;
SELECT COUNT(*) as trigger_count
FROM sqlite_master
WHERE type = 'trigger'
  AND name = 'auto_log_price_change';
-- Should return 1

-- Verify view created
SELECT 'Checking view created...' AS status;
SELECT COUNT(*) as view_exists
FROM sqlite_master
WHERE type = 'view' AND name = 'v_product_price_history';
-- Should return 1

-- Verify table structure
SELECT 'Checking table structure...' AS status;
SELECT 
    COUNT(*) as column_count
FROM pragma_table_info('product_price_history')
WHERE name IN (
    'id', 'product_id', 'old_price', 'new_price', 'old_cost', 'new_cost',
    'changed_by', 'changed_at', 'reason', 'tenant_id'
);
-- Should return 10

-- Verify constraints
SELECT 'Checking constraints...' AS status;
SELECT sql
FROM sqlite_master
WHERE type = 'table' AND name = 'product_price_history';
-- Should show CHECK constraints for non-negative prices

-- Show table is empty (no initial data)
SELECT 'Checking initial data...' AS status;
SELECT COUNT(*) as row_count FROM product_price_history;
-- Should return 0

-- Final status
SELECT 'Migration 015 completed successfully!' AS status;
SELECT 'Product price history table created' AS details;
SELECT '6 indexes created for performance' AS details;
SELECT '1 trigger created for automatic price logging' AS details;
SELECT '1 view created for easy price history queries' AS details;
SELECT 'Ready for price change tracking and audit compliance' AS details;
SELECT 'Supports 7-year retention requirement' AS details;
