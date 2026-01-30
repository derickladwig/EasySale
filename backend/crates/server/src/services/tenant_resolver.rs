//! Tenant Resolver Service
//!
//! Resolves tenant_id from external platform identifiers:
//! - QuickBooks realm_id -> tenant_id
//! - WooCommerce store_url -> tenant_id
//! - Webhook source -> tenant_id
//!
//! Requirements: 10.5, 12.3, 11.8

use sqlx::SqlitePool;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Tenant resolver service with caching
pub struct TenantResolver {
    db: SqlitePool,
    /// Cache: realm_id -> tenant_id
    realm_cache: Arc<RwLock<HashMap<String, String>>>,
    /// Cache: store_url -> tenant_id
    store_cache: Arc<RwLock<HashMap<String, String>>>,
}

impl TenantResolver {
    pub fn new(db: SqlitePool) -> Self {
        Self {
            db,
            realm_cache: Arc::new(RwLock::new(HashMap::new())),
            store_cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Resolve tenant_id from QuickBooks realm_id
    pub async fn resolve_from_realm_id(&self, realm_id: &str) -> Result<String, String> {
        // Check cache first
        {
            let cache = self.realm_cache.read().await;
            if let Some(tenant_id) = cache.get(realm_id) {
                return Ok(tenant_id.clone());
            }
        }

        // Query database
        let row = sqlx::query(
            r#"
            SELECT tenant_id 
            FROM integration_credentials 
            WHERE platform = 'quickbooks' 
              AND realm_id = ? 
              AND is_active = 1
            LIMIT 1
            "#
        )
        .bind(realm_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| format!("Database error: {}", e))?
        .ok_or_else(|| format!("No tenant found for realm_id: {}", realm_id))?;

        use sqlx::Row;
        let tenant_id: String = row.get("tenant_id");

        // Update cache
        {
            let mut cache = self.realm_cache.write().await;
            cache.insert(realm_id.to_string(), tenant_id.clone());
        }

        Ok(tenant_id)
    }

    /// Resolve tenant_id from WooCommerce store URL
    pub async fn resolve_from_store_url(&self, store_url: &str) -> Result<String, String> {
        // Normalize URL (remove trailing slash, protocol variations)
        let normalized_url = store_url.trim_end_matches('/').to_lowercase();

        // Check cache first
        {
            let cache = self.store_cache.read().await;
            if let Some(tenant_id) = cache.get(&normalized_url) {
                return Ok(tenant_id.clone());
            }
        }

        // Query database
        let row = sqlx::query(
            r#"
            SELECT tenant_id 
            FROM integration_credentials 
            WHERE platform = 'woocommerce' 
              AND LOWER(TRIM(store_url, '/')) = ? 
              AND is_active = 1
            LIMIT 1
            "#
        )
        .bind(&normalized_url)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| format!("Database error: {}", e))?
        .ok_or_else(|| format!("No tenant found for store_url: {}", store_url))?;

        use sqlx::Row;
        let tenant_id: String = row.get("tenant_id");

        // Update cache
        {
            let mut cache = self.store_cache.write().await;
            cache.insert(normalized_url, tenant_id.clone());
        }

        Ok(tenant_id)
    }

    /// Resolve tenant_id from webhook headers or metadata
    /// Tries multiple strategies in order:
    /// 1. X-Tenant-ID header
    /// 2. realm_id in payload (QuickBooks)
    /// 3. store_url in payload (WooCommerce)
    /// 4. Falls back to environment variable (single-tenant mode)
    pub async fn resolve_from_webhook(
        &self,
        headers: &actix_web::http::header::HeaderMap,
        payload: &serde_json::Value,
    ) -> Result<String, String> {
        // Strategy 1: Check X-Tenant-ID header
        if let Some(header_value) = headers.get("X-Tenant-ID") {
            if let Ok(tenant_id) = header_value.to_str() {
                return Ok(tenant_id.to_string());
            }
        }

        // Strategy 2: Check for realm_id in payload (QuickBooks)
        if let Some(realm_id) = payload.get("realmId").and_then(|v| v.as_str()) {
            return self.resolve_from_realm_id(realm_id).await;
        }
        if let Some(notifications) = payload.get("eventNotifications").and_then(|v| v.as_array()) {
            if let Some(first) = notifications.first() {
                if let Some(realm_id) = first.get("realmId").and_then(|v| v.as_str()) {
                    return self.resolve_from_realm_id(realm_id).await;
                }
            }
        }

        // Strategy 3: Check for store_url in payload (WooCommerce)
        if let Some(store_url) = payload.get("store_url").and_then(|v| v.as_str()) {
            return self.resolve_from_store_url(store_url).await;
        }

        // Strategy 4: Fall back to environment variable (single-tenant mode)
        std::env::var("TENANT_ID")
            .map_err(|_| "Unable to resolve tenant_id: no header, realm_id, store_url, or TENANT_ID env var".to_string())
    }

    /// Clear all caches (useful for testing or after credential changes)
    pub async fn clear_cache(&self) {
        let mut realm_cache = self.realm_cache.write().await;
        realm_cache.clear();
        
        let mut store_cache = self.store_cache.write().await;
        store_cache.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_url_normalization() {
        let urls = vec![
            ("https://example.com/", "https://example.com"),
            ("https://EXAMPLE.COM", "https://example.com"),
            ("https://example.com", "https://example.com"),
        ];

        for (input, expected) in urls {
            let normalized = input.trim_end_matches('/').to_lowercase();
            assert_eq!(normalized, expected);
        }
    }

    #[tokio::test]
    async fn test_cache_operations() {
        let db = SqlitePool::connect(":memory:").await.unwrap();
        let resolver = TenantResolver::new(db);

        // Add to cache manually for testing
        {
            let mut cache = resolver.realm_cache.write().await;
            cache.insert("test-realm".to_string(), "test-tenant".to_string());
        }

        // Clear cache
        resolver.clear_cache().await;
        
        // Verify cache is empty
        {
            let cache = resolver.realm_cache.read().await;
            assert_eq!(cache.len(), 0);
        }
    }
}
