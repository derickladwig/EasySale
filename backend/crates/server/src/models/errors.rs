use actix_web::{error::ResponseError, http::StatusCode, HttpResponse};
use serde::{Deserialize, Serialize};
use std::fmt;

/// Validation error for a specific field
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    /// Field name that failed validation
    pub field: String,
    /// Human-readable error message
    pub message: String,
    /// Machine-readable error code
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
}

impl ValidationError {
    pub fn new(field: impl Into<String>, message: impl Into<String>, code: impl Into<String>) -> Self {
        Self {
            field: field.into(),
            message: message.into(),
            code: Some(code.into()),
        }
    }

    /// Create a simple validation error without a code (for backward compatibility)
    pub fn simple(field: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            field: field.into(),
            message: message.into(), code: None,
        }
    }

    /// Create a required field error
    pub fn required(field: impl Into<String>) -> Self {
        let field_str = field.into();
        Self {
            field: field_str.clone(),
            message: format!("{} is required", field_str),
            code: Some("REQUIRED".to_string()),
        }
    }

    /// Create an invalid format error
    pub fn invalid_format(field: impl Into<String>, expected: impl Into<String>) -> Self {
        let field_str = field.into();
        let expected_str = expected.into();
        Self {
            field: field_str.clone(),
            message: format!("{} has invalid format. Expected: {}", field_str, expected_str),
            code: Some("INVALID_FORMAT".to_string()),
        }
    }

    /// Create an invalid value error
    pub fn invalid_value(field: impl Into<String>, message: impl Into<String>) -> Self {
        let field_str = field.into();
        Self {
            field: field_str,
            message: message.into(),
            code: Some("INVALID_VALUE".to_string()),
        }
    }

    /// Create a duplicate value error
    pub fn duplicate(field: impl Into<String>) -> Self {
        let field_str = field.into();
        Self {
            field: field_str.clone(),
            message: format!("{} already exists", field_str),
            code: Some("DUPLICATE".to_string()),
        }
    }

    /// Create a not found error
    pub fn not_found(field: impl Into<String>) -> Self {
        let field_str = field.into();
        Self {
            field: field_str.clone(),
            message: format!("{} not found", field_str),
            code: Some("NOT_FOUND".to_string()),
        }
    }
}

/// API error response
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiError {
    /// HTTP status code
    pub status: u16,
    /// Error message
    pub message: String,
    /// Optional error code
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    /// Field-level validation errors
    #[serde(skip_serializing_if = "Option::is_none")]
    pub errors: Option<Vec<ValidationError>>,
}

impl ApiError {
    /// Create a new API error
    #[allow(dead_code)]
    pub fn new(status: u16, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(), code: None,
            errors: None,
        }
    }

    /// Create an API error with code
    pub fn with_code(status: u16, message: impl Into<String>, code: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
            code: Some(code.into()),
            errors: None,
        }
    }

    /// Create a validation error response from a vector of errors
    pub fn validation(errors: Vec<ValidationError>) -> Self {
        Self {
            status: 400,
            message: "Validation failed".to_string(),
            code: Some("VALIDATION_ERROR".to_string()),
            errors: Some(errors),
        }
    }

    /// Create a validation error response from a single error message
    pub fn validation_msg(message: impl Into<String>) -> Self {
        Self {
            status: 400,
            message: message.into(),
            code: Some("VALIDATION_ERROR".to_string()),
            errors: None,
        }
    }

    /// Create an internal server error
    pub fn internal(message: impl Into<String>) -> Self {
        Self::with_code(500, message, "INTERNAL_SERVER_ERROR")
    }

    /// Create a bad request error
    pub fn bad_request(message: impl Into<String>) -> Self {
        Self::new(400, message)
    }

    /// Create an unauthorized error
    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self::with_code(401, message, "UNAUTHORIZED")
    }

    /// Create a forbidden error
    pub fn forbidden(message: impl Into<String>) -> Self {
        Self::with_code(403, message, "FORBIDDEN")
    }

    /// Create a not found error
    pub fn not_found(message: impl Into<String>) -> Self {
        Self::with_code(404, message, "NOT_FOUND")
    }

    /// Create a conflict error
    pub fn conflict(message: impl Into<String>) -> Self {
        Self::with_code(409, message, "CONFLICT")
    }

    /// Create an internal server error
    pub fn internal_server_error(message: impl Into<String>) -> Self {
        Self::with_code(500, message, "INTERNAL_SERVER_ERROR")
    }

    /// Create a configuration error
    pub fn configuration(message: impl Into<String>) -> Self {
        Self::with_code(500, message, "CONFIGURATION_ERROR")
    }

    /// Add validation errors
    pub fn with_errors(mut self, errors: Vec<ValidationError>) -> Self {
        self.errors = Some(errors);
        self
    }
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.status, self.message)
    }
}

impl ResponseError for ApiError {
    fn error_response(&self) -> HttpResponse {
        let status = StatusCode::from_u16(self.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        HttpResponse::build(status).json(self)
    }

    fn status_code(&self) -> StatusCode {
        StatusCode::from_u16(self.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

/// Result type for API operations
pub type ApiResult<T> = Result<T, ApiError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validation_error_required() {
        let error = ValidationError::required("username");
        assert_eq!(error.field, "username");
        assert_eq!(error.code, Some("REQUIRED".to_string()));
        assert!(error.message.contains("required"));
    }

    #[test]
    fn test_validation_error_invalid_format() {
        let error = ValidationError::invalid_format("email", "valid email address");
        assert_eq!(error.field, "email");
        assert_eq!(error.code, Some("INVALID_FORMAT".to_string()));
        assert!(error.message.contains("invalid format"));
    }

    #[test]
    fn test_validation_error_duplicate() {
        let error = ValidationError::duplicate("username");
        assert_eq!(error.field, "username");
        assert_eq!(error.code, Some("DUPLICATE".to_string()));
        assert!(error.message.contains("already exists"));
    }

    #[test]
    fn test_api_error_validation() {
        let errors = vec![
            ValidationError::required("username"),
            ValidationError::invalid_format("email", "valid email"),
        ];
        let api_error = ApiError::validation(errors);
        
        assert_eq!(api_error.status, 400);
        assert_eq!(api_error.message, "Validation failed");
        assert_eq!(api_error.code, Some("VALIDATION_ERROR".to_string()));
        assert!(api_error.errors.is_some());
        assert_eq!(api_error.errors.unwrap().len(), 2);
    }

    #[test]
    fn test_api_error_bad_request() {
        let error = ApiError::bad_request("Invalid input");
        assert_eq!(error.status, 400);
        assert_eq!(error.message, "Invalid input");
    }

    #[test]
    fn test_api_error_unauthorized() {
        let error = ApiError::unauthorized("Invalid credentials");
        assert_eq!(error.status, 401);
        assert_eq!(error.code, Some("UNAUTHORIZED".to_string()));
    }

    #[test]
    fn test_api_error_forbidden() {
        let error = ApiError::forbidden("Access denied");
        assert_eq!(error.status, 403);
        assert_eq!(error.code, Some("FORBIDDEN".to_string()));
    }

    #[test]
    fn test_api_error_not_found() {
        let error = ApiError::not_found("Resource not found");
        assert_eq!(error.status, 404);
        assert_eq!(error.code, Some("NOT_FOUND".to_string()));
    }

    #[test]
    fn test_api_error_conflict() {
        let error = ApiError::conflict("Resource already exists");
        assert_eq!(error.status, 409);
        assert_eq!(error.code, Some("CONFLICT".to_string()));
    }

    #[test]
    fn test_api_error_with_errors() {
        let errors = vec![ValidationError::required("name")];
        let error = ApiError::bad_request("Invalid data").with_errors(errors);
        
        assert!(error.errors.is_some());
        assert_eq!(error.errors.unwrap().len(), 1);
    }

    #[test]
    fn test_api_error_serialization() {
        let errors = vec![
            ValidationError::required("username"),
            ValidationError::invalid_format("email", "valid email"),
        ];
        let api_error = ApiError::validation(errors);
        
        let json = serde_json::to_string(&api_error).unwrap();
        assert!(json.contains("\"status\":400"));
        assert!(json.contains("\"message\":\"Validation failed\""));
        assert!(json.contains("\"code\":\"VALIDATION_ERROR\""));
        assert!(json.contains("\"errors\""));
    }
}
