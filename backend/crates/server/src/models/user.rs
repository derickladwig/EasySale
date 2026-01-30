use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use super::errors::ValidationError;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: String,
    pub tenant_id: String,
    pub username: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub display_name: Option<String>,
    pub role: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub store_id: Option<String>,
    pub station_policy: String, // 'any', 'specific', 'none'
    pub station_id: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub display_name: Option<String>,
    pub role: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub store_id: Option<String>,
    pub station_policy: Option<String>,
    pub station_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserResponse,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserResponse {
    pub id: String,
    pub tenant_id: String,
    pub username: String,
    pub email: String,
    pub display_name: Option<String>,
    pub role: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub store_id: Option<String>,
    pub station_policy: String,
    pub station_id: Option<String>,
    pub permissions: Vec<String>,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        let permissions = get_permissions_for_role(&user.role);
        Self {
            id: user.id,
            tenant_id: user.tenant_id,
            username: user.username,
            email: user.email,
            display_name: user.display_name,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            store_id: user.store_id,
            station_policy: user.station_policy,
            station_id: user.station_id,
            permissions,
        }
    }
}

/// Get permissions for a given role
pub fn get_permissions_for_role(role: &str) -> Vec<String> {
    match role {
        "admin" => vec![
            "access_sell".to_string(),
            "access_warehouse".to_string(),
            "access_admin".to_string(),
            "apply_discount".to_string(),
            "override_price".to_string(),
            "process_return".to_string(),
            "receive_stock".to_string(),
            "adjust_inventory".to_string(),
            "manage_users".to_string(),
            "manage_settings".to_string(),
            "view_audit_logs".to_string(),
        ],
        "manager" => vec![
            "access_sell".to_string(),
            "access_warehouse".to_string(),
            "apply_discount".to_string(),
            "override_price".to_string(),
            "process_return".to_string(),
            "receive_stock".to_string(),
            "adjust_inventory".to_string(),
            "view_audit_logs".to_string(),
        ],
        "cashier" => vec!["access_sell".to_string(), "process_return".to_string()],
        "specialist" => vec![
            "access_sell".to_string(),
            "access_warehouse".to_string(),
            "receive_stock".to_string(),
        ],
        "inventory_clerk" => vec![
            "access_warehouse".to_string(),
            "receive_stock".to_string(),
            "adjust_inventory".to_string(),
        ],
        "technician" => vec!["access_sell".to_string()],
        _ => vec![],
    }
}

/// Check if a role requires store assignment
pub fn role_requires_store(role: &str) -> bool {
    matches!(
        role,
        "cashier" | "manager" | "specialist" | "technician"
    )
}

/// Check if a role requires station assignment
pub fn role_requires_station(role: &str) -> bool {
    matches!(role, "cashier")
}

/// Validate user data
pub fn validate_user(
    role: &str,
    store_id: &Option<String>,
    station_policy: &str,
    station_id: &Option<String>,
) -> Result<(), String> {
    // Validate station policy
    if !matches!(station_policy, "any" | "specific" | "none") {
        return Err("Invalid station policy. Must be 'any', 'specific', or 'none'".to_string());
    }

    // Check if role requires store assignment
    if role_requires_store(role) && store_id.is_none() {
        return Err(format!(
            "Role '{}' requires store assignment for POS operations",
            role
        ));
    }

    // Check if station policy is consistent
    if station_policy == "specific" && station_id.is_none() {
        return Err("Station policy 'specific' requires a station assignment".to_string());
    }

    if station_policy != "specific" && station_id.is_some() {
        return Err(
            "Station assignment is only allowed when station policy is 'specific'".to_string(),
        );
    }

    Ok(())
}

impl CreateUserRequest {
    /// Validate create user request
    pub fn validate(&self) -> Result<(), String> {
        let station_policy = self.station_policy.as_deref().unwrap_or("any");
        validate_user(&self.role, &self.store_id, station_policy, &self.station_id)
    }

    /// Validate create user request with structured errors
    pub fn validate_detailed(&self) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();

        // Validate username
        if self.username.trim().is_empty() {
            errors.push(ValidationError::required("username"));
        } else if self.username.len() < 3 {
            errors.push(ValidationError::invalid_value(
                "username",
                "Username must be at least 3 characters long",
            ));
        } else if self.username.len() > 50 {
            errors.push(ValidationError::invalid_value(
                "username",
                "Username must not exceed 50 characters",
            ));
        }

        // Validate email
        if self.email.trim().is_empty() {
            errors.push(ValidationError::required("email"));
        } else if !self.email.contains('@') || !self.email.contains('.') {
            errors.push(ValidationError::invalid_format("email", "valid email address"));
        }

        // Validate password
        if self.password.is_empty() {
            errors.push(ValidationError::required("password"));
        } else if self.password.len() < 8 {
            errors.push(ValidationError::invalid_value(
                "password",
                "Password must be at least 8 characters long",
            ));
        }

        // Validate role
        let valid_roles = [
            "admin",
            "manager",
            "cashier",
            "specialist",
            "inventory_clerk",
            "technician",
        ];
        if !valid_roles.contains(&self.role.as_str()) {
            errors.push(ValidationError::invalid_value(
                "role",
                format!("Role must be one of: {}", valid_roles.join(", ")),
            ));
        }

        // Validate station policy
        let station_policy = self.station_policy.as_deref().unwrap_or("any");
        if !matches!(station_policy, "any" | "specific" | "none") {
            errors.push(ValidationError::invalid_value(
                "station_policy",
                "Station policy must be 'any', 'specific', or 'none'",
            ));
        }

        // Validate store requirement for POS roles
        if role_requires_store(&self.role) && self.store_id.is_none() {
            errors.push(ValidationError::invalid_value(
                "store_id",
                format!("Role '{}' requires store assignment for POS operations", self.role),
            ));
        }

        // Validate station policy consistency
        if station_policy == "specific" && self.station_id.is_none() {
            errors.push(ValidationError::invalid_value(
                "station_id",
                "Station policy 'specific' requires a station assignment",
            ));
        }

        if station_policy != "specific" && self.station_id.is_some() {
            errors.push(ValidationError::invalid_value(
                "station_id",
                "Station assignment is only allowed when station policy is 'specific'",
            ));
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
    fn test_admin_permissions() {
        let perms = get_permissions_for_role("admin");
        assert!(perms.contains(&"manage_users".to_string()));
        assert!(perms.contains(&"manage_settings".to_string()));
        assert!(perms.len() > 5);
    }

    #[test]
    fn test_cashier_permissions() {
        let perms = get_permissions_for_role("cashier");
        assert!(perms.contains(&"access_sell".to_string()));
        assert!(!perms.contains(&"manage_users".to_string()));
    }

    #[test]
    fn test_unknown_role() {
        let perms = get_permissions_for_role("unknown");
        assert_eq!(perms.len(), 0);
    }

    #[test]
    fn test_role_requires_store() {
        assert!(role_requires_store("cashier"));
        assert!(role_requires_store("manager"));
        assert!(role_requires_store("specialist"));
        assert!(role_requires_store("technician"));
        assert!(!role_requires_store("admin"));
        assert!(!role_requires_store("inventory_clerk"));
    }

    #[test]
    fn test_role_requires_station() {
        assert!(role_requires_station("cashier"));
        assert!(!role_requires_station("manager"));
        assert!(!role_requires_station("admin"));
    }

    #[test]
    fn test_validate_user_cashier_without_store() {
        let result = validate_user("cashier", &None, "any", &None);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("requires store assignment"));
    }

    #[test]
    fn test_validate_user_cashier_with_store() {
        let result = validate_user("cashier", &Some("store-1".to_string()), "any", &None);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_user_specific_policy_without_station() {
        let result = validate_user("cashier", &Some("store-1".to_string()), "specific", &None);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("requires a station assignment"));
    }

    #[test]
    fn test_validate_user_specific_policy_with_station() {
        let result = validate_user(
            "cashier",
            &Some("store-1".to_string()),
            "specific",
            &Some("station-1".to_string()),
        );
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_user_invalid_station_policy() {
        let result = validate_user("cashier", &Some("store-1".to_string()), "invalid", &None);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid station policy"));
    }

    #[test]
    fn test_validate_user_station_without_specific_policy() {
        let result = validate_user(
            "cashier",
            &Some("store-1".to_string()),
            "any",
            &Some("station-1".to_string()),
        );
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("only allowed when station policy is 'specific'"));
    }

    #[test]
    fn test_create_user_request_validate_detailed_valid() {
        let request = CreateUserRequest {
            username: "testuser".to_string(),
            email: "test@example.com".to_string(),
            password: "password123".to_string(),
            display_name: None,
            role: "admin".to_string(),
            first_name: Some("Test".to_string()),
            last_name: Some("User".to_string()),
            store_id: None,
            station_policy: Some("any".to_string()),
            station_id: None,
        };

        let result = request.validate_detailed();
        assert!(result.is_ok());
    }

    #[test]
    fn test_create_user_request_validate_detailed_missing_username() {
        let request = CreateUserRequest {
            username: "".to_string(),
            email: "test@example.com".to_string(),
            password: "password123".to_string(),
            display_name: None,
            role: "admin".to_string(),
            first_name: None,
            last_name: None,
            store_id: None,
            station_policy: None,
            station_id: None,
        };

        let result = request.validate_detailed();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert_eq!(errors.len(), 1);
        assert_eq!(errors[0].field, "username");
        assert_eq!(errors[0].code, Some("REQUIRED".to_string()));
    }

    #[test]
    fn test_create_user_request_validate_detailed_short_username() {
        let request = CreateUserRequest {
            username: "ab".to_string(),
            email: "test@example.com".to_string(),
            password: "password123".to_string(),
            display_name: None,
            role: "admin".to_string(),
            first_name: None,
            last_name: None,
            store_id: None,
            station_policy: None,
            station_id: None,
        };

        let result = request.validate_detailed();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.field == "username" && e.code == Some("INVALID_VALUE".to_string())));
    }

    #[test]
    fn test_create_user_request_validate_detailed_invalid_email() {
        let request = CreateUserRequest {
            username: "testuser".to_string(),
            email: "invalid-email".to_string(),
            password: "password123".to_string(),
            display_name: None,
            role: "admin".to_string(),
            first_name: None,
            last_name: None,
            store_id: None,
            station_policy: None,
            station_id: None,
        };

        let result = request.validate_detailed();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.field == "email" && e.code == Some("INVALID_FORMAT".to_string())));
    }

    #[test]
    fn test_create_user_request_validate_detailed_short_password() {
        let request = CreateUserRequest {
            username: "testuser".to_string(),
            email: "test@example.com".to_string(),
            password: "short".to_string(),
            display_name: None,
            role: "admin".to_string(),
            first_name: None,
            last_name: None,
            store_id: None,
            station_policy: None,
            station_id: None,
        };

        let result = request.validate_detailed();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.field == "password" && e.code == Some("INVALID_VALUE".to_string())));
    }

    #[test]
    fn test_create_user_request_validate_detailed_invalid_role() {
        let request = CreateUserRequest {
            username: "testuser".to_string(),
            email: "test@example.com".to_string(),
            password: "password123".to_string(),
            display_name: None,
            role: "invalid_role".to_string(),
            first_name: None,
            last_name: None,
            store_id: None,
            station_policy: None,
            station_id: None,
        };

        let result = request.validate_detailed();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.field == "role" && e.code == Some("INVALID_VALUE".to_string())));
    }

    #[test]
    fn test_create_user_request_validate_detailed_cashier_without_store() {
        let request = CreateUserRequest {
            username: "testuser".to_string(),
            email: "test@example.com".to_string(),
            password: "password123".to_string(),
            display_name: None,
            role: "cashier".to_string(),
            first_name: None,
            last_name: None,
            store_id: None,
            station_policy: Some("any".to_string()),
            station_id: None,
        };

        let result = request.validate_detailed();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.field == "store_id" && e.code == Some("INVALID_VALUE".to_string())));
    }

    #[test]
    fn test_create_user_request_validate_detailed_multiple_errors() {
        let request = CreateUserRequest {
            username: "".to_string(),
            email: "invalid".to_string(),
            password: "short".to_string(),
            display_name: None,
            role: "invalid_role".to_string(),
            first_name: None,
            last_name: None,
            store_id: None,
            station_policy: None,
            station_id: None,
        };

        let result = request.validate_detailed();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.len() >= 4); // username, email, password, role
    }
}
