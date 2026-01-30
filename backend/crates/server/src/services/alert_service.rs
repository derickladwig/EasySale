use sqlx::SqlitePool;
use uuid::Uuid;

/// Alert service for sending notifications about backup failures and other critical events
pub struct AlertService {
    pool: SqlitePool,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct BackupAlert {
    pub id: String,
    pub alert_type: String,
    pub severity: String,
    pub title: String,
    pub message: String,
    pub backup_job_id: Option<String>,
    pub error_details: Option<String>,
    pub suggested_actions: Option<String>,
    pub acknowledged: bool,
    pub acknowledged_at: Option<String>,
    pub acknowledged_by: Option<String>,
    pub created_at: String,
}

impl AlertService {
    /// Create a new alert service
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Send a backup failure alert
    pub async fn send_backup_failure_alert(
        &self,
        backup_job_id: &str,
        backup_type: &str,
        error: &str,
    ) -> Result<BackupAlert, Box<dyn std::error::Error + Send + Sync>> {
        let alert_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        // Determine suggested actions based on error type
        let suggested_actions = Self::suggest_actions_for_error(error);

        let title = format!("{} backup failed", backup_type);
        let message = format!(
            "Backup job {} failed with error: {}",
            backup_job_id, error
        );

        let alert = BackupAlert {
            id: alert_id.clone(),
            alert_type: "backup_failure".to_string(),
            severity: "high".to_string(),
            title,
            message,
            backup_job_id: Some(backup_job_id.to_string()),
            error_details: Some(error.to_string()),
            suggested_actions: Some(suggested_actions),
            acknowledged: false,
            acknowledged_at: None,
            acknowledged_by: None,
            created_at: now.clone(),
        };

        // Insert alert into database
        sqlx::query(
            "INSERT INTO backup_alerts (
                id, alert_type, severity, title, message, backup_job_id,
                error_details, suggested_actions, acknowledged, acknowledged_at,
                acknowledged_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&alert.id)
        .bind(&alert.alert_type)
        .bind(&alert.severity)
        .bind(&alert.title)
        .bind(&alert.message)
        .bind(&alert.backup_job_id)
        .bind(&alert.error_details)
        .bind(&alert.suggested_actions)
        .bind(alert.acknowledged)
        .bind(&alert.acknowledged_at)
        .bind(&alert.acknowledged_by)
        .bind(&alert.created_at)
        .execute(&self.pool)
        .await?;

        // Log the alert
        tracing::error!(
            alert_id = %alert.id,
            backup_job_id = %backup_job_id,
            backup_type = %backup_type,
            error = %error,
            "Backup failure alert created"
        );

        Ok(alert)
    }

    /// Send a disk space warning alert
    pub async fn send_disk_space_warning(
        &self,
        available_gb: f64,
        required_gb: f64,
    ) -> Result<BackupAlert, Box<dyn std::error::Error + Send + Sync>> {
        let alert_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        let title = "Insufficient disk space for backup".to_string();
        let message = format!(
            "Backup cannot proceed. Available: {:.2} GB, Required: {:.2} GB",
            available_gb, required_gb
        );
        let suggested_actions = "Free up disk space by:\n\
            1. Deleting old backups manually\n\
            2. Adjusting retention policies to keep fewer backups\n\
            3. Moving backups to external storage\n\
            4. Expanding disk capacity".to_string();

        let alert = BackupAlert {
            id: alert_id.clone(),
            alert_type: "disk_space_warning".to_string(),
            severity: "high".to_string(),
            title,
            message,
            backup_job_id: None,
            error_details: Some(format!(
                "Available: {:.2} GB, Required: {:.2} GB",
                available_gb, required_gb
            )),
            suggested_actions: Some(suggested_actions),
            acknowledged: false,
            acknowledged_at: None,
            acknowledged_by: None,
            created_at: now.clone(),
        };

        // Insert alert into database
        sqlx::query(
            "INSERT INTO backup_alerts (
                id, alert_type, severity, title, message, backup_job_id,
                error_details, suggested_actions, acknowledged, acknowledged_at,
                acknowledged_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&alert.id)
        .bind(&alert.alert_type)
        .bind(&alert.severity)
        .bind(&alert.title)
        .bind(&alert.message)
        .bind(&alert.backup_job_id)
        .bind(&alert.error_details)
        .bind(&alert.suggested_actions)
        .bind(alert.acknowledged)
        .bind(&alert.acknowledged_at)
        .bind(&alert.acknowledged_by)
        .bind(&alert.created_at)
        .execute(&self.pool)
        .await?;

        tracing::warn!(
            alert_id = %alert.id,
            available_gb = %available_gb,
            required_gb = %required_gb,
            "Disk space warning alert created"
        );

        Ok(alert)
    }

    /// Get all unacknowledged alerts
    pub async fn get_unacknowledged_alerts(&self) -> Result<Vec<BackupAlert>, Box<dyn std::error::Error + Send + Sync>> {
        let alerts = sqlx::query_as::<_, BackupAlert>(
            "SELECT * FROM backup_alerts WHERE acknowledged = 0 ORDER BY created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(alerts)
    }

    /// Acknowledge an alert
    pub async fn acknowledge_alert(
        &self,
        alert_id: &str,
        acknowledged_by: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE backup_alerts SET acknowledged = 1, acknowledged_at = ?, acknowledged_by = ? WHERE id = ?"
        )
        .bind(&now)
        .bind(acknowledged_by)
        .bind(alert_id)
        .execute(&self.pool)
        .await?;

        tracing::info!(
            alert_id = %alert_id,
            acknowledged_by = %acknowledged_by,
            "Alert acknowledged"
        );

        Ok(())
    }

    /// Suggest actions based on error message
    fn suggest_actions_for_error(error: &str) -> String {
        let error_lower = error.to_lowercase();

        if error_lower.contains("disk space") || error_lower.contains("insufficient") {
            "1. Free up disk space by deleting old files\n\
             2. Adjust retention policies to keep fewer backups\n\
             3. Move backups to external storage\n\
             4. Expand disk capacity".to_string()
        } else if error_lower.contains("permission") || error_lower.contains("access denied") {
            "1. Check file and directory permissions\n\
             2. Ensure the backup service has write access to the backup directory\n\
             3. Run the service with appropriate user privileges".to_string()
        } else if error_lower.contains("database") || error_lower.contains("locked") {
            "1. Ensure no other processes are accessing the database\n\
             2. Check if the database file is corrupted\n\
             3. Try running the backup during off-peak hours\n\
             4. Consider increasing the database timeout settings".to_string()
        } else if error_lower.contains("network") || error_lower.contains("connection") {
            "1. Check network connectivity\n\
             2. Verify remote storage credentials\n\
             3. Check firewall settings\n\
             4. Retry the backup manually".to_string()
        } else {
            "1. Review the error details in the backup job logs\n\
             2. Check system logs for additional information\n\
             3. Retry the backup manually\n\
             4. Contact support if the issue persists".to_string()
        }
    }
}

// Implement sqlx::FromRow for BackupAlert
impl sqlx::FromRow<'_, sqlx::sqlite::SqliteRow> for BackupAlert {
    fn from_row(row: &sqlx::sqlite::SqliteRow) -> Result<Self, sqlx::Error> {
        use sqlx::Row;
        
        Ok(BackupAlert {
            id: row.try_get("id")?,
            alert_type: row.try_get("alert_type")?,
            severity: row.try_get("severity")?,
            title: row.try_get("title")?,
            message: row.try_get("message")?,
            backup_job_id: row.try_get("backup_job_id")?,
            error_details: row.try_get("error_details")?,
            suggested_actions: row.try_get("suggested_actions")?,
            acknowledged: row.try_get("acknowledged")?,
            acknowledged_at: row.try_get("acknowledged_at")?,
            acknowledged_by: row.try_get("acknowledged_by")?,
            created_at: row.try_get("created_at")?,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();

        // Create backup_alerts table
        sqlx::query(
            "CREATE TABLE backup_alerts (
                id TEXT PRIMARY KEY,
                alert_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                backup_job_id TEXT,
                error_details TEXT,
                suggested_actions TEXT,
                acknowledged BOOLEAN NOT NULL DEFAULT 0,
                acknowledged_at TEXT,
                acknowledged_by TEXT,
                created_at TEXT NOT NULL
            )"
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_send_backup_failure_alert() {
        let pool = setup_test_db().await;
        let service = AlertService::new(pool);

        let result = service
            .send_backup_failure_alert("job-123", "db_full", "Disk space error")
            .await;

        assert!(result.is_ok());
        let alert = result.unwrap();
        assert_eq!(alert.alert_type, "backup_failure");
        assert_eq!(alert.severity, "high");
        assert!(!alert.acknowledged);
        assert!(alert.suggested_actions.is_some());
    }

    #[tokio::test]
    async fn test_send_disk_space_warning() {
        let pool = setup_test_db().await;
        let service = AlertService::new(pool);

        let result = service.send_disk_space_warning(5.0, 10.0).await;

        assert!(result.is_ok());
        let alert = result.unwrap();
        assert_eq!(alert.alert_type, "disk_space_warning");
        assert_eq!(alert.severity, "high");
        assert!(alert.message.contains("5.00 GB"));
        assert!(alert.message.contains("10.00 GB"));
    }

    #[tokio::test]
    async fn test_get_unacknowledged_alerts() {
        let pool = setup_test_db().await;
        let service = AlertService::new(pool.clone());

        // Create two alerts
        service
            .send_backup_failure_alert("job-1", "db_full", "Error 1")
            .await
            .unwrap();
        service
            .send_backup_failure_alert("job-2", "file", "Error 2")
            .await
            .unwrap();

        let alerts = service.get_unacknowledged_alerts().await.unwrap();
        assert_eq!(alerts.len(), 2);
    }

    #[tokio::test]
    async fn test_acknowledge_alert() {
        let pool = setup_test_db().await;
        let service = AlertService::new(pool.clone());

        // Create an alert
        let alert = service
            .send_backup_failure_alert("job-1", "db_full", "Error 1")
            .await
            .unwrap();

        // Acknowledge it
        let result = service.acknowledge_alert(&alert.id, "admin-user").await;
        assert!(result.is_ok());

        // Verify it's acknowledged
        let alerts = service.get_unacknowledged_alerts().await.unwrap();
        assert_eq!(alerts.len(), 0);
    }

    #[tokio::test]
    async fn test_suggest_actions_disk_space() {
        let actions = AlertService::suggest_actions_for_error("Insufficient disk space");
        assert!(actions.contains("disk space"));
        assert!(actions.contains("retention"));
    }

    #[tokio::test]
    async fn test_suggest_actions_permission() {
        let actions = AlertService::suggest_actions_for_error("Permission denied");
        assert!(actions.contains("permission"));
        assert!(actions.contains("privileges"));
    }

    #[tokio::test]
    async fn test_suggest_actions_database() {
        let actions = AlertService::suggest_actions_for_error("Database is locked");
        assert!(actions.contains("database"));
        assert!(actions.contains("timeout"));
    }
}
