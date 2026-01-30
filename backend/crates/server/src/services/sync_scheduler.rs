//! Sync Scheduler Service
//!
//! Extends scheduler functionality for sync operations:
//! - Cron-based scheduling (full sync, incremental sync)
//! - Timezone configuration
//! - Incremental sync logic with last_sync_at tracking
//! - Webhook-triggered sync
//! - Event deduplication
//!
//! Requirements: 5.3, 5.4, 5.5, 5.6

use crate::services::sync_orchestrator::{SyncOrchestrator, SyncOptions, SyncMode};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio_cron_scheduler::{Job, JobScheduler};
use tracing::{error, info, warn};
use uuid::Uuid;

#[derive(Debug)]
pub enum SyncSchedulerError {
    DatabaseError(sqlx::Error),
    SchedulerError(String),
    SyncError(String),
}

impl From<sqlx::Error> for SyncSchedulerError {
    fn from(err: sqlx::Error) -> Self {
        SyncSchedulerError::DatabaseError(err)
    }
}

impl std::fmt::Display for SyncSchedulerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SyncSchedulerError::DatabaseError(e) => write!(f, "Database error: {}", e),
            SyncSchedulerError::SchedulerError(e) => write!(f, "Scheduler error: {}", e),
            SyncSchedulerError::SyncError(e) => write!(f, "Sync error: {}", e),
        }
    }
}

impl std::error::Error for SyncSchedulerError {}

/// Sync schedule configuration
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyncSchedule {
    pub id: String,
    pub tenant_id: String,
    pub credential_id: String,
    pub platform: String,
    pub entity_type: String,
    pub cron_expression: String,
    pub sync_mode: String, // 'full' or 'incremental'
    pub timezone: String,
    pub is_active: bool,
    pub last_run_at: Option<String>,
    pub next_run_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Webhook event for deduplication
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WebhookEvent {
    pub id: String,
    pub tenant_id: String,
    pub platform: String,
    pub event_id: String,
    pub event_type: String,
    pub entity_type: String,
    pub entity_id: String,
    pub processed: bool,
    pub processed_at: Option<String>,
    pub created_at: String,
}

/// Sync Scheduler Service
pub struct SyncScheduler {
    db: SqlitePool,
    sync_orchestrator: Arc<SyncOrchestrator>,
    scheduler: Arc<RwLock<JobScheduler>>,
}

impl SyncScheduler {
    pub async fn new(
        db: SqlitePool,
        sync_orchestrator: Arc<SyncOrchestrator>,
    ) -> Result<Self, SyncSchedulerError> {
        let scheduler = JobScheduler::new()
            .await
            .map_err(|e| SyncSchedulerError::SchedulerError(e.to_string()))?;

        Ok(Self {
            db,
            sync_orchestrator,
            scheduler: Arc::new(RwLock::new(scheduler)),
        })
    }

    /// Start the scheduler
    pub async fn start(&self) -> Result<(), SyncSchedulerError> {
        info!("Starting sync scheduler");

        // Load all active schedules
        let active_schedules = self.get_active_schedules().await?;

        // Schedule each one
        for schedule in active_schedules {
            self.schedule_sync_job(&schedule).await?;
        }

        // Start the scheduler
        let scheduler = self.scheduler.write().await;
        scheduler
            .start()
            .await
            .map_err(|e| SyncSchedulerError::SchedulerError(e.to_string()))?;

        info!("Sync scheduler started successfully");
        Ok(())
    }

    /// Stop the scheduler
    pub async fn stop(&self) -> Result<(), SyncSchedulerError> {
        info!("Stopping sync scheduler");

        let mut scheduler = self.scheduler.write().await;
        scheduler
            .shutdown()
            .await
            .map_err(|e| SyncSchedulerError::SchedulerError(e.to_string()))?;

        info!("Sync scheduler stopped");
        Ok(())
    }

    /// Create a new sync schedule
    pub async fn create_schedule(
        &self,
        tenant_id: &str,
        credential_id: &str,
        platform: &str,
        entity_type: &str,
        cron_expression: &str,
        sync_mode: &str,
        timezone: Option<&str>,
    ) -> Result<String, SyncSchedulerError> {
        let schedule_id = Uuid::new_v4().to_string();
        let tz = timezone.unwrap_or("America/Edmonton");

        sqlx::query(
            r"
            INSERT INTO sync_schedules (
                id, tenant_id, credential_id, platform, entity_type,
                cron_expression, sync_mode, timezone, is_active,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            "
        )
        .bind(&schedule_id)
        .bind(tenant_id)
        .bind(credential_id)
        .bind(platform)
        .bind(entity_type)
        .bind(cron_expression)
        .bind(sync_mode)
        .bind(tz)
        .execute(&self.db)
        .await?;

        // Load the schedule and add it to the scheduler
        let schedule = self.get_schedule(&schedule_id).await?;
        self.schedule_sync_job(&schedule).await?;

        Ok(schedule_id)
    }

    /// Update a sync schedule
    pub async fn update_schedule(
        &self,
        schedule_id: &str,
        cron_expression: Option<&str>,
        sync_mode: Option<&str>,
        is_active: Option<bool>,
    ) -> Result<(), SyncSchedulerError> {
        let mut query = String::from("UPDATE sync_schedules SET updated_at = CURRENT_TIMESTAMP");
        let mut params: Vec<String> = Vec::new();

        if let Some(cron) = cron_expression {
            query.push_str(", cron_expression = ?");
            params.push(cron.to_string());
        }

        if let Some(mode) = sync_mode {
            query.push_str(", sync_mode = ?");
            params.push(mode.to_string());
        }

        if let Some(active) = is_active {
            query.push_str(", is_active = ?");
            params.push(if active { "1" } else { "0" }.to_string());
        }

        query.push_str(" WHERE id = ?");
        params.push(schedule_id.to_string());

        let mut q = sqlx::query(&query);
        for param in params {
            q = q.bind(param);
        }

        q.execute(&self.db).await?;

        Ok(())
    }

    /// Delete a sync schedule
    pub async fn delete_schedule(&self, schedule_id: &str) -> Result<(), SyncSchedulerError> {
        sqlx::query("DELETE FROM sync_schedules WHERE id = ?")
            .bind(schedule_id)
            .execute(&self.db)
            .await?;

        Ok(())
    }

    /// Get a sync schedule
    pub async fn get_schedule(&self, schedule_id: &str) -> Result<SyncSchedule, SyncSchedulerError> {
        let schedule = sqlx::query_as::<_, SyncSchedule>(
            "SELECT * FROM sync_schedules WHERE id = ?"
        )
        .bind(schedule_id)
        .fetch_one(&self.db)
        .await?;

        Ok(schedule)
    }

    /// Get all schedules for a tenant
    pub async fn get_schedules(&self, tenant_id: &str) -> Result<Vec<SyncSchedule>, SyncSchedulerError> {
        let schedules = sqlx::query_as::<_, SyncSchedule>(
            "SELECT * FROM sync_schedules WHERE tenant_id = ? ORDER BY created_at DESC"
        )
        .bind(tenant_id)
        .fetch_all(&self.db)
        .await?;

        Ok(schedules)
    }

    /// Get active schedules
    async fn get_active_schedules(&self) -> Result<Vec<SyncSchedule>, SyncSchedulerError> {
        let schedules = sqlx::query_as::<_, SyncSchedule>(
            "SELECT * FROM sync_schedules WHERE is_active = 1"
        )
        .fetch_all(&self.db)
        .await?;

        Ok(schedules)
    }

    /// Schedule a sync job
    async fn schedule_sync_job(&self, schedule: &SyncSchedule) -> Result<(), SyncSchedulerError> {
        let db = self.db.clone();
        let orchestrator = self.sync_orchestrator.clone();
        let schedule_clone = schedule.clone();

        // Parse cron expression
        let cron_str = schedule.cron_expression.clone();
        
        let job = Job::new_async(cron_str.as_str(), move |_uuid, _lock| {
            let db = db.clone();
            let orchestrator = orchestrator.clone();
            let schedule = schedule_clone.clone();

            Box::pin(async move {
                info!(
                    "Scheduled sync triggered: {} - {} ({})",
                    schedule.platform, schedule.entity_type, schedule.sync_mode
                );

                // Execute sync
                let sync_mode = if schedule.sync_mode == "full" {
                    SyncMode::Full
                } else {
                    SyncMode::Incremental
                };

                let options = SyncOptions {
                    mode: sync_mode,
                    dry_run: false,
                    entity_types: Some(vec![schedule.entity_type.clone()]),
                    date_range: None,
                    filters: std::collections::HashMap::new(),
                };

                match orchestrator.start_sync(
                    &schedule.tenant_id,
                    &schedule.credential_id,
                    options,
                ).await {
                    Ok(result) => {
                        info!(
                            "Scheduled sync completed: {} records processed, {} created, {} updated, {} failed",
                            result.records_processed,
                            result.records_created,
                            result.records_updated,
                            result.records_failed
                        );

                        // Update last_run_at
                        if let Err(e) = sqlx::query(
                            "UPDATE sync_schedules SET last_run_at = CURRENT_TIMESTAMP WHERE id = ?"
                        )
                        .bind(&schedule.id)
                        .execute(&db)
                        .await {
                            error!("Failed to update last_run_at: {}", e);
                        }
                    }
                    Err(e) => {
                        error!("Scheduled sync failed: {}", e);
                    }
                }
            })
        })
        .map_err(|e| SyncSchedulerError::SchedulerError(e.to_string()))?;

        let scheduler = self.scheduler.write().await;
        scheduler
            .add(job)
            .await
            .map_err(|e| SyncSchedulerError::SchedulerError(e.to_string()))?;

        Ok(())
    }

    /// Get last sync timestamp for incremental sync
    pub async fn get_last_sync_at(
        &self,
        credential_id: &str,
        entity_type: &str,
    ) -> Result<Option<DateTime<Utc>>, SyncSchedulerError> {
        let row: Option<(String,)> = sqlx::query_as(
            r"
            SELECT last_run_at FROM sync_schedules
            WHERE credential_id = ? AND entity_type = ? AND sync_mode = 'incremental'
            ORDER BY last_run_at DESC LIMIT 1
            "
        )
        .bind(credential_id)
        .bind(entity_type)
        .fetch_optional(&self.db)
        .await?;

        match row {
            Some((timestamp,)) => {
                let dt = DateTime::parse_from_rfc3339(&timestamp)
                    .map_err(|e| SyncSchedulerError::SchedulerError(e.to_string()))?
                    .with_timezone(&Utc);
                Ok(Some(dt))
            }
            None => Ok(None),
        }
    }

    /// Trigger webhook-based sync
    pub async fn trigger_webhook_sync(
        &self,
        tenant_id: &str,
        credential_id: &str,
        platform: &str,
        event_id: &str,
        event_type: &str,
        entity_type: &str,
        entity_id: &str,
    ) -> Result<String, SyncSchedulerError> {
        // Check if event already processed (deduplication)
        if self.is_event_processed(platform, event_id).await? {
            warn!("Event {} already processed, skipping", event_id);
            return Ok("skipped".to_string());
        }

        // Record the event
        self.record_webhook_event(
            tenant_id,
            platform,
            event_id,
            event_type,
            entity_type,
            entity_id,
        ).await?;

        // Trigger incremental sync
        let options = SyncOptions {
            mode: SyncMode::Incremental,
            dry_run: false,
            entity_types: Some(vec![entity_type.to_string()]),
            date_range: None,
            filters: std::collections::HashMap::new(),
        };

        match self.sync_orchestrator.start_sync(tenant_id, credential_id, options).await {
            Ok(result) => {
                info!("Webhook-triggered sync completed: sync_id={}", result.sync_id);
                
                // Mark event as processed
                self.mark_event_processed(platform, event_id).await?;
                
                Ok(result.sync_id)
            }
            Err(e) => {
                error!("Webhook-triggered sync failed: {}", e);
                Err(SyncSchedulerError::SyncError(e))
            }
        }
    }

    /// Check if webhook event was already processed
    async fn is_event_processed(
        &self,
        platform: &str,
        event_id: &str,
    ) -> Result<bool, SyncSchedulerError> {
        let row: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM webhook_events WHERE platform = ? AND event_id = ? AND processed = 1"
        )
        .bind(platform)
        .bind(event_id)
        .fetch_one(&self.db)
        .await?;

        Ok(row.0 > 0)
    }

    /// Record webhook event
    async fn record_webhook_event(
        &self,
        tenant_id: &str,
        platform: &str,
        event_id: &str,
        event_type: &str,
        entity_type: &str,
        entity_id: &str,
    ) -> Result<(), SyncSchedulerError> {
        let id = Uuid::new_v4().to_string();

        sqlx::query(
            r"
            INSERT INTO webhook_events (
                id, tenant_id, platform, event_id, event_type,
                entity_type, entity_id, processed, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
            "
        )
        .bind(id)
        .bind(tenant_id)
        .bind(platform)
        .bind(event_id)
        .bind(event_type)
        .bind(entity_type)
        .bind(entity_id)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// Mark webhook event as processed
    async fn mark_event_processed(
        &self,
        platform: &str,
        event_id: &str,
    ) -> Result<(), SyncSchedulerError> {
        sqlx::query(
            r"
            UPDATE webhook_events
            SET processed = 1, processed_at = CURRENT_TIMESTAMP
            WHERE platform = ? AND event_id = ?
            "
        )
        .bind(platform)
        .bind(event_id)
        .execute(&self.db)
        .await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync_schedule_creation() {
        let schedule = SyncSchedule {
            id: "test-123".to_string(),
            tenant_id: "tenant-1".to_string(),
            credential_id: "cred-1".to_string(),
            platform: "woocommerce".to_string(),
            entity_type: "orders".to_string(),
            cron_expression: "0 0 * * * *".to_string(),
            sync_mode: "incremental".to_string(),
            timezone: "America/Edmonton".to_string(),
            is_active: true,
            last_run_at: None,
            next_run_at: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };

        assert_eq!(schedule.platform, "woocommerce");
        assert_eq!(schedule.sync_mode, "incremental");
        assert!(schedule.is_active);
    }
}
