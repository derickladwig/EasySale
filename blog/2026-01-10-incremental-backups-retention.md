# Incremental Backups & Retention Policies - The Foundation of Reliable Data Protection

**Date:** 2026-01-10  
**Session:** 13  
**Mood:** 🎯 Focused & Productive

## What We Built Today

Today was all about building the core backup engine for our offline-first POS system. We implemented incremental backups and retention policies - the foundation that will keep our data safe without eating up all the storage.

## The Challenge

Our POS system needs to backup data frequently (hourly!) but we can't just create full backups every hour - that would fill up the disk in days. We needed:

1. **Incremental backups** that only store what changed
2. **Chain management** to link related backups together
3. **Smart retention** that keeps the right backups and deletes the old ones
4. **Chain integrity** so we never orphan incremental backups

## What We Tried

### Attempt 1: Backup Chain Management

First, we tackled organizing backups into chains. The idea is simple: a "base" backup contains everything, then subsequent "incremental" backups only contain changes. They're all linked by a `chain_id`.

**The implementation:**
- Check if we should start a new chain (no previous backups OR max incrementals reached)
- Get the next incremental number in the current chain
- Track chain statistics (total size, backup count)

**What happened:**
We hit a subtle bug where the query was ordering by `created_at` instead of `incremental_number`. In tests, all backups had the same timestamp, so SQLite was returning random results! Fixed by ordering by `incremental_number DESC`.

**The lesson:**
Test data matters. When all timestamps are identical, ordering becomes non-deterministic. Always test with realistic data variations.

### Attempt 2: Incremental File Detection

Next, we needed to detect which files changed since the last backup. This involves:
- Loading the previous backup's manifest
- Comparing current file checksums with previous checksums
- Identifying added, modified, and deleted files

**What happened:**
The logic was straightforward, but we had to handle edge cases:
- Files that were deleted in a previous backup but now exist again (treat as added)
- Files that exist in both backups but have different checksums (modified)
- Files in the previous backup but not in current scan (deleted)

**The lesson:**
File state transitions are more complex than "added/modified/deleted". A file can be deleted and then re-added, and we need to handle that correctly.

### Attempt 3: Retention Policies with Chain Integrity

The trickiest part was implementing retention that preserves chain integrity. We can't just delete old backups - if we delete a base backup, all its incrementals become useless!

**The implementation:**
- Categorize backups by age (daily: ≤7 days, weekly: ≤28 days, monthly: >28 days)
- Keep N backups from each category (7 daily, 4 weekly, 12 monthly)
- When marking a backup to keep, also mark its entire chain
- Delete only complete chains, never partial chains

**What happened:**
First test failed because we created only 1 old chain, which was kept as part of the 12 monthly retention. Fixed by creating 15 chains (more than the 12 limit) so some would actually be deleted.

We also hit a Rust type error: `cannot subtract DateTime<FixedOffset> from DateTime<Utc>`. Fixed by converting parsed datetimes to UTC with `.with_timezone(&chrono::Utc)`.

**The lesson:**
Test expectations must match the actual retention logic. If you keep 12 monthly backups and only create 1 old backup, nothing gets deleted! Also, Rust's type system catches subtle timezone bugs that would be silent errors in other languages.

## The Results

**16 tests passing (100%)**
- 7 tests for chain management
- 4 tests for file detection
- 1 test for incremental archive creation
- 1 test for chain rotation
- 3 tests for retention policies

**Key metrics:**
- ~1,000 lines of production code
- 12 new methods implemented
- 2 new services (BackupService enhancements, RetentionService)

## What's Next

The backup engine is solid. Next up:
1. **Task 7 Checkpoint** - Verify everything works end-to-end
2. **Task 8: Backup UI** - React components for managing backups
3. **Task 11: Scheduler** - Automatic hourly/daily/weekly backups
4. **Task 12: Google Drive** - Off-site backup sync

## Technical Highlights

**Incremental Efficiency:**
```rust
// Only backup changed files
let (added, modified, deleted) = self.detect_file_changes(chain_id, &current_files).await?;
let mut changed_files = added.clone();
changed_files.extend(modified.clone());

// Archive only contains changed files
self.create_archive(job, &snapshot_path, &changed_files, settings).await?;
```

**Chain Integrity:**
```rust
// When keeping a backup, keep its entire chain
for backup in daily_backups.iter().take(settings.db_retention_daily as usize) {
    keep_ids.insert(backup.id.clone());
    if let Some(chain_id) = &backup.backup_chain_id {
        let chain_backups = self.get_chain_backup_ids(chain_id).await?;
        keep_ids.extend(chain_backups); // Keep entire chain!
    }
}
```

## Mood: 🎯

Focused and productive. The incremental backup system is exactly what we needed - efficient, reliable, and well-tested. The retention logic is smart enough to preserve chain integrity while keeping storage under control.

Building a backup system is like building a time machine - you're creating snapshots of the past that you hope you'll never need, but when you do need them, they better work perfectly. Today we built that time machine, and it works.

---

**Stats:**
- Time: ~120 minutes
- Tests written: 16
- Tests passing: 16 (100%)
- Coffee consumed: 2 cups ☕☕
- Bugs squashed: 3 (ordering, timezone, test expectations)
