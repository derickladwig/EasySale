# Task 23: Data Migration for Multi-Tenancy - Overview

## 🎯 Goal

Add `tenant_id` column to all 30+ database tables to enable complete data isolation between tenants. This is the **critical foundation** for true multi-tenant architecture.

## ⚠️ Why This is Critical

**Current State:**
- All data is stored without tenant identification
- No way to isolate data between different businesses
- Cannot safely switch between tenants
- Cannot test white-label configurations

**After Migration:**
- Every row has a `tenant_id` identifying which tenant owns it
- Queries automatically filter by `tenant_id`
- Complete data isolation between tenants
- Safe tenant switching and testing
- Foundation for white-label transformation

## 📊 Scope

### Tables to Migrate (30+ total)

**Core Tables (3):**
- users, sessions, audit_log

**Sales & Customer Tables (17):**
- customers, customer_vehicles, layaways, layaway_payments
- work_orders, work_order_lines, commissions, commission_rules
- loyalty_accounts, loyalty_transactions, price_levels
- credit_accounts, credit_transactions, gift_cards, gift_card_transactions
- promotions, promotion_usage

**Sync Tables (3):**
- sync_log, sync_conflicts, pending_operations

**Product Tables (5):**
- products, product_categories, fitment_data, inventory, inventory_transactions

**Backup Tables (4):**
- backups, backup_destinations, backup_settings, restore_jobs

## 🗺️ Migration Strategy

### Phase 1: Preparation (30 min)
1. **Backup** - Create full database backup
2. **Audit** - Document current schema and row counts
3. **Script** - Create migration SQL script
4. **Test** - Run on copy of database

### Phase 2: Execution (5 min)
1. **Stop** - Gracefully shutdown application
2. **Migrate** - Run SQL script
3. **Verify** - Check all tables updated

### Phase 3: Validation (15 min)
1. **Integrity** - Verify no data loss
2. **Isolation** - Test query filtering
3. **Performance** - Benchmark queries

### Phase 4: Application Update (30 min)
1. **Models** - Add `tenant_id` to Rust structs
2. **Queries** - Add `tenant_id` filtering
3. **Middleware** - Inject `tenant_id` from context

### Phase 5: Testing (1 hour)
1. **Unit Tests** - Test tenant isolation
2. **Integration Tests** - Test API endpoints
3. **Manual Tests** - Test CAPS configuration
4. **Rollback Test** - Verify backup restore

## 📝 Migration SQL Preview

```sql
-- Add tenant_id to all tables
ALTER TABLE users ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE customers ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
ALTER TABLE products ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive';
-- ... (30+ tables total)

-- Create indexes for performance
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
-- ... (30+ indexes total)
```

## ✅ Success Criteria

- [ ] All 30+ tables have `tenant_id` column
- [ ] All existing data has `tenant_id = 'caps-automotive'`
- [ ] All 30+ indexes created
- [ ] No NULL `tenant_id` values
- [ ] No data loss (row counts match)
- [ ] Query performance within 10% of baseline
- [ ] All tests pass (15+ new tests)
- [ ] CAPS configuration works perfectly
- [ ] No cross-tenant data leakage

## ⏱️ Timeline

**Total Estimated Time:** 2.5 hours

- Preparation: 30 minutes
- Execution: 5 minutes
- Validation: 15 minutes
- Application Update: 30 minutes
- Testing: 1 hour

## 🔗 Dependencies

**Required (Complete):**
- ✅ Backend Configuration System (Tasks 4-7)
- ✅ Configuration API Endpoints (Task 8)
- ✅ Configuration Validation (Task 9)

**Blocks:**
- ⬜ Integration Testing (Task 22)
- ⬜ Performance Testing (Task 24)
- ⬜ White-Label Transformation (Task 25-28)
- ⬜ Multi-Tenant Support UI (Task 29-31)

## 📚 Documentation Created

1. **data-migration-requirements.md** - Detailed requirements with acceptance criteria
2. **tasks.md (updated)** - Expanded Task 23 with 17 sub-tasks
3. **TASK_23_OVERVIEW.md** - This overview document

## 🚀 Next Steps

1. **Review** the detailed requirements in `data-migration-requirements.md`
2. **Approve** the migration strategy
3. **Begin** Phase 1: Preparation
   - Create database backup
   - Audit current schema
   - Write migration script
   - Test on database copy

## 🛡️ Risk Mitigation

**High Risk - Data Loss:**
- ✅ Mitigated by full backup before migration
- ✅ Mitigated by testing on copy first
- ✅ Mitigated by transaction rollback on error

**Medium Risk - Downtime:**
- ✅ Mitigated by fast migration (< 5 seconds)
- ✅ Mitigated by off-hours execution

**Low Risk - Performance:**
- ✅ Mitigated by indexes on `tenant_id`
- ✅ Mitigated by performance benchmarking

## 💡 Key Insights

1. **Default Value Strategy**: Using `'caps-automotive'` as default ensures all existing data belongs to CAPS tenant
2. **Index Strategy**: Creating indexes on `tenant_id` maintains query performance
3. **Transaction Safety**: Entire migration runs in single transaction for atomicity
4. **Rollback Simplicity**: Simple restore from backup if anything fails
5. **Testing First**: Running on copy first eliminates surprises

## 📞 Questions to Consider

1. Should we use `VARCHAR(255)` or `VARCHAR(50)` for `tenant_id`?
   - **Recommendation**: `VARCHAR(255)` for flexibility
   
2. Should we add `tenant_id` to junction tables?
   - **Recommendation**: Yes, for complete isolation
   
3. Should we add composite indexes (tenant_id + other columns)?
   - **Recommendation**: Yes, for common query patterns
   
4. Should we enforce foreign key constraints on `tenant_id`?
   - **Recommendation**: No, keep it simple for now

5. Should we add a `tenants` table?
   - **Recommendation**: Yes, but in a later task (Task 29)

---

**Ready to proceed?** Let's start with Phase 1: Preparation! 🚀
