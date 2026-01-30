use crate::models::backup::{BackupJob, BackupMode, BackupSettings};
use crate::services::backup_service::BackupService;
use chrono::{DateTime, Duration, Utc};
use sqlx::{Pool, Sqlite};
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio_cron_scheduler::{Job, JobScheduler};
use tracing::{error, info, warn};

#[derive(Debug)]
pub enum SchedulerError {
    DatabaseError(sqlx::Error),
    SchedulerError(String),
    BackupError(String),
}

impl From<sqlx::Error> for SchedulerError {
    fn from(err: sqlx::Error) -> Self {
        SchedulerError::DatabaseError(err)
    }
}

impl std::fmt::Display for SchedulerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SchedulerError::DatabaseError(e) => write!(f, "Database error: {}", e),
            SchedulerError::SchedulerError(e) => write!(f, "Scheduler error: {}", e),
            SchedulerError::BackupError(e) => write!(f, "Backup error: {}", e),
        }
    }
}

impl std::error::Error for SchedulerError {}

pub struct SchedulerService {
    db_pool: Pool<Sqlite>,
    backup_service: Arc<BackupService>,
    scheduler: Arc<RwLock<JobScheduler>>,
    running_job: Arc<RwLock<Option<String>>>, // Track currently running backup job ID (UUID)
    store_id: String,
    tenant_id: String,
}

impl SchedulerService {
    pub async fn new(
        db_pool: Pool<Sqlite>,
        backup_service: Arc<BackupService>,
        store_id: String,
        tenant_id: String,
    ) -> Result<Self, SchedulerError> {
        let scheduler = JobScheduler::new()
            .await
            .map_err(|e| SchedulerError::SchedulerError(e.to_string()))?;

        Ok(Self {
            db_pool,
            backup_service,
            scheduler: Arc::new(RwLock::new(scheduler)),
            running_job: Arc::new(RwLock::new(None)),
            store_id,
            tenant_id,
        })
    }

    /// Start the scheduler and schedule backups based on current settings
    pub async fn start(&self) -> Result<(), SchedulerError> {
        info!("Starting backup scheduler");

        // Load backup settings
        let settings = self.load_settings().await?;

        // Check if any backup type is enabled
        if !settings.db_backup_enabled && !settings.file_backup_enabled && !settings.full_backup_enabled {
            info!("All backup types are disabled in settings");
            return Ok(());
        }

        // Schedule backups
        self.schedule_backups(&settings).await?;

        // Start the scheduler
        let scheduler = self.scheduler.write().await;
        scheduler
            .start()
            .await
            .map_err(|e| SchedulerError::SchedulerError(e.to_string()))?;

        info!("Backup scheduler started successfully");
        Ok(())
    }

    /// Stop the scheduler
    pub async fn stop(&self) -> Result<(), SchedulerError> {
        info!("Stopping backup scheduler");

        let mut scheduler = self.scheduler.write().await;
        scheduler
            .shutdown()
            .await
            .map_err(|e| SchedulerError::SchedulerError(e.to_string()))?;

        info!("Backup scheduler stopped");
        Ok(())
    }

    /// Schedule backups based on settings
    pub async fn schedule_backups(&self, settings: &BackupSettings) -> Result<(), SchedulerError> {
        let scheduler = self.scheduler.write().await;

        // Note: tokio-cron-scheduler doesn't have remove_all_jobs, so we'll just add new jobs
        // If we need to reschedule, we should stop and restart the scheduler

        // Schedule hourly incremental backups (at :00)
        if settings.db_backup_enabled {
            let db_pool = self.db_pool.clone();
            let backup_service = self.backup_service.clone();
            let running_job = self.running_job.clone();
            let store_id = self.store_id.clone();
            let tenant_id = self.tenant_id.clone();

            let hourly_job = Job::new_async("0 * * * * *", move |_uuid, _lock| {
                let db_pool = db_pool.clone();
                let backup_service = backup_service.clone();
                let running_job = running_job.clone();
                let store_id = store_id.clone();
                let tenant_id = tenant_id.clone();

                Box::pin(async move {
                    info!("Hourly incremental backup triggered");
                    if let Err(e) = Self::execute_backup_static(
                        db_pool,
                        backup_service,
                        running_job,
                        BackupMode::DbIncremental,
                        store_id,
                        tenant_id,
                    )
                    .await
                    {
                        error!("Hourly backup failed: {}", e);
                    }
                })
            })
            .map_err(|e| SchedulerError::SchedulerError(e.to_string()))?;

            scheduler
                .add(hourly_job)
                .await
                .map_err(|e| SchedulerError::SchedulerError(e.to_string()))?;

            info!("Scheduled hourly incremental backups at :00");
        }

        // Schedule daily full backup (at 23:59)
        if settings.db_backup_enabled {
            let db_pool = self.db_pool.clone();
            let backup_service = self.backup_service.clone();
            let running_job = self.running_job.clone();
            let store_id = self.store_id.clone();
            let tenant_id = self.tenant_id.clone();

            let daily_job = Job::new_async("0 59 23 * * *", move |_uuid, _lock| {
                let db_pool = db_pool.clone();
                let backup_service = backup_service.clone();
                let running_job = running_job.clone();
                let store_id = store_id.clone();
                let tenant_id = tenant_id.clone();

                Box::pin(async move {
                    info!("Daily full backup triggered");
                    if let Err(e) = Self::execute_backup_static(
                        db_pool,
                        backup_service,
                        running_job,
                        BackupMode::DbFull,
                        store_id,
                        tenant_id,
                    )
                    .await
                    {
                        error!("Daily backup failed: {}", e);
                    }
                })
            })
            .map_err(|e| SchedulerError::SchedulerError(e.to_string()))?;

            scheduler
                .add(daily_job)
                .await
                .map_err(|e| SchedulerError::SchedulerError(e.to_string()))?;

            info!("Scheduled daily full backups at 23:59");
        }

        // Schedule weekly file backup (Sunday at 3:00 AM)
        if settings.file_backup_enabled {
            let db_pool = self.db_pool.clone();
            let backup_service = self.backup_service.clone();
            let running_job = self.running_job.clone();
            let store_id = self.store_id.clone();
            let tenant_id = self.tenant_id.clone();

            let weekly_job = Job::new_async("0 0 3 * * SUN", move |_uuid, _lock| {
                let db_pool = db_pool.clone();
                let backup_service = backup_service.clone();
                let running_job = running_job.clone();
                let store_id = store_id.clone();
                let tenant_id = tenant_id.clone();

                Box::pin(async move {
                    info!("Weekly file backup triggered");
                    if let Err(e) = Self::execute_backup_static(
                        db_pool,
                        backup_service,
                        running_job,
                        BackupMode::File,
                        store_id,
                        tenant_id,
                    )
                    .await
                    {
                        error!("Weekly file backup failed: {}", e);
                    }
                })
            })
            .map_err(|e| SchedulerError::SchedulerError(e.to_string()))?;

            scheduler
                .add(weekly_job)
                .await
                .map_err(|e| SchedulerError::SchedulerError(e.to_string()))?;

            info!("Scheduled weekly file backups on Sunday at 3:00 AM");
        }

        // Schedule monthly full backup (1st of month at 4:00 AM)
        if settings.full_backup_enabled {
            let db_pool = self.db_pool.clone();
            let backup_service = self.backup_service.clone();
            let running_job = self.running_job.clone();
            let store_id = self.store_id.clone();
            let tenant_id = self.tenant_id.clone();

            let monthly_job = Job::new_async("0 0 4 1 * *", move |_uuid, _lock| {
                let db_pool = db_pool.clone();
                let backup_service = backup_service.clone();
                let running_job = running_job.clone();
                let store_id = store_id.clone();
                let tenant_id = tenant_id.clone();

                Box::pin(async move {
                    info!("Monthly full backup triggered");
                    if let Err(e) = Self::execute_backup_static(
                        db_pool,
                        backup_service,
                        running_job,
                        BackupMode::Full,
                        store_id,
                        tenant_id,
                    )
                    .await
                    {
                        error!("Monthly full backup failed: {}", e);
                    }
                })
            })
            .map_err(|e| SchedulerError::SchedulerError(e.to_string()))?;

            scheduler
                .add(monthly_job)
                .await
                .map_err(|e| SchedulerError::SchedulerError(e.to_string()))?;

            info!("Scheduled monthly full backups on 1st at 4:00 AM");
        }

        Ok(())
    }

    /// Execute a backup (static version for use in async closures)
    async fn execute_backup_static(
        _db_pool: Pool<Sqlite>,
        backup_service: Arc<BackupService>,
        running_job: Arc<RwLock<Option<String>>>,
        backup_mode: BackupMode,
        store_id: String,
        tenant_id: String,
    ) -> Result<(), SchedulerError> {
        // Check if a backup is already running
        {
            let current_job = running_job.read().await;
            if current_job.is_some() {
                warn!(
                    "Skipping scheduled {:?} backup - another backup is already running",
                    backup_mode
                );
                return Ok(());
            }
        }

        // Create backup
        let backup_type = backup_mode.as_str();
        let result = backup_service
            .create_backup(backup_type, &store_id, &tenant_id, None)  // System-triggered backup
            .await
            .map_err(|e| e.to_string());
        
        match result {
            Ok(backup_job) => {
                let job_id = backup_job.id.clone();
                
                // Set running job
                {
                    let mut current_job = running_job.write().await;
                    *current_job = Some(job_id.clone());
                }

                info!(
                    "Scheduled {:?} backup completed successfully (ID: {})",
                    backup_mode, job_id
                );

                // Clear running job
                {
                    let mut current_job = running_job.write().await;
                    *current_job = None;
                }

                Ok(())
            }
            Err(e) => {
                error!("Scheduled {:?} backup failed: {}", backup_mode, e);

                // Clear running job
                {
                    let mut current_job = running_job.write().await;
                    *current_job = None;
                }

                // Retry once after 15 minutes
                tokio::time::sleep(tokio::time::Duration::from_secs(15 * 60)).await;

                warn!("Retrying failed {:?} backup", backup_mode);
                let retry_result = backup_service
                    .create_backup(&backup_type, &store_id, &tenant_id, None)  // System-triggered retry
                    .await
                    .map_err(|e| e.to_string());
                
                match retry_result {
                    Ok(backup_job) => {
                        info!(
                            "Retry of {:?} backup succeeded (ID: {})",
                            backup_mode, backup_job.id
                        );
                        Ok(())
                    }
                    Err(retry_err) => {
                        error!(
                            "Retry of {:?} backup also failed: {}",
                            backup_mode, retry_err
                        );
                        // TODO: Send alert to administrators
                        Err(SchedulerError::BackupError(retry_err))
                    }
                }
            }
        }
    }

    /// Check if a backup job is currently running
    pub async fn is_job_running(&self) -> bool {
        let current_job = self.running_job.read().await;
        current_job.is_some()
    }

    /// Load backup settings from database
    async fn load_settings(&self) -> Result<BackupSettings, SchedulerError> {
        let settings = sqlx::query_as::<_, BackupSettings>(
            "SELECT * FROM backup_settings WHERE id = 1",
        )
        .fetch_one(&self.db_pool)
        .await?;

        Ok(settings)
    }

    /// Check for missed scheduled backups on startup
    pub async fn check_missed_backups(&self) -> Result<(), SchedulerError> {
        info!("Checking for missed scheduled backups");

        let settings = self.load_settings().await?;

        // Check if any backup type is enabled
        if !settings.db_backup_enabled && !settings.file_backup_enabled && !settings.full_backup_enabled {
            return Ok(());
        }

        // Get last backup of each type
        let last_db_backup = self.get_last_backup(BackupMode::DbFull).await?;
        let last_file_backup = self.get_last_backup(BackupMode::File).await?;
        let last_full_backup = self.get_last_backup(BackupMode::Full).await?;

        let now = Utc::now();

        // Check if daily backup was missed (should run at 23:59)
        if let Some(last_db) = last_db_backup {
            if let Some(ref started_at) = last_db.started_at {
                let last_db_time = DateTime::parse_from_rfc3339(started_at)
                    .map_err(|e| SchedulerError::SchedulerError(e.to_string()))?
                    .with_timezone(&Utc);

                if now.signed_duration_since(last_db_time) > Duration::days(1) {
                    warn!("Missed daily backup detected, running now");
                    self.execute_backup(BackupMode::DbFull).await?;
                }
            }
        }

        // Check if weekly file backup was missed (should run on Sunday at 3:00 AM)
        if let Some(last_file) = last_file_backup {
            if let Some(ref started_at) = last_file.started_at {
                let last_file_time = DateTime::parse_from_rfc3339(started_at)
                    .map_err(|e| SchedulerError::SchedulerError(e.to_string()))?
                    .with_timezone(&Utc);

                if now.signed_duration_since(last_file_time) > Duration::weeks(1) {
                    warn!("Missed weekly file backup detected, running now");
                    self.execute_backup(BackupMode::File).await?;
                }
            }
        }

        // Check if monthly full backup was missed (should run on 1st at 4:00 AM)
        if let Some(last_full) = last_full_backup {
            if let Some(ref started_at) = last_full.started_at {
                let last_full_time = DateTime::parse_from_rfc3339(started_at)
                    .map_err(|e| SchedulerError::SchedulerError(e.to_string()))?
                    .with_timezone(&Utc);

                if now.signed_duration_since(last_full_time) > Duration::days(31) {
                    warn!("Missed monthly full backup detected, running now");
                    self.execute_backup(BackupMode::Full).await?;
                }
            }
        }

        Ok(())
    }

    /// Get the last backup of a specific type
    async fn get_last_backup(
        &self,
        backup_mode: BackupMode,
    ) -> Result<Option<BackupJob>, SchedulerError> {
        let mode_str = backup_mode.as_str();

        let backup = sqlx::query_as::<_, BackupJob>(
            "SELECT * FROM backup_jobs WHERE backup_type = ? AND status = 'completed' ORDER BY started_at DESC LIMIT 1"
        )
        .bind(mode_str)
        .fetch_optional(&self.db_pool)
        .await?;

        Ok(backup)
    }

    /// Execute a backup immediately (for manual triggers)
    pub async fn execute_backup(&self, backup_mode: BackupMode) -> Result<(), SchedulerError> {
        Self::execute_backup_static(
            self.db_pool.clone(),
            self.backup_service.clone(),
            self.running_job.clone(),
            backup_mode,
            self.store_id.clone(),
            self.tenant_id.clone(),
        )
        .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::backup_service::BackupService;
    use crate::test_utils::create_test_db;

    async fn setup_test_db() -> Pool<Sqlite> {
        let pool = create_test_db().await.unwrap();
        
        // Insert test backup settings
        sqlx::query(
            "INSERT OR IGNORE INTO backup_settings (
                id, tenant_id, db_backup_enabled, file_backup_enabled, full_backup_enabled,
                file_include_paths, file_exclude_patterns, updated_at
            )
            VALUES (1, ?, TRUE, TRUE, TRUE, 'data/uploads/', '*.tmp,*.log', datetime('now'))"
        )
        .bind(crate::test_constants::TEST_TENANT_ID)
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    async fn insert_test_backup(
        pool: &Pool<Sqlite>,
        backup_type: &str,
        started_at: &str,
        status: &str,
    ) -> i64 {
        let result = sqlx::query(
            "INSERT INTO backup_jobs (
                id, tenant_id, store_id, backup_type, status, started_at, 
                completed_at, created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(crate::test_constants::TEST_TENANT_ID)
        .bind("store-1")
        .bind(backup_type)
        .bind(status)
        .bind(started_at)
        .bind(if status == "completed" { Some(started_at) } else { None })
        .bind("system")
        .execute(pool)
        .await
        .unwrap();

        result.last_insert_rowid()
    }

    #[tokio::test]
    async fn test_scheduler_creation() {
        let pool = setup_test_db().await;
        let backup_service = Arc::new(BackupService::new(pool.clone()));

        let scheduler = SchedulerService::new(
            pool,
            backup_service,
            "store-1".to_string(),
            crate::test_constants::TEST_TENANT_ID.to_string(),
        ).await;
        assert!(scheduler.is_ok());
    }

    #[tokio::test]
    async fn test_is_job_running() {
        let pool = setup_test_db().await;
        let backup_service = Arc::new(BackupService::new(pool.clone()));

        let scheduler = SchedulerService::new(
            pool,
            backup_service,
            "store-1".to_string(),
            crate::test_constants::TEST_TENANT_ID.to_string(),
        ).await.unwrap();
        assert!(!scheduler.is_job_running().await);
    }

    #[tokio::test]
    async fn test_load_settings() {
        let pool = setup_test_db().await;
        let backup_service = Arc::new(BackupService::new(pool.clone()));

        let scheduler = SchedulerService::new(
            pool,
            backup_service,
            "store-1".to_string(),
            crate::test_constants::TEST_TENANT_ID.to_string(),
        ).await.unwrap();
        let settings = scheduler.load_settings().await;
        assert!(settings.is_ok());
        // Note: BackupSettings doesn't have an 'enabled' field anymore
        let settings = settings.unwrap();
        assert!(settings.db_backup_enabled || settings.file_backup_enabled || settings.full_backup_enabled);
    }

    // ========================================================================
    // Schedule Calculation Tests
    // ========================================================================

    #[tokio::test]
    async fn test_daily_schedule_not_missed() {
        // Test that a daily backup completed within 24 hours is not considered missed
        let pool = setup_test_db().await;
        let backup_service = Arc::new(BackupService::new(pool.clone()));

        // Insert a daily backup from 12 hours ago
        let twelve_hours_ago = (Utc::now() - Duration::hours(12))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
        insert_test_backup(&pool, "db_full", &twelve_hours_ago, "completed").await;

        let scheduler = SchedulerService::new(
            pool.clone(),
            backup_service,
            "store-1".to_string(),
            crate::test_constants::TEST_TENANT_ID.to_string(),
        ).await.unwrap();

        // Check for missed backups - should not trigger a new backup
        let result = scheduler.check_missed_backups().await;
        assert!(result.is_ok());

        // Verify no new backup was created (only the one we inserted)
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM backup_jobs WHERE backup_type = 'db_full'"
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(count, 1);
    }

    #[tokio::test]
    async fn test_daily_schedule_missed() {
        // Test that a daily backup older than 24 hours triggers a new backup
        let pool = setup_test_db().await;
        let backup_service = Arc::new(BackupService::new(pool.clone()));

        // Insert a daily backup from 2 days ago
        let two_days_ago = (Utc::now() - Duration::days(2))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
        insert_test_backup(&pool, "db_full", &two_days_ago, "completed").await;

        let scheduler = SchedulerService::new(
            pool.clone(),
            backup_service,
            "store-1".to_string(),
            crate::test_constants::TEST_TENANT_ID.to_string(),
        ).await.unwrap();

        // Check for missed backups - should trigger a new backup
        let result = scheduler.check_missed_backups().await;
        assert!(result.is_ok());

        // Verify a new backup was created (2 total: old one + new one)
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM backup_jobs WHERE backup_type = 'db_full'"
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(count, 2);
    }

    #[tokio::test]
    async fn test_weekly_schedule_not_missed() {
        // Test that a weekly file backup completed within 7 days is not considered missed
        let pool = setup_test_db().await;
        let backup_service = Arc::new(BackupService::new(pool.clone()));

        // Insert a weekly backup from 3 days ago
        let three_days_ago = (Utc::now() - Duration::days(3))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
        insert_test_backup(&pool, "file", &three_days_ago, "completed").await;

        let scheduler = SchedulerService::new(
            pool.clone(),
            backup_service,
            "store-1".to_string(),
            crate::test_constants::TEST_TENANT_ID.to_string(),
        ).await.unwrap();

        // Check for missed backups - should not trigger a new backup
        let result = scheduler.check_missed_backups().await;
        assert!(result.is_ok());

        // Verify no new backup was created
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM backup_jobs WHERE backup_type = 'file'"
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(count, 1);
    }

    #[tokio::test]
    async fn test_weekly_schedule_missed() {
        // Test that a weekly file backup older than 7 days triggers a new backup
        let pool = setup_test_db().await;
        let backup_service = Arc::new(BackupService::new(pool.clone()));

        // Insert a weekly backup from 10 days ago
        let ten_days_ago = (Utc::now() - Duration::days(10))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
        insert_test_backup(&pool, "file", &ten_days_ago, "completed").await;

        let scheduler = SchedulerService::new(
            pool.clone(),
            backup_service,
            "store-1".to_string(),
            crate::test_constants::TEST_TENANT_ID.to_string(),
        ).await.unwrap();

        // Check for missed backups - should trigger a new backup
        let result = scheduler.check_missed_backups().await;
        assert!(result.is_ok());

        // Verify a new backup was created
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM backup_jobs WHERE backup_type = 'file'"
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(count, 2);
    }

    #[tokio::test]
    async fn test_monthly_schedule_not_missed() {
        // Test that a monthly full backup completed within 31 days is not considered missed
        let pool = setup_test_db().await;
        let backup_service = Arc::new(BackupService::new(pool.clone()));

        // Insert a monthly backup from 15 days ago
        let fifteen_days_ago = (Utc::now() - Duration::days(15))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
        insert_test_backup(&pool, "full", &fifteen_days_ago, "completed").await;

        let scheduler = SchedulerService::new(
            pool.clone(),
            backup_service,
            "store-1".to_string(),
            crate::test_constants::TEST_TENANT_ID.to_string(),
        ).await.unwrap();

        // Check for missed backups - should not trigger a new backup
        let result = scheduler.check_missed_backups().await;
        assert!(result.is_ok());

        // Verify no new backup was created
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM backup_jobs WHERE backup_type = 'full'"
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(count, 1);
    }

    #[tokio::test]
    async fn test_monthly_schedule_missed() {
        // Test that a monthly full backup older than 31 days triggers a new backup
        let pool = setup_test_db().await;
        let backup_service = Arc::new(BackupService::new(pool.clone()));

        // Insert a monthly backup from 35 days ago
        let thirty_five_days_ago = (Utc::now() - Duration::days(35))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
        insert_test_backup(&pool, "full", &thirty_five_days_ago, "completed").await;

        let scheduler = SchedulerService::new(
            pool.clone(),
            backup_service,
            "store-1".to_string(),
            crate::test_constants::TEST_TENANT_ID.to_string(),
        ).await.unwrap();

        // Check for missed backups - should trigger a new backup
        let result = scheduler.check_missed_backups().await;
        assert!(result.is_ok());

        // Verify a new backup was created
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM backup_jobs WHERE backup_type = 'full'"
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(count, 2);
    }

    #[tokio::test]
    async fn test_missed_schedule_detection_no_previous_backups() {
        // Test that missed schedule detection works when there are no previous backups
        let pool = setup_test_db().await;
        let backup_service = Arc::new(BackupService::new(pool.clone()));

        let scheduler = SchedulerService::new(
            pool.clone(),
            backup_service,
            "store-1".to_string(),
            crate::test_constants::TEST_TENANT_ID.to_string(),
        ).await.unwrap();

        // Check for missed backups with no previous backups - should not error
        let result = scheduler.check_missed_backups().await;
        assert!(result.is_ok());

        // Verify no backups were created (since there's no baseline to compare against)
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM backup_jobs"
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(count, 0);
    }

    #[tokio::test]
    async fn test_missed_schedule_detection_multiple_types() {
        // Test that missed schedule detection correctly handles multiple backup types
        let pool = setup_test_db().await;
        let backup_service = Arc::new(BackupService::new(pool.clone()));

        // Insert old backups for all three types
        let two_days_ago = (Utc::now() - Duration::days(2))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
        let ten_days_ago = (Utc::now() - Duration::days(10))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
        let thirty_five_days_ago = (Utc::now() - Duration::days(35))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);

        insert_test_backup(&pool, "db_full", &two_days_ago, "completed").await;
        insert_test_backup(&pool, "file", &ten_days_ago, "completed").await;
        insert_test_backup(&pool, "full", &thirty_five_days_ago, "completed").await;

        let scheduler = SchedulerService::new(
            pool.clone(),
            backup_service,
            "store-1".to_string(),
            crate::test_constants::TEST_TENANT_ID.to_string(),
        ).await.unwrap();

        // Check for missed backups - should trigger new backups for all three types
        let result = scheduler.check_missed_backups().await;
        assert!(result.is_ok());

        // Verify new backups were created for all three types
        let db_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM backup_jobs WHERE backup_type = 'db_full'"
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(db_count, 2); // Old + new

        let file_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM backup_jobs WHERE backup_type = 'file'"
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(file_count, 2); // Old + new

        let full_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM backup_jobs WHERE backup_type = 'full'"
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(full_count, 2); // Old + new
    }

    #[tokio::test]
    async fn test_missed_schedule_detection_with_disabled_backups() {
        // Test that missed schedule detection respects disabled backup types
        let pool = setup_test_db().await;
        let backup_service = Arc::new(BackupService::new(pool.clone()));

        // Disable all backup types
        sqlx::query(
            "UPDATE backup_settings SET db_backup_enabled = FALSE, 
             file_backup_enabled = FALSE, full_backup_enabled = FALSE WHERE id = 1"
        )
        .execute(&pool)
        .await
        .unwrap();

        // Insert old backups
        let two_days_ago = (Utc::now() - Duration::days(2))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
        insert_test_backup(&pool, "db_full", &two_days_ago, "completed").await;

        let scheduler = SchedulerService::new(
            pool.clone(),
            backup_service,
            "store-1".to_string(),
            crate::test_constants::TEST_TENANT_ID.to_string(),
        ).await.unwrap();

        // Check for missed backups - should not trigger any backups
        let result = scheduler.check_missed_backups().await;
        assert!(result.is_ok());

        // Verify no new backups were created
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM backup_jobs WHERE backup_type = 'db_full'"
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(count, 1); // Only the one we inserted
    }

    #[tokio::test]
    async fn test_schedule_calculation_boundary_daily() {
        // Test the exact boundary for daily schedule (24 hours)
        let pool = setup_test_db().await;
        let backup_service = Arc::new(BackupService::new(pool.clone()));

        // Insert a backup exactly 24 hours ago
        let exactly_24_hours_ago = (Utc::now() - Duration::hours(24))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
        insert_test_backup(&pool, "db_full", &exactly_24_hours_ago, "completed").await;

        let scheduler = SchedulerService::new(
            pool.clone(),
            backup_service,
            "store-1".to_string(),
            crate::test_constants::TEST_TENANT_ID.to_string(),
        ).await.unwrap();

        // Check for missed backups - at exactly 24 hours, it should not be considered missed
        let result = scheduler.check_missed_backups().await;
        assert!(result.is_ok());

        // The behavior at the boundary depends on the implementation
        // Since the check is > Duration::days(1), exactly 24 hours should not trigger
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM backup_jobs WHERE backup_type = 'db_full'"
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(count, 1);
    }

    #[tokio::test]
    async fn test_schedule_calculation_boundary_weekly() {
        // Test the exact boundary for weekly schedule (7 days)
        let pool = setup_test_db().await;
        let backup_service = Arc::new(BackupService::new(pool.clone()));

        // Insert a backup exactly 7 days ago
        let exactly_7_days_ago = (Utc::now() - Duration::days(7))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
        insert_test_backup(&pool, "file", &exactly_7_days_ago, "completed").await;

        let scheduler = SchedulerService::new(
            pool.clone(),
            backup_service,
            "store-1".to_string(),
            crate::test_constants::TEST_TENANT_ID.to_string(),
        ).await.unwrap();

        // Check for missed backups - at exactly 7 days, it should not be considered missed
        let result = scheduler.check_missed_backups().await;
        assert!(result.is_ok());

        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM backup_jobs WHERE backup_type = 'file'"
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(count, 1);
    }

    #[tokio::test]
    async fn test_schedule_calculation_boundary_monthly() {
        // Test the exact boundary for monthly schedule (31 days)
        let pool = setup_test_db().await;
        let backup_service = Arc::new(BackupService::new(pool.clone()));

        // Insert a backup exactly 31 days ago
        let exactly_31_days_ago = (Utc::now() - Duration::days(31))
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
        insert_test_backup(&pool, "full", &exactly_31_days_ago, "completed").await;

        let scheduler = SchedulerService::new(
            pool.clone(),
            backup_service,
            "store-1".to_string(),
            crate::test_constants::TEST_TENANT_ID.to_string(),
        ).await.unwrap();

        // Check for missed backups - at exactly 31 days, it should not be considered missed
        let result = scheduler.check_missed_backups().await;
        assert!(result.is_ok());

        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM backup_jobs WHERE backup_type = 'full'"
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(count, 1);
    }
}


