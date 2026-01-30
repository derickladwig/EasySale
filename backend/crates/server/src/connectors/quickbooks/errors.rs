/**
 * QuickBooks Error Handling
 * 
 * Handles QuickBooks-specific error codes and provides retry strategies
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.6
 */

use serde::Deserialize;
use std::fmt;

/// QuickBooks error classification
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum QBErrorType {
    /// Authentication errors (401, 403)
    Authentication,
    /// Validation errors (400, business rule violations)
    Validation,
    /// Rate limit exceeded (429)
    RateLimit,
    /// Conflict errors (stale object, duplicate name)
    Conflict,
    /// Network errors (timeout, connection refused)
    Network,
    /// Internal server errors (500, 503)
    Internal,
}

/// QuickBooks error with classification and retry strategy
#[derive(Debug, Clone)]
pub struct QBError {
    #[allow(dead_code)] // Used for error classification, kept for API contract
    pub error_type: QBErrorType,
    pub code: Option<String>,
    pub message: String,
    pub detail: Option<String>,
    pub retry_after: Option<u64>, // seconds
    pub is_retryable: bool,
}

impl QBError {
    /// Create a new QuickBooks error
    pub fn new(
        error_type: QBErrorType,
        code: Option<String>,
        message: String,
        detail: Option<String>,
    ) -> Self {
        let is_retryable = matches!(
            error_type,
            QBErrorType::RateLimit | QBErrorType::Network | QBErrorType::Internal
        );

        Self {
            error_type,
            code,
            message,
            detail,
            retry_after: None,
            is_retryable,
        }
    }

    /// Create error from HTTP status code
    pub fn from_status(status: u16, body: &str) -> Self {
        match status {
            401 | 403 => Self::new(
                QBErrorType::Authentication,
                Some(status.to_string()),
                "Authentication failed or token expired".to_string(),
                Some(body.to_string()),
            ),
            400 => Self::parse_validation_error(body),
            429 => Self::new(
                QBErrorType::RateLimit,
                Some("429".to_string()),
                "Rate limit exceeded".to_string(),
                Some(body.to_string()),
            ),
            500 | 502 | 503 | 504 => Self::new(
                QBErrorType::Internal,
                Some(status.to_string()),
                "QuickBooks server error".to_string(),
                Some(body.to_string()),
            ),
            _ => Self::new(
                QBErrorType::Network,
                Some(status.to_string()),
                format!("HTTP error {}", status),
                Some(body.to_string()),
            ),
        }
    }

    /// Parse QuickBooks validation error from response body
    /// 
    /// Requirements: 8.3, 8.6
    fn parse_validation_error(body: &str) -> Self {
        // Try to parse as QuickBooks error response
        if let Ok(qb_error) = serde_json::from_str::<QuickBooksErrorResponse>(body) {
            if let Some(error) = qb_error.fault.error.first() {
                return Self::classify_qb_error(error);
            }
        }

        // Fallback to generic validation error
        Self::new(
            QBErrorType::Validation,
            None,
            "Validation error".to_string(),
            Some(body.to_string()),
        )
    }

    /// Classify QuickBooks error by error code
    /// 
    /// Requirements: 8.1, 8.2, 8.3
    fn classify_qb_error(error: &QBErrorDetail) -> Self {
        match error.code.as_str() {
            // Stale object error - refetch and retry
            "5010" => {
                tracing::warn!(
                    "QuickBooks stale object error: {}. Will refetch and retry.",
                    error.message
                );
                Self {
                    error_type: QBErrorType::Conflict,
                    code: Some("5010".to_string()),
                    message: "Stale object - SyncToken mismatch".to_string(),
                    detail: Some(error.detail.clone().unwrap_or_default()),
                    retry_after: None,
                    is_retryable: true, // Can retry after refetching
                }
            }

            // Duplicate name error - log and skip or rename
            "6240" => {
                tracing::warn!(
                    "QuickBooks duplicate name error: {}. Consider renaming with suffix.",
                    error.message
                );
                Self {
                    error_type: QBErrorType::Conflict,
                    code: Some("6240".to_string()),
                    message: "Duplicate name".to_string(),
                    detail: Some(error.detail.clone().unwrap_or_default()),
                    retry_after: None,
                    is_retryable: false, // Requires manual intervention
                }
            }

            // Business validation error - log for manual review
            "6000" => {
                tracing::error!(
                    "QuickBooks business validation error: {}. Requires manual review.",
                    error.message
                );
                Self {
                    error_type: QBErrorType::Validation,
                    code: Some("6000".to_string()),
                    message: "Business validation error".to_string(),
                    detail: Some(format!(
                        "{}: {}",
                        error.message,
                        error.detail.clone().unwrap_or_default()
                    )),
                    retry_after: None,
                    is_retryable: false,
                }
            }

            // Generic validation error
            _ => Self {
                error_type: QBErrorType::Validation,
                code: Some(error.code.clone()),
                message: error.message.clone(),
                detail: error.detail.clone(),
                retry_after: None,
                is_retryable: false,
            },
        }
    }

    /// Set retry_after from Retry-After header
    /// 
    /// Requirements: 8.1, 8.2
    pub fn with_retry_after(mut self, retry_after_seconds: u64) -> Self {
        self.retry_after = Some(retry_after_seconds);
        self
    }

    /// Get recommended action for this error
    pub fn recommended_action(&self) -> &str {
        match (&self.error_type, self.code.as_deref()) {
            (QBErrorType::Authentication, _) => "Refresh OAuth token or reconnect",
            (QBErrorType::RateLimit, _) => "Wait and retry with exponential backoff",
            (QBErrorType::Conflict, Some("5010")) => "Refetch entity for current SyncToken and retry",
            (QBErrorType::Conflict, Some("6240")) => "Skip or rename with suffix (e.g., 'Name (2)')",
            (QBErrorType::Validation, Some("6000")) => "Review business rules and fix data",
            (QBErrorType::Validation, _) => "Fix validation errors in request data",
            (QBErrorType::Network, _) => "Retry with exponential backoff",
            (QBErrorType::Internal, _) => "Retry with exponential backoff",
            _ => "Contact support if error persists",
        }
    }

    /// Check if error should trigger automatic retry
    pub fn should_retry(&self) -> bool {
        self.is_retryable
    }

    /// Get retry delay in seconds (for rate limiting)
    pub fn retry_delay(&self) -> Option<u64> {
        self.retry_after
    }

    /// Get error type as string for logging
    fn error_type_name(&self) -> &str {
        match self.error_type {
            QBErrorType::Authentication => "Authentication",
            QBErrorType::Validation => "Validation",
            QBErrorType::RateLimit => "RateLimit",
            QBErrorType::Conflict => "Conflict",
            QBErrorType::Network => "Network",
            QBErrorType::Internal => "Internal",
        }
    }
}

impl fmt::Display for QBError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "QuickBooks {:?} Error",
            self.error_type
        )?;
        
        if let Some(ref code) = self.code {
            write!(f, " ({})", code)?;
        }
        
        write!(f, ": {}", self.message)?;
        
        if let Some(ref detail) = self.detail {
            write!(f, " - {}", detail)?;
        }
        
        Ok(())
    }
}

impl std::error::Error for QBError {}

/// QuickBooks API error response structure
#[derive(Debug, Deserialize)]
struct QuickBooksErrorResponse {
    #[serde(rename = "Fault")]
    fault: Fault,
}

#[derive(Debug, Deserialize)]
struct Fault {
    #[serde(rename = "Error")]
    error: Vec<QBErrorDetail>,
    #[serde(rename = "type")]
    #[allow(dead_code)] // Part of QuickBooks API response structure
    error_type: String,
}

#[derive(Debug, Deserialize)]
struct QBErrorDetail {
    #[serde(rename = "Message")]
    message: String,
    #[serde(rename = "Detail")]
    detail: Option<String>,
    #[serde(rename = "code")]
    code: String,
}

/// Error handler for QuickBooks operations
pub struct QBErrorHandler;

impl QBErrorHandler {
    /// Handle error and determine retry strategy
    /// 
    /// Requirements: 8.1, 8.2, 8.3
    pub fn handle_error(error: &QBError) -> ErrorHandlingStrategy {
        // Check if error is retryable first
        if !error.is_retryable {
            return ErrorHandlingStrategy::Fail {
                reason: format!("{}: {}", error.error_type_name(), error.message),
            };
        }

        match &error.error_type {
            QBErrorType::Authentication => ErrorHandlingStrategy::Fail {
                reason: "Authentication failed - reconnect required".to_string(),
            },
            
            QBErrorType::RateLimit => {
                let delay = error.retry_after.unwrap_or(60); // Default 60s if no Retry-After
                tracing::warn!(
                    "Rate limit exceeded. Waiting {} seconds before retry.",
                    delay
                );
                ErrorHandlingStrategy::RetryAfter { seconds: delay }
            }
            
            QBErrorType::Conflict => {
                match error.code.as_deref() {
                    Some("5010") => {
                        tracing::info!("Stale object detected. Will refetch and retry.");
                        ErrorHandlingStrategy::RefetchAndRetry
                    }
                    Some("6240") => {
                        tracing::warn!("Duplicate name detected. Skipping or manual intervention required.");
                        ErrorHandlingStrategy::Skip {
                            reason: "Duplicate name".to_string(),
                        }
                    }
                    _ => {
                        tracing::warn!("Conflict error: {}", error.message);
                        ErrorHandlingStrategy::Fail {
                            reason: format!("Conflict: {}", error.message),
                        }
                    }
                }
            }
            
            QBErrorType::Validation => {
                if error.code.as_deref() == Some("6000") {
                    tracing::error!("Business validation error: {}", error.message);
                    ErrorHandlingStrategy::Fail {
                        reason: format!("Business validation: {}", error.message),
                    }
                } else {
                    ErrorHandlingStrategy::Fail {
                        reason: format!("Validation error: {}", error.message),
                    }
                }
            }
            
            QBErrorType::Network | QBErrorType::Internal => {
                ErrorHandlingStrategy::RetryWithBackoff
            }
        }
    }

    /// Log error for monitoring and alerting
    /// 
    /// Requirements: 9.1, 9.5
    pub fn log_error(error: &QBError, entity_type: &str, entity_id: Option<&str>) {
        let entity_info = entity_id
            .map(|id| format!(" ({})", id))
            .unwrap_or_default();

        match error.error_type {
            QBErrorType::Authentication => {
                tracing::error!(
                    "QuickBooks authentication error for {}{}: {}",
                    entity_type,
                    entity_info,
                    error.message
                );
            }
            QBErrorType::RateLimit => {
                tracing::warn!(
                    "QuickBooks rate limit for {}{}: {}",
                    entity_type,
                    entity_info,
                    error.message
                );
            }
            QBErrorType::Conflict => {
                tracing::warn!(
                    "QuickBooks conflict for {}{}: {} (code: {})",
                    entity_type,
                    entity_info,
                    error.message,
                    error.code.as_deref().unwrap_or("unknown")
                );
            }
            QBErrorType::Validation => {
                tracing::error!(
                    "QuickBooks validation error for {}{}: {}",
                    entity_type,
                    entity_info,
                    error.message
                );
            }
            QBErrorType::Network => {
                tracing::warn!(
                    "QuickBooks network error for {}{}: {}",
                    entity_type,
                    entity_info,
                    error.message
                );
            }
            QBErrorType::Internal => {
                tracing::error!(
                    "QuickBooks internal error for {}{}: {}",
                    entity_type,
                    entity_info,
                    error.message
                );
            }
        }
    }
}

/// Error handling strategy
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ErrorHandlingStrategy {
    /// Retry immediately with exponential backoff
    RetryWithBackoff,
    /// Retry after specific delay (for rate limiting)
    RetryAfter { seconds: u64 },
    /// Refetch entity and retry (for stale object)
    RefetchAndRetry,
    /// Skip this operation (for duplicate name)
    Skip { reason: String },
    /// Fail and log for manual review
    Fail { reason: String },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_classification() {
        let error = QBError::from_status(429, "Rate limit exceeded");
        assert_eq!(error.error_type, QBErrorType::RateLimit);
        assert!(error.is_retryable);
    }

    #[test]
    fn test_stale_object_error() {
        let body = r#"{
            "Fault": {
                "Error": [{
                    "Message": "Stale object error",
                    "Detail": "Object version mismatch",
                    "code": "5010"
                }],
                "type": "ValidationFault"
            }
        }"#;

        let error = QBError::from_status(400, body);
        assert_eq!(error.error_type, QBErrorType::Conflict);
        assert_eq!(error.code, Some("5010".to_string()));
        assert!(error.is_retryable);
    }

    #[test]
    fn test_duplicate_name_error() {
        let body = r#"{
            "Fault": {
                "Error": [{
                    "Message": "Duplicate name exists",
                    "Detail": "Another customer with this name already exists",
                    "code": "6240"
                }],
                "type": "ValidationFault"
            }
        }"#;

        let error = QBError::from_status(400, body);
        assert_eq!(error.error_type, QBErrorType::Conflict);
        assert_eq!(error.code, Some("6240".to_string()));
        assert!(!error.is_retryable);
    }

    #[test]
    fn test_business_validation_error() {
        let body = r#"{
            "Fault": {
                "Error": [{
                    "Message": "Business validation error",
                    "Detail": "Account does not exist",
                    "code": "6000"
                }],
                "type": "ValidationFault"
            }
        }"#;

        let error = QBError::from_status(400, body);
        assert_eq!(error.error_type, QBErrorType::Validation);
        assert_eq!(error.code, Some("6000".to_string()));
        assert!(!error.is_retryable);
    }

    #[test]
    fn test_error_handling_strategy() {
        // Rate limit
        let error = QBError::new(
            QBErrorType::RateLimit,
            Some("429".to_string()),
            "Rate limit".to_string(),
            None,
        ).with_retry_after(60);
        
        let strategy = QBErrorHandler::handle_error(&error);
        assert_eq!(strategy, ErrorHandlingStrategy::RetryAfter { seconds: 60 });

        // Stale object
        let error = QBError::new(
            QBErrorType::Conflict,
            Some("5010".to_string()),
            "Stale object".to_string(),
            None,
        );
        
        let strategy = QBErrorHandler::handle_error(&error);
        assert_eq!(strategy, ErrorHandlingStrategy::RefetchAndRetry);

        // Duplicate name
        let error = QBError::new(
            QBErrorType::Conflict,
            Some("6240".to_string()),
            "Duplicate name".to_string(),
            None,
        );
        
        let strategy = QBErrorHandler::handle_error(&error);
        assert!(matches!(strategy, ErrorHandlingStrategy::Skip { .. }));
    }

    #[test]
    fn test_recommended_action() {
        let error = QBError::new(
            QBErrorType::Conflict,
            Some("5010".to_string()),
            "Stale object".to_string(),
            None,
        );
        
        assert_eq!(
            error.recommended_action(),
            "Refetch entity for current SyncToken and retry"
        );
    }
}
