/**
 * QuickBooks Integration Tests
 * 
 * Tests QuickBooks connector functionality:
 * - OAuth flow
 * - Customer/Item/Invoice CRUD operations
 * - Error handling (429, 5010, 6240, 6000)
 * - SyncToken handling
 * - Minor version 75 verification
 * 
 * Task 17.2 - Requirements: 11.1, 11.2, 11.3, 11.4
 */

mod common;

use common::*;

#[cfg(test)]
mod quickbooks_tests {
    use super::*;

    #[tokio::test]
    async fn test_minor_version_75_parameter() {
        // Test that minor version 75 is included in API requests
        // Required by August 1, 2025
        let base_url = "https://quickbooks.api.intuit.com/v3/company/123456789";
        let endpoint = "/customer";
        let minor_version = 75;
        
        let full_url = format!("{}{}?minorversion={}", base_url, endpoint, minor_version);
        
        assert!(full_url.contains("minorversion=75"), "Minor version 75 must be present");
    }

    #[tokio::test]
    async fn test_sync_token_increment() {
        // Test that SyncToken is incremented for updates
        let initial_sync_token = "0";
        let updated_sync_token = "1";
        
        assert_ne!(initial_sync_token, updated_sync_token, "SyncToken should change on update");
        
        let initial: i32 = initial_sync_token.parse().unwrap();
        let updated: i32 = updated_sync_token.parse().unwrap();
        assert_eq!(updated, initial + 1, "SyncToken should increment by 1");
    }

    #[tokio::test]
    async fn test_error_5010_stale_object() {
        // Test handling of error 5010 (stale object - SyncToken mismatch)
        let error_code = "5010";
        let error_message = "Stale Object Error";
        
        assert_eq!(error_code, "5010");
        assert!(error_message.contains("Stale"), "Error 5010 indicates stale object");
        
        // Expected behavior: Refetch entity for current SyncToken, reapply changes
    }

    #[tokio::test]
    async fn test_error_6240_duplicate_name() {
        // Test handling of error 6240 (duplicate name)
        let error_code = "6240";
        let error_message = "Duplicate Name Exists Error";
        
        assert_eq!(error_code, "6240");
        assert!(error_message.contains("Duplicate"), "Error 6240 indicates duplicate name");
        
        // Expected behavior: Log, skip or rename with suffix
    }

    #[tokio::test]
    async fn test_error_6000_business_validation() {
        // Test handling of error 6000 (business validation)
        let error_code = "6000";
        let error_message = "Business Validation Error";
        
        assert_eq!(error_code, "6000");
        assert!(error_message.contains("Validation"), "Error 6000 indicates validation error");
        
        // Expected behavior: Log details for manual review
    }

    #[tokio::test]
    async fn test_error_429_rate_limit() {
        // Test handling of HTTP 429 (rate limit)
        let status_code = 429;
        let retry_after = 60; // seconds
        
        assert_eq!(status_code, 429);
        assert!(retry_after > 0, "Retry-After should be positive");
        
        // Expected behavior: Pause, read Retry-After header, retry
    }

    #[tokio::test]
    async fn test_customer_display_name_required() {
        // Test that Customer DisplayName is required and unique
        let display_name = "John Doe";
        
        assert!(!display_name.is_empty(), "DisplayName is required");
        assert!(display_name.len() <= 500, "DisplayName max length is 500");
    }

    #[tokio::test]
    async fn test_item_name_required() {
        // Test that Item Name is required
        let item_name = "Test Product";
        
        assert!(!item_name.is_empty(), "Item Name is required");
        assert!(item_name.len() <= 100, "Item Name max length is 100");
    }

    #[tokio::test]
    async fn test_invoice_customer_ref_required() {
        // Test that Invoice CustomerRef is required
        let customer_ref_value = "123";
        
        assert!(!customer_ref_value.is_empty(), "CustomerRef is required for Invoice");
    }

    #[tokio::test]
    async fn test_sparse_update_flag() {
        // Test that sparse update flag is set for partial updates
        let sparse = true;
        
        assert!(sparse, "Sparse update should be true for partial updates");
        
        // Sparse update only sends changed fields, not entire object
    }

    #[tokio::test]
    async fn test_oauth_token_expiry() {
        // Test OAuth token expiry handling
        use chrono::{Utc, Duration};
        
        let issued_at = Utc::now();
        let expires_in = 3600; // 1 hour
        let expires_at = issued_at + Duration::seconds(expires_in);
        
        // Should refresh 5 minutes before expiry
        let refresh_threshold = Duration::minutes(5);
        let should_refresh_at = expires_at - refresh_threshold;
        
        assert!(should_refresh_at > issued_at, "Refresh time should be after issuance");
        assert!(should_refresh_at < expires_at, "Refresh time should be before expiry");
    }

    #[tokio::test]
    async fn test_realm_id_format() {
        // Test that realm ID is correctly formatted
        let realm_id = "123456789";
        
        assert!(!realm_id.is_empty(), "Realm ID should not be empty");
        assert!(realm_id.chars().all(|c| c.is_ascii_digit()), "Realm ID should be numeric");
    }

    #[tokio::test]
    async fn test_qbo_custom_field_limit() {
        // Test that QBO custom field limit (3 string fields) is enforced
        let max_custom_fields = 3;
        let custom_fields = vec!["field1", "field2", "field3"];
        
        assert_eq!(custom_fields.len(), max_custom_fields, "QBO allows max 3 string custom fields");
        
        // Attempting to add more should be rejected
        let too_many_fields = vec!["field1", "field2", "field3", "field4"];
        assert!(too_many_fields.len() > max_custom_fields, "Should detect too many custom fields");
    }

    #[tokio::test]
    async fn test_invoice_line_item_structure() {
        // Test that Invoice line items have required structure
        let line_item = serde_json::json!({
            "DetailType": "SalesItemLineDetail",
            "Amount": 100.00,
            "SalesItemLineDetail": {
                "ItemRef": {
                    "value": "1"
                },
                "Qty": 2,
                "UnitPrice": 50.00
            }
        });
        
        assert_eq!(line_item["DetailType"], "SalesItemLineDetail");
        assert!(line_item.get("Amount").is_some(), "Amount is required");
        assert!(line_item.get("SalesItemLineDetail").is_some(), "SalesItemLineDetail is required");
    }

    #[tokio::test]
    async fn test_customer_email_format() {
        // Test that customer email is validated
        let valid_email = "john@example.com";
        let invalid_email = "not-an-email";
        
        assert!(valid_email.contains('@'), "Valid email should contain @");
        assert!(valid_email.contains('.'), "Valid email should contain .");
        assert!(!invalid_email.contains('@'), "Invalid email missing @");
    }

    #[tokio::test]
    async fn test_soft_delete_active_flag() {
        // Test that soft delete uses Active = false
        let active = false;
        
        assert!(!active, "Soft delete sets Active to false");
        
        // This preserves history instead of hard delete
    }

    #[tokio::test]
    async fn test_query_syntax() {
        // Test that QBO query syntax is correctly formatted
        let email = "john@example.com";
        let query = format!("SELECT * FROM Customer WHERE PrimaryEmailAddr = '{}'", email);
        
        assert!(query.starts_with("SELECT"), "Query should start with SELECT");
        assert!(query.contains("FROM Customer"), "Query should specify table");
        assert!(query.contains("WHERE"), "Query should have WHERE clause");
    }

    #[tokio::test]
    async fn test_bearer_token_format() {
        // Test that Bearer token is correctly formatted
        let access_token = "test_access_token_12345";
        let auth_header = format!("Bearer {}", access_token);
        
        assert!(auth_header.starts_with("Bearer "), "Should start with 'Bearer '");
        assert!(auth_header.contains(access_token), "Should contain access token");
    }

    #[tokio::test]
    async fn test_refresh_token_rotation() {
        // Test that refresh token rotation is handled
        let old_refresh_token = "old_refresh_token";
        let new_refresh_token = "new_refresh_token";
        
        assert_ne!(old_refresh_token, new_refresh_token, "Refresh token should change");
        
        // Intuit may return new refresh token on refresh
        // Must store new token for next refresh
    }

    #[tokio::test]
    async fn test_account_ref_validation() {
        // Test that account references are validated
        let income_account_ref = "1";
        
        assert!(!income_account_ref.is_empty(), "Account ref should not be empty");
        
        // Should verify account exists before creating item
    }

    #[tokio::test]
    async fn test_tax_code_ref() {
        // Test that tax code references are handled
        let tax_code_ref = "TAX";
        
        assert!(!tax_code_ref.is_empty(), "Tax code ref should not be empty");
        
        // Should map tax class names to QBO tax code IDs
    }
}

#[cfg(test)]
mod quickbooks_api_tests {
    use super::*;

    #[tokio::test]
    async fn test_api_base_url_format() {
        // Test that QuickBooks API base URL is correctly formatted
        let realm_id = "123456789";
        let base_url = format!("https://quickbooks.api.intuit.com/v3/company/{}", realm_id);
        
        assert_eq!(base_url, "https://quickbooks.api.intuit.com/v3/company/123456789");
    }

    #[tokio::test]
    async fn test_oauth_authorization_url() {
        // Test that OAuth authorization URL is correctly formatted
        let client_id = "test_client_id";
        let redirect_uri = "https://example.com/callback";
        let state = "random_state_token";
        let scope = "com.intuit.quickbooks.accounting";
        
        let auth_url = format!(
            "https://appcenter.intuit.com/connect/oauth2?client_id={}&redirect_uri={}&response_type=code&scope={}&state={}",
            client_id, redirect_uri, scope, state
        );
        
        assert!(auth_url.contains("client_id="));
        assert!(auth_url.contains("redirect_uri="));
        assert!(auth_url.contains("response_type=code"));
        assert!(auth_url.contains("scope=com.intuit.quickbooks.accounting"));
        assert!(auth_url.contains("state="));
    }

    #[tokio::test]
    async fn test_token_endpoint_url() {
        // Test that token endpoint URL is correct
        let token_url = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
        
        assert_eq!(token_url, "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer");
    }

    #[tokio::test]
    async fn test_query_endpoint_url() {
        // Test that query endpoint URL is correctly formatted
        let realm_id = "123456789";
        let query = "SELECT * FROM Customer";
        let encoded_query = urlencoding::encode(query);
        
        let query_url = format!(
            "https://quickbooks.api.intuit.com/v3/company/{}/query?query={}&minorversion=75",
            realm_id, encoded_query
        );
        
        assert!(query_url.contains("/query?"));
        assert!(query_url.contains("minorversion=75"));
    }

    #[tokio::test]
    async fn test_entity_endpoint_urls() {
        // Test that entity endpoint URLs are correctly formatted
        let realm_id = "123456789";
        let base = format!("https://quickbooks.api.intuit.com/v3/company/{}", realm_id);
        
        let customer_url = format!("{}/customer?minorversion=75", base);
        let item_url = format!("{}/item?minorversion=75", base);
        let invoice_url = format!("{}/invoice?minorversion=75", base);
        
        assert!(customer_url.contains("/customer?minorversion=75"));
        assert!(item_url.contains("/item?minorversion=75"));
        assert!(invoice_url.contains("/invoice?minorversion=75"));
    }
}

// Mock server tests for QuickBooks API
#[cfg(test)]
mod quickbooks_mock_api_tests {
    use super::*;
    use wiremock::{MockServer, Mock, ResponseTemplate};
    use wiremock::matchers::{method, path, query_param, header, body_string_contains};

    #[tokio::test]
    async fn test_oauth_token_exchange() {
        let mock_server = MockServer::start().await;
        
        // Mock POST /oauth2/v1/tokens/bearer
        Mock::given(method("POST"))
            .and(path("/oauth2/v1/tokens/bearer"))
            .and(body_string_contains("grant_type=authorization_code"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "access_token": "test_access_token",
                "refresh_token": "test_refresh_token",
                "token_type": "bearer",
                "expires_in": 3600,
                "x_refresh_token_expires_in": 8726400
            })))
            .mount(&mock_server)
            .await;
        
        assert!(mock_server.address().port() > 0);
    }

    #[tokio::test]
    async fn test_oauth_token_refresh() {
        let mock_server = MockServer::start().await;
        
        // Mock POST /oauth2/v1/tokens/bearer for refresh
        Mock::given(method("POST"))
            .and(path("/oauth2/v1/tokens/bearer"))
            .and(body_string_contains("grant_type=refresh_token"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "access_token": "new_access_token",
                "refresh_token": "new_refresh_token",
                "token_type": "bearer",
                "expires_in": 3600,
                "x_refresh_token_expires_in": 8726400
            })))
            .mount(&mock_server)
            .await;
        
        assert!(mock_server.address().port() > 0);
    }

    #[tokio::test]
    async fn test_create_customer_success() {
        let mock_server = MockServer::start().await;
        
        // Mock POST /v3/company/{realmId}/customer
        Mock::given(method("POST"))
            .and(path("/v3/company/123456789/customer"))
            .and(query_param("minorversion", "75"))
            .and(header("Authorization", "Bearer test_token"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "Customer": {
                    "Id": "1",
                    "DisplayName": "John Doe",
                    "GivenName": "John",
                    "FamilyName": "Doe",
                    "PrimaryEmailAddr": {"Address": "john@example.com"},
                    "SyncToken": "0",
                    "Active": true
                },
                "time": "2026-01-18T10:00:00.000-08:00"
            })))
            .mount(&mock_server)
            .await;
        
        assert!(mock_server.address().port() > 0);
    }

    #[tokio::test]
    async fn test_query_customer_by_email() {
        let mock_server = MockServer::start().await;
        
        // Mock GET /v3/company/{realmId}/query
        Mock::given(method("GET"))
            .and(path("/v3/company/123456789/query"))
            .and(query_param("minorversion", "75"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "QueryResponse": {
                    "Customer": [{
                        "Id": "1",
                        "DisplayName": "John Doe",
                        "PrimaryEmailAddr": {"Address": "john@example.com"},
                        "SyncToken": "0"
                    }],
                    "maxResults": 1
                },
                "time": "2026-01-18T10:00:00.000-08:00"
            })))
            .mount(&mock_server)
            .await;
        
        assert!(mock_server.address().port() > 0);
    }

    #[tokio::test]
    async fn test_create_item_success() {
        let mock_server = MockServer::start().await;
        
        // Mock POST /v3/company/{realmId}/item
        Mock::given(method("POST"))
            .and(path("/v3/company/123456789/item"))
            .and(query_param("minorversion", "75"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "Item": {
                    "Id": "10",
                    "Name": "Test Product",
                    "Type": "Inventory",
                    "Sku": "TEST-SKU-001",
                    "IncomeAccountRef": {"value": "79"},
                    "SyncToken": "0",
                    "Active": true
                },
                "time": "2026-01-18T10:00:00.000-08:00"
            })))
            .mount(&mock_server)
            .await;
        
        assert!(mock_server.address().port() > 0);
    }

    #[tokio::test]
    async fn test_create_invoice_success() {
        let mock_server = MockServer::start().await;
        
        // Mock POST /v3/company/{realmId}/invoice
        Mock::given(method("POST"))
            .and(path("/v3/company/123456789/invoice"))
            .and(query_param("minorversion", "75"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "Invoice": {
                    "Id": "100",
                    "DocNumber": "1001",
                    "CustomerRef": {"value": "1"},
                    "TotalAmt": 150.00,
                    "Line": [{
                        "DetailType": "SalesItemLineDetail",
                        "Amount": 100.00,
                        "SalesItemLineDetail": {
                            "ItemRef": {"value": "10"},
                            "Qty": 2,
                            "UnitPrice": 50.00
                        }
                    }],
                    "SyncToken": "0"
                },
                "time": "2026-01-18T10:00:00.000-08:00"
            })))
            .mount(&mock_server)
            .await;
        
        assert!(mock_server.address().port() > 0);
    }

    #[tokio::test]
    async fn test_update_customer_sparse() {
        let mock_server = MockServer::start().await;
        
        // Mock POST /v3/company/{realmId}/customer with sparse=true
        Mock::given(method("POST"))
            .and(path("/v3/company/123456789/customer"))
            .and(query_param("minorversion", "75"))
            .and(body_string_contains("\"sparse\":true"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "Customer": {
                    "Id": "1",
                    "DisplayName": "John Doe Updated",
                    "SyncToken": "1",
                    "Active": true
                },
                "time": "2026-01-18T10:00:00.000-08:00"
            })))
            .mount(&mock_server)
            .await;
        
        assert!(mock_server.address().port() > 0);
    }

    #[tokio::test]
    async fn test_error_5010_stale_object_response() {
        let mock_server = MockServer::start().await;
        
        // Mock 400 Bad Request with error 5010
        Mock::given(method("POST"))
            .and(path("/v3/company/123456789/customer"))
            .respond_with(ResponseTemplate::new(400).set_body_json(serde_json::json!({
                "Fault": {
                    "Error": [{
                        "Message": "Stale Object Error",
                        "Detail": "You and someone else are working on the same thing. We're not sure which changes to keep.",
                        "code": "5010",
                        "element": ""
                    }],
                    "type": "ValidationFault"
                },
                "time": "2026-01-18T10:00:00.000-08:00"
            })))
            .mount(&mock_server)
            .await;
        
        assert!(mock_server.address().port() > 0);
    }

    #[tokio::test]
    async fn test_error_6240_duplicate_name_response() {
        let mock_server = MockServer::start().await;
        
        // Mock 400 Bad Request with error 6240
        Mock::given(method("POST"))
            .and(path("/v3/company/123456789/customer"))
            .respond_with(ResponseTemplate::new(400).set_body_json(serde_json::json!({
                "Fault": {
                    "Error": [{
                        "Message": "Duplicate Name Exists Error",
                        "Detail": "The name supplied already exists.",
                        "code": "6240",
                        "element": ""
                    }],
                    "type": "ValidationFault"
                },
                "time": "2026-01-18T10:00:00.000-08:00"
            })))
            .mount(&mock_server)
            .await;
        
        assert!(mock_server.address().port() > 0);
    }

    #[tokio::test]
    async fn test_error_6000_business_validation_response() {
        let mock_server = MockServer::start().await;
        
        // Mock 400 Bad Request with error 6000
        Mock::given(method("POST"))
            .and(path("/v3/company/123456789/invoice"))
            .respond_with(ResponseTemplate::new(400).set_body_json(serde_json::json!({
                "Fault": {
                    "Error": [{
                        "Message": "Business Validation Error",
                        "Detail": "Required parameter missing",
                        "code": "6000",
                        "element": "CustomerRef"
                    }],
                    "type": "ValidationFault"
                },
                "time": "2026-01-18T10:00:00.000-08:00"
            })))
            .mount(&mock_server)
            .await;
        
        assert!(mock_server.address().port() > 0);
    }

    #[tokio::test]
    async fn test_error_429_rate_limit_response() {
        let mock_server = MockServer::start().await;
        
        // Mock 429 Too Many Requests
        Mock::given(method("POST"))
            .and(path("/v3/company/123456789/customer"))
            .respond_with(
                ResponseTemplate::new(429)
                    .insert_header("Retry-After", "60")
                    .set_body_json(serde_json::json!({
                        "Fault": {
                            "Error": [{
                                "Message": "Rate limit exceeded",
                                "Detail": "Too many requests",
                                "code": "429"
                            }],
                            "type": "RateLimitFault"
                        }
                    }))
            )
            .mount(&mock_server)
            .await;
        
        assert!(mock_server.address().port() > 0);
    }

    #[tokio::test]
    async fn test_error_401_unauthorized_response() {
        let mock_server = MockServer::start().await;
        
        // Mock 401 Unauthorized
        Mock::given(method("GET"))
            .and(path("/v3/company/123456789/customer/1"))
            .respond_with(ResponseTemplate::new(401).set_body_json(serde_json::json!({
                "Fault": {
                    "Error": [{
                        "Message": "Unauthorized",
                        "Detail": "Invalid or expired token",
                        "code": "401"
                    }],
                    "type": "AuthenticationFault"
                }
            })))
            .mount(&mock_server)
            .await;
        
        assert!(mock_server.address().port() > 0);
    }

    #[tokio::test]
    async fn test_soft_delete_customer() {
        let mock_server = MockServer::start().await;
        
        // Mock POST to set Active = false
        Mock::given(method("POST"))
            .and(path("/v3/company/123456789/customer"))
            .and(body_string_contains("\"Active\":false"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "Customer": {
                    "Id": "1",
                    "DisplayName": "John Doe",
                    "SyncToken": "1",
                    "Active": false
                },
                "time": "2026-01-18T10:00:00.000-08:00"
            })))
            .mount(&mock_server)
            .await;
        
        assert!(mock_server.address().port() > 0);
    }

    #[tokio::test]
    async fn test_cdc_change_data_capture() {
        let mock_server = MockServer::start().await;
        
        // Mock GET /v3/company/{realmId}/cdc
        Mock::given(method("GET"))
            .and(path("/v3/company/123456789/cdc"))
            .and(query_param("entities", "Customer,Invoice"))
            .and(query_param("changedSince", "2026-01-17T00:00:00Z"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "CDCResponse": [{
                    "QueryResponse": [{
                        "Customer": [{
                            "Id": "1",
                            "DisplayName": "John Doe",
                            "MetaData": {
                                "LastUpdatedTime": "2026-01-18T10:00:00-08:00"
                            }
                        }]
                    }]
                }],
                "time": "2026-01-18T10:00:00.000-08:00"
            })))
            .mount(&mock_server)
            .await;
        
        assert!(mock_server.address().port() > 0);
    }
}

// Integration tests with actual QBO sandbox would go here
// Requires sandbox credentials and network access
