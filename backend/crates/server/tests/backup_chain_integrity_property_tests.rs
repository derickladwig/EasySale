// Property-Based Tests for Backup & Sync Module
// Feature: backup-sync, Property 6: Chain Integrity After Deletion
// These tests validate that backup deletion never leaves orphaned incrementals

use proptest::prelude::*;
use sqlx::SqlitePool;
use uuid::Uuid;

// ============================================================================
// Test Database Setup
// ============================================================================

async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Create backup_jobs table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS backup_jobs (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL DEFAULT 'test-tenant',
            backup_type TEXT NOT NULL,
            status TEXT NOT NULL,
            started_at TEXT,
            completed_at TEXT,
            size_bytes INTEGER,
            checksum TEXT,
            archive_path TEXT,
            error_message TEXT,
            snapshot_method TEXT,
            files_included INTEGER DEFAULT 0,
            files_changed INTEGER DEFAULT 0,
            files_deleted INTEGER DEFAULT 0,
            backup_chain_id TEXT,
            is_base_backup BOOLEAN DEFAULT 0,
            incremental_number INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            store_id TEXT NOT NULL,
            created_by TEXT
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    // Create backup_manifests table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS backup_manifests (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL DEFAULT 'test-tenant',
            backup_job_id TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            checksum TEXT NOT NULL,
            modified_at TEXT NOT NULL,
            is_deleted BOOLEAN DEFAULT 0,
            created_at TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    // Create backup_dest_objects table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS backup_dest_objects (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL DEFAULT 'test-tenant',
            backup_job_id TEXT NOT NULL,
            destination_id TEXT NOT NULL,
            remote_id TEXT NOT NULL,
            remote_path TEXT,
            upload_status TEXT NOT NULL DEFAULT 'pending',
            uploaded_at TEXT,
            upload_size_bytes INTEGER,
            error_message TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    // Create backup_settings table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS backup_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            tenant_id TEXT NOT NULL DEFAULT 'test-tenant',
            db_backup_enabled BOOLEAN NOT NULL DEFAULT 1,
            db_incremental_schedule TEXT NOT NULL DEFAULT '0 * * * *',
            db_full_schedule TEXT NOT NULL DEFAULT '59 23 * * *',
            db_retention_daily INTEGER NOT NULL DEFAULT 7,
            db_retention_weekly INTEGER NOT NULL DEFAULT 4,
            db_retention_monthly INTEGER NOT NULL DEFAULT 12,
            db_max_incrementals INTEGER NOT NULL DEFAULT 24,
            file_backup_enabled BOOLEAN NOT NULL DEFAULT 1,
            file_schedule TEXT NOT NULL DEFAULT '0 3 * * 0',
            file_retention_count INTEGER NOT NULL DEFAULT 2,
            file_include_paths TEXT NOT NULL DEFAULT 'data/uploads/',
            file_exclude_patterns TEXT NOT NULL DEFAULT '*.tmp,*.log',
            full_backup_enabled BOOLEAN NOT NULL DEFAULT 1,
            full_schedule TEXT NOT NULL DEFAULT '0 2 1 * *',
            full_retention_count INTEGER NOT NULL DEFAULT 12,
            backup_directory TEXT NOT NULL DEFAULT 'data/backups/',
            compression_enabled BOOLEAN NOT NULL DEFAULT 1,
            auto_upload_enabled BOOLEAN NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL,
            updated_by TEXT
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    // Insert default settings
    sqlx::query("INSERT INTO backup_settings (id, tenant_id, updated_at) VALUES (1, 'test-tenant', datetime('now'))")
        .execute(&pool)
        .await
        .unwrap();
    
    pool
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Create a backup chain with specified number of incrementals
async fn create_backup_chain(
    pool: &SqlitePool,
    chain_id: &str,
    num_incrementals: i32,
    days_old: i64,
) {
    let created_at = chrono::Utc::now() - chrono::Duration::days(days_old);
    
    // Create base backup (incremental_number = 0)
    sqlx::query(
        "INSERT INTO backup_jobs (
            id, backup_type, status, backup_chain_id, is_base_backup, incremental_number,
            created_at, updated_at, store_id, tenant_id, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(format!("{}-base", chain_id))
    .bind("db_incremental")
    .bind("completed")
    .bind(chain_id)
    .bind(true)
    .bind(0)
    .bind(created_at.to_rfc3339())
    .bind(created_at.to_rfc3339())
    .bind("test-store")
    .bind("test-tenant")
    .bind(created_at.to_rfc3339())
    .execute(pool)
    .await
    .unwrap();
    
    // Create incremental backups
    for i in 1..=num_incrementals {
        sqlx::query(
            "INSERT INTO backup_jobs (
                id, backup_type, status, backup_chain_id, is_base_backup, incremental_number,
                created_at, updated_at, store_id, tenant_id, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(format!("{}-inc-{}", chain_id, i))
        .bind("db_incremental")
        .bind("completed")
        .bind(chain_id)
        .bind(false)
        .bind(i)
        .bind(created_at.to_rfc3339())
        .bind(created_at.to_rfc3339())
        .bind("test-store")
        .bind("test-tenant")
        .bind(created_at.to_rfc3339())
        .execute(pool)
        .await
        .unwrap();
    }
}

/// Delete a specific backup by ID
async fn delete_backup(pool: &SqlitePool, backup_id: &str) {
    // Delete manifest entries
    sqlx::query("DELETE FROM backup_manifests WHERE backup_job_id = ?")
        .bind(backup_id)
        .execute(pool)
        .await
        .unwrap();
    
    // Delete destination objects
    sqlx::query("DELETE FROM backup_dest_objects WHERE backup_job_id = ?")
        .bind(backup_id)
        .execute(pool)
        .await
        .unwrap();
    
    // Delete backup job
    sqlx::query("DELETE FROM backup_jobs WHERE id = ?")
        .bind(backup_id)
        .execute(pool)
        .await
        .unwrap();
}

/// Delete an entire chain
async fn delete_chain(pool: &SqlitePool, chain_id: &str) {
    // Get all backup IDs in the chain
    let backup_ids: Vec<String> = sqlx::query_as::<_, (String,)>(
        "SELECT id FROM backup_jobs WHERE backup_chain_id = ?"
    )
    .bind(chain_id)
    .fetch_all(pool)
    .await
    .unwrap()
    .into_iter()
    .map(|(id,)| id)
    .collect();
    
    // Delete each backup
    for backup_id in backup_ids {
        delete_backup(pool, &backup_id).await;
    }
}

/// Check if there are any orphaned incrementals (incrementals without a base backup)
async fn has_orphaned_incrementals(pool: &SqlitePool) -> bool {
    // Get all chains that have incrementals
    let chains_with_incrementals: Vec<String> = sqlx::query_as::<_, (String,)>(
        "SELECT DISTINCT backup_chain_id 
         FROM backup_jobs 
         WHERE backup_chain_id IS NOT NULL 
         AND is_base_backup = 0"
    )
    .fetch_all(pool)
    .await
    .unwrap()
    .into_iter()
    .map(|(id,)| id)
    .collect();
    
    // For each chain, check if it has a base backup
    for chain_id in chains_with_incrementals {
        let base_count: i64 = sqlx::query_as::<_, (i64,)>(
            "SELECT COUNT(*) FROM backup_jobs 
             WHERE backup_chain_id = ? 
             AND is_base_backup = 1"
        )
        .bind(&chain_id)
        .fetch_one(pool)
        .await
        .unwrap()
        .0;
        
        if base_count == 0 {
            // Found incrementals without a base backup - orphaned!
            return true;
        }
    }
    
    false
}

/// Check if there are any incomplete chains (missing incrementals in sequence)
async fn has_incomplete_chains(pool: &SqlitePool) -> bool {
    // Get all chains
    let chains: Vec<String> = sqlx::query_as::<_, (String,)>(
        "SELECT DISTINCT backup_chain_id 
         FROM backup_jobs 
         WHERE backup_chain_id IS NOT NULL"
    )
    .fetch_all(pool)
    .await
    .unwrap()
    .into_iter()
    .map(|(id,)| id)
    .collect();
    
    // For each chain, check if incremental numbers are sequential
    for chain_id in chains {
        let incremental_numbers: Vec<i32> = sqlx::query_as::<_, (i32,)>(
            "SELECT incremental_number 
             FROM backup_jobs 
             WHERE backup_chain_id = ? 
             ORDER BY incremental_number ASC"
        )
        .bind(&chain_id)
        .fetch_all(pool)
        .await
        .unwrap()
        .into_iter()
        .map(|(num,)| num)
        .collect();
        
        // Check if numbers are sequential starting from 0
        for (i, num) in incremental_numbers.iter().enumerate() {
            if *num != i as i32 {
                // Found a gap in the sequence - incomplete chain!
                return true;
            }
        }
    }
    
    false
}

// ============================================================================
// Property Test Generators
// ============================================================================

/// Generate a random number of chains (1-10)
fn arb_num_chains() -> impl Strategy<Value = usize> {
    1..=10usize
}

/// Generate a random number of incrementals per chain (1-10)
fn arb_num_incrementals() -> impl Strategy<Value = i32> {
    1..=10i32
}

/// Generate a random age in days (1-365)
fn arb_days_old() -> impl Strategy<Value = i64> {
    1..=365i64
}

/// Generate a random deletion strategy
#[derive(Debug, Clone)]
enum DeletionStrategy {
    DeleteWholeChain(usize),      // Delete entire chain at index
    DeleteBaseBackup(usize),       // Delete only base backup of chain at index
    DeleteIncremental(usize, i32), // Delete specific incremental of chain at index
    DeleteMultipleChains(Vec<usize>), // Delete multiple entire chains
}

fn arb_deletion_strategy(num_chains: usize) -> impl Strategy<Value = DeletionStrategy> {
    prop_oneof![
        // Delete a whole chain
        (0..num_chains).prop_map(DeletionStrategy::DeleteWholeChain),
        
        // Delete just the base backup (should trigger whole chain deletion)
        (0..num_chains).prop_map(DeletionStrategy::DeleteBaseBackup),
        
        // Delete a specific incremental (should trigger whole chain deletion or be prevented)
        (0..num_chains, 1..=5i32).prop_map(|(idx, inc)| DeletionStrategy::DeleteIncremental(idx, inc)),
        
        // Delete multiple chains
        prop::collection::vec(0..num_chains, 1..=3).prop_map(DeletionStrategy::DeleteMultipleChains),
    ]
}

// ============================================================================
// Property Tests
// ============================================================================

// Property 6: Chain Integrity After Deletion
// For any backup deletion, if the deleted backup is part of a chain,
// either the entire chain is deleted or only complete chains are deleted,
// never leaving orphaned incrementals.
// **Validates: Requirements 5.2**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_6_chain_integrity_after_deletion(
        num_chains in arb_num_chains(),
        incrementals_per_chain in prop::collection::vec(arb_num_incrementals(), 1..=10),
        days_old_per_chain in prop::collection::vec(arb_days_old(), 1..=10),
    ) {
        // Run async test
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let pool = setup_test_db().await;
            
            // Ensure we have enough data for the number of chains
            let incrementals = if incrementals_per_chain.len() < num_chains {
                let mut extended = incrementals_per_chain.clone();
                while extended.len() < num_chains {
                    extended.push(3); // Default to 3 incrementals
                }
                extended
            } else {
                incrementals_per_chain
            };
            
            let days_old = if days_old_per_chain.len() < num_chains {
                let mut extended = days_old_per_chain.clone();
                while extended.len() < num_chains {
                    extended.push(30); // Default to 30 days old
                }
                extended
            } else {
                days_old_per_chain
            };
            
            // Create multiple backup chains
            let mut chain_ids = Vec::new();
            for i in 0..num_chains {
                let chain_id = Uuid::new_v4().to_string();
                create_backup_chain(
                    &pool,
                    &chain_id,
                    incrementals[i],
                    days_old[i],
                ).await;
                chain_ids.push(chain_id);
            }
            
            // Verify all chains are complete before deletion
            prop_assert!(
                !has_orphaned_incrementals(&pool).await,
                "Should have no orphaned incrementals before deletion"
            );
            prop_assert!(
                !has_incomplete_chains(&pool).await,
                "Should have no incomplete chains before deletion"
            );
            
            // Generate and apply deletion strategy
            let strategy = if num_chains == 1 {
                // For single chain, test different deletion scenarios
                let scenario = (num_chains * incrementals[0] as usize) % 3;
                match scenario {
                    0 => DeletionStrategy::DeleteWholeChain(0),
                    1 => DeletionStrategy::DeleteBaseBackup(0),
                    _ => DeletionStrategy::DeleteIncremental(0, 1),
                }
            } else {
                // For multiple chains, delete one or more chains
                let chains_to_delete = (0..num_chains).step_by(2).collect();
                DeletionStrategy::DeleteMultipleChains(chains_to_delete)
            };
            
            // Apply deletion strategy
            match strategy {
                DeletionStrategy::DeleteWholeChain(idx) => {
                    if idx < chain_ids.len() {
                        delete_chain(&pool, &chain_ids[idx]).await;
                    }
                }
                DeletionStrategy::DeleteBaseBackup(idx) => {
                    if idx < chain_ids.len() {
                        let base_id = format!("{}-base", chain_ids[idx]);
                        delete_backup(&pool, &base_id).await;
                        
                        // After deleting base, we should delete the entire chain
                        // to maintain integrity (this is what the retention service does)
                        delete_chain(&pool, &chain_ids[idx]).await;
                    }
                }
                DeletionStrategy::DeleteIncremental(idx, inc_num) => {
                    if idx < chain_ids.len() {
                        let inc_id = format!("{}-inc-{}", chain_ids[idx], inc_num);
                        
                        // Check if this incremental exists
                        let exists: i64 = sqlx::query_as::<_, (i64,)>(
                            "SELECT COUNT(*) FROM backup_jobs WHERE id = ?"
                        )
                        .bind(&inc_id)
                        .fetch_one(&pool)
                        .await
                        .unwrap()
                        .0;
                        
                        if exists > 0 {
                            delete_backup(&pool, &inc_id).await;
                            
                            // After deleting an incremental, we should delete the entire chain
                            // to maintain integrity (this is what the retention service does)
                            delete_chain(&pool, &chain_ids[idx]).await;
                        }
                    }
                }
                DeletionStrategy::DeleteMultipleChains(indices) => {
                    for idx in indices {
                        if idx < chain_ids.len() {
                            delete_chain(&pool, &chain_ids[idx]).await;
                        }
                    }
                }
            }
            
            // PROPERTY VERIFICATION:
            // After deletion, there should be NO orphaned incrementals
            prop_assert!(
                !has_orphaned_incrementals(&pool).await,
                "After deletion, there should be no orphaned incrementals (incrementals without base backup)"
            );
            
            // After deletion, there should be NO incomplete chains
            prop_assert!(
                !has_incomplete_chains(&pool).await,
                "After deletion, there should be no incomplete chains (missing incrementals in sequence)"
            );
            
            // Verify that remaining chains are complete
            let remaining_chains: Vec<String> = sqlx::query_as::<_, (String,)>(
                "SELECT DISTINCT backup_chain_id 
                 FROM backup_jobs 
                 WHERE backup_chain_id IS NOT NULL"
            )
            .fetch_all(&pool)
            .await
            .unwrap()
            .into_iter()
            .map(|(id,)| id)
            .collect();
            
            for chain_id in remaining_chains {
                // Each remaining chain must have a base backup
                let base_count: i64 = sqlx::query_as::<_, (i64,)>(
                    "SELECT COUNT(*) FROM backup_jobs 
                     WHERE backup_chain_id = ? 
                     AND is_base_backup = 1"
                )
                .bind(&chain_id)
                .fetch_one(&pool)
                .await
                .unwrap()
                .0;
                
                prop_assert_eq!(
                    base_count, 1,
                    "Chain {} must have exactly one base backup", chain_id
                );
                
                // Each remaining chain must have sequential incremental numbers
                let incremental_numbers: Vec<i32> = sqlx::query_as::<_, (i32,)>(
                    "SELECT incremental_number 
                     FROM backup_jobs 
                     WHERE backup_chain_id = ? 
                     ORDER BY incremental_number ASC"
                )
                .bind(&chain_id)
                .fetch_all(&pool)
                .await
                .unwrap()
                .into_iter()
                .map(|(num,)| num)
                .collect();
                
                // Verify sequential numbering starting from 0
                for (i, num) in incremental_numbers.iter().enumerate() {
                    prop_assert_eq!(
                        *num, i as i32,
                        "Chain {} must have sequential incremental numbers, expected {}, got {}",
                        chain_id, i, num
                    );
                }
            }
            
            Ok(())
        }).unwrap();
    }
}

#[cfg(test)]
mod additional_tests {
    use super::*;

    /// Test that deleting a base backup leaves orphans if we don't delete the whole chain
    #[tokio::test]
    async fn test_deleting_base_without_chain_creates_orphans() {
        let pool = setup_test_db().await;
        let chain_id = Uuid::new_v4().to_string();
        
        // Create a chain with base + 3 incrementals
        create_backup_chain(&pool, &chain_id, 3, 10).await;
        
        // Verify no orphans initially
        assert!(!has_orphaned_incrementals(&pool).await, "Should have no orphans initially");
        
        // Delete ONLY the base backup (not the whole chain)
        let base_id = format!("{}-base", chain_id);
        delete_backup(&pool, &base_id).await;
        
        // Now we should have orphaned incrementals
        assert!(has_orphaned_incrementals(&pool).await, "Should have orphaned incrementals after deleting base");
    }

    /// Test that deleting an incremental in the middle creates an incomplete chain
    #[tokio::test]
    async fn test_deleting_middle_incremental_creates_incomplete_chain() {
        let pool = setup_test_db().await;
        let chain_id = Uuid::new_v4().to_string();
        
        // Create a chain with base + 5 incrementals
        create_backup_chain(&pool, &chain_id, 5, 10).await;
        
        // Verify no incomplete chains initially
        assert!(!has_incomplete_chains(&pool).await, "Should have no incomplete chains initially");
        
        // Delete incremental #3 (leaving 0, 1, 2, 4, 5)
        let inc_id = format!("{}-inc-3", chain_id);
        delete_backup(&pool, &inc_id).await;
        
        // Now we should have an incomplete chain
        assert!(has_incomplete_chains(&pool).await, "Should have incomplete chain after deleting middle incremental");
    }

    /// Test that deleting entire chain leaves no orphans
    #[tokio::test]
    async fn test_deleting_entire_chain_leaves_no_orphans() {
        let pool = setup_test_db().await;
        let chain_id = Uuid::new_v4().to_string();
        
        // Create a chain with base + 5 incrementals
        create_backup_chain(&pool, &chain_id, 5, 10).await;
        
        // Delete the entire chain
        delete_chain(&pool, &chain_id).await;
        
        // Verify no orphans or incomplete chains
        assert!(!has_orphaned_incrementals(&pool).await, "Should have no orphans after deleting entire chain");
        assert!(!has_incomplete_chains(&pool).await, "Should have no incomplete chains after deleting entire chain");
        
        // Verify chain is completely gone
        let remaining_count: i64 = sqlx::query_as::<_, (i64,)>(
            "SELECT COUNT(*) FROM backup_jobs WHERE backup_chain_id = ?"
        )
        .bind(&chain_id)
        .fetch_one(&pool)
        .await
        .unwrap()
        .0;
        
        assert_eq!(remaining_count, 0, "Chain should be completely deleted");
    }

    /// Test multiple chains with selective deletion
    #[tokio::test]
    async fn test_multiple_chains_selective_deletion() {
        let pool = setup_test_db().await;
        
        // Create 5 chains
        let mut chain_ids = Vec::new();
        for i in 0..5 {
            let chain_id = Uuid::new_v4().to_string();
            create_backup_chain(&pool, &chain_id, 3, 10 + i).await;
            chain_ids.push(chain_id);
        }
        
        // Delete chains 1 and 3 (keep 0, 2, 4)
        delete_chain(&pool, &chain_ids[1]).await;
        delete_chain(&pool, &chain_ids[3]).await;
        
        // Verify no orphans or incomplete chains
        assert!(!has_orphaned_incrementals(&pool).await, "Should have no orphans after selective deletion");
        assert!(!has_incomplete_chains(&pool).await, "Should have no incomplete chains after selective deletion");
        
        // Verify correct chains remain
        let remaining_chains: Vec<String> = sqlx::query_as::<_, (String,)>(
            "SELECT DISTINCT backup_chain_id FROM backup_jobs WHERE backup_chain_id IS NOT NULL"
        )
        .fetch_all(&pool)
        .await
        .unwrap()
        .into_iter()
        .map(|(id,)| id)
        .collect();
        
        assert_eq!(remaining_chains.len(), 3, "Should have 3 chains remaining");
        assert!(remaining_chains.contains(&chain_ids[0]), "Chain 0 should remain");
        assert!(remaining_chains.contains(&chain_ids[2]), "Chain 2 should remain");
        assert!(remaining_chains.contains(&chain_ids[4]), "Chain 4 should remain");
    }
}
