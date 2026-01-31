//! Network configuration handlers
//!
//! Provides endpoints for configuring LAN access settings.
//! Settings are persisted to local-only files (not tracked in git).

use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tracing::{info, warn, error};

/// Network binding mode
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum NetworkBindMode {
    Localhost,
    AllInterfaces,
    SpecificIp,
}

impl Default for NetworkBindMode {
    fn default() -> Self {
        Self::Localhost
    }
}

/// Detected network interface
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInterface {
    pub name: String,
    pub ip: String,
    pub is_wireless: bool,
}

/// Network configuration request/response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkConfig {
    pub lan_enabled: bool,
    pub bind_mode: NetworkBindMode,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected_ip: Option<String>,
    #[serde(default)]
    pub detected_interfaces: Vec<NetworkInterface>,
}

impl Default for NetworkConfig {
    fn default() -> Self {
        Self {
            lan_enabled: false,
            bind_mode: NetworkBindMode::Localhost,
            selected_ip: None,
            detected_interfaces: Vec::new(),
        }
    }
}

/// Get the runtime directory path
fn get_runtime_dir() -> PathBuf {
    // Check for RUNTIME_DIR env var, otherwise use ./runtime
    std::env::var("RUNTIME_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("./runtime"))
}

/// Get the network config file path
fn get_config_path() -> PathBuf {
    get_runtime_dir().join("network-config.json")
}

/// Get the docker-compose override file path
fn get_compose_override_path() -> PathBuf {
    get_runtime_dir().join("docker-compose.override.yml")
}

/// Detect local network interfaces
/// 
/// # Errors
/// Returns error if network interface detection fails
pub async fn get_interfaces() -> impl Responder {
    let interfaces = detect_network_interfaces();
    HttpResponse::Ok().json(interfaces)
}

/// Get current network configuration
/// 
/// # Errors
/// Returns error if config file cannot be read
pub async fn get_config() -> impl Responder {
    let config_path = get_config_path();
    
    if config_path.exists() {
        match fs::read_to_string(&config_path) {
            Ok(content) => {
                match serde_json::from_str::<NetworkConfig>(&content) {
                    Ok(config) => HttpResponse::Ok().json(config),
                    Err(e) => {
                        warn!("Failed to parse network config: {}", e);
                        HttpResponse::Ok().json(NetworkConfig::default())
                    }
                }
            }
            Err(e) => {
                warn!("Failed to read network config: {}", e);
                HttpResponse::Ok().json(NetworkConfig::default())
            }
        }
    } else {
        HttpResponse::Ok().json(NetworkConfig::default())
    }
}

/// Save network configuration
/// 
/// # Errors
/// Returns error if config cannot be saved
pub async fn save_config(config: web::Json<NetworkConfig>) -> impl Responder {
    let runtime_dir = get_runtime_dir();
    let config_path = get_config_path();
    let compose_override_path = get_compose_override_path();
    
    // Ensure runtime directory exists
    if let Err(e) = fs::create_dir_all(&runtime_dir) {
        error!("Failed to create runtime directory: {}", e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to create runtime directory",
            "message": e.to_string()
        }));
    }
    
    // Save JSON config
    let config_json = match serde_json::to_string_pretty(&config.into_inner()) {
        Ok(json) => json,
        Err(e) => {
            error!("Failed to serialize network config: {}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to serialize configuration",
                "message": e.to_string()
            }));
        }
    };
    
    if let Err(e) = fs::write(&config_path, &config_json) {
        error!("Failed to write network config: {}", e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to save configuration",
            "message": e.to_string()
        }));
    }
    
    // Parse config back for compose generation
    let config: NetworkConfig = match serde_json::from_str(&config_json) {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to parse saved config: {}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Configuration parse error",
                "message": e.to_string()
            }));
        }
    };
    
    // Generate docker-compose override
    let compose_override = generate_compose_override(&config);
    
    if let Err(e) = fs::write(&compose_override_path, compose_override) {
        error!("Failed to write docker-compose override: {}", e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to save Docker configuration",
            "message": e.to_string()
        }));
    }
    
    info!("Network configuration saved: lan_enabled={}, bind_mode={:?}", 
          config.lan_enabled, config.bind_mode);
    
    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Network configuration saved. Restart the application for changes to take effect.",
        "restart_required": true
    }))
}

/// Generate docker-compose override YAML based on network config
fn generate_compose_override(config: &NetworkConfig) -> String {
    let bind_address = if config.lan_enabled {
        match &config.bind_mode {
            NetworkBindMode::Localhost => "127.0.0.1",
            NetworkBindMode::AllInterfaces => "0.0.0.0",
            NetworkBindMode::SpecificIp => {
                config.selected_ip.as_deref().unwrap_or("0.0.0.0")
            }
        }
    } else {
        "127.0.0.1"
    };
    
    format!(r#"# Auto-generated by EasySale Network Configuration
# DO NOT EDIT MANUALLY - changes will be overwritten
# This file is gitignored and local-only

services:
  frontend:
    ports:
      - "{bind_address}:7945:7945"
  
  backend:
    ports:
      - "{bind_address}:8923:8923"
"#, bind_address = bind_address)
}

/// Detect network interfaces on the system
fn detect_network_interfaces() -> Vec<NetworkInterface> {
    let mut interfaces = Vec::new();
    
    // Always include loopback
    interfaces.push(NetworkInterface {
        name: "Loopback".to_string(),
        ip: "127.0.0.1".to_string(),
        is_wireless: false,
    });
    
    // Try to detect real interfaces using system commands
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = std::process::Command::new("powershell")
            .args(["-Command", "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -Property IPAddress, InterfaceAlias | ConvertTo-Json"])
            .output()
        {
            if let Ok(json_str) = String::from_utf8(output.stdout) {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&json_str) {
                    // Handle both single object and array
                    let items = if parsed.is_array() {
                        parsed.as_array().cloned().unwrap_or_default()
                    } else if parsed.is_object() {
                        vec![parsed]
                    } else {
                        vec![]
                    };
                    
                    for item in items {
                        if let (Some(ip), Some(name)) = (
                            item.get("IPAddress").and_then(|v| v.as_str()),
                            item.get("InterfaceAlias").and_then(|v| v.as_str())
                        ) {
                            let is_wireless = name.to_lowercase().contains("wi-fi") 
                                || name.to_lowercase().contains("wireless")
                                || name.to_lowercase().contains("wlan");
                            
                            interfaces.push(NetworkInterface {
                                name: name.to_string(),
                                ip: ip.to_string(),
                                is_wireless,
                            });
                        }
                    }
                }
            }
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        if let Ok(output) = std::process::Command::new("ip")
            .args(["-4", "-j", "addr", "show"])
            .output()
        {
            if let Ok(json_str) = String::from_utf8(output.stdout) {
                if let Ok(parsed) = serde_json::from_str::<Vec<serde_json::Value>>(&json_str) {
                    for iface in parsed {
                        let name = iface.get("ifname")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown");
                        
                        if name == "lo" {
                            continue;
                        }
                        
                        if let Some(addr_info) = iface.get("addr_info").and_then(|v| v.as_array()) {
                            for addr in addr_info {
                                if let Some(ip) = addr.get("local").and_then(|v| v.as_str()) {
                                    let is_wireless = name.starts_with("wl") 
                                        || name.contains("wifi")
                                        || name.contains("wlan");
                                    
                                    interfaces.push(NetworkInterface {
                                        name: name.to_string(),
                                        ip: ip.to_string(),
                                        is_wireless,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = std::process::Command::new("ifconfig")
            .output()
        {
            if let Ok(output_str) = String::from_utf8(output.stdout) {
                let mut current_iface = String::new();
                let mut is_wireless = false;
                
                for line in output_str.lines() {
                    if !line.starts_with('\t') && !line.starts_with(' ') && line.contains(':') {
                        current_iface = line.split(':').next().unwrap_or("").to_string();
                        is_wireless = current_iface.starts_with("en") && current_iface != "en0";
                    } else if line.contains("inet ") && !line.contains("127.0.0.1") {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if let Some(ip_idx) = parts.iter().position(|&x| x == "inet") {
                            if let Some(ip) = parts.get(ip_idx + 1) {
                                interfaces.push(NetworkInterface {
                                    name: current_iface.clone(),
                                    ip: ip.to_string(),
                                    is_wireless,
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    
    interfaces
}

/// Remote store information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteStore {
    pub id: String,
    pub name: String,
    pub url: String,
    pub status: String, // "online", "offline", "syncing"
    pub last_sync: Option<String>,
    pub sync_enabled: bool,
}

/// Get list of remote stores
/// 
/// Returns stores configured for multi-store sync
pub async fn get_remote_stores(pool: web::Data<sqlx::SqlitePool>) -> impl Responder {
    // Query stores from database
    let stores_result: Result<Vec<(String, String, Option<String>, Option<String>, Option<String>)>, _> = sqlx::query_as(
        r"SELECT id, name, COALESCE(address, '') as address, sync_status, last_sync_at 
          FROM stores 
          WHERE is_active = 1
          ORDER BY name"
    )
    .fetch_all(pool.get_ref())
    .await;
    
    match stores_result {
        Ok(stores) => {
            let remote_stores: Vec<RemoteStore> = stores.iter().map(|(id, name, address, sync_status, last_sync)| {
                RemoteStore {
                    id: id.clone(),
                    name: name.clone(),
                    url: address.clone().unwrap_or_default(),
                    status: sync_status.clone().unwrap_or_else(|| "offline".to_string()),
                    last_sync: last_sync.clone(),
                    sync_enabled: sync_status.is_some(),
                }
            }).collect();
            
            HttpResponse::Ok().json(remote_stores)
        }
        Err(e) => {
            warn!("Failed to fetch remote stores: {}", e);
            // Return empty array on error - frontend expects array
            HttpResponse::Ok().json(Vec::<RemoteStore>::new())
        }
    }
}

/// Configure network routes
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/network")
            .route("/interfaces", web::get().to(get_interfaces))
            .route("/config", web::get().to(get_config))
            .route("/config", web::post().to(save_config))
            .route("/remote-stores", web::get().to(get_remote_stores))
    );
}
