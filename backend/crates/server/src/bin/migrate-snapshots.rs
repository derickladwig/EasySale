//! Snapshot migration CLI tool
//!
//! This tool creates accounting snapshots for historical finalized transactions.
//!
//! Usage:
//!   cargo run --bin migrate-snapshots -- [OPTIONS]
//!
//! Options:
//!   --verify-only    Only verify migration status, don't create snapshots
//!   --dry-run        Show what would be migrated without making changes
//!   --rollback       Rollback migration (delete migrated snapshots)

use accounting_snapshots::MigrationJob;
use sqlx::sqlite::SqlitePool;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();
    
    // Parse arguments
    let args: Vec<String> = env::args().collect();
    let verify_only = args.contains(&"--verify-only".to_string());
    let dry_run = args.contains(&"--dry-run".to_string());
    let rollback = args.contains(&"--rollback".to_string());
    
    // Get database path from environment
    let database_path = env::var("DATABASE_PATH")
        .unwrap_or_else(|_| "./data/EasySale.db".to_string());
    
    tracing::info!("Connecting to database: {}", database_path);
    
    // Connect to database
    let pool = SqlitePool::connect(&format!("sqlite:{database_path}")).await?;
    
    // Create migration job
    let migration = MigrationJob::new(pool);
    
    if rollback {
        // Rollback migration
        tracing::info!("Rolling back migration...");
        let deleted = migration.rollback().await?;
        
        println!("\n=== Rollback Complete ===");
        println!("Deleted {deleted} migrated snapshots");
    } else if verify_only {
        // Verify only
        tracing::info!("Running verification...");
        let result = migration.verify().await?;
        
        println!("\n=== Migration Verification ===");
        println!("Finalized transactions: {}", result.finalized_transactions);
        println!("Existing snapshots:     {}", result.snapshots);
        println!("Missing snapshots:      {}", result.missing_snapshots);
        
        if result.missing_snapshots > 0 {
            println!("\nTransactions without snapshots:");
            for id in result.missing_transaction_ids.iter().take(10) {
                println!("  - {id}");
            }
            if result.missing_transaction_ids.len() > 10 {
                println!("  ... and {} more", result.missing_transaction_ids.len() - 10);
            }
        } else {
            println!("\n✓ All finalized transactions have snapshots!");
        }
    } else if dry_run {
        // Dry run - verify first
        tracing::info!("Running dry run...");
        let result = migration.verify().await?;
        
        println!("\n=== Dry Run ===");
        println!("Would create {} snapshots", result.missing_snapshots);
        println!("\nRun without --dry-run to perform migration");
    } else {
        // Run migration
        tracing::info!("Starting migration...");
        let stats = migration.run().await?;
        
        println!("\n=== Migration Complete ===");
        println!("Total transactions:     {}", stats.total_transactions);
        println!("Existing snapshots:     {}", stats.existing_snapshots);
        println!("Created snapshots:      {}", stats.created_snapshots);
        println!("Failed transactions:    {}", stats.failed_transactions);
        
        if stats.failed_transactions > 0 {
            println!("\nFailed transaction IDs:");
            for id in &stats.failed_ids {
                println!("  - {id}");
            }
        }
        
        // Verify after migration
        tracing::info!("Verifying migration...");
        let result = migration.verify().await?;
        
        if result.missing_snapshots == 0 {
            println!("\n✓ Migration successful! All transactions have snapshots.");
        } else {
            println!("\n⚠ Warning: {} transactions still missing snapshots", result.missing_snapshots);
        }
    }
    
    Ok(())
}
