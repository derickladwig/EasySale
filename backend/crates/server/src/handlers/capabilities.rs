use actix_web::{HttpResponse, Responder};
use capabilities::{CapabilityProvider, provider::DefaultCapabilityProvider};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;

use crate::config::ConfigLoader;

/// Extended capabilities response with module information
#[derive(Debug, Serialize)]
pub struct ExtendedCapabilities {
    /// Backend version
    pub version: String,
    
    /// Build hash
    pub build_hash: String,
    
    /// Accounting mode
    pub accounting_mode: String,
    
    /// Feature flags
    pub features: FeatureFlags,
    
    /// Enabled modules
    pub modules: HashMap<String, ModuleStatus>,
    
    /// Vertical pack status
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vertical_pack: Option<VerticalPackStatus>,
}

#[derive(Debug, Serialize)]
pub struct FeatureFlags {
    pub export: bool,
    pub sync: bool,
    /// Document processing (PDF, images) - vendor bills, document ingest
    pub document_processing: bool,
    /// OCR and image enhancement - multi-pass OCR, zone detection
    pub ocr: bool,
    /// Document cleanup engine - mask engine, cleanup shields
    pub document_cleanup: bool,
    /// Integration management (connect/test/status/summary/logs/disconnect)
    pub integrations: bool,
    /// Payment processing capabilities
    pub payments: bool,
    /// Stripe Connect integration
    pub stripe: bool,
    /// Square integration
    pub square: bool,
    /// Clover integration
    pub clover: bool,
    /// Data Manager (seed/import/purge)
    pub data_manager: bool,
    /// Build variant (lite, export, full)
    pub build_variant: String,
}

#[derive(Debug, Serialize)]
pub struct ModuleStatus {
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub settings: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Serialize)]
pub struct VerticalPackStatus {
    pub enabled: bool,
    pub pack_name: String,
}

/// GET /api/capabilities
/// 
/// Returns the backend's capability information including:
/// - accounting_mode: disabled | export_only | sync
/// - features: { export: bool, sync: bool }
/// - version: backend version
/// - build_hash: build identifier
pub async fn get_capabilities() -> impl Responder {
    let build_hash = option_env!("BUILD_HASH")
        .unwrap_or("dev")
        .to_string();
    
    let provider = DefaultCapabilityProvider::new(
        env!("CARGO_PKG_VERSION").to_string(),
        build_hash.clone(),
    );
    
    let capabilities = provider.get_capabilities();
    
    HttpResponse::Ok().json(capabilities)
}

/// GET /api/config/capabilities
/// 
/// Returns extended capabilities including enabled modules and vertical packs
#[actix_web::get("/api/config/capabilities")]
pub async fn get_config_capabilities() -> HttpResponse {
    let build_hash = option_env!("BUILD_HASH")
        .unwrap_or("dev")
        .to_string();
    
    let version = env!("CARGO_PKG_VERSION").to_string();
    
    // Determine accounting mode based on features
    let accounting_mode = if cfg!(feature = "sync") {
        "sync"
    } else if cfg!(feature = "export") {
        "export_only"
    } else {
        "disabled"
    };
    
    let features = FeatureFlags {
        export: cfg!(feature = "export"),
        sync: cfg!(feature = "sync"),
        document_processing: cfg!(feature = "document-processing"),
        ocr: cfg!(feature = "ocr"),
        document_cleanup: cfg!(feature = "document-cleanup"),
        integrations: cfg!(feature = "integrations") || cfg!(feature = "full"),
        payments: cfg!(feature = "payments") || cfg!(feature = "full"),
        stripe: cfg!(feature = "payments") || cfg!(feature = "full"),
        square: cfg!(feature = "payments") || cfg!(feature = "full"),
        clover: cfg!(feature = "payments") || cfg!(feature = "full"),
        data_manager: cfg!(feature = "full"),
        build_variant: if cfg!(feature = "full") {
            "full".to_string()
        } else if cfg!(feature = "export") {
            "export".to_string()
        } else {
            "lite".to_string()
        },
    };
    
    // Load tenant config to get module information
    let tenant_id = env::var("TENANT_ID")
        .unwrap_or_else(|_| "default".to_string());
    
    let config_loader = ConfigLoader::new("configs", 300, false);
    
    let modules = match config_loader.load_config(&tenant_id) {
        Ok(config) => {
            // Convert ModulesConfig to HashMap<String, ModuleStatus>
            config.modules.modules.into_iter().map(|(key, module_config)| {
                (key, ModuleStatus {
                    enabled: module_config.enabled,
                    settings: module_config.settings,
                })
            }).collect()
        }
        Err(e) => {
            tracing::warn!("Failed to load config for modules: {:?}", e);
            HashMap::new()
        }
    };
    
    // Check for automotive vertical pack
    let vertical_pack = modules.get("automotive").map(|automotive_module| {
        VerticalPackStatus {
            enabled: automotive_module.enabled,
            pack_name: "automotive".to_string(),
        }
    });
    
    let response = ExtendedCapabilities {
        version,
        build_hash,
        accounting_mode: accounting_mode.to_string(),
        features,
        modules,
        vertical_pack,
    };
    
    HttpResponse::Ok().json(response)
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, web, App};
    use capabilities::{AccountingMode, Capabilities};

    #[actix_web::test]
    async fn test_get_capabilities() {
        let app = test::init_service(
            App::new().route("/api/capabilities", web::get().to(get_capabilities))
        ).await;
        
        let req = test::TestRequest::get()
            .uri("/api/capabilities")
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        
        assert!(resp.status().is_success());
        
        let body: Capabilities = test::read_body_json(resp).await;
        
        // Verify structure
        assert!(!body.version.is_empty());
        assert!(!body.build_hash.is_empty());
        
        // Verify accounting mode logic
        #[cfg(feature = "export")]
        {
            assert!(body.features.export);
            assert_eq!(body.accounting_mode, AccountingMode::ExportOnly);
        }
        
        #[cfg(not(feature = "export"))]
        {
            assert!(!body.features.export);
            assert_eq!(body.accounting_mode, AccountingMode::Disabled);
        }
        
        // Sync is never enabled in this phase
        assert!(!body.features.sync);
    }
}


/// Feature capability status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum FeatureStatus {
    Ready,
    Beta,
    ComingSoon,
    Hidden,
}

/// Individual capability entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapabilityEntry {
    pub status: FeatureStatus,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

/// Meta capabilities response
#[derive(Debug, Serialize)]
pub struct MetaCapabilitiesResponse {
    pub tenant_id: String,
    pub store_id: String,
    pub user_role: String,
    pub capabilities: HashMap<String, CapabilityEntry>,
}

/// GET /api/meta/capabilities
/// 
/// Returns capabilities for the authenticated user's tenant/store context.
/// Includes cleanup engine capabilities and their status.
#[actix_web::get("/api/meta/capabilities")]
pub async fn get_meta_capabilities(
    // In production, this would come from auth context
    // For now, we use environment variables as fallback
) -> HttpResponse {
    let tenant_id = env::var("TENANT_ID")
        .unwrap_or_else(|_| "default".to_string());
    let store_id = env::var("STORE_ID")
        .unwrap_or_else(|_| "default-store".to_string());
    
    // Default to manager role for now - in production this comes from JWT
    let user_role = "manager".to_string();
    
    let mut capabilities = HashMap::new();
    
    // Document Cleanup Engine capabilities
    capabilities.insert("cleanup.view".to_string(), CapabilityEntry {
        status: FeatureStatus::Ready,
        enabled: true,
        reason: None,
    });
    
    capabilities.insert("cleanup.adjust_session".to_string(), CapabilityEntry {
        status: FeatureStatus::Ready,
        enabled: true,
        reason: None,
    });
    
    capabilities.insert("cleanup.save_vendor_rules".to_string(), CapabilityEntry {
        status: FeatureStatus::Ready,
        enabled: true,
        reason: None,
    });
    
    capabilities.insert("cleanup.save_template_rules".to_string(), CapabilityEntry {
        status: FeatureStatus::Ready,
        enabled: true,
        reason: None,
    });
    
    capabilities.insert("cleanup.configure_detection".to_string(), CapabilityEntry {
        status: FeatureStatus::ComingSoon,
        enabled: false,
        reason: Some("Detection configuration coming in v4.1".to_string()),
    });
    
    capabilities.insert("cleanup.view_audit_log".to_string(), CapabilityEntry {
        status: FeatureStatus::Ready,
        enabled: true,
        reason: None,
    });
    
    capabilities.insert("cleanup.manage_thresholds".to_string(), CapabilityEntry {
        status: FeatureStatus::ComingSoon,
        enabled: false,
        reason: Some("Threshold management coming in v4.1".to_string()),
    });
    
    // Review capabilities
    capabilities.insert("review.view_queue".to_string(), CapabilityEntry {
        status: FeatureStatus::Ready,
        enabled: true,
        reason: None,
    });
    
    capabilities.insert("review.claim_case".to_string(), CapabilityEntry {
        status: FeatureStatus::Ready,
        enabled: true,
        reason: None,
    });
    
    capabilities.insert("review.approve_case".to_string(), CapabilityEntry {
        status: FeatureStatus::Ready,
        enabled: true,
        reason: None,
    });
    
    capabilities.insert("review.reject_case".to_string(), CapabilityEntry {
        status: FeatureStatus::Ready,
        enabled: true,
        reason: None,
    });
    
    capabilities.insert("review.rerun_extraction".to_string(), CapabilityEntry {
        status: FeatureStatus::Ready,
        enabled: true,
        reason: None,
    });
    
    capabilities.insert("review.bulk_approve".to_string(), CapabilityEntry {
        status: FeatureStatus::Ready,
        enabled: true,
        reason: None,
    });
    
    // Integration capabilities
    capabilities.insert("integration.inventory".to_string(), CapabilityEntry {
        status: FeatureStatus::Ready,
        enabled: true,
        reason: None,
    });
    
    capabilities.insert("integration.ap".to_string(), CapabilityEntry {
        status: FeatureStatus::Ready,
        enabled: true,
        reason: None,
    });
    
    capabilities.insert("integration.accounting".to_string(), CapabilityEntry {
        status: FeatureStatus::Ready,
        enabled: true,
        reason: None,
    });
    
    let response = MetaCapabilitiesResponse {
        tenant_id,
        store_id,
        user_role,
        capabilities,
    };
    
    HttpResponse::Ok().json(response)
}

#[cfg(test)]
mod meta_capabilities_tests {
    use super::*;
    use actix_web::{test, App};

    #[actix_web::test]
    async fn test_get_meta_capabilities() {
        let app = test::init_service(
            App::new().service(get_meta_capabilities)
        ).await;
        
        let req = test::TestRequest::get()
            .uri("/api/meta/capabilities")
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        
        assert!(resp.status().is_success());
        
        let body: MetaCapabilitiesResponse = test::read_body_json(resp).await;
        
        // Verify structure
        assert!(!body.tenant_id.is_empty());
        assert!(!body.store_id.is_empty());
        assert!(!body.user_role.is_empty());
        
        // Verify cleanup capabilities exist
        assert!(body.capabilities.contains_key("cleanup.view"));
        assert!(body.capabilities.contains_key("cleanup.save_vendor_rules"));
        
        // Verify cleanup.view is ready and enabled
        let cleanup_view = body.capabilities.get("cleanup.view").unwrap();
        assert_eq!(cleanup_view.status, FeatureStatus::Ready);
        assert!(cleanup_view.enabled);
        
        // Verify cleanup.configure_detection is coming soon
        let configure = body.capabilities.get("cleanup.configure_detection").unwrap();
        assert_eq!(configure.status, FeatureStatus::ComingSoon);
        assert!(!configure.enabled);
        assert!(configure.reason.is_some());
    }
}
