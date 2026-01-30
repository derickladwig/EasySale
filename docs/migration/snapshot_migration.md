# Accounting Snapshot Migration Guide

## Overview

This guide explains how to migrate existing finalized transactions to the new accounting snapshot system. The migration creates immutable accounting snapshots for all historical transactions that don't have snapshots yet.

## Prerequisites

Before running the migration:

1. **Backup your database**: Create a full backup of your database before proceeding
   ```bash
   cp data/pos.db data/pos.db.backup
   ```

2. **Stop the server**: Ensure the POS server is not running during migration
   ```bash
   # Stop any running instances
   pkill EasySale-server
   ```

3. **Verify database integrity**: Check that your database is not corrupted
   ```bash
   sqlite3 data/pos.db "PRAGMA integrity_check;"
   ```

4. **Check disk space**: Ensure you have sufficient disk space (snapshots will add ~20% to database size)
   ```bash
   df -h data/
   ```

## Migration Procedure

### Step 1: Verify Current State

Before migrating, check how many transactions need snapshots:

```bash
cd backend
cargo run --release -- verify-snapshots
```

This will show:
- Total finalized transactions
- Existing snapshots
- Missing snapshots
- List of transaction IDs without snapshots

Example output:
```
Verification complete!

Results:
  Finalized transactions: 1500
  Snapshots:              200
  Missing snapshots:      1300

Transactions without snapshots:
  - 123e4567-e89b-12d3-a456-426614174000
  - 234e5678-e89b-12d3-a456-426614174001
  ...
```

### Step 2: Run Migration

Execute the migration to create snapshots for all historical transactions:

```bash
cargo run --release -- migrate-snapshots
```

The migration will:
1. Find all finalized transactions without snapshots
2. Load transaction data (lines, payments, totals)
3. Create accounting snapshots using current POS_Core logic
4. Track migrated snapshots for potential rollback
5. Log any failures

Example output:
```
Starting snapshot migration...

Found 1300 finalized transactions
Created 100 snapshots
Created 200 snapshots
...
Created 1300 snapshots

Migration complete!

Summary:
  Total finalized transactions: 1500
  Already had snapshots:        200
  Snapshots created:            1300
  Failed transactions:          0
```

### Step 3: Verify Migration

After migration, verify that all transactions have snapshots:

```bash
cargo run --release -- verify-snapshots
```

Expected output:
```
Verification complete!

Results:
  Finalized transactions: 1500
  Snapshots:              1500
  Missing snapshots:      0

✓ All finalized transactions have snapshots
```

### Step 4: Test Application

Start the server and verify that:
1. Existing transactions display correctly
2. New transactions create snapshots automatically
3. Export functionality works with historical data

```bash
cargo run --release
```

## Rollback Procedure

If the migration fails or produces incorrect results, you can rollback:

### Option 1: Rollback Migration (Recommended)

This deletes only the snapshots created by migration, preserving any snapshots created during normal operation:

```bash
cargo run --release -- rollback-migration
```

This will:
1. Find all snapshots created by migration (tracked in `migration_snapshots` table)
2. Delete snapshot lines and payments
3. Delete snapshots
4. Clear migration tracking

### Option 2: Restore from Backup

If rollback fails or you need to restore the entire database:

```bash
# Stop the server
pkill EasySale-server

# Restore backup
cp data/pos.db.backup data/pos.db

# Restart server
cargo run --release
```

## Troubleshooting

### Migration Fails with Database Errors

**Symptom**: Migration exits with "Failed to create snapshot for transaction X"

**Solution**:
1. Check database integrity: `sqlite3 data/pos.db "PRAGMA integrity_check;"`
2. Verify transaction data is complete (has lines, payments, totals)
3. Check logs for specific error messages
4. Fix data issues and re-run migration

### Migration Creates Incorrect Snapshots

**Symptom**: Snapshot totals don't match transaction totals

**Solution**:
1. Rollback migration: `cargo run --release -- rollback-migration`
2. Verify transaction data in database
3. Check POS_Core calculation logic
4. Re-run migration after fixes

### Migration is Too Slow

**Symptom**: Migration takes hours for large databases

**Solution**:
1. Ensure database has proper indexes
2. Run migration during off-hours
3. Consider batching (modify migration code to process in chunks)
4. Increase database cache size

### Some Transactions Still Missing Snapshots

**Symptom**: Verification shows missing snapshots after migration

**Solution**:
1. Check if transactions are truly finalized: `SELECT * FROM transactions WHERE id = 'X'`
2. Verify transaction has required data (lines, payments)
3. Check migration logs for failures
4. Re-run migration (it will skip existing snapshots)

## Migration Performance

Expected performance for different database sizes:

| Transactions | Estimated Time | Database Growth |
|-------------|----------------|-----------------|
| 1,000       | 1-2 minutes    | +10 MB          |
| 10,000      | 10-15 minutes  | +100 MB         |
| 100,000     | 1-2 hours      | +1 GB           |
| 1,000,000   | 10-15 hours    | +10 GB          |

## Post-Migration Verification

After successful migration, verify:

1. **Snapshot Count**: Should equal finalized transaction count
   ```sql
   SELECT 
     (SELECT COUNT(*) FROM transactions WHERE status = 'finalized') as finalized,
     (SELECT COUNT(*) FROM accounting_snapshots) as snapshots;
   ```

2. **Snapshot Integrity**: All snapshots have lines and payments
   ```sql
   SELECT 
     s.id,
     COUNT(DISTINCT l.id) as line_count,
     COUNT(DISTINCT p.id) as payment_count
   FROM accounting_snapshots s
   LEFT JOIN snapshot_lines l ON s.id = l.snapshot_id
   LEFT JOIN snapshot_payments p ON s.id = p.snapshot_id
   GROUP BY s.id
   HAVING line_count = 0 OR payment_count = 0;
   ```

3. **Total Accuracy**: Snapshot totals match transaction totals
   ```sql
   SELECT 
     t.id,
     t.total as transaction_total,
     s.total as snapshot_total
   FROM transactions t
   JOIN accounting_snapshots s ON t.id = s.transaction_id
   WHERE t.total != s.total;
   ```

## Migration Tracking

The migration system tracks all created snapshots in the `migration_snapshots` table:

```sql
SELECT 
  migration_batch,
  COUNT(*) as snapshot_count,
  MIN(migrated_at) as started_at,
  MAX(migrated_at) as completed_at
FROM migration_snapshots
GROUP BY migration_batch;
```

This allows:
- Identifying which snapshots were created by migration
- Rolling back specific migration batches
- Auditing migration history

## Best Practices

1. **Always backup before migration**: Database corruption can occur
2. **Run during off-hours**: Migration can be resource-intensive
3. **Verify before and after**: Use `verify-snapshots` command
4. **Monitor disk space**: Snapshots add 15-25% to database size
5. **Test on copy first**: Run migration on a database copy before production
6. **Keep migration logs**: Save output for troubleshooting
7. **Don't interrupt migration**: Let it complete or rollback cleanly

## Support

If you encounter issues not covered in this guide:

1. Check application logs: `logs/pos-YYYY-MM-DD.log`
2. Review migration tracking: `SELECT * FROM migration_snapshots`
3. Verify database integrity: `PRAGMA integrity_check`
4. Contact support with:
   - Migration output
   - Error messages
   - Database size and transaction count
   - System specifications

## Appendix: Manual Snapshot Creation

If you need to create a snapshot for a specific transaction manually:

```sql
-- 1. Load transaction data
SELECT * FROM transactions WHERE id = 'TRANSACTION_ID';
SELECT * FROM transaction_lines WHERE transaction_id = 'TRANSACTION_ID';
SELECT * FROM transaction_payments WHERE transaction_id = 'TRANSACTION_ID';

-- 2. Create snapshot (use application API or migration tool)
-- Do NOT insert directly into accounting_snapshots table
-- Use the migration tool or application API to ensure proper validation
```

## Appendix: Migration SQL Queries

Useful queries for monitoring migration:

```sql
-- Count transactions by status
SELECT status, COUNT(*) FROM transactions GROUP BY status;

-- Find transactions without snapshots
SELECT t.id, t.finalized_at, t.total
FROM transactions t
LEFT JOIN accounting_snapshots s ON t.id = s.transaction_id
WHERE t.status = 'finalized' AND s.id IS NULL;

-- Check snapshot creation rate
SELECT 
  DATE(created_at) as date,
  COUNT(*) as snapshots_created
FROM accounting_snapshots
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Verify snapshot immutability triggers
SELECT name, sql FROM sqlite_master 
WHERE type = 'trigger' 
AND name LIKE '%snapshot%';
```
