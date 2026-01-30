-- Migration: Remove all mock/sample data
-- Description: Removes sample products, vendors, templates, and other test data
-- This ensures a clean slate for production use

-- Remove sample products from migration 004
DELETE FROM products WHERE id IN (
    'prod-001', 'prod-002', 'prod-003', 'prod-004', 'prod-005'
);

-- Remove sample vehicle fitment data
DELETE FROM vehicle_fitment WHERE id IN (
    'fit-001', 'fit-002', 'fit-003', 'fit-004', 'fit-005', 'fit-006', 'fit-007'
);

-- Remove sample maintenance schedules
DELETE FROM maintenance_schedules WHERE id LIKE 'maint-%';

-- Remove sample product templates from migration 016
DELETE FROM product_templates WHERE id IN (
    'template-oil-001',
    'template-filter-001',
    'template-brake-001'
);

-- Remove sample vendors from migration 017
DELETE FROM vendors WHERE id LIKE 'vendor-%' OR name IN (
    'AutoZone',
    'NAPA Auto Parts',
    'O''Reilly Auto Parts'
);

-- Remove sample vendor SKU aliases from migration 022
DELETE FROM vendor_sku_aliases WHERE id LIKE 'alias-%';

-- Remove sample vendor templates from migration 024
DELETE FROM vendor_templates WHERE id LIKE 'vt-%';

-- Log completion
SELECT 'Mock data removed successfully' AS status;
SELECT 'Database is now clean for production use' AS message;
