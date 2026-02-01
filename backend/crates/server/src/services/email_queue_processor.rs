/**
 * Email Queue Processor
 * 
 * Background worker that processes the email queue with retry logic:
 * - Runs every 1 minute
 * - Processes up to 100 emails per batch
 * - Implements exponential backoff for failed emails
 * - Marks emails as failed after max attempts
 */

use sqlx::SqlitePool;
use tokio::time::{interval, Duration};
use crate::services::email_service::{EmailService, EmailProvider};

pub struct EmailQueueProcessor {
    pool: SqlitePool,
    email_service: EmailService,
    interval_seconds: u64,
}

impl EmailQueueProcessor {
    pub fn new(pool: SqlitePool, email_provider: EmailProvider, interval_seconds: u64) -> Self {
        let email_service = EmailService::new(pool.clone(), email_provider);
        Self {
            pool,
            email_service,
            interval_seconds,
        }
    }

    /// Start the background processor
    pub async fn start(self) {
        let mut ticker = interval(Duration::from_secs(self.interval_seconds));

        tracing::info!(
            "Email queue processor started (interval: {}s)",
            self.interval_seconds
        );

        loop {
            ticker.tick().await;

            match self.process_batch().await {
                Ok(processed) => {
                    if processed > 0 {
                        tracing::info!("Processed {} emails from queue", processed);
                    }
                }
                Err(errors) => {
                    tracing::error!("Failed to process email queue: {:?}", errors);
                }
            }
        }
    }

    /// Process a batch of emails
    async fn process_batch(&self) -> Result<usize, Vec<String>> {
        self.email_service.process_queue().await
    }

    /// Mark emails as failed after max attempts
    pub async fn mark_failed_emails(&self) -> Result<usize, Vec<String>> {
        let now = chrono::Utc::now().to_rfc3339();

        // Mark emails that have reached max attempts as failed
        let result = sqlx::query(
            r#"
            UPDATE email_queue
            SET status = 'failed', updated_at = ?
            WHERE status = 'pending'
            AND attempts >= max_attempts
            "#
        )
        .bind(&now)
        .execute(&self.pool)
        .await
        .map_err(|e| vec![format!("Failed to mark emails as failed: {}", e)])?;

        Ok(result.rows_affected() as usize)
    }

    /// Clean up old emails (sent or failed older than 30 days)
    pub async fn cleanup_old_emails(&self, days: i64) -> Result<usize, Vec<String>> {
        let cutoff_date = (chrono::Utc::now() - chrono::Duration::days(days)).to_rfc3339();

        let result = sqlx::query(
            r#"
            DELETE FROM email_queue
            WHERE (status = 'sent' OR status = 'failed')
            AND updated_at < ?
            "#
        )
        .bind(&cutoff_date)
        .execute(&self.pool)
        .await
        .map_err(|e| vec![format!("Failed to cleanup old emails: {}", e)])?;

        Ok(result.rows_affected() as usize)
    }

    /// Get queue statistics
    pub async fn get_queue_stats(&self) -> Result<QueueStats, Vec<String>> {
        let stats = sqlx::query_as::<_, (i64, i64, i64, i64)>(
            r#"
            SELECT
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'sending' THEN 1 END) as sending,
                COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
            FROM email_queue
            "#
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| vec![format!("Failed to fetch queue stats: {}", e)])?;

        Ok(QueueStats {
            pending: stats.0 as usize,
            sending: stats.1 as usize,
            sent: stats.2 as usize,
            failed: stats.3 as usize,
        })
    }
}

#[derive(Debug, Clone)]
pub struct QueueStats {
    pub pending: usize,
    pub sending: usize,
    pub sent: usize,
    pub failed: usize,
}

impl QueueStats {
    pub fn total(&self) -> usize {
        self.pending + self.sending + self.sent + self.failed
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_queue_stats() {
        let pool = SqlitePool::connect(":memory:").await.unwrap();
        
        // Create email_queue table
        sqlx::query(
            r#"
            CREATE TABLE email_queue (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                to_address TEXT NOT NULL,
                from_address TEXT NOT NULL,
                subject TEXT NOT NULL,
                body_html TEXT NOT NULL,
                body_text TEXT,
                template_name TEXT,
                template_data TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                attempts INTEGER NOT NULL DEFAULT 0,
                max_attempts INTEGER NOT NULL DEFAULT 3,
                last_attempt_at TEXT,
                last_error TEXT,
                scheduled_for TEXT NOT NULL,
                sent_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            "#
        )
        .execute(&pool)
        .await
        .unwrap();

        let processor = EmailQueueProcessor::new(pool, EmailProvider::Mock, 60);
        let stats = processor.get_queue_stats().await.unwrap();

        assert_eq!(stats.pending, 0);
        assert_eq!(stats.total(), 0);
    }
}
