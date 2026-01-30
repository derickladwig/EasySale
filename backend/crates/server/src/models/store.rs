use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use super::errors::ValidationError;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Store {
    pub id: String,
    pub tenant_id: String,
    pub name: String,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub timezone: String,
    pub currency: String,
    pub receipt_footer: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    pub sync_version: i64,
    pub synced_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateStoreRequest {
    pub name: String,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub timezone: Option<String>,
    pub currency: Option<String>,
    pub receipt_footer: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateStoreRequest {
    pub name: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub timezone: Option<String>,
    pub currency: Option<String>,
    pub receipt_footer: Option<String>,
    pub is_active: Option<bool>,
}

impl Store {
    /// Validate store data
    pub fn validate(&self) -> Result<(), String> {
        if self.name.trim().is_empty() {
            return Err("Store name is required".to_string());
        }

        if self.name.len() > 100 {
            return Err("Store name must be 100 characters or less".to_string());
        }

        // Validate timezone (basic check)
        if !self.timezone.contains('/') {
            return Err("Invalid timezone format".to_string());
        }

        // Validate currency (basic check)
        if self.currency.len() != 3 {
            return Err("Currency must be a 3-letter code (e.g., CAD, USD)".to_string());
        }

        Ok(())
    }
}

impl CreateStoreRequest {
    /// Validate create request
    pub fn validate(&self) -> Result<(), String> {
        if self.name.trim().is_empty() {
            return Err("Store name is required".to_string());
        }

        if self.name.len() > 100 {
            return Err("Store name must be 100 characters or less".to_string());
        }

        // Validate timezone if provided
        if let Some(tz) = &self.timezone {
            if !tz.contains('/') {
                return Err("Invalid timezone format".to_string());
            }
        }

        // Validate currency if provided
        if let Some(curr) = &self.currency {
            if curr.len() != 3 {
                return Err("Currency must be a 3-letter code (e.g., CAD, USD)".to_string());
            }
        }

        Ok(())
    }

    /// Validate create request with structured errors
    pub fn validate_detailed(&self) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();

        // Validate name
        if self.name.trim().is_empty() {
            errors.push(ValidationError::required("name"));
        } else if self.name.len() > 100 {
            errors.push(ValidationError::invalid_value(
                "name",
                "Store name must be 100 characters or less",
            ));
        }

        // Validate email if provided
        if let Some(email) = &self.email {
            if !email.is_empty() && (!email.contains('@') || !email.contains('.')) {
                errors.push(ValidationError::invalid_format("email", "valid email address"));
            }
        }

        // Validate timezone if provided
        if let Some(tz) = &self.timezone {
            if !tz.contains('/') {
                errors.push(ValidationError::invalid_format(
                    "timezone",
                    "valid timezone (e.g., America/Toronto)",
                ));
            }
        }

        // Validate currency if provided
        if let Some(curr) = &self.currency {
            if curr.len() != 3 {
                errors.push(ValidationError::invalid_format(
                    "currency",
                    "3-letter currency code (e.g., CAD, USD)",
                ));
            }
        }

        // Validate phone if provided
        if let Some(phone) = &self.phone {
            if !phone.is_empty() && phone.len() < 10 {
                errors.push(ValidationError::invalid_value(
                    "phone",
                    "Phone number must be at least 10 digits",
                ));
            }
        }

        // Validate zip if provided
        if let Some(zip) = &self.zip {
            if !zip.is_empty() && zip.len() < 5 {
                errors.push(ValidationError::invalid_value(
                    "zip",
                    "ZIP/Postal code must be at least 5 characters",
                ));
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_store_validation() {
        let store = Store {
            id: "store-1".to_string(),
            tenant_id: crate::test_constants::TEST_TENANT_ID.to_string(),
            name: "Test Store".to_string(),
            address: None,
            city: None,
            state: None,
            zip: None,
            phone: None,
            email: None,
            timezone: "America/Toronto".to_string(),
            currency: "CAD".to_string(),
            receipt_footer: None,
            is_active: true,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            sync_version: 1,
            synced_at: None,
        };

        assert!(store.validate().is_ok());
    }

    #[test]
    fn test_store_validation_empty_name() {
        let store = Store {
            id: "store-1".to_string(),
            tenant_id: crate::test_constants::TEST_TENANT_ID.to_string(),
            name: "".to_string(),
            address: None,
            city: None,
            state: None,
            zip: None,
            phone: None,
            email: None,
            timezone: "America/Toronto".to_string(),
            currency: "CAD".to_string(),
            receipt_footer: None,
            is_active: true,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            sync_version: 1,
            synced_at: None,
        };

        assert!(store.validate().is_err());
    }

    #[test]
    fn test_store_validation_invalid_timezone() {
        let store = Store {
            id: "store-1".to_string(),
            tenant_id: crate::test_constants::TEST_TENANT_ID.to_string(),
            name: "Test Store".to_string(),
            address: None,
            city: None,
            state: None,
            zip: None,
            phone: None,
            email: None,
            timezone: "InvalidTimezone".to_string(),
            currency: "CAD".to_string(),
            receipt_footer: None,
            is_active: true,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            sync_version: 1,
            synced_at: None,
        };

        assert!(store.validate().is_err());
    }

    #[test]
    fn test_store_validation_invalid_currency() {
        let store = Store {
            id: "store-1".to_string(),
            tenant_id: crate::test_constants::TEST_TENANT_ID.to_string(),
            name: "Test Store".to_string(),
            address: None,
            city: None,
            state: None,
            zip: None,
            phone: None,
            email: None,
            timezone: "America/Toronto".to_string(),
            currency: "INVALID".to_string(),
            receipt_footer: None,
            is_active: true,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            sync_version: 1,
            synced_at: None,
        };

        assert!(store.validate().is_err());
    }

    #[test]
    fn test_create_store_request_validation() {
        let request = CreateStoreRequest {
            name: "Test Store".to_string(),
            address: None,
            city: None,
            state: None,
            zip: None,
            phone: None,
            email: None,
            timezone: Some("America/Toronto".to_string()),
            currency: Some("CAD".to_string()),
            receipt_footer: None,
        };

        assert!(request.validate().is_ok());
    }

    #[test]
    fn test_create_store_request_validate_detailed_valid() {
        let request = CreateStoreRequest {
            name: "Test Store".to_string(),
            address: Some("123 Main St".to_string()),
            city: Some("Toronto".to_string()),
            state: Some("ON".to_string()),
            zip: Some("M5H 2N2".to_string()),
            phone: Some("4165551234".to_string()),
            email: Some("store@example.com".to_string()),
            timezone: Some("America/Toronto".to_string()),
            currency: Some("CAD".to_string()),
            receipt_footer: None,
        };

        let result = request.validate_detailed();
        assert!(result.is_ok());
    }

    #[test]
    fn test_create_store_request_validate_detailed_missing_name() {
        let request = CreateStoreRequest {
            name: "".to_string(),
            address: None,
            city: None,
            state: None,
            zip: None,
            phone: None,
            email: None,
            timezone: None,
            currency: None,
            receipt_footer: None,
        };

        let result = request.validate_detailed();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.field == "name" && e.code == Some("REQUIRED".to_string())));
    }

    #[test]
    fn test_create_store_request_validate_detailed_invalid_email() {
        let request = CreateStoreRequest {
            name: "Test Store".to_string(),
            address: None,
            city: None,
            state: None,
            zip: None,
            phone: None,
            email: Some("invalid-email".to_string()),
            timezone: None,
            currency: None,
            receipt_footer: None,
        };

        let result = request.validate_detailed();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.field == "email" && e.code == Some("INVALID_FORMAT".to_string())));
    }

    #[test]
    fn test_create_store_request_validate_detailed_invalid_timezone() {
        let request = CreateStoreRequest {
            name: "Test Store".to_string(),
            address: None,
            city: None,
            state: None,
            zip: None,
            phone: None,
            email: None,
            timezone: Some("InvalidTimezone".to_string()),
            currency: None,
            receipt_footer: None,
        };

        let result = request.validate_detailed();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.field == "timezone" && e.code == Some("INVALID_FORMAT".to_string())));
    }

    #[test]
    fn test_create_store_request_validate_detailed_invalid_currency() {
        let request = CreateStoreRequest {
            name: "Test Store".to_string(),
            address: None,
            city: None,
            state: None,
            zip: None,
            phone: None,
            email: None,
            timezone: None,
            currency: Some("INVALID".to_string()),
            receipt_footer: None,
        };

        let result = request.validate_detailed();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.field == "currency" && e.code == Some("INVALID_FORMAT".to_string())));
    }
}


