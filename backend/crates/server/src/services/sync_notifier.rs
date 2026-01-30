/**
 * Sync Notifier Service
 * 
 * Sends alerts on sync errors, rate limit events, and connection failures:
 * - Email notifications
 * - Slack webhook notifications
 * - Custom webhook notifications
 * - Includes actionable details and suggested fixes
 * 
 * Requirements: Task 14.3 - Error notification system
 */

use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use reqwest::Client;
use std::collections::HashMap;

/// Notification type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum NotificationType {
    Email,
    Slack,
    Webhook,
}

/// Notification severity
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum NotificationSeverity {
    Info,
    Warning,
    Error,
    Critical,
}

/// Notification configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationConfig {
    pub id: String,
    pub tenant_id: String,
    pub notification_type: NotificationType,
    pub enabled: bool,
    pub config: NotificationChannelConfig,
    pub filters: NotificationFilters,
}

/// Channel-specific configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum NotificationChannelConfig {
    Email {
        smtp_host: String,
        smtp_port: u16,
        smtp_username: String,
        smtp_password: String,
        from_address: String,
        to_addresses: Vec<String>,
    },
    Slack {
        webhook_url: String,
        channel: Option<String>,
        username: Option<String>,
    },
    Webhook {
        url: String,
        method: String,
        headers: HashMap<String, String>,
        auth_token: Option<String>,
    },
}

/// Notification filters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationFilters {
    pub min_severity: NotificationSeverity,
    pub connectors: Option<Vec<String>>,
    pub entity_types: Option<Vec<String>>,
    pub error_types: Option<Vec<String>>,
}

/// Notification event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationEvent {
    pub event_type: String,
    pub severity: NotificationSeverity,
    pub title: String,
    pub message: String,
    pub connector_id: Option<String>,
    pub entity_type: Option<String>,
    pub error_type: Option<String>,
    pub details: HashMap<String, String>,
    pub suggested_actions: Vec<String>,
    pub timestamp: String,
}

/// Sync notifier service
pub struct SyncNotifier {
    db: SqlitePool,
    http_client: Client,
}

impl SyncNotifier {
    pub fn new(db: SqlitePool) -> Self {
        Self {
            db,
            http_client: Client::new(),
        }
    }

    /// Send notification for sync error
    pub async fn notify_sync_error(
        &self,
        tenant_id: &str,
        connector_id: &str,
        entity_type: &str,
        error_message: &str,
        sync_id: &str,
    ) -> Result<(), String> {
        let event = NotificationEvent {
            event_type: "sync_error".to_string(),
            severity: NotificationSeverity::Error,
            title: format!("Sync Error: {} - {}", connector_id, entity_type),
            message: error_message.to_string(),
            connector_id: Some(connector_id.to_string()),
            entity_type: Some(entity_type.to_string()),
            error_type: Some("sync_failure".to_string()),
            details: HashMap::from([
                ("sync_id".to_string(), sync_id.to_string()),
                ("connector".to_string(), connector_id.to_string()),
                ("entity".to_string(), entity_type.to_string()),
            ]),
            suggested_actions: vec![
                "Check connector credentials and configuration".to_string(),
                "Verify network connectivity to external service".to_string(),
                "Review sync logs for detailed error information".to_string(),
                "Retry failed records from the Failed Records Queue".to_string(),
            ],
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        self.send_notification(tenant_id, event).await
    }

    /// Send notification for rate limit event
    pub async fn notify_rate_limit(
        &self,
        tenant_id: &str,
        connector_id: &str,
        retry_after: Option<u64>,
    ) -> Result<(), String> {
        let retry_msg = if let Some(seconds) = retry_after {
            format!("Retry after {} seconds", seconds)
        } else {
            "Retry with exponential backoff".to_string()
        };

        let event = NotificationEvent {
            event_type: "rate_limit".to_string(),
            severity: NotificationSeverity::Warning,
            title: format!("Rate Limit Reached: {}", connector_id),
            message: format!("API rate limit reached for {}. {}", connector_id, retry_msg),
            connector_id: Some(connector_id.to_string()),
            entity_type: None,
            error_type: Some("rate_limit".to_string()),
            details: HashMap::from([
                ("connector".to_string(), connector_id.to_string()),
                ("retry_after".to_string(), retry_after.map(|s| s.to_string()).unwrap_or_default()),
            ]),
            suggested_actions: vec![
                "Sync will automatically retry after the rate limit period".to_string(),
                "Consider reducing sync frequency if rate limits are frequent".to_string(),
                "Check if multiple sync operations are running concurrently".to_string(),
            ],
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        self.send_notification(tenant_id, event).await
    }

    /// Send notification for connection failure
    pub async fn notify_connection_failure(
        &self,
        tenant_id: &str,
        connector_id: &str,
        error_message: &str,
    ) -> Result<(), String> {
        let event = NotificationEvent {
            event_type: "connection_failure".to_string(),
            severity: NotificationSeverity::Critical,
            title: format!("Connection Failed: {}", connector_id),
            message: format!("Failed to connect to {}: {}", connector_id, error_message),
            connector_id: Some(connector_id.to_string()),
            entity_type: None,
            error_type: Some("connection_failure".to_string()),
            details: HashMap::from([
                ("connector".to_string(), connector_id.to_string()),
                ("error".to_string(), error_message.to_string()),
            ]),
            suggested_actions: vec![
                "Verify connector credentials are correct and not expired".to_string(),
                "Check network connectivity to the external service".to_string(),
                "Ensure the external service is not experiencing downtime".to_string(),
                "Review connector configuration in the Integrations page".to_string(),
            ],
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        self.send_notification(tenant_id, event).await
    }

    /// Send notification for multiple consecutive failures
    pub async fn notify_consecutive_failures(
        &self,
        tenant_id: &str,
        connector_id: &str,
        failure_count: usize,
    ) -> Result<(), String> {
        let event = NotificationEvent {
            event_type: "consecutive_failures".to_string(),
            severity: NotificationSeverity::Critical,
            title: format!("Multiple Sync Failures: {}", connector_id),
            message: format!(
                "{} has failed {} consecutive times. Manual intervention may be required.",
                connector_id, failure_count
            ),
            connector_id: Some(connector_id.to_string()),
            entity_type: None,
            error_type: Some("consecutive_failures".to_string()),
            details: HashMap::from([
                ("connector".to_string(), connector_id.to_string()),
                ("failure_count".to_string(), failure_count.to_string()),
            ]),
            suggested_actions: vec![
                "Review recent sync logs to identify the root cause".to_string(),
                "Check if connector credentials need to be refreshed".to_string(),
                "Verify the external service is operational".to_string(),
                "Consider disabling automatic sync until the issue is resolved".to_string(),
            ],
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        self.send_notification(tenant_id, event).await
    }

    /// Send notification
    async fn send_notification(
        &self,
        tenant_id: &str,
        event: NotificationEvent,
    ) -> Result<(), String> {
        // Load notification configs for tenant
        let configs = self.load_notification_configs(tenant_id).await?;

        // Filter configs based on event
        let applicable_configs: Vec<_> = configs
            .into_iter()
            .filter(|config| self.should_notify(config, &event))
            .collect();

        if applicable_configs.is_empty() {
            tracing::debug!("No applicable notification configs for event: {}", event.event_type);
            return Ok(());
        }

        // Send to each configured channel
        for config in applicable_configs {
            let success = match self.send_to_channel(&config, &event).await {
                Ok(_) => {
                    tracing::info!(
                        "Sent notification via {:?} for event: {}",
                        config.notification_type,
                        event.event_type
                    );
                    true
                }
                Err(e) => {
                    tracing::error!(
                        "Failed to send notification via {:?}: {}",
                        config.notification_type,
                        e
                    );
                    false
                }
            };

            // Record in history
            if let Err(e) = self.record_notification_history(
                tenant_id,
                &config.id,
                &event,
                success,
                if success { None } else { Some("Failed to send notification") },
            ).await {
                tracing::error!("Failed to record notification history: {}", e);
            }
        }

        Ok(())
    }

    /// Check if notification should be sent based on filters
    fn should_notify(&self, config: &NotificationConfig, event: &NotificationEvent) -> bool {
        if !config.enabled {
            return false;
        }

        // Check severity
        let severity_order = |s: &NotificationSeverity| match s {
            NotificationSeverity::Info => 0,
            NotificationSeverity::Warning => 1,
            NotificationSeverity::Error => 2,
            NotificationSeverity::Critical => 3,
        };

        if severity_order(&event.severity) < severity_order(&config.filters.min_severity) {
            return false;
        }

        // Check connector filter
        if let Some(ref connectors) = config.filters.connectors {
            if let Some(ref connector_id) = event.connector_id {
                if !connectors.contains(connector_id) {
                    return false;
                }
            }
        }

        // Check entity type filter
        if let Some(ref entity_types) = config.filters.entity_types {
            if let Some(ref entity_type) = event.entity_type {
                if !entity_types.contains(entity_type) {
                    return false;
                }
            }
        }

        // Check error type filter
        if let Some(ref error_types) = config.filters.error_types {
            if let Some(ref error_type) = event.error_type {
                if !error_types.contains(error_type) {
                    return false;
                }
            }
        }

        true
    }

    /// Send notification to specific channel (public for testing)
    pub async fn send_to_channel(
        &self,
        config: &NotificationConfig,
        event: &NotificationEvent,
    ) -> Result<(), String> {
        match &config.config {
            NotificationChannelConfig::Email { .. } => {
                self.send_email(config, event).await
            }
            NotificationChannelConfig::Slack { .. } => {
                self.send_slack(config, event).await
            }
            NotificationChannelConfig::Webhook { .. } => {
                self.send_webhook(config, event).await
            }
        }
    }

    /// Send email notification
    #[cfg(feature = "notifications")]
    async fn send_email(
        &self,
        config: &NotificationConfig,
        event: &NotificationEvent,
    ) -> Result<(), String> {
        use lettre::{
            message::{header::ContentType, Mailbox, MultiPart, SinglePart},
            transport::smtp::authentication::Credentials,
            AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
        };

        if let NotificationChannelConfig::Email {
            smtp_host,
            smtp_port,
            smtp_username,
            smtp_password,
            from_address,
            to_addresses,
        } = &config.config
        {
            // Build HTML email body
            let html_body = self.build_email_html(event);
            let plain_body = self.build_email_plain(event);

            // Parse from address
            let from_mailbox: Mailbox = from_address
                .parse()
                .map_err(|e| format!("Invalid from address: {}", e))?;

            // Build message for each recipient
            for to_address in to_addresses {
                let to_mailbox: Mailbox = to_address
                    .parse()
                    .map_err(|e| format!("Invalid to address {}: {}", to_address, e))?;

                let email = Message::builder()
                    .from(from_mailbox.clone())
                    .to(to_mailbox)
                    .subject(&event.title)
                    .multipart(
                        MultiPart::alternative()
                            .singlepart(
                                SinglePart::builder()
                                    .header(ContentType::TEXT_PLAIN)
                                    .body(plain_body.clone()),
                            )
                            .singlepart(
                                SinglePart::builder()
                                    .header(ContentType::TEXT_HTML)
                                    .body(html_body.clone()),
                            ),
                    )
                    .map_err(|e| format!("Failed to build email: {}", e))?;

                // Create SMTP transport
                let creds = Credentials::new(smtp_username.clone(), smtp_password.clone());

                let mailer: AsyncSmtpTransport<Tokio1Executor> =
                    AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(smtp_host)
                        .map_err(|e| format!("Failed to create SMTP transport: {}", e))?
                        .port(*smtp_port)
                        .credentials(creds)
                        .build();

                // Send email
                mailer
                    .send(email)
                    .await
                    .map_err(|e| format!("Failed to send email to {}: {}", to_address, e))?;

                tracing::info!("Email notification sent to {}: {}", to_address, event.title);
            }

            Ok(())
        } else {
            Err("Invalid email configuration".to_string())
        }
    }

    /// Send email notification (stub when notifications feature disabled)
    #[cfg(not(feature = "notifications"))]
    async fn send_email(
        &self,
        config: &NotificationConfig,
        event: &NotificationEvent,
    ) -> Result<(), String> {
        if let NotificationChannelConfig::Email {
            from_address,
            to_addresses,
            ..
        } = &config.config
        {
            tracing::info!(
                "Email notification (feature disabled): {} -> {:?}\nSubject: {}\nBody: {}",
                from_address,
                to_addresses,
                event.title,
                event.message
            );
            Ok(())
        } else {
            Err("Invalid email configuration".to_string())
        }
    }

    /// Build HTML email body
    fn build_email_html(&self, event: &NotificationEvent) -> String {
        let severity_color = match event.severity {
            NotificationSeverity::Info => "#36a64f",
            NotificationSeverity::Warning => "#ff9900",
            NotificationSeverity::Error => "#ff0000",
            NotificationSeverity::Critical => "#8b0000",
        };

        let actions_html = if event.suggested_actions.is_empty() {
            String::new()
        } else {
            let actions_list: String = event
                .suggested_actions
                .iter()
                .map(|a| format!("<li>{}</li>", a))
                .collect();
            format!(
                r#"<div style="margin-top: 16px;">
                    <strong>Suggested Actions:</strong>
                    <ul style="margin: 8px 0; padding-left: 20px;">{}</ul>
                </div>"#,
                actions_list
            )
        };

        let details_html = if event.details.is_empty() {
            String::new()
        } else {
            let details_rows: String = event
                .details
                .iter()
                .map(|(k, v)| format!("<tr><td style=\"padding: 4px 8px; font-weight: bold;\">{}</td><td style=\"padding: 4px 8px;\">{}</td></tr>", k, v))
                .collect();
            format!(
                r#"<div style="margin-top: 16px;">
                    <strong>Details:</strong>
                    <table style="margin-top: 8px; border-collapse: collapse;">{}</table>
                </div>"#,
                details_rows
            )
        };

        format!(
            r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="background: {color}; color: white; padding: 16px 24px;">
            <h1 style="margin: 0; font-size: 20px;">{title}</h1>
            <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">{severity:?} • {timestamp}</p>
        </div>
        <div style="padding: 24px;">
            <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5;">{message}</p>
            {details}
            {actions}
        </div>
        <div style="background: #f9f9f9; padding: 16px 24px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p style="margin: 0;">This notification was sent by EasySale Sync Monitor.</p>
        </div>
    </div>
</body>
</html>"#,
            title = event.title,
            color = severity_color,
            severity = event.severity,
            timestamp = event.timestamp,
            message = event.message,
            details = details_html,
            actions = actions_html,
        )
    }

    /// Build plain text email body
    fn build_email_plain(&self, event: &NotificationEvent) -> String {
        let mut body = format!(
            "{}\n{}\n\nSeverity: {:?}\nTimestamp: {}\n\n{}\n",
            event.title,
            "=".repeat(event.title.len()),
            event.severity,
            event.timestamp,
            event.message
        );

        if !event.details.is_empty() {
            body.push_str("\nDetails:\n");
            for (key, value) in &event.details {
                body.push_str(&format!("  {}: {}\n", key, value));
            }
        }

        if !event.suggested_actions.is_empty() {
            body.push_str("\nSuggested Actions:\n");
            for (i, action) in event.suggested_actions.iter().enumerate() {
                body.push_str(&format!("  {}. {}\n", i + 1, action));
            }
        }

        body.push_str("\n--\nEasySale Sync Monitor\n");
        body
    }

    /// Send Slack notification
    async fn send_slack(
        &self,
        config: &NotificationConfig,
        event: &NotificationEvent,
    ) -> Result<(), String> {
        if let NotificationChannelConfig::Slack {
            webhook_url,
            channel,
            username,
        } = &config.config
        {
            let color = match event.severity {
                NotificationSeverity::Info => "#36a64f",
                NotificationSeverity::Warning => "#ff9900",
                NotificationSeverity::Error => "#ff0000",
                NotificationSeverity::Critical => "#8b0000",
            };

            let mut payload = serde_json::json!({
                "attachments": [{
                    "color": color,
                    "title": event.title,
                    "text": event.message,
                    "fields": [
                        {
                            "title": "Severity",
                            "value": format!("{:?}", event.severity),
                            "short": true
                        },
                        {
                            "title": "Timestamp",
                            "value": event.timestamp,
                            "short": true
                        }
                    ],
                    "footer": "EasySale Sync Monitor"
                }]
            });

            if let Some(ch) = channel {
                payload["channel"] = serde_json::json!(ch);
            }

            if let Some(user) = username {
                payload["username"] = serde_json::json!(user);
            }

            // Add suggested actions
            if !event.suggested_actions.is_empty() {
                let actions_text = event
                    .suggested_actions
                    .iter()
                    .enumerate()
                    .map(|(i, action)| format!("{}. {}", i + 1, action))
                    .collect::<Vec<_>>()
                    .join("\n");

                payload["attachments"][0]["fields"]
                    .as_array_mut()
                    .unwrap()
                    .push(serde_json::json!({
                        "title": "Suggested Actions",
                        "value": actions_text,
                        "short": false
                    }));
            }

            self.http_client
                .post(webhook_url)
                .json(&payload)
                .send()
                .await
                .map_err(|e| format!("Failed to send Slack notification: {}", e))?;

            Ok(())
        } else {
            Err("Invalid Slack configuration".to_string())
        }
    }

    /// Send webhook notification
    async fn send_webhook(
        &self,
        config: &NotificationConfig,
        event: &NotificationEvent,
    ) -> Result<(), String> {
        if let NotificationChannelConfig::Webhook {
            url,
            method,
            headers,
            auth_token,
        } = &config.config
        {
            let mut request = match method.to_uppercase().as_str() {
                "POST" => self.http_client.post(url),
                "PUT" => self.http_client.put(url),
                "PATCH" => self.http_client.patch(url),
                _ => return Err(format!("Unsupported HTTP method: {}", method)),
            };

            // Add headers
            for (key, value) in headers {
                request = request.header(key, value);
            }

            // Add auth token if provided
            if let Some(token) = auth_token {
                request = request.bearer_auth(token);
            }

            // Send event as JSON
            request
                .json(event)
                .send()
                .await
                .map_err(|e| format!("Failed to send webhook notification: {}", e))?;

            Ok(())
        } else {
            Err("Invalid webhook configuration".to_string())
        }
    }

    /// Load notification configs for tenant
    async fn load_notification_configs(
        &self,
        tenant_id: &str,
    ) -> Result<Vec<NotificationConfig>, String> {
        let rows = sqlx::query_as::<_, (String, String, String, bool, String, String)>(
            r#"
            SELECT id, tenant_id, notification_type, enabled, config, filters
            FROM notification_configs
            WHERE tenant_id = ? AND enabled = 1
            "#
        )
        .bind(tenant_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| format!("Failed to load notification configs: {}", e))?;

        let configs: Vec<NotificationConfig> = rows
            .into_iter()
            .filter_map(|row| {
                let notification_type = match row.2.as_str() {
                    "email" => NotificationType::Email,
                    "slack" => NotificationType::Slack,
                    "webhook" => NotificationType::Webhook,
                    _ => return None,
                };

                let config: NotificationChannelConfig =
                    serde_json::from_str(&row.4).ok()?;
                let filters: NotificationFilters =
                    serde_json::from_str(&row.5).ok()?;

                Some(NotificationConfig {
                    id: row.0,
                    tenant_id: row.1,
                    notification_type,
                    enabled: row.3,
                    config,
                    filters,
                })
            })
            .collect();

        Ok(configs)
    }

    /// Record notification in history
    async fn record_notification_history(
        &self,
        tenant_id: &str,
        config_id: &str,
        event: &NotificationEvent,
        success: bool,
        error_message: Option<&str>,
    ) -> Result<(), String> {
        let history_id = format!("notif_hist_{}", uuid::Uuid::new_v4().simple());
        let details_json = serde_json::to_string(&event.details)
            .map_err(|e| format!("Failed to serialize details: {}", e))?;

        sqlx::query(
            r#"
            INSERT INTO notification_history (
                id, tenant_id, config_id, event_type, severity, title, message,
                connector_id, entity_type, error_type, details, sent_at, success, error_message
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
            "#
        )
        .bind(&history_id)
        .bind(tenant_id)
        .bind(config_id)
        .bind(&event.event_type)
        .bind(format!("{:?}", event.severity).to_lowercase())
        .bind(&event.title)
        .bind(&event.message)
        .bind(&event.connector_id)
        .bind(&event.entity_type)
        .bind(&event.error_type)
        .bind(&details_json)
        .bind(success)
        .bind(error_message)
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to record notification history: {}", e))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_severity_ordering() {
        let info = NotificationSeverity::Info;
        let warning = NotificationSeverity::Warning;
        let error = NotificationSeverity::Error;
        let critical = NotificationSeverity::Critical;

        assert_ne!(info, warning);
        assert_ne!(warning, error);
        assert_ne!(error, critical);
    }

    #[test]
    fn test_notification_type_serialization() {
        let email = NotificationType::Email;
        let json = serde_json::to_string(&email).unwrap();
        assert_eq!(json, "\"email\"");
    }

    #[test]
    fn test_notification_severity_serialization() {
        let critical = NotificationSeverity::Critical;
        let json = serde_json::to_string(&critical).unwrap();
        assert_eq!(json, "\"critical\"");
    }
}

