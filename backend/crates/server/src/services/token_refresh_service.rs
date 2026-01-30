/**
 * Token Refresh Service
 * 
 * Automatically refreshes OAuth tokens before they expire.
 * Runs every 5 minutes to check for tokens expiring soon.
 * 
 * Requirements: Task 3.2 - Automatic token refresh
 */

use std::sync::Arc;
use std::time::Duration;
use sqlx::SqlitePool;
use tokio::time::interval;
use tracing::{info, warn, error};

use crate::services::credential_service::CredentialService;
use crate::connectors::quickbooks::oauth::QuickBooksOAuth;
use crate::services::credential_service::PlatformCredentials;

pub struct TokenRefreshService {
    pool: SqlitePool,
}

impl TokenRefreshService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Start the background token refresh task
    pub fn start(pool: SqlitePool) -> tokio::task::JoinHandle<()> {
        let service = Arc::new(Self::new(pool));
        
        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(300)); // 5 minutes
            
            info!("Token refresh service started - checking every 5 minutes");
            
            loop {
                interval.tick().await;
                
                if let Err(e) = service.refresh_expiring_tokens().await {
                    error!("Token refresh check failed: {}", e);
                }
            }
        })
    }

    /// Check all tenants for expiring tokens and refresh them
    async fn refresh_expiring_tokens(&self) -> Result<(), String> {
        // Get all tenants with QuickBooks credentials
        let tenants = sqlx::query_as::<_, (String,)>(
            "SELECT DISTINCT tenant_id FROM integration_credentials WHERE platform = 'quickbooks' AND is_active = 1"
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| format!("Failed to fetch tenants: {}", e))?;

        info!("Checking tokens for {} tenants", tenants.len());

        for (tenant_id,) in tenants {
            if let Err(e) = self.refresh_tenant_token(&tenant_id).await {
                warn!("Failed to refresh token for tenant {}: {}", tenant_id, e);
            }
        }

        Ok(())
    }

    /// Refresh token for a specific tenant if needed
    async fn refresh_tenant_token(&self, tenant_id: &str) -> Result<(), String> {
        let credential_service = CredentialService::new(self.pool.clone())
            .map_err(|e| format!("Failed to create credential service: {}", e))?;

        // Get credentials
        let creds = match credential_service.get_credentials(tenant_id, "quickbooks").await {
            Ok(Some(creds)) => creds,
            Ok(None) => return Ok(()), // No credentials, skip
            Err(e) => return Err(format!("Failed to get credentials: {}", e)),
        };

        let qb_creds = match creds {
            PlatformCredentials::QuickBooks(c) => c,
            _ => return Err("Invalid credential type".to_string()),
        };

        // Get OAuth tokens
        let tokens = match credential_service.get_oauth_tokens(tenant_id, "quickbooks").await {
            Ok(Some(tokens)) => tokens,
            Ok(None) => {
                info!("No OAuth tokens found for tenant {}, skipping", tenant_id);
                return Ok(());
            }
            Err(e) => return Err(format!("Failed to get OAuth tokens: {}", e)),
        };

        // Check if token needs refresh (5 minutes before expiry)
        if !QuickBooksOAuth::needs_refresh(&tokens) {
            return Ok(()); // Token still valid
        }

        info!("Refreshing OAuth token for tenant {} (expires at {})", 
              tenant_id, 
              chrono::DateTime::from_timestamp(tokens.expires_at, 0)
                  .map(|dt| dt.to_rfc3339())
                  .unwrap_or_else(|| "unknown".to_string())
        );

        // Create OAuth client
        let redirect_uri = std::env::var("QUICKBOOKS_REDIRECT_URI")
            .map_err(|_| format!("QUICKBOOKS_REDIRECT_URI not configured"))?;
        let oauth = QuickBooksOAuth::new(qb_creds, redirect_uri)
            .map_err(|e| format!("Failed to create OAuth client: {}", e))?;

        // Refresh the token
        let new_tokens = match oauth.refresh_access_token(&tokens.refresh_token).await {
            Ok(tokens) => tokens,
            Err(e) => {
                error!("Failed to refresh token for tenant {}: {}", tenant_id, e);
                
                // Mark connection as invalid
                let _ = self.mark_connection_invalid(tenant_id).await;
                
                return Err(format!("Token refresh failed: {}", e));
            }
        };

        // Store new tokens
        credential_service.store_oauth_tokens(tenant_id, "quickbooks", &new_tokens).await
            .map_err(|e| format!("Failed to store refreshed tokens: {}", e))?;

        info!("Successfully refreshed OAuth token for tenant {}", tenant_id);

        Ok(())
    }

    /// Mark connection as invalid when refresh fails
    async fn mark_connection_invalid(&self, tenant_id: &str) -> Result<(), String> {
        sqlx::query(
            "UPDATE integration_status 
             SET is_connected = 0, 
                 last_error = 'OAuth token refresh failed - please reconnect',
                 last_checked_at = datetime('now')
             WHERE tenant_id = ? AND platform = 'quickbooks'"
        )
        .bind(tenant_id)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to update connection status: {}", e))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_needs_refresh() {
        // Token expires in 4 minutes - should need refresh
        let tokens = QuickBooksTokens {
            access_token: "test".to_string(),
            refresh_token: "test".to_string(),
            expires_at: chrono::Utc::now().timestamp() + 240, // 4 minutes
        };
        assert!(QuickBooksOAuth::needs_refresh(&tokens));

        // Token expires in 10 minutes - should not need refresh yet
        let tokens = QuickBooksTokens {
            access_token: "test".to_string(),
            refresh_token: "test".to_string(),
            expires_at: chrono::Utc::now().timestamp() + 600, // 10 minutes
        };
        assert!(!QuickBooksOAuth::needs_refresh(&tokens));
    }
}
