-- Migration 045: Update tenant_id from 'default-tenant' to 'default'
-- 
-- This migration updates all records that have tenant_id = 'default-tenant'
-- to use 'default' instead, aligning with the new default TENANT_ID value.
-- 
-- Background: The original migration (009) set 'default-tenant' as the default,
-- but the system now uses 'default' as the standard tenant ID for generic deployments.

-- Update all tables with tenant_id column
UPDATE users SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE sessions SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE audit_log SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE customers SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE vehicles SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE layaways SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE layaway_payments SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE layaway_items SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE work_orders SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE work_order_lines SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE commissions SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE commission_rules SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE commission_splits SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE loyalty_transactions SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE price_levels SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE credit_accounts SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE credit_transactions SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE gift_cards SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE gift_card_transactions SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE promotions SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE promotion_usage SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE sync_log SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE sync_conflicts SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE sync_queue SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE sync_state SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE products SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE vehicle_fitment SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE stores SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE stations SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE ar_statements SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE offline_credit_verifications SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE maintenance_schedules SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE backup_jobs SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';
UPDATE backup_settings SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';

-- Update product_templates if it has tenant_id
UPDATE product_templates SET tenant_id = 'default' WHERE tenant_id = 'default-tenant';

-- Verification query
SELECT 'Migration 045 complete: Updated tenant_id from default-tenant to default' AS status;
