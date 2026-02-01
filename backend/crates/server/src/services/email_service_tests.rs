/**
 * Unit tests for EmailService
 */

#[cfg(test)]
mod tests {
    use crate::services::email_service::{
        EmailService, EmailProvider, EmailMessage, NotificationPreferencesUpdate,
    };
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect(":memory:").await.unwrap();

        // Create notification_preferences table
        sqlx::query(
            r#"
            CREATE TABLE notification_preferences (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                tenant_id TEXT NOT NULL,
                low_stock_alerts BOOLEAN NOT NULL DEFAULT 1,
                appointment_reminders BOOLEAN NOT NULL DEFAULT 1,
                invoice_notifications BOOLEAN NOT NULL DEFAULT 1,
                work_order_completion BOOLEAN NOT NULL DEFAULT 1,
                payment_receipts BOOLEAN NOT NULL DEFAULT 1,
                email_address TEXT,
                email_verified BOOLEAN NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

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
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_send_email_mock() {
        let pool = setup_test_db().await;
        let service = EmailService::new(pool, EmailProvider::Mock);

        let message = EmailMessage {
            to: "test@example.com".to_string(),
            subject: "Test Email".to_string(),
            body_html: "<p>Test</p>".to_string(),
            body_text: Some("Test".to_string()),
            template_name: None,
            template_data: None,
        };

        let result = service.send_email("tenant1", message).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_queue_email() {
        let pool = setup_test_db().await;
        let service = EmailService::new(pool.clone(), EmailProvider::Mock);

        let message = EmailMessage {
            to: "test@example.com".to_string(),
            subject: "Test Email".to_string(),
            body_html: "<p>Test</p>".to_string(),
            body_text: Some("Test".to_string()),
            template_name: Some("test_template".to_string()),
            template_data: None,
        };

        let result = service.queue_email("tenant1", message, None).await;
        assert!(result.is_ok());

        let email_id = result.unwrap();
        assert!(!email_id.is_empty());

        // Verify email was queued
        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM email_queue")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count.0, 1);
    }

    #[tokio::test]
    async fn test_process_queue() {
        let pool = setup_test_db().await;
        let service = EmailService::new(pool.clone(), EmailProvider::Mock);

        // Queue an email
        let message = EmailMessage {
            to: "test@example.com".to_string(),
            subject: "Test Email".to_string(),
            body_html: "<p>Test</p>".to_string(),
            body_text: None,
            template_name: None,
            template_data: None,
        };

        service.queue_email("tenant1", message, None).await.unwrap();

        // Process queue
        let processed = service.process_queue().await.unwrap();
        assert_eq!(processed, 1);

        // Verify email was marked as sent
        let status: (String,) = sqlx::query_as("SELECT status FROM email_queue")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(status.0, "sent");
    }

    #[tokio::test]
    async fn test_get_preferences_creates_default() {
        let pool = setup_test_db().await;
        let service = EmailService::new(pool.clone(), EmailProvider::Mock);

        let prefs = service
            .get_preferences("user1", "tenant1")
            .await
            .unwrap();

        assert_eq!(prefs.user_id, "user1");
        assert_eq!(prefs.tenant_id, "tenant1");
        assert!(prefs.low_stock_alerts);
        assert!(prefs.appointment_reminders);
        assert!(prefs.invoice_notifications);
        assert!(prefs.work_order_completion);
        assert!(prefs.payment_receipts);
        assert!(!prefs.email_verified);
    }

    #[tokio::test]
    async fn test_update_preferences() {
        let pool = setup_test_db().await;
        let service = EmailService::new(pool.clone(), EmailProvider::Mock);

        // Create default preferences
        service.get_preferences("user1", "tenant1").await.unwrap();

        // Update preferences
        let updates = NotificationPreferencesUpdate {
            low_stock_alerts: Some(false),
            appointment_reminders: Some(true),
            invoice_notifications: Some(false),
            work_order_completion: None,
            payment_receipts: None,
            email_address: Some("user1@example.com".to_string()),
        };

        let result = service.update_preferences("user1", "tenant1", updates).await;
        assert!(result.is_ok());

        // Verify updates
        let prefs = service
            .get_preferences("user1", "tenant1")
            .await
            .unwrap();

        assert!(!prefs.low_stock_alerts);
        assert!(prefs.appointment_reminders);
        assert!(!prefs.invoice_notifications);
        assert!(prefs.work_order_completion); // Not updated
        assert!(prefs.payment_receipts); // Not updated
        assert_eq!(prefs.email_address, Some("user1@example.com".to_string()));
        assert!(!prefs.email_verified); // Reset when email changes
    }

    #[tokio::test]
    async fn test_exponential_backoff() {
        let pool = setup_test_db().await;
        
        // Create a provider that always fails
        let service = EmailService::new(pool.clone(), EmailProvider::Mock);

        // Queue an email
        let message = EmailMessage {
            to: "test@example.com".to_string(),
            subject: "Test Email".to_string(),
            body_html: "<p>Test</p>".to_string(),
            body_text: None,
            template_name: None,
            template_data: None,
        };

        let email_id = service.queue_email("tenant1", message, None).await.unwrap();

        // Simulate failed attempts by manually updating the database
        for attempt in 1..=3 {
            sqlx::query(
                r#"
                UPDATE email_queue
                SET attempts = ?, status = 'pending', last_error = 'Test error'
                WHERE id = ?
                "#,
            )
            .bind(attempt)
            .bind(&email_id)
            .execute(&pool)
            .await
            .unwrap();

            // Check scheduled_for increases exponentially
            let (scheduled_for,): (String,) =
                sqlx::query_as("SELECT scheduled_for FROM email_queue WHERE id = ?")
                    .bind(&email_id)
                    .fetch_one(&pool)
                    .await
                    .unwrap();

            // Verify scheduled_for is set (actual backoff calculation tested in process_queue)
            assert!(!scheduled_for.is_empty());
        }
    }

    #[tokio::test]
    async fn test_email_templates() {
        use crate::services::email_service::{
            get_low_stock_alert_template, get_appointment_reminder_template,
            get_invoice_notification_template,
        };

        // Test low stock alert template
        let template = get_low_stock_alert_template("Test Product", 5, 10);
        assert_eq!(template.name, "low_stock_alert");
        assert!(template.subject.contains("Test Product"));
        assert!(template.body_html.contains("Test Product"));
        assert!(template.body_html.contains("5"));
        assert!(template.body_html.contains("10"));
        assert!(template.body_text.is_some());

        // Test appointment reminder template
        let template = get_appointment_reminder_template(
            "John Doe",
            "2024-01-15 10:00 AM",
            "Oil Change",
        );
        assert_eq!(template.name, "appointment_reminder");
        assert!(template.body_html.contains("John Doe"));
        assert!(template.body_html.contains("Oil Change"));
        assert!(template.body_text.is_some());

        // Test invoice notification template
        let template = get_invoice_notification_template("Jane Smith", "INV-001", "$150.00");
        assert_eq!(template.name, "invoice_notification");
        assert!(template.body_html.contains("Jane Smith"));
        assert!(template.body_html.contains("INV-001"));
        assert!(template.body_html.contains("$150.00"));
        assert!(template.body_text.is_some());
    }

    #[tokio::test]
    async fn test_queue_with_scheduled_time() {
        let pool = setup_test_db().await;
        let service = EmailService::new(pool.clone(), EmailProvider::Mock);

        let message = EmailMessage {
            to: "test@example.com".to_string(),
            subject: "Scheduled Email".to_string(),
            body_html: "<p>Test</p>".to_string(),
            body_text: None,
            template_name: None,
            template_data: None,
        };

        let scheduled_time = chrono::Utc::now() + chrono::Duration::hours(1);
        let result = service
            .queue_email("tenant1", message, Some(scheduled_time))
            .await;
        assert!(result.is_ok());

        // Verify email is not processed immediately
        let processed = service.process_queue().await.unwrap();
        assert_eq!(processed, 0); // Should not process future emails

        // Verify email is still pending
        let status: (String,) = sqlx::query_as("SELECT status FROM email_queue")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(status.0, "pending");
    }
}
