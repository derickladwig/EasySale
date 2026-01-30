use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Station {
    pub id: String,
    pub tenant_id: String,
    pub store_id: String,
    pub name: String,
    pub device_id: Option<String>,
    pub ip_address: Option<String>,
    pub is_active: bool,
    pub offline_mode_enabled: bool,
    pub last_seen_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub sync_version: i64,
    pub synced_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateStationRequest {
    pub store_id: String,
    pub name: String,
    pub device_id: Option<String>,
    pub ip_address: Option<String>,
    pub offline_mode_enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateStationRequest {
    pub name: Option<String>,
    pub device_id: Option<String>,
    pub ip_address: Option<String>,
    pub is_active: Option<bool>,
    pub offline_mode_enabled: Option<bool>,
}

impl Station {
    /// Validate station data
    pub fn validate(&self) -> Result<(), String> {
        if self.name.trim().is_empty() {
            return Err("Station name is required".to_string());
        }

        if self.name.len() > 100 {
            return Err("Station name must be 100 characters or less".to_string());
        }

        if self.store_id.trim().is_empty() {
            return Err("Store ID is required".to_string());
        }

        // Validate IP address format if provided
        if let Some(ip) = &self.ip_address {
            if !ip.is_empty() && !is_valid_ip(ip) {
                return Err("Invalid IP address format".to_string());
            }
        }

        Ok(())
    }
}

impl CreateStationRequest {
    /// Validate create request
    pub fn validate(&self) -> Result<(), String> {
        if self.name.trim().is_empty() {
            return Err("Station name is required".to_string());
        }

        if self.name.len() > 100 {
            return Err("Station name must be 100 characters or less".to_string());
        }

        if self.store_id.trim().is_empty() {
            return Err("Store ID is required".to_string());
        }

        // Validate IP address format if provided
        if let Some(ip) = &self.ip_address {
            if !ip.is_empty() && !is_valid_ip(ip) {
                return Err("Invalid IP address format".to_string());
            }
        }

        Ok(())
    }
}

/// Basic IP address validation (IPv4)
fn is_valid_ip(ip: &str) -> bool {
    let parts: Vec<&str> = ip.split('.').collect();
    if parts.len() != 4 {
        return false;
    }

    for part in parts {
        // Parse as u8 - this automatically validates 0-255 range
        if part.parse::<u8>().is_err() {
            return false;
        }
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_station_validation() {
        let station = Station {
            id: "station-1".to_string(),
            tenant_id: crate::test_constants::TEST_TENANT_ID.to_string(),
            store_id: "store-1".to_string(),
            name: "Terminal 1".to_string(),
            device_id: None,
            ip_address: Some("192.168.1.100".to_string()),
            is_active: true,
            offline_mode_enabled: false,
            last_seen_at: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            sync_version: 1,
            synced_at: None,
        };

        assert!(station.validate().is_ok());
    }

    #[test]
    fn test_station_validation_empty_name() {
        let station = Station {
            id: "station-1".to_string(),
            tenant_id: crate::test_constants::TEST_TENANT_ID.to_string(),
            store_id: "store-1".to_string(),
            name: "".to_string(),
            device_id: None,
            ip_address: None,
            is_active: true,
            offline_mode_enabled: false,
            last_seen_at: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            sync_version: 1,
            synced_at: None,
        };

        assert!(station.validate().is_err());
    }

    #[test]
    fn test_station_validation_invalid_ip() {
        let station = Station {
            id: "station-1".to_string(),
            tenant_id: crate::test_constants::TEST_TENANT_ID.to_string(),
            store_id: "store-1".to_string(),
            name: "Terminal 1".to_string(),
            device_id: None,
            ip_address: Some("invalid-ip".to_string()),
            is_active: true,
            offline_mode_enabled: false,
            last_seen_at: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            sync_version: 1,
            synced_at: None,
        };

        assert!(station.validate().is_err());
    }

    #[test]
    fn test_is_valid_ip() {
        assert!(is_valid_ip("192.168.1.1"));
        assert!(is_valid_ip("10.0.0.1"));
        assert!(is_valid_ip("172.16.0.1"));
        assert!(!is_valid_ip("256.1.1.1"));
        assert!(!is_valid_ip("192.168.1"));
        assert!(!is_valid_ip("invalid"));
    }

    #[test]
    fn test_create_station_request_validation() {
        let request = CreateStationRequest {
            store_id: "store-1".to_string(),
            name: "Terminal 1".to_string(),
            device_id: None,
            ip_address: Some("192.168.1.100".to_string()),
            offline_mode_enabled: Some(false),
        };

        assert!(request.validate().is_ok());
    }
}


