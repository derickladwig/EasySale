# Data Migration Requirements: Multi-Tenant Support

## Overview

Add `tenant_id` column to all database tables to enable true multi-tenant data isolation. This is a **critical blocker** for production multi-tenant deployment and must be completed before any tenant switching or white-label transformation can be tested.

## User Story

**As a system administrator**, I want all database tables to include a `tenant_id` column, so that data from different tenants is completely isolated and cannot be accessed across tenant boundaries.

## Acceptance Criteria

### 1. Schema Migration

**WHEN** the migration runs, **THEN** the system **SHALL**:
- Add `tenant_id VARCHAR(255) NOT NULL` column to all tables
- Create indexes on `tenant_id` for query performance
- Set default value of 'caps-automotive' for all existing data
- Preserve all existing data without loss
- Complete migration in < 5 seconds for typical database size

### 2. Data Integrity

**WHEN** the migration completes, **THEN** the system **SHALL**:
- Verify all rows have a valid `tenant_id` value
- Verify no NULL values in `tenant_id` columns
- Verify referential integrity is maintained
- Verify all foreign key relationships still work

### 3. Query Isolation

**WHEN** queries execute after migration, **THEN** the system **SHALL**:
- Automatically filter all SELECT queries by `tenant_id`
- Automatically set `tenant_id` on all INSERT queries
- Prevent UPDATE/DELETE operations across tenant boundaries
- Return zero results for queries with wrong `tenant_id`

### 4. Rollback Safety

**WHEN** migration fails, **THEN** the system **SHALL**:
- Automatically rollback all changes
- Restore database to pre-migration state
- Log detailed error information
- Provide clear rollback instructions

### 5. Performance

**WHEN** queries execute with `tenant_id` filtering, **THEN** the system **SHALL**:
- Maintain query performance within 10% of pre-migration
- Use indexes effectively for `tenant_id` filtering
- Support 100+ concurrent queries without degradation

## Tables Requiring Migration

### Core Tables (Migration 001)
- `users` - User accounts
- `sessions` - Active sessions
- `audit_log` - Audit trail

### Sales & Customer Tables (Migration 002)
- `customers` - Customer records
- `customer_vehicles` - Customer vehicles
- `layaways` - Layaway transactions
- `layaway_payments` - Layaway payment history
- `work_orders` - Service work orders
- `work_order_lines` - Work order line items
- `commissions` - Commission records
- `commission_rules` - Commission calculation rules
- `loyalty_accounts` - Loyalty program accounts
- `loyalty_transactions` - Loyalty point transactions
- `price_levels` - Custom pricing tiers
- `credit_accounts` - Customer credit accounts
- `credit_transactions` - Credit account transactions
- `gift_cards` - Gift card records
- `gift_card_transactions` - Gift card usage history
- `promotions` - Promotional campaigns
- `promotion_usage` - Promotion redemption tracking

### Sync Tables (Migration 003)
- `sync_log` - Synchronization history
- `sync_conflicts` - Conflict resolution records
- `pending_operations` - Offline operation queue

### Product Tables (Migration 004)
- `products` - Product catalog
- `product_categories` - Product categorization
- `fitment_data` - Vehicle fitment information
- `inventory` - Stock levels
- `inventory_transactions` - Stock movements

### Backup Tables (Migration 007)
- `backups` - Backup records
- `backup_destinations` - Backup storage locations
- `backup_settings` - Backup configuration
- `restore_jobs` - Restore operation tracking

## Migration Strategy

### Phase 1: Preparation (30 minutes)
1. **Backup Database**
   - Create full database backup
   - Verify backup integrity
   - Store backup in safe location
   - Document backup location

2. **Audit Current Schema**
   - List all tables in database
   - Identify tables without `tenant_id`
   - Check for existing `tenant_id` columns
   - Document current row counts

3. **Test Migration Script**
   - Run migration on test database
   - Verify all tables updated
   - Verify data integrity
   - Measure migration time

### Phase 2: Migration Execution (5 minutes)
1. **Stop Application**
   - Gracefully shutdown backend
   - Wait for active requests to complete
   - Verify no active connections

2. **Run Migration**
   - Execute migration script
   - Monitor progress
   - Log all operations
   - Verify success

3. **Verify Migration**
   - Check all tables have `tenant_id`
   - Check all rows have valid `tenant_id`
   - Check indexes created
   - Check foreign keys intact

### Phase 3: Validation (15 minutes)
1. **Data Integrity Checks**
   - Count rows before/after (should match)
   - Verify no NULL `tenant_id` values
   - Verify referential integrity
   - Verify no data loss

2. **Query Testing**
   - Test SELECT with `tenant_id` filter
   - Test INSERT with `tenant_id`
   - Test UPDATE with `tenant_id` filter
   - Test DELETE with `tenant_id` filter

3. **Performance Testing**
   - Measure query execution time
   - Compare to pre-migration baseline
   - Verify index usage
   - Check for slow queries

### Phase 4: Application Update (30 minutes)
1. **Update Models**
   - Add `tenant_id` field to all Rust structs
   - Update serialization/deserialization
   - Update validation logic

2. **Update Queries**
   - Add `tenant_id` to WHERE clauses
   - Add `tenant_id` to INSERT statements
   - Add `tenant_id` to JOIN conditions
   - Remove hardcoded tenant assumptions

3. **Update Middleware**
   - Inject `tenant_id` from context
   - Validate `tenant_id` on all requests
   - Log `tenant_id` in audit trail

### Phase 5: Testing (1 hour)
1. **Unit Tests**
   - Test model serialization with `tenant_id`
   - Test query filtering by `tenant_id`
   - Test tenant isolation

2. **Integration Tests**
   - Test CAPS configuration loads
   - Test all API endpoints work
   - Test no cross-tenant data leakage

3. **Manual Testing**
   - Login as CAPS user
   - Verify all features work
   - Verify data displays correctly
   - Verify no errors in logs

## Migration SQL Template

```sql
-- Migration 008: Add tenant_id for multi-tenant support
-- Date: 2026-01-11
-- Description: Add tenant_id column to all tables for data isolation

BEGIN TRANSACTION;

-- Add tenant_id to core tables
ALTER TABLE users ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE sessions ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE audit_log ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';

-- Add tenant_id to sales & customer tables
ALTER TABLE customers ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE customer_vehicles ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE layaways ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE layaway_payments ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE work_orders ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE work_order_lines ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE commissions ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE commission_rules ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE loyalty_accounts ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE loyalty_transactions ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE price_levels ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE credit_accounts ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE credit_transactions ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE gift_cards ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE gift_card_transactions ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE promotions ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE promotion_usage ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';

-- Add tenant_id to sync tables
ALTER TABLE sync_log ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE sync_conflicts ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE pending_operations ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';

-- Add tenant_id to product tables
ALTER TABLE products ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE product_categories ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE fitment_data ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE inventory ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE inventory_transactions ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';

-- Add tenant_id to backup tables
ALTER TABLE backups ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE backup_destinations ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE backup_settings ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE restore_jobs ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';

-- Create indexes for performance
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_sessions_tenant_id ON sessions(tenant_id);
CREATE INDEX idx_audit_log_tenant_id ON audit_log(tenant_id);
CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customer_vehicles_tenant_id ON customer_vehicles(tenant_id);
CREATE INDEX idx_layaways_tenant_id ON layaways(tenant_id);
CREATE INDEX idx_layaway_payments_tenant_id ON layaway_payments(tenant_id);
CREATE INDEX idx_work_orders_tenant_id ON work_orders(tenant_id);
CREATE INDEX idx_work_order_lines_tenant_id ON work_order_lines(tenant_id);
CREATE INDEX idx_commissions_tenant_id ON commissions(tenant_id);
CREATE INDEX idx_commission_rules_tenant_id ON commission_rules(tenant_id);
CREATE INDEX idx_loyalty_accounts_tenant_id ON loyalty_accounts(tenant_id);
CREATE INDEX idx_loyalty_transactions_tenant_id ON loyalty_transactions(tenant_id);
CREATE INDEX idx_price_levels_tenant_id ON price_levels(tenant_id);
CREATE INDEX idx_credit_accounts_tenant_id ON credit_accounts(tenant_id);
CREATE INDEX idx_credit_transactions_tenant_id ON credit_transactions(tenant_id);
CREATE INDEX idx_gift_cards_tenant_id ON gift_cards(tenant_id);
CREATE INDEX idx_gift_card_transactions_tenant_id ON gift_card_transactions(tenant_id);
CREATE INDEX idx_promotions_tenant_id ON promotions(tenant_id);
CREATE INDEX idx_promotion_usage_tenant_id ON promotion_usage(tenant_id);
CREATE INDEX idx_sync_log_tenant_id ON sync_log(tenant_id);
CREATE INDEX idx_sync_conflicts_tenant_id ON sync_conflicts(tenant_id);
CREATE INDEX idx_pending_operations_tenant_id ON pending_operations(tenant_id);
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_product_categories_tenant_id ON product_categories(tenant_id);
CREATE INDEX idx_fitment_data_tenant_id ON fitment_data(tenant_id);
CREATE INDEX idx_inventory_tenant_id ON inventory(tenant_id);
CREATE INDEX idx_inventory_transactions_tenant_id ON inventory_transactions(tenant_id);
CREATE INDEX idx_backups_tenant_id ON backups(tenant_id);
CREATE INDEX idx_backup_destinations_tenant_id ON backup_destinations(tenant_id);
CREATE INDEX idx_backup_settings_tenant_id ON backup_settings(tenant_id);
CREATE INDEX idx_restore_jobs_tenant_id ON restore_jobs(tenant_id);

-- Verify migration
SELECT 'Migration 008 completed successfully' AS status;

COMMIT;
```

## Verification Queries

```sql
-- Check all tables have tenant_id column
SELECT 
    name as table_name,
    sql
FROM sqlite_master 
WHERE type = 'table' 
AND name NOT LIKE 'sqlite_%'
AND sql NOT LIKE '%tenant_id%';
-- Should return 0 rows

-- Check all rows have valid tenant_id
SELECT 'users' as table_name, COUNT(*) as null_count FROM users WHERE tenant_id IS NULL
UNION ALL
SELECT 'customers', COUNT(*) FROM customers WHERE tenant_id IS NULL
UNION ALL
SELECT 'products', COUNT(*) FROM products WHERE tenant_id IS NULL;
-- All counts should be 0

-- Check tenant_id distribution
SELECT tenant_id, COUNT(*) as count FROM users GROUP BY tenant_id;
SELECT tenant_id, COUNT(*) as count FROM customers GROUP BY tenant_id;
SELECT tenant_id, COUNT(*) as count FROM products GROUP BY tenant_id;
-- Should show 'caps-automotive' with all counts

-- Check indexes exist
SELECT name FROM sqlite_master 
WHERE type = 'index' 
AND name LIKE 'idx_%_tenant_id';
-- Should return 30+ indexes
```

## Rollback Plan

If migration fails or causes issues:

1. **Stop Application Immediately**
2. **Restore from Backup**
   ```bash
   # Stop backend
   docker-compose stop backend
   
   # Restore database
   cp data/pos.db.backup data/pos.db
   
   # Restart backend
   docker-compose start backend
   ```

3. **Verify Rollback**
   - Check application starts
   - Check data is accessible
   - Check no errors in logs

4. **Investigate Failure**
   - Review migration logs
   - Identify root cause
   - Fix migration script
   - Test on fresh database

## Success Criteria

- ✅ All 30+ tables have `tenant_id` column
- ✅ All existing data has `tenant_id = 'caps-automotive'`
- ✅ All indexes created successfully
- ✅ No NULL `tenant_id` values
- ✅ No data loss (row counts match)
- ✅ Foreign keys still work
- ✅ Query performance within 10% of baseline
- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ CAPS configuration works perfectly
- ✅ No cross-tenant data leakage

## Risk Assessment

### High Risk
- **Data Loss**: Mitigated by backup before migration
- **Downtime**: Mitigated by fast migration (< 5 seconds)
- **Performance Degradation**: Mitigated by indexes

### Medium Risk
- **Foreign Key Issues**: Mitigated by testing on copy first
- **Application Errors**: Mitigated by comprehensive testing

### Low Risk
- **Rollback Complexity**: Mitigated by simple restore from backup

## Timeline

- **Preparation**: 30 minutes
- **Migration**: 5 minutes
- **Validation**: 15 minutes
- **Application Update**: 30 minutes
- **Testing**: 1 hour
- **Total**: ~2.5 hours

## Dependencies

- ✅ Backend Configuration System (Task 4-7) - **COMPLETE**
- ✅ Configuration API Endpoints (Task 8) - **COMPLETE**
- ✅ Configuration Validation (Task 9) - **COMPLETE**
- ⬜ Tenant Context Middleware (Task 5) - **REQUIRED**

## Next Steps After Migration

1. Update all Rust models with `tenant_id` field
2. Update all queries to filter by `tenant_id`
3. Update middleware to inject `tenant_id`
4. Test tenant isolation thoroughly
5. Proceed to Task 24 (Performance Testing)
