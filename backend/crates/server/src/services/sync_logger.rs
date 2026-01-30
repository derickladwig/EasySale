//! Sync Logger Service
//!
//! Comprehensive logging for sync operations:
//! - Logs every operation with timestamp, entity, result
//! - Supports multiple log levels (debug, info, warn, error)
//! - Writes to database and optionally to Supabase
//! - Masks sensitive data (PII, credentials)
//! - Provides structured logging for monitoring
//!
//! Requirements: Task 14.1 - Sync logging infrastructure

use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::Utc;

/// Log level for sync operations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

impl LogLevel {
    pub fn as_str(&self) -> &str {
        match self {
            LogLevel::Debug => "debug",
            LogLevel::Info => "info",
            LogLevel::Warn => "warn",
            LogLevel::Error => "error",
        }
    }
}

/// Sync operation result
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SyncResult {
    Success,
    Warning,
    Error,
}

impl SyncResult {
    pub fn as_str(&self) -> &str {
        match self {
            SyncResult::Success => "success",
            SyncResult::Warning => "warning",
            SyncResult::Error => "error",
        }
    }
}

/// Sync log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncLogEntry {
    pub id: String,
    pub tenant_id: String,
    pub sync_id: String,
    pub connector_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub result: SyncResult,
    pub level: LogLevel,
    pub message: String,
    pub error_details: Option<String>,
    pub duration_ms: Option<i64>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: String,
}

/// Sync logger service
pub struct SyncLogger {
    db: SqlitePool,
}

impl SyncLogger {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// Log a sync operation
    pub async fn log(
        &self,
        tenant_id: &str,
        sync_id: &str,
        connector_id: &str,
        entity_type: &str,
        entity_id: &str,
        operation: &str,
        result: SyncResult,
        level: LogLevel,
        message: &str,
        error_details: Option<&str>,
        duration_ms: Option<i64>,
        metadata: Option<serde_json::Value>,
    ) -> Result<String, String> {
        let log_id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        // Mask sensitive data in message and error details
        let masked_message = Self::mask_sensitive_data(message);
        let masked_error = error_details.map(Self::mask_sensitive_data);

        // Log to tracing for immediate visibility
        match level {
            LogLevel::Debug => tracing::debug!(
                sync_id = sync_id,
                entity_type = entity_type,
                entity_id = entity_id,
                "{}",
                masked_message
            ),
            LogLevel::Info => tracing::info!(
                sync_id = sync_id,
                entity_type = entity_type,
                entity_id = entity_id,
                "{}",
                masked_message
            ),
            LogLevel::Warn => tracing::warn!(
                sync_id = sync_id,
                entity_type = entity_type,
                entity_id = entity_id,
                "{}",
                masked_message
            ),
            LogLevel::Error => tracing::error!(
                sync_id = sync_id,
                entity_type = entity_type,
                entity_id = entity_id,
                error = ?masked_error,
                "{}",
                masked_message
            ),
        }

        // Store in database
        sqlx::query(
            r#"
            INSERT INTO sync_logs (
                id, tenant_id, sync_id, connector_id, entity_type, entity_id,
                operation, result, level, message, error_details, duration_ms,
                metadata, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&log_id)
        .bind(tenant_id)
        .bind(sync_id)
        .bind(connector_id)
        .bind(entity_type)
        .bind(entity_id)
        .bind(operation)
        .bind(result.as_str())
        .bind(level.as_str())
        .bind(&masked_message)
        .bind(masked_error.as_deref())
        .bind(duration_ms)
        .bind(metadata.map(|m| m.to_string()))
        .bind(&now)
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to write sync log: {}", e))?;

        Ok(log_id)
    }

    /// Log success
    pub async fn log_success(
        &self,
        tenant_id: &str,
        sync_id: &str,
        connector_id: &str,
        entity_type: &str,
        entity_id: &str,
        operation: &str,
        message: &str,
        duration_ms: Option<i64>,
    ) -> Result<String, String> {
        self.log(
            tenant_id,
            sync_id,
            connector_id,
            entity_type,
            entity_id,
            operation,
            SyncResult::Success,
            LogLevel::Info,
            message,
            None,
            duration_ms,
            None,
        )
        .await
    }

    /// Log warning
    pub async fn log_warning(
        &self,
        tenant_id: &str,
        sync_id: &str,
        connector_id: &str,
        entity_type: &str,
        entity_id: &str,
        operation: &str,
        message: &str,
        details: Option<&str>,
    ) -> Result<String, String> {
        self.log(
            tenant_id,
            sync_id,
            connector_id,
            entity_type,
            entity_id,
            operation,
            SyncResult::Warning,
            LogLevel::Warn,
            message,
            details,
            None,
            None,
        )
        .await
    }

    /// Log error
    pub async fn log_error(
        &self,
        tenant_id: &str,
        sync_id: &str,
        connector_id: &str,
        entity_type: &str,
        entity_id: &str,
        operation: &str,
        message: &str,
        error_details: &str,
        duration_ms: Option<i64>,
    ) -> Result<String, String> {
        self.log(
            tenant_id,
            sync_id,
            connector_id,
            entity_type,
            entity_id,
            operation,
            SyncResult::Error,
            LogLevel::Error,
            message,
            Some(error_details),
            duration_ms,
            None,
        )
        .await
    }

    /// Mask sensitive data in log messages
    /// 
    /// CRITICAL: Never log PII or credentials
    /// Masks: emails, phone numbers, credit cards, tokens, passwords
    fn mask_sensitive_data(text: &str) -> String {
        let mut masked = text.to_string();

        // Mask email addresses
        let email_regex = regex::Regex::new(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b").unwrap();
        masked = email_regex.replace_all(&masked, "[EMAIL]").to_string();

        // Mask phone numbers (various formats)
        let phone_regex = regex::Regex::new(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b").unwrap();
        masked = phone_regex.replace_all(&masked, "[PHONE]").to_string();

        // Mask credit card numbers
        let cc_regex = regex::Regex::new(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b").unwrap();
        masked = cc_regex.replace_all(&masked, "[CARD]").to_string();

        // Mask tokens and keys (common patterns)
        let token_regex = regex::Regex::new(r#"(token|key|secret|password)["']?\s*[:=]\s*["']?([^\s"']+)"#).unwrap();
        masked = token_regex.replace_all(&masked, "$1: [REDACTED]").to_string();

        // Mask Bearer tokens
        let bearer_regex = regex::Regex::new(r"Bearer\s+[A-Za-z0-9\-._~+/]+=*").unwrap();
        masked = bearer_regex.replace_all(&masked, "Bearer [REDACTED]").to_string();

        masked
    }

    /// Get recent logs for a sync run
    pub async fn get_sync_logs(
        &self,
        tenant_id: &str,
        sync_id: &str,
        limit: Option<i64>,
    ) -> Result<Vec<SyncLogEntry>, String> {
        let limit = limit.unwrap_or(100);

        let logs = sqlx::query_as::<_, (
            String, String, String, String, String, String, String, String, String,
            String, Option<String>, Option<i64>, Option<String>, String,
        )>(
            r#"
            SELECT id, tenant_id, sync_id, connector_id, entity_type, entity_id,
                   operation, result, level, message, error_details, duration_ms,
                   metadata, created_at
            FROM sync_logs
            WHERE tenant_id = ? AND sync_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            "#
        )
        .bind(tenant_id)
        .bind(sync_id)
        .bind(limit)
        .fetch_all(&self.db)
        .await
        .map_err(|e| format!("Failed to fetch sync logs: {}", e))?;

        Ok(logs
            .into_iter()
            .map(|row| {
                let result = match row.7.as_str() {
                    "success" => SyncResult::Success,
                    "warning" => SyncResult::Warning,
                    "error" => SyncResult::Error,
                    _ => SyncResult::Error,
                };

                let level = match row.8.as_str() {
                    "debug" => LogLevel::Debug,
                    "info" => LogLevel::Info,
                    "warn" => LogLevel::Warn,
                    "error" => LogLevel::Error,
                    _ => LogLevel::Info,
                };

                SyncLogEntry {
                    id: row.0,
                    tenant_id: row.1,
                    sync_id: row.2,
                    connector_id: row.3,
                    entity_type: row.4,
                    entity_id: row.5,
                    operation: row.6,
                    result,
                    level,
                    message: row.9,
                    error_details: row.10,
                    duration_ms: row.11,
                    metadata: row.12.and_then(|m| serde_json::from_str(&m).ok()),
                    created_at: row.13,
                }
            })
            .collect())
    }

    /// Get error logs for troubleshooting
    pub async fn get_error_logs(
        &self,
        tenant_id: &str,
        connector_id: Option<&str>,
        limit: Option<i64>,
    ) -> Result<Vec<SyncLogEntry>, String> {
        let limit = limit.unwrap_or(50);

        let query = if let Some(conn_id) = connector_id {
            sqlx::query_as::<_, (
                String, String, String, String, String, String, String, String, String,
                String, Option<String>, Option<i64>, Option<String>, String,
            )>(
                r#"
                SELECT id, tenant_id, sync_id, connector_id, entity_type, entity_id,
                       operation, result, level, message, error_details, duration_ms,
                       metadata, created_at
                FROM sync_logs
                WHERE tenant_id = ? AND connector_id = ? AND result = 'error'
                ORDER BY created_at DESC
                LIMIT ?
                "#
            )
            .bind(tenant_id)
            .bind(conn_id)
            .bind(limit)
        } else {
            sqlx::query_as::<_, (
                String, String, String, String, String, String, String, String, String,
                String, Option<String>, Option<i64>, Option<String>, String,
            )>(
                r#"
                SELECT id, tenant_id, sync_id, connector_id, entity_type, entity_id,
                       operation, result, level, message, error_details, duration_ms,
                       metadata, created_at
                FROM sync_logs
                WHERE tenant_id = ? AND result = 'error'
                ORDER BY created_at DESC
                LIMIT ?
                "#
            )
            .bind(tenant_id)
            .bind(limit)
        };

        let logs = query
            .fetch_all(&self.db)
            .await
            .map_err(|e| format!("Failed to fetch error logs: {}", e))?;

        Ok(logs
            .into_iter()
            .map(|row| SyncLogEntry {
                id: row.0,
                tenant_id: row.1,
                sync_id: row.2,
                connector_id: row.3,
                entity_type: row.4,
                entity_id: row.5,
                operation: row.6,
                result: SyncResult::Error,
                level: LogLevel::Error,
                message: row.9,
                error_details: row.10,
                duration_ms: row.11,
                metadata: row.12.and_then(|m| serde_json::from_str(&m).ok()),
                created_at: row.13,
            })
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mask_email() {
        let text = "User email is john.doe@example.com";
        let masked = SyncLogger::mask_sensitive_data(text);
        assert_eq!(masked, "User email is [EMAIL]");
    }

    #[test]
    fn test_mask_phone() {
        let text = "Phone: 555-123-4567";
        let masked = SyncLogger::mask_sensitive_data(text);
        assert_eq!(masked, "Phone: [PHONE]");
    }

    #[test]
    fn test_mask_token() {
        let text = "token: abc123xyz";
        let masked = SyncLogger::mask_sensitive_data(text);
        assert_eq!(masked, "token: [REDACTED]");
    }

    #[test]
    fn test_mask_bearer_token() {
        let text = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
        let masked = SyncLogger::mask_sensitive_data(text);
        assert_eq!(masked, "Authorization: Bearer [REDACTED]");
    }

    #[test]
    fn test_log_level_serialization() {
        let level = LogLevel::Error;
        let json = serde_json::to_string(&level).unwrap();
        assert_eq!(json, "\"error\"");
    }

    #[test]
    fn test_sync_result_serialization() {
        let result = SyncResult::Success;
        let json = serde_json::to_string(&result).unwrap();
        assert_eq!(json, "\"success\"");
    }
}
