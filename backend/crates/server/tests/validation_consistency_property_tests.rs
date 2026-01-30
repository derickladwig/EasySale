// Property-Based Tests for Validation Consistency
// **Property 5: Validation Consistency**
// **Validates: Requirements 3.3, 3.4, 7.2, 7.3**
//
// These tests verify that frontend and backend validation produce consistent results.
// For any form submission, if validation passes/fails, both frontend and backend should agree.

use proptest::prelude::*;
use EasySale_server::models::{
    user::CreateUserRequest,
    store::CreateStoreRequest,
    errors::ValidationError,
};

// ============================================================================
// Test Data Generators
// ============================================================================

/// Generate arbitrary user creation requests (both valid and invalid)
fn arb_user_request() -> impl Strategy<Value = CreateUserRequest> {
    (
        prop::option::of("[a-z]{3,50}"),  // username (sometimes empty/short/long)
        prop::option::of("[a-z]+@[a-z]+\\.[a-z]+"),  // email (sometimes invalid)
        prop::option::of("[a-zA-Z0-9]{0,20}"),  // password (sometimes too short)
        prop::option::of("[A-Za-z ]{0,50}"),  // display_name
        prop::option::of(prop::sample::select(vec![
            "admin", "manager", "cashier", "specialist", 
            "inventory_clerk", "technician", "invalid_role"
        ])),  // role (sometimes invalid)
        prop::option::of("[A-Za-z]{2,30}"),  // first_name
        prop::option::of("[A-Za-z]{2,30}"),  // last_name
        prop::option::of("[a-z0-9-]{5,20}"),  // store_id
        prop::option::of(prop::sample::select(vec!["any", "specific", "none", "invalid"])),  // station_policy
        prop::option::of("[a-z0-9-]{5,20}"),  // station_id
    ).prop_map(|(username, email, password, display_name, role, first_name, last_name, store_id, station_policy, station_id)| {
        CreateUserRequest {
            username: username.unwrap_or_else(|| "".to_string()),
            email: email.unwrap_or_else(|| "invalid".to_string()),
            password: password.unwrap_or_else(|| "".to_string()),
            display_name,
            role: role.unwrap_or("admin").to_string(),
            first_name,
            last_name,
            store_id,
            station_policy: station_policy.map(|s| s.to_string()),
            station_id,
        }
    })
}

/// Generate arbitrary store creation requests (both valid and invalid)
fn arb_store_request() -> impl Strategy<Value = CreateStoreRequest> {
    (
        prop::option::of("[A-Za-z0-9 ]{0,150}"),  // name (sometimes empty/too long)
        prop::option::of("[A-Za-z0-9 ]{5,100}"),  // address
        prop::option::of("[A-Za-z ]{2,50}"),  // city
        prop::option::of("[A-Z]{2}"),  // state
        prop::option::of("[A-Z0-9 ]{0,15}"),  // zip (sometimes too short)
        prop::option::of("[0-9]{0,15}"),  // phone (sometimes too short)
        prop::option::of(prop::option::of("[a-z]+@?[a-z]*\\.?[a-z]*")),  // email (sometimes invalid)
        prop::option::of(prop::option::of(prop::sample::select(vec![
            "America/Toronto", "America/New_York", "America/Los_Angeles",
            "InvalidTimezone", "UTC"  // Some invalid
        ]))),  // timezone
        prop::option::of(prop::option::of(prop::sample::select(vec![
            "CAD", "USD", "EUR", "INVALID", "US"  // Some invalid
        ]))),  // currency
        prop::option::of(prop::option::of("[A-Za-z0-9 ]{0,200}")),  // receipt_footer
    ).prop_map(|(name, address, city, state, zip, phone, email, timezone, currency, receipt_footer)| {
        CreateStoreRequest {
            name: name.unwrap_or_else(|| "".to_string()),
            address,
            city,
            state,
            zip,
            phone,
            email: email.flatten(),
            timezone: timezone.flatten().map(|s| s.to_string()),
            currency: currency.flatten().map(|s| s.to_string()),
            receipt_footer: receipt_footer.flatten(),
        }
    })
}

// ============================================================================
// Validation Logic Simulators (Frontend)
// ============================================================================

/// Simulate frontend validation for user creation
/// This mimics what the frontend validation would do
fn frontend_validate_user(req: &CreateUserRequest) -> Result<(), Vec<ValidationError>> {
    let mut errors = Vec::new();

    // Username validation
    if req.username.trim().is_empty() {
        errors.push(ValidationError::required("username"));
    } else if req.username.len() < 3 {
        errors.push(ValidationError::invalid_value(
            "username",
            "Username must be at least 3 characters long",
        ));
    } else if req.username.len() > 50 {
        errors.push(ValidationError::invalid_value(
            "username",
            "Username must not exceed 50 characters",
        ));
    }

    // Email validation
    if req.email.trim().is_empty() {
        errors.push(ValidationError::required("email"));
    } else if !req.email.contains('@') || !req.email.contains('.') {
        errors.push(ValidationError::invalid_format("email", "valid email address"));
    }

    // Password validation
    if req.password.is_empty() {
        errors.push(ValidationError::required("password"));
    } else if req.password.len() < 8 {
        errors.push(ValidationError::invalid_value(
            "password",
            "Password must be at least 8 characters long",
        ));
    }

    // Role validation
    let valid_roles = [
        "admin",
        "manager",
        "cashier",
        "specialist",
        "inventory_clerk",
        "technician",
    ];
    if !valid_roles.contains(&req.role.as_str()) {
        errors.push(ValidationError::invalid_value(
            "role",
            format!("Role must be one of: {}", valid_roles.join(", ")),
        ));
    }

    // Station policy validation
    let station_policy = req.station_policy.as_deref().unwrap_or("any");
    if !matches!(station_policy, "any" | "specific" | "none") {
        errors.push(ValidationError::invalid_value(
            "station_policy",
            "Station policy must be 'any', 'specific', or 'none'",
        ));
    }

    // Store requirement validation
    let role_requires_store = matches!(
        req.role.as_str(),
        "cashier" | "manager" | "specialist" | "technician"
    );
    if role_requires_store && req.store_id.is_none() {
        errors.push(ValidationError::invalid_value(
            "store_id",
            format!("Role '{}' requires store assignment for POS operations", req.role),
        ));
    }

    // Station policy consistency validation
    if station_policy == "specific" && req.station_id.is_none() {
        errors.push(ValidationError::invalid_value(
            "station_id",
            "Station policy 'specific' requires a station assignment",
        ));
    }

    if station_policy != "specific" && req.station_id.is_some() {
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

/// Simulate frontend validation for store creation
/// This mimics what the frontend validation would do
fn frontend_validate_store(req: &CreateStoreRequest) -> Result<(), Vec<ValidationError>> {
    let mut errors = Vec::new();

    // Name validation
    if req.name.trim().is_empty() {
        errors.push(ValidationError::required("name"));
    } else if req.name.len() > 100 {
        errors.push(ValidationError::invalid_value(
            "name",
            "Store name must be 100 characters or less",
        ));
    }

    // Email validation (if provided)
    if let Some(email) = &req.email {
        if !email.is_empty() && (!email.contains('@') || !email.contains('.')) {
            errors.push(ValidationError::invalid_format("email", "valid email address"));
        }
    }

    // Timezone validation (if provided)
    if let Some(tz) = &req.timezone {
        if !tz.contains('/') {
            errors.push(ValidationError::invalid_format(
                "timezone",
                "valid timezone (e.g., America/Toronto)",
            ));
        }
    }

    // Currency validation (if provided)
    if let Some(curr) = &req.currency {
        if curr.len() != 3 {
            errors.push(ValidationError::invalid_format(
                "currency",
                "3-letter currency code (e.g., CAD, USD)",
            ));
        }
    }

    // Phone validation (if provided)
    if let Some(phone) = &req.phone {
        if !phone.is_empty() && phone.len() < 10 {
            errors.push(ValidationError::invalid_value(
                "phone",
                "Phone number must be at least 10 digits",
            ));
        }
    }

    // Zip validation (if provided)
    if let Some(zip) = &req.zip {
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

// ============================================================================
// Helper Functions
// ============================================================================

/// Compare validation results to ensure they match
fn validation_results_match(
    frontend_result: &Result<(), Vec<ValidationError>>,
    backend_result: &Result<(), Vec<ValidationError>>,
) -> bool {
    match (frontend_result, backend_result) {
        (Ok(()), Ok(())) => true,  // Both pass
        (Err(fe), Err(be)) => {
            // Both fail - check that they have errors for the same fields
            // We don't require exact message matching, just field matching
            if fe.is_empty() || be.is_empty() {
                return false;
            }
            
            // Extract field names from both error sets
            let fe_fields: std::collections::HashSet<_> = fe.iter().map(|e| &e.field).collect();
            let be_fields: std::collections::HashSet<_> = be.iter().map(|e| &e.field).collect();
            
            // They should have errors for the same fields
            fe_fields == be_fields
        }
        _ => false,  // One passes, one fails - inconsistent
    }
}

// ============================================================================
// Property Tests
// ============================================================================

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    /// **Property 5: Validation Consistency for User Creation**
    /// 
    /// For any user creation request, frontend and backend validation should agree:
    /// - If frontend validation passes, backend validation should pass
    /// - If frontend validation fails, backend validation should fail
    /// - Both should report errors for the same fields
    /// 
    /// **Validates: Requirements 3.3, 3.4, 7.2, 7.3**
    #[test]
    fn property_5_user_validation_consistency(user_req in arb_user_request()) {
        // Run frontend validation
        let frontend_result = frontend_validate_user(&user_req);
        
        // Run backend validation (the actual implementation)
        let backend_result = user_req.validate_detailed();
        
        // Assert that results match
        prop_assert!(
            validation_results_match(&frontend_result, &backend_result),
            "Validation inconsistency detected!\n\
             Frontend result: {:?}\n\
             Backend result: {:?}\n\
             Request: {:?}",
            frontend_result,
            backend_result,
            user_req
        );
    }

    /// **Property 5: Validation Consistency for Store Creation**
    /// 
    /// For any store creation request, frontend and backend validation should agree:
    /// - If frontend validation passes, backend validation should pass
    /// - If frontend validation fails, backend validation should fail
    /// - Both should report errors for the same fields
    /// 
    /// **Validates: Requirements 3.3, 3.4, 7.2, 7.3**
    #[test]
    fn property_5_store_validation_consistency(store_req in arb_store_request()) {
        // Run frontend validation
        let frontend_result = frontend_validate_store(&store_req);
        
        // Run backend validation (the actual implementation)
        let backend_result = store_req.validate_detailed();
        
        // Assert that results match
        prop_assert!(
            validation_results_match(&frontend_result, &backend_result),
            "Validation inconsistency detected!\n\
             Frontend result: {:?}\n\
             Backend result: {:?}\n\
             Request: {:?}",
            frontend_result,
            backend_result,
            store_req
        );
    }
}

// ============================================================================
// Unit Tests for Validation Helpers
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validation_results_match_both_pass() {
        let result1: Result<(), Vec<ValidationError>> = Ok(());
        let result2: Result<(), Vec<ValidationError>> = Ok(());
        assert!(validation_results_match(&result1, &result2));
    }

    #[test]
    fn test_validation_results_match_both_fail_same_fields() {
        let result1 = Err(vec![
            ValidationError::required("username"),
            ValidationError::required("email"),
        ]);
        let result2 = Err(vec![
            ValidationError::required("username"),
            ValidationError::required("email"),
        ]);
        assert!(validation_results_match(&result1, &result2));
    }

    #[test]
    fn test_validation_results_match_both_fail_different_fields() {
        let result1 = Err(vec![ValidationError::required("username")]);
        let result2 = Err(vec![ValidationError::required("email")]);
        assert!(!validation_results_match(&result1, &result2));
    }

    #[test]
    fn test_validation_results_match_one_passes_one_fails() {
        let result1: Result<(), Vec<ValidationError>> = Ok(());
        let result2 = Err(vec![ValidationError::required("username")]);
        assert!(!validation_results_match(&result1, &result2));
    }

    #[test]
    fn test_frontend_validate_user_valid() {
        let req = CreateUserRequest {
            username: "testuser".to_string(),
            email: "test@example.com".to_string(),
            password: "password123".to_string(),
            display_name: None,
            role: "admin".to_string(),
            first_name: None,
            last_name: None,
            store_id: None,
            station_policy: Some("any".to_string()),
            station_id: None,
        };

        let result = frontend_validate_user(&req);
        assert!(result.is_ok());
    }

    #[test]
    fn test_frontend_validate_user_missing_username() {
        let req = CreateUserRequest {
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

        let result = frontend_validate_user(&req);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.field == "username"));
    }

    #[test]
    fn test_frontend_validate_store_valid() {
        let req = CreateStoreRequest {
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

        let result = frontend_validate_store(&req);
        assert!(result.is_ok());
    }

    #[test]
    fn test_frontend_validate_store_missing_name() {
        let req = CreateStoreRequest {
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

        let result = frontend_validate_store(&req);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.field == "name"));
    }

    #[test]
    fn test_frontend_backend_consistency_valid_user() {
        let req = CreateUserRequest {
            username: "testuser".to_string(),
            email: "test@example.com".to_string(),
            password: "password123".to_string(),
            display_name: None,
            role: "admin".to_string(),
            first_name: None,
            last_name: None,
            store_id: None,
            station_policy: Some("any".to_string()),
            station_id: None,
        };

        let frontend_result = frontend_validate_user(&req);
        let backend_result = req.validate_detailed();

        assert!(validation_results_match(&frontend_result, &backend_result));
    }

    #[test]
    fn test_frontend_backend_consistency_invalid_user() {
        let req = CreateUserRequest {
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

        let frontend_result = frontend_validate_user(&req);
        let backend_result = req.validate_detailed();

        assert!(validation_results_match(&frontend_result, &backend_result));
    }
}
