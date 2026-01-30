/**
 * Health Check Service
 * 
 * Checks connectivity to external services (WooCommerce, QuickBooks, Supabase)
 * Caches results for 30 seconds to avoid excessive API calls
 * 
 * Task 22.1: Real connectivity checks
 * Requirements: 1.2, 14.4
 */

use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct ConnectivityStatus {
    pub is_online: bool,
    pub last_checked: Instant,
    pub error_message: Option<String>,
}

impl ConnectivityStatus {
    fn new(is_online: bool, error_message: Option<String>) -> Self {
        Self {
            is_online,
            last_checked: Instant::now(),
            error_message,
        }
    }
    
    fn is_stale(&self, max_age: Duration) -> bool {
        self.last_checked.elapsed() > max_age
    }
}

pub struct HealthCheckService {
    cache: Arc<RwLock<HashMap<String, ConnectivityStatus>>>,
    cache_duration: Duration,
}

impl HealthCheckService {
    pub fn new() -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            cache_duration: Duration::from_secs(30), // 30 seconds cache
        }
    }
    
    /// Check if system has internet connectivity
    pub async fn check_internet_connectivity(&self) -> bool {
        let cache_key = "internet".to_string();
        
        // Check cache first
        {
            let cache = self.cache.read().await;
            if let Some(status) = cache.get(&cache_key) {
                if !status.is_stale(self.cache_duration) {
                    return status.is_online;
                }
            }
        }
        
        // Perform actual check - try to reach a reliable endpoint
        let is_online = self.ping_internet().await;
        
        // Update cache
        {
            let mut cache = self.cache.write().await;
            cache.insert(
                cache_key,
                ConnectivityStatus::new(is_online, None),
            );
        }
        
        is_online
    }
    
    /// Check connectivity to WooCommerce
    pub async fn check_woocommerce(&self, store_url: &str) -> ConnectivityStatus {
        let cache_key = format!("woocommerce:{}", store_url);
        
        // Check cache first
        {
            let cache = self.cache.read().await;
            if let Some(status) = cache.get(&cache_key) {
                if !status.is_stale(self.cache_duration) {
                    return status.clone();
                }
            }
        }
        
        // Perform actual check
        let status = self.ping_woocommerce(store_url).await;
        
        // Update cache
        {
            let mut cache = self.cache.write().await;
            cache.insert(cache_key, status.clone());
        }
        
        status
    }
    
    /// Check connectivity to QuickBooks
    pub async fn check_quickbooks(&self) -> ConnectivityStatus {
        let cache_key = "quickbooks".to_string();
        
        // Check cache first
        {
            let cache = self.cache.read().await;
            if let Some(status) = cache.get(&cache_key) {
                if !status.is_stale(self.cache_duration) {
                    return status.clone();
                }
            }
        }
        
        // Perform actual check
        let status = self.ping_quickbooks().await;
        
        // Update cache
        {
            let mut cache = self.cache.write().await;
            cache.insert(cache_key, status.clone());
        }
        
        status
    }
    
    /// Check connectivity to Supabase
    pub async fn check_supabase(&self, project_url: &str) -> ConnectivityStatus {
        let cache_key = format!("supabase:{}", project_url);
        
        // Check cache first
        {
            let cache = self.cache.read().await;
            if let Some(status) = cache.get(&cache_key) {
                if !status.is_stale(self.cache_duration) {
                    return status.clone();
                }
            }
        }
        
        // Perform actual check
        let status = self.ping_supabase(project_url).await;
        
        // Update cache
        {
            let mut cache = self.cache.write().await;
            cache.insert(cache_key, status.clone());
        }
        
        status
    }
    
    /// Clear all cached statuses (useful for testing or forcing refresh)
    pub async fn clear_cache(&self) {
        let mut cache = self.cache.write().await;
        cache.clear();
    }
    
    // Private helper methods
    
    async fn ping_internet(&self) -> bool {
        // Try to reach a reliable endpoint (Google DNS or Cloudflare DNS)
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(5))
            .build()
            .unwrap_or_default();
        
        // Try multiple reliable endpoints
        let endpoints = vec![
            "https://1.1.1.1", // Cloudflare DNS
            "https://8.8.8.8", // Google DNS
            "https://www.google.com",
        ];
        
        for endpoint in endpoints {
            if let Ok(response) = client.get(endpoint).send().await {
                if response.status().is_success() || response.status().is_redirection() {
                    return true;
                }
            }
        }
        
        false
    }
    
    async fn ping_woocommerce(&self, store_url: &str) -> ConnectivityStatus {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .unwrap_or_default();
        
        // Try to reach the WooCommerce REST API endpoint
        let url = format!("{}/wp-json/wc/v3", store_url.trim_end_matches('/'));
        
        match client.get(&url).send().await {
            Ok(response) => {
                // 401 is actually good - it means the endpoint exists but needs auth
                if response.status().is_success() || response.status() == 401 {
                    ConnectivityStatus::new(true, None)
                } else {
                    ConnectivityStatus::new(
                        false,
                        Some(format!("HTTP {}", response.status())),
                    )
                }
            }
            Err(e) => ConnectivityStatus::new(false, Some(e.to_string())),
        }
    }
    
    async fn ping_quickbooks(&self) -> ConnectivityStatus {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .unwrap_or_default();
        
        // Try to reach QuickBooks API base URL
        let url = "https://quickbooks.api.intuit.com";
        
        match client.get(url).send().await {
            Ok(_) => ConnectivityStatus::new(true, None),
            Err(e) => ConnectivityStatus::new(false, Some(e.to_string())),
        }
    }
    
    async fn ping_supabase(&self, project_url: &str) -> ConnectivityStatus {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .unwrap_or_default();
        
        // Try to reach the Supabase REST API
        let url = format!("{}/rest/v1/", project_url.trim_end_matches('/'));
        
        match client.get(&url).send().await {
            Ok(response) => {
                // 401 or 403 is good - means endpoint exists but needs auth
                if response.status().is_success() 
                    || response.status() == 401 
                    || response.status() == 403 {
                    ConnectivityStatus::new(true, None)
                } else {
                    ConnectivityStatus::new(
                        false,
                        Some(format!("HTTP {}", response.status())),
                    )
                }
            }
            Err(e) => ConnectivityStatus::new(false, Some(e.to_string())),
        }
    }
}

impl Default for HealthCheckService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_cache_expiry() {
        let service = HealthCheckService {
            cache: Arc::new(RwLock::new(HashMap::new())),
            cache_duration: Duration::from_millis(100), // Very short for testing
        };
        
        // First check should hit the network
        let result1 = service.check_internet_connectivity().await;
        
        // Second check should use cache
        let result2 = service.check_internet_connectivity().await;
        assert_eq!(result1, result2);
        
        // Wait for cache to expire
        tokio::time::sleep(Duration::from_millis(150)).await;
        
        // Third check should hit the network again
        let _result3 = service.check_internet_connectivity().await;
    }
    
    #[tokio::test]
    async fn test_clear_cache() {
        let service = HealthCheckService::new();
        
        // Populate cache
        let _ = service.check_internet_connectivity().await;
        
        // Clear cache
        service.clear_cache().await;
        
        // Cache should be empty
        let cache = service.cache.read().await;
        assert_eq!(cache.len(), 0);
    }
}
