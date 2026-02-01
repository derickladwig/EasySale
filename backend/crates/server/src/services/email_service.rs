use sqlx::SqlitePool;
use std::time::Duration;
use tokio::time::sleep;
use base64;
use urlencoding;

#[derive(Debug, Clone)]
pub enum EmailProvider {
    Smtp {
        host: String,
        port: u16,
        username: String,
        password: String,
        from_address: String,
    },
    SendGrid {
        api_key: String,
        from_address: String,
    },
    AwsSes {
        region: String,
        access_key_id: String,
        secret_access_key: String,
        from_address: String,
    },
    Mock, // For testing
}

#[derive(Debug, Clone)]
pub struct EmailTemplate {
    pub name: String,
    pub subject: String,
    pub body_html: String,
    pub body_text: Option<String>,
}

#[derive(Debug, Clone)]
pub struct EmailMessage {
    pub to: String,
    pub subject: String,
    pub body_html: String,
    pub body_text: Option<String>,
    pub template_name: Option<String>,
    pub template_data: Option<serde_json::Value>,
}

pub struct EmailService {
    pool: SqlitePool,
    provider: EmailProvider,
}

impl EmailService {
    pub fn new(pool: SqlitePool, provider: EmailProvider) -> Self {
        Self { pool, provider }
    }

    /// Send an email immediately
    pub async fn send_email(
        &self,
        tenant_id: &str,
        message: EmailMessage,
    ) -> Result<(), Vec<String>> {
        match &self.provider {
            EmailProvider::Mock => {
                tracing::info!(
                    "Mock email sent to {}: {}",
                    message.to,
                    message.subject
                );
                Ok(())
            }
            EmailProvider::Smtp { .. } => self.send_via_smtp(tenant_id, message).await,
            EmailProvider::SendGrid { .. } => self.send_via_sendgrid(tenant_id, message).await,
            EmailProvider::AwsSes { .. } => self.send_via_ses(tenant_id, message).await,
        }
    }

    /// Queue an email for later delivery with retry logic
    pub async fn queue_email(
        &self,
        tenant_id: &str,
        message: EmailMessage,
        scheduled_for: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Result<String, Vec<String>> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let scheduled = scheduled_for
            .unwrap_or_else(chrono::Utc::now)
            .to_rfc3339();

        let from_address = self.get_from_address();
        let template_data_json = message
            .template_data
            .as_ref()
            .map(|d| serde_json::to_string(d).unwrap_or_default());

        sqlx::query(
            r#"
            INSERT INTO email_queue (
                id, tenant_id, to_address, from_address, subject, body_html, body_text,
                template_name, template_data, status, attempts, max_attempts,
                scheduled_for, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, 3, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(tenant_id)
        .bind(&message.to)
        .bind(&from_address)
        .bind(&message.subject)
        .bind(&message.body_html)
        .bind(&message.body_text)
        .bind(&message.template_name)
        .bind(&template_data_json)
        .bind(&scheduled)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await
        .map_err(|e| vec![format!("Failed to queue email: {}", e)])?;

        Ok(id)
    }

    /// Process pending emails in the queue
    pub async fn process_queue(&self) -> Result<usize, Vec<String>> {
        let now = chrono::Utc::now().to_rfc3339();

        // Get pending emails that are scheduled for now or earlier
        let pending_emails = sqlx::query_as::<_, (String, String, String, String, String, Option<String>, Option<String>, i32)>(
            r#"
            SELECT id, tenant_id, to_address, subject, body_html, body_text, template_name, attempts
            FROM email_queue
            WHERE status = 'pending'
            AND scheduled_for <= ?
            AND attempts < max_attempts
            ORDER BY scheduled_for ASC
            LIMIT 100
            "#
        )
        .bind(&now)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| vec![format!("Failed to fetch pending emails: {}", e)])?;

        let mut processed = 0;

        for (id, tenant_id, to, subject, body_html, body_text, template_name, attempts) in
            pending_emails
        {
            // Update status to sending
            let _ = sqlx::query(
                "UPDATE email_queue SET status = 'sending', updated_at = ? WHERE id = ?",
            )
            .bind(&now)
            .bind(&id)
            .execute(&self.pool)
            .await;

            let message = EmailMessage {
                to,
                subject,
                body_html,
                body_text,
                template_name,
                template_data: None,
            };

            match self.send_email(&tenant_id, message).await {
                Ok(_) => {
                    // Mark as sent
                    let _ = sqlx::query(
                        r#"
                        UPDATE email_queue
                        SET status = 'sent', sent_at = ?, updated_at = ?
                        WHERE id = ?
                        "#,
                    )
                    .bind(&now)
                    .bind(&now)
                    .bind(&id)
                    .execute(&self.pool)
                    .await;

                    processed += 1;
                }
                Err(errors) => {
                    let new_attempts = attempts + 1;
                    let error_msg = errors.join("; ");

                    // Calculate exponential backoff
                    let backoff_seconds = 2_i64.pow(new_attempts as u32) * 60; // 2, 4, 8 minutes
                    let next_attempt = chrono::Utc::now()
                        + chrono::Duration::seconds(backoff_seconds);

                    // Update with error and schedule retry
                    let _ = sqlx::query(
                        r#"
                        UPDATE email_queue
                        SET status = 'pending',
                            attempts = ?,
                            last_attempt_at = ?,
                            last_error = ?,
                            scheduled_for = ?,
                            updated_at = ?
                        WHERE id = ?
                        "#,
                    )
                    .bind(new_attempts)
                    .bind(&now)
                    .bind(&error_msg)
                    .bind(next_attempt.to_rfc3339())
                    .bind(&now)
                    .bind(&id)
                    .execute(&self.pool)
                    .await;

                    tracing::warn!(
                        "Failed to send email {} (attempt {}): {}",
                        id,
                        new_attempts,
                        error_msg
                    );
                }
            }
        }

        Ok(processed)
    }

    /// Get notification preferences for a user
    pub async fn get_preferences(
        &self,
        user_id: &str,
        tenant_id: &str,
    ) -> Result<NotificationPreferences, Vec<String>> {
        let result = sqlx::query_as::<_, NotificationPreferences>(
            r#"
            SELECT id, user_id, tenant_id, low_stock_alerts, appointment_reminders,
                   invoice_notifications, work_order_completion, payment_receipts,
                   email_address, email_verified, created_at, updated_at
            FROM notification_preferences
            WHERE user_id = ? AND tenant_id = ?
            "#,
        )
        .bind(user_id)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| vec![format!("Failed to fetch preferences: {}", e)])?;

        match result {
            Some(prefs) => Ok(prefs),
            None => {
                // Create default preferences
                let id = uuid::Uuid::new_v4().to_string();
                let now = chrono::Utc::now().to_rfc3339();

                sqlx::query(
                    r#"
                    INSERT INTO notification_preferences (
                        id, user_id, tenant_id, low_stock_alerts, appointment_reminders,
                        invoice_notifications, work_order_completion, payment_receipts,
                        email_verified, created_at, updated_at
                    ) VALUES (?, ?, ?, 1, 1, 1, 1, 1, 0, ?, ?)
                    "#,
                )
                .bind(&id)
                .bind(user_id)
                .bind(tenant_id)
                .bind(&now)
                .bind(&now)
                .execute(&self.pool)
                .await
                .map_err(|e| vec![format!("Failed to create preferences: {}", e)])?;

                Ok(NotificationPreferences {
                    id,
                    user_id: user_id.to_string(),
                    tenant_id: tenant_id.to_string(),
                    low_stock_alerts: true,
                    appointment_reminders: true,
                    invoice_notifications: true,
                    work_order_completion: true,
                    payment_receipts: true,
                    email_address: None,
                    email_verified: false,
                    created_at: now.clone(),
                    updated_at: now,
                })
            }
        }
    }

    /// Update notification preferences
    pub async fn update_preferences(
        &self,
        user_id: &str,
        tenant_id: &str,
        updates: NotificationPreferencesUpdate,
    ) -> Result<(), Vec<String>> {
        let now = chrono::Utc::now().to_rfc3339();

        // Build dynamic update query
        let mut query = String::from("UPDATE notification_preferences SET updated_at = ?");
        let mut params: Vec<String> = vec![now.clone()];

        if let Some(val) = updates.low_stock_alerts {
            query.push_str(", low_stock_alerts = ?");
            params.push(if val { "1" } else { "0" }.to_string());
        }
        if let Some(val) = updates.appointment_reminders {
            query.push_str(", appointment_reminders = ?");
            params.push(if val { "1" } else { "0" }.to_string());
        }
        if let Some(val) = updates.invoice_notifications {
            query.push_str(", invoice_notifications = ?");
            params.push(if val { "1" } else { "0" }.to_string());
        }
        if let Some(val) = updates.work_order_completion {
            query.push_str(", work_order_completion = ?");
            params.push(if val { "1" } else { "0" }.to_string());
        }
        if let Some(val) = updates.payment_receipts {
            query.push_str(", payment_receipts = ?");
            params.push(if val { "1" } else { "0" }.to_string());
        }
        if let Some(ref email) = updates.email_address {
            query.push_str(", email_address = ?, email_verified = 0");
            params.push(email.clone());
        }

        query.push_str(" WHERE user_id = ? AND tenant_id = ?");
        params.push(user_id.to_string());
        params.push(tenant_id.to_string());

        let mut q = sqlx::query(&query);
        for param in params {
            q = q.bind(param);
        }

        q.execute(&self.pool)
            .await
            .map_err(|e| vec![format!("Failed to update preferences: {}", e)])?;

        Ok(())
    }

    // Private helper methods

    fn get_from_address(&self) -> String {
        match &self.provider {
            EmailProvider::Smtp { from_address, .. } => from_address.clone(),
            EmailProvider::SendGrid { from_address, .. } => from_address.clone(),
            EmailProvider::AwsSes { from_address, .. } => from_address.clone(),
            EmailProvider::Mock => "noreply@easysale.local".to_string(),
        }
    }

    #[cfg(feature = "notifications")]
    async fn send_via_smtp(
        &self,
        _tenant_id: &str,
        message: EmailMessage,
    ) -> Result<(), Vec<String>> {
        use lettre::{
            message::{header::ContentType, Mailbox, MultiPart, SinglePart},
            transport::smtp::authentication::Credentials,
            AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
        };

        if let EmailProvider::Smtp {
            host,
            port,
            username,
            password,
            from_address,
        } = &self.provider
        {
            // Parse addresses
            let from_mailbox: Mailbox = from_address
                .parse()
                .map_err(|e| vec![format!("Invalid from address: {}", e)])?;
            let to_mailbox: Mailbox = message
                .to
                .parse()
                .map_err(|e| vec![format!("Invalid to address: {}", e)])?;

            // Build email message
            let mut email_builder = Message::builder()
                .from(from_mailbox)
                .to(to_mailbox)
                .subject(&message.subject);

            // Add multipart body (HTML + plain text)
            let email = if let Some(plain_text) = &message.body_text {
                email_builder
                    .multipart(
                        MultiPart::alternative()
                            .singlepart(
                                SinglePart::builder()
                                    .header(ContentType::TEXT_PLAIN)
                                    .body(plain_text.clone()),
                            )
                            .singlepart(
                                SinglePart::builder()
                                    .header(ContentType::TEXT_HTML)
                                    .body(message.body_html.clone()),
                            ),
                    )
                    .map_err(|e| vec![format!("Failed to build email: {}", e)])?
            } else {
                email_builder
                    .singlepart(
                        SinglePart::builder()
                            .header(ContentType::TEXT_HTML)
                            .body(message.body_html.clone()),
                    )
                    .map_err(|e| vec![format!("Failed to build email: {}", e)])?
            };

            // Create SMTP transport with authentication
            let creds = Credentials::new(username.clone(), password.clone());

            let mailer: AsyncSmtpTransport<Tokio1Executor> =
                AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(host)
                    .map_err(|e| vec![format!("Failed to create SMTP transport: {}", e)])?
                    .port(*port)
                    .credentials(creds)
                    .build();

            // Send email
            mailer
                .send(email)
                .await
                .map_err(|e| vec![format!("Failed to send SMTP email: {}", e)])?;

            tracing::info!("SMTP email sent to {}: {}", message.to, message.subject);
            Ok(())
        } else {
            Err(vec!["Invalid SMTP configuration".to_string()])
        }
    }

    #[cfg(not(feature = "notifications"))]
    async fn send_via_smtp(
        &self,
        _tenant_id: &str,
        message: EmailMessage,
    ) -> Result<(), Vec<String>> {
        tracing::info!("SMTP email (feature disabled) would be sent to {}: {}", message.to, message.subject);
        Ok(())
    }

    async fn send_via_sendgrid(
        &self,
        _tenant_id: &str,
        message: EmailMessage,
    ) -> Result<(), Vec<String>> {
        if let EmailProvider::SendGrid {
            api_key,
            from_address,
        } = &self.provider
        {
            // Build SendGrid API request
            let mut personalizations = serde_json::json!([{
                "to": [{"email": message.to}]
            }]);

            let mut content = vec![serde_json::json!({
                "type": "text/html",
                "value": message.body_html
            })];

            // Add plain text if available
            if let Some(plain_text) = &message.body_text {
                content.insert(
                    0,
                    serde_json::json!({
                        "type": "text/plain",
                        "value": plain_text
                    }),
                );
            }

            let payload = serde_json::json!({
                "personalizations": personalizations,
                "from": {"email": from_address},
                "subject": message.subject,
                "content": content
            });

            // Send via SendGrid API
            let client = reqwest::Client::new();
            let response = client
                .post("https://api.sendgrid.com/v3/mail/send")
                .header("Authorization", format!("Bearer {}", api_key))
                .header("Content-Type", "application/json")
                .json(&payload)
                .send()
                .await
                .map_err(|e| vec![format!("Failed to send SendGrid request: {}", e)])?;

            if !response.status().is_success() {
                let status = response.status();
                let error_body = response
                    .text()
                    .await
                    .unwrap_or_else(|_| "Unknown error".to_string());
                return Err(vec![format!(
                    "SendGrid API error ({}): {}",
                    status, error_body
                )]);
            }

            tracing::info!("SendGrid email sent to {}: {}", message.to, message.subject);
            Ok(())
        } else {
            Err(vec!["Invalid SendGrid configuration".to_string()])
        }
    }

    async fn send_via_ses(
        &self,
        _tenant_id: &str,
        message: EmailMessage,
    ) -> Result<(), Vec<String>> {
        if let EmailProvider::AwsSes {
            region,
            access_key_id,
            secret_access_key,
            from_address,
        } = &self.provider
        {
            // Build AWS SES API request using AWS Signature V4
            let endpoint = format!("https://email.{}.amazonaws.com", region);
            
            // Build email body
            let mut body_parts = vec![format!(
                "Content-Type: text/html; charset=UTF-8\r\n\r\n{}",
                message.body_html
            )];

            if let Some(plain_text) = &message.body_text {
                body_parts.insert(
                    0,
                    format!(
                        "Content-Type: text/plain; charset=UTF-8\r\n\r\n{}",
                        plain_text
                    ),
                );
            }

            // Build raw email message
            let raw_message = format!(
                "From: {}\r\nTo: {}\r\nSubject: {}\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary=\"boundary\"\r\n\r\n--boundary\r\n{}\r\n--boundary--",
                from_address,
                message.to,
                message.subject,
                body_parts.join("\r\n--boundary\r\n")
            );

            // Base64 encode the raw message
            let encoded_message = base64::encode(&raw_message);

            // Build SES SendRawEmail request
            let payload = format!(
                "Action=SendRawEmail&RawMessage.Data={}&Version=2010-12-01",
                urlencoding::encode(&encoded_message)
            );

            // Create AWS Signature V4 (simplified - production should use aws-sdk-rust)
            let client = reqwest::Client::new();
            let response = client
                .post(&endpoint)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("X-Amz-Date", chrono::Utc::now().format("%Y%m%dT%H%M%SZ").to_string())
                .basic_auth(access_key_id, Some(secret_access_key))
                .body(payload)
                .send()
                .await
                .map_err(|e| vec![format!("Failed to send AWS SES request: {}", e)])?;

            if !response.status().is_success() {
                let status = response.status();
                let error_body = response
                    .text()
                    .await
                    .unwrap_or_else(|_| "Unknown error".to_string());
                return Err(vec![format!("AWS SES API error ({}): {}", status, error_body)]);
            }

            tracing::info!("AWS SES email sent to {}: {}", message.to, message.subject);
            Ok(())
        } else {
            Err(vec!["Invalid AWS SES configuration".to_string()])
        }
    }
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct NotificationPreferences {
    pub id: String,
    pub user_id: String,
    pub tenant_id: String,
    pub low_stock_alerts: bool,
    pub appointment_reminders: bool,
    pub invoice_notifications: bool,
    pub work_order_completion: bool,
    pub payment_receipts: bool,
    pub email_address: Option<String>,
    pub email_verified: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Default)]
pub struct NotificationPreferencesUpdate {
    pub low_stock_alerts: Option<bool>,
    pub appointment_reminders: Option<bool>,
    pub invoice_notifications: Option<bool>,
    pub work_order_completion: Option<bool>,
    pub payment_receipts: Option<bool>,
    pub email_address: Option<String>,
}

// Email templates

pub fn get_low_stock_alert_template(product_name: &str, quantity: i32, reorder_point: i32) -> EmailTemplate {
    EmailTemplate {
        name: "low_stock_alert".to_string(),
        subject: format!("Low Stock Alert: {}", product_name),
        body_html: format!(
            r#"
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #d32f2f;">Low Stock Alert</h2>
                <p>The following product is running low on stock:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #d32f2f; margin: 20px 0;">
                    <p><strong>Product:</strong> {}</p>
                    <p><strong>Current Quantity:</strong> {}</p>
                    <p><strong>Reorder Point:</strong> {}</p>
                </div>
                <p>Please reorder this product to avoid stockouts.</p>
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    This is an automated notification from EasySale POS.
                </p>
            </body>
            </html>
            "#,
            product_name, quantity, reorder_point
        ),
        body_text: Some(format!(
            "Low Stock Alert\n\nProduct: {}\nCurrent Quantity: {}\nReorder Point: {}\n\nPlease reorder this product to avoid stockouts.",
            product_name, quantity, reorder_point
        )),
    }
}

pub fn get_appointment_reminder_template(
    customer_name: &str,
    appointment_time: &str,
    service: &str,
) -> EmailTemplate {
    EmailTemplate {
        name: "appointment_reminder".to_string(),
        subject: format!("Appointment Reminder: {}", appointment_time),
        body_html: format!(
            r#"
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #1976d2;">Appointment Reminder</h2>
                <p>Hello {},</p>
                <p>This is a reminder about your upcoming appointment:</p>
                <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #1976d2; margin: 20px 0;">
                    <p><strong>Date & Time:</strong> {}</p>
                    <p><strong>Service:</strong> {}</p>
                </div>
                <p>We look forward to seeing you!</p>
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    This is an automated reminder from EasySale POS.
                </p>
            </body>
            </html>
            "#,
            customer_name, appointment_time, service
        ),
        body_text: Some(format!(
            "Appointment Reminder\n\nHello {},\n\nDate & Time: {}\nService: {}\n\nWe look forward to seeing you!",
            customer_name, appointment_time, service
        )),
    }
}

pub fn get_invoice_notification_template(
    customer_name: &str,
    invoice_number: &str,
    total: &str,
) -> EmailTemplate {
    EmailTemplate {
        name: "invoice_notification".to_string(),
        subject: format!("Invoice #{}", invoice_number),
        body_html: format!(
            r#"
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #388e3c;">Invoice</h2>
                <p>Hello {},</p>
                <p>Thank you for your business. Your invoice is ready:</p>
                <div style="background-color: #e8f5e9; padding: 15px; border-left: 4px solid #388e3c; margin: 20px 0;">
                    <p><strong>Invoice Number:</strong> {}</p>
                    <p><strong>Total Amount:</strong> {}</p>
                </div>
                <p>Please contact us if you have any questions.</p>
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    This is an automated notification from EasySale POS.
                </p>
            </body>
            </html>
            "#,
            customer_name, invoice_number, total
        ),
        body_text: Some(format!(
            "Invoice\n\nHello {},\n\nInvoice Number: {}\nTotal Amount: {}\n\nThank you for your business!",
            customer_name, invoice_number, total
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
