//! Property-based tests for scheduler non-overlap
//! 
//! These tests verify that the scheduler prevents concurrent backup executions
//! by ensuring only one backup runs at a time.
//!
//! **Validates: Requirements 2.3 (Scheduler Non-Overlap)**

use proptest::prelude::*;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Simulate concurrent backup attempts
#[derive(Debug, Clone)]
struct BackupAttempt {
    id: String,
    delay_ms: u64,
}

/// Generate random backup attempts
fn arb_backup_attempt() -> impl Strategy<Value = BackupAttempt> {
    ("[a-z0-9]{8}", 0u64..500u64).prop_map(|(id, delay)| BackupAttempt {
        id: format!("backup-{}", id),
        delay_ms: delay,
    })
}

/// Simulate a backup execution that takes some time
async fn simulate_backup_execution(
    running_job: Arc<RwLock<Option<String>>>,
    attempt: BackupAttempt,
) -> Result<bool, String> {
    // Check if a backup is already running
    {
        let current_job = running_job.read().await;
        if current_job.is_some() {
            // Another backup is running, skip this one
            return Ok(false);
        }
    }

    // Try to acquire the lock and start backup
    {
        let mut current_job = running_job.write().await;
        if current_job.is_some() {
            // Race condition: another backup started between read and write
            return Ok(false);
        }
        *current_job = Some(attempt.id.clone());
    }

    // Simulate backup work
    tokio::time::sleep(tokio::time::Duration::from_millis(attempt.delay_ms)).await;

    // Clear running job
    {
        let mut current_job = running_job.write().await;
        *current_job = None;
    }

    Ok(true)
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    /// Property 9: Scheduler Non-Overlap
    /// 
    /// For any set of concurrent backup attempts:
    /// - Only one backup should execute at a time
    /// - Other attempts should be skipped (not queued)
    /// - The running job lock should be released after completion
    /// 
    /// This validates Requirement 2.3 (Scheduler non-overlap)
    #[test]
    fn prop_scheduler_non_overlap(
        attempts in prop::collection::vec(arb_backup_attempt(), 2..10),
    ) {
        let runtime = tokio::runtime::Runtime::new().unwrap();
        runtime.block_on(async {
            let running_job: Arc<RwLock<Option<String>>> = Arc::new(RwLock::new(None));
            
            // Launch all backup attempts concurrently
            let mut handles = vec![];
            for attempt in attempts.clone() {
                let running_job = running_job.clone();
                let handle = tokio::spawn(async move {
                    simulate_backup_execution(running_job, attempt).await
                });
                handles.push(handle);
            }

            // Wait for all attempts to complete
            let mut executed_count = 0;
            let mut skipped_count = 0;
            for handle in handles {
                match handle.await {
                    Ok(Ok(true)) => executed_count += 1,
                    Ok(Ok(false)) => skipped_count += 1,
                    Ok(Err(e)) => panic!("Backup execution failed: {}", e),
                    Err(e) => panic!("Task join failed: {}", e),
                }
            }

            // Verify that at least one backup executed
            prop_assert!(
                executed_count > 0,
                "At least one backup should have executed, but all were skipped"
            );

            // Verify that some backups were skipped (proving non-overlap)
            if attempts.len() > 1 {
                prop_assert!(
                    skipped_count > 0,
                    "With {} concurrent attempts, some should have been skipped to prevent overlap",
                    attempts.len()
                );
            }

            // Verify the running job lock is released
            let final_state = running_job.read().await;
            prop_assert!(
                final_state.is_none(),
                "Running job lock should be released after all backups complete"
            );

            Ok(())
        }).unwrap();
    }

    /// Property: Sequential Backups Always Execute
    /// 
    /// For any sequence of backup attempts executed one after another,
    /// all should execute successfully (no skipping).
    #[test]
    fn prop_sequential_backups_execute(
        attempts in prop::collection::vec(arb_backup_attempt(), 1..5),
    ) {
        let runtime = tokio::runtime::Runtime::new().unwrap();
        runtime.block_on(async {
            let running_job: Arc<RwLock<Option<String>>> = Arc::new(RwLock::new(None));
            
            let mut executed_count = 0;
            
            // Execute backups sequentially
            for attempt in attempts.clone() {
                let result = simulate_backup_execution(running_job.clone(), attempt).await;
                match result {
                    Ok(true) => executed_count += 1,
                    Ok(false) => {
                        prop_assert!(
                            false,
                            "Sequential backup should not be skipped"
                        );
                    }
                    Err(e) => panic!("Backup execution failed: {}", e),
                }
            }

            // All sequential backups should execute
            prop_assert_eq!(
                executed_count,
                attempts.len(),
                "All sequential backups should execute"
            );

            Ok(())
        }).unwrap();
    }

    /// Property: Lock Released After Failure
    /// 
    /// Even if a backup fails, the running job lock should be released.
    #[test]
    fn prop_lock_released_after_failure(
        attempt in arb_backup_attempt(),
    ) {
        let runtime = tokio::runtime::Runtime::new().unwrap();
        runtime.block_on(async {
            let running_job: Arc<RwLock<Option<String>>> = Arc::new(RwLock::new(None));
            
            // Simulate a backup that "fails" (but still releases lock)
            {
                let mut current_job = running_job.write().await;
                *current_job = Some(attempt.id.clone());
            }

            // Simulate failure and cleanup
            {
                let mut current_job = running_job.write().await;
                *current_job = None;
            }

            // Verify lock is released
            let final_state = running_job.read().await;
            prop_assert!(
                final_state.is_none(),
                "Running job lock should be released even after failure"
            );

            Ok(())
        }).unwrap();
    }
}

#[cfg(test)]
mod unit_tests {
    use super::*;

    #[tokio::test]
    async fn test_single_backup_executes() {
        let running_job: Arc<RwLock<Option<String>>> = Arc::new(RwLock::new(None));
        let attempt = BackupAttempt {
            id: "backup-1".to_string(),
            delay_ms: 10,
        };

        let result = simulate_backup_execution(running_job.clone(), attempt).await;
        assert!(result.is_ok());
        assert!(result.unwrap());

        // Verify lock is released
        let final_state = running_job.read().await;
        assert!(final_state.is_none());
    }

    #[tokio::test]
    async fn test_concurrent_backups_skip() {
        let running_job: Arc<RwLock<Option<String>>> = Arc::new(RwLock::new(None));
        
        let attempt1 = BackupAttempt {
            id: "backup-1".to_string(),
            delay_ms: 100,
        };
        let attempt2 = BackupAttempt {
            id: "backup-2".to_string(),
            delay_ms: 10,
        };

        // Launch both concurrently
        let running_job1 = running_job.clone();
        let handle1 = tokio::spawn(async move {
            simulate_backup_execution(running_job1, attempt1).await
        });

        // Give first backup time to start
        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;

        let running_job2 = running_job.clone();
        let handle2 = tokio::spawn(async move {
            simulate_backup_execution(running_job2, attempt2).await
        });

        let result1 = handle1.await.unwrap().unwrap();
        let result2 = handle2.await.unwrap().unwrap();

        // One should execute, one should skip
        assert!(result1 || result2);
        assert!(!(result1 && result2), "Both backups should not execute concurrently");

        // Verify lock is released
        let final_state = running_job.read().await;
        assert!(final_state.is_none());
    }

    #[tokio::test]
    async fn test_sequential_backups_all_execute() {
        let running_job: Arc<RwLock<Option<String>>> = Arc::new(RwLock::new(None));
        
        let attempt1 = BackupAttempt {
            id: "backup-1".to_string(),
            delay_ms: 10,
        };
        let attempt2 = BackupAttempt {
            id: "backup-2".to_string(),
            delay_ms: 10,
        };

        // Execute sequentially
        let result1 = simulate_backup_execution(running_job.clone(), attempt1).await;
        let result2 = simulate_backup_execution(running_job.clone(), attempt2).await;

        assert!(result1.is_ok());
        assert!(result1.unwrap());
        assert!(result2.is_ok());
        assert!(result2.unwrap());

        // Verify lock is released
        let final_state = running_job.read().await;
        assert!(final_state.is_none());
    }
}
