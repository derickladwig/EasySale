// OCR Profile Model
// Defines OCR profile configuration with YAML loading support
// Requirements: 2.1 (OCR Profiles)

use crate::models::artifact::ZoneType;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use thiserror::Error;

/// OCR profile configuration errors
#[derive(Debug, Error)]
pub enum OcrProfileError {
    #[error("Failed to load profile configuration: {0}")]
    LoadError(String),
    
    #[error("Failed to parse YAML: {0}")]
    ParseError(String),
    
    #[error("Invalid profile configuration: {0}")]
    ValidationError(String),
    
    #[error("Profile not found: {0}")]
    ProfileNotFound(String),
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

/// OCR profile definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrProfileDef {
    pub name: String,
    pub psm: u8,
    pub oem: u8,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dpi: Option<u32>,
    pub language: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub whitelist: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub blacklist: Option<String>,
    pub timeout_seconds: u64,
    pub zone_types: Vec<ZoneType>,
}

/// Zone default profiles mapping
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZoneDefaults {
    #[serde(rename = "HeaderFields")]
    pub header_fields: Vec<String>,
    
    #[serde(rename = "TotalsBox")]
    pub totals_box: Vec<String>,
    
    #[serde(rename = "LineItemsTable")]
    pub line_items_table: Vec<String>,
    
    #[serde(rename = "FooterNotes")]
    pub footer_notes: Vec<String>,
    
    #[serde(rename = "BarcodeArea")]
    pub barcode_area: Vec<String>,
    
    #[serde(rename = "LogoArea")]
    pub logo_area: Vec<String>,
}

impl ZoneDefaults {
    /// Get default profiles for a zone type
    pub fn get_profiles_for_zone(&self, zone_type: &ZoneType) -> Vec<String> {
        match zone_type {
            ZoneType::HeaderFields => self.header_fields.clone(),
            ZoneType::TotalsBox => self.totals_box.clone(),
            ZoneType::LineItemsTable => self.line_items_table.clone(),
            ZoneType::FooterNotes => self.footer_notes.clone(),
            ZoneType::BarcodeArea => self.barcode_area.clone(),
            ZoneType::LogoArea => self.logo_area.clone(),
        }
    }
}

/// Global OCR settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrSettings {
    pub max_concurrent: usize,
    pub default_timeout_seconds: u64,
    pub retry_on_failure: bool,
    pub max_retries: usize,
    pub min_confidence_threshold: f64,
    pub track_word_confidence: bool,
    pub cache_results: bool,
    pub cache_ttl_seconds: u64,
}

impl Default for OcrSettings {
    fn default() -> Self {
        Self {
            max_concurrent: 4,
            default_timeout_seconds: 30,
            retry_on_failure: true,
            max_retries: 2,
            min_confidence_threshold: 0.5,
            track_word_confidence: true,
            cache_results: true,
            cache_ttl_seconds: 3600,
        }
    }
}

/// Complete OCR profile configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrProfileConfig {
    pub profiles: Vec<OcrProfileDef>,
    pub zone_defaults: ZoneDefaults,
    pub settings: OcrSettings,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vendor_overrides: Option<HashMap<String, HashMap<String, Vec<String>>>>,
}

impl OcrProfileConfig {
    /// Load OCR profile configuration from YAML file
    pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Self, OcrProfileError> {
        let content = fs::read_to_string(path)
            .map_err(|e| OcrProfileError::LoadError(e.to_string()))?;
        
        Self::load_from_yaml(&content)
    }
    
    /// Load OCR profile configuration from YAML string
    pub fn load_from_yaml(yaml: &str) -> Result<Self, OcrProfileError> {
        let config: OcrProfileConfig = serde_yaml::from_str(yaml)
            .map_err(|e| OcrProfileError::ParseError(e.to_string()))?;
        
        config.validate()?;
        
        Ok(config)
    }
    
    /// Validate configuration
    fn validate(&self) -> Result<(), OcrProfileError> {
        // Check that all profiles have unique names
        let mut names = std::collections::HashSet::new();
        for profile in &self.profiles {
            if !names.insert(&profile.name) {
                return Err(OcrProfileError::ValidationError(
                    format!("Duplicate profile name: {}", profile.name)
                ));
            }
        }
        
        // Validate PSM values (0-13 for Tesseract)
        for profile in &self.profiles {
            if profile.psm > 13 {
                return Err(OcrProfileError::ValidationError(
                    format!("Invalid PSM value {} in profile {}", profile.psm, profile.name)
                ));
            }
        }
        
        // Validate OEM values (0-3 for Tesseract)
        for profile in &self.profiles {
            if profile.oem > 3 {
                return Err(OcrProfileError::ValidationError(
                    format!("Invalid OEM value {} in profile {}", profile.oem, profile.name)
                ));
            }
        }
        
        // Validate zone defaults reference existing profiles
        let profile_names: std::collections::HashSet<_> = 
            self.profiles.iter().map(|p| &p.name).collect();
        
        for zone_type in &[
            ZoneType::HeaderFields,
            ZoneType::TotalsBox,
            ZoneType::LineItemsTable,
            ZoneType::FooterNotes,
            ZoneType::BarcodeArea,
            ZoneType::LogoArea,
        ] {
            let profiles = self.zone_defaults.get_profiles_for_zone(zone_type);
            for profile_name in profiles {
                if !profile_names.contains(&profile_name) {
                    return Err(OcrProfileError::ValidationError(
                        format!("Zone default references unknown profile: {}", profile_name)
                    ));
                }
            }
        }
        
        Ok(())
    }
    
    /// Get profile by name
    pub fn get_profile(&self, name: &str) -> Result<&OcrProfileDef, OcrProfileError> {
        self.profiles
            .iter()
            .find(|p| p.name == name)
            .ok_or_else(|| OcrProfileError::ProfileNotFound(name.to_string()))
    }
    
    /// Get profiles for a zone type
    pub fn get_profiles_for_zone(&self, zone_type: &ZoneType) -> Vec<&OcrProfileDef> {
        let profile_names = self.zone_defaults.get_profiles_for_zone(zone_type);
        
        profile_names
            .iter()
            .filter_map(|name| self.get_profile(name).ok())
            .collect()
    }
    
    /// Get profiles for a zone type with vendor override
    pub fn get_profiles_for_zone_with_vendor(
        &self,
        zone_type: &ZoneType,
        vendor_id: Option<&str>,
    ) -> Vec<&OcrProfileDef> {
        // Check for vendor override
        if let Some(vid) = vendor_id {
            if let Some(overrides) = &self.vendor_overrides {
                if let Some(vendor_zones) = overrides.get(vid) {
                    let zone_key = format!("{:?}", zone_type);
                    if let Some(profile_names) = vendor_zones.get(&zone_key) {
                        return profile_names
                            .iter()
                            .filter_map(|name| self.get_profile(name).ok())
                            .collect();
                    }
                }
            }
        }
        
        // Fall back to default
        self.get_profiles_for_zone(zone_type)
    }
    
    /// Get all profile names
    pub fn get_profile_names(&self) -> Vec<String> {
        self.profiles.iter().map(|p| p.name.clone()).collect()
    }
    
    /// Get profiles by zone type
    pub fn get_profiles_by_zone_type(&self, zone_type: &ZoneType) -> Vec<&OcrProfileDef> {
        self.profiles
            .iter()
            .filter(|p| p.zone_types.contains(zone_type))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn create_test_config() -> OcrProfileConfig {
        let yaml = r#"
profiles:
  - name: test-profile-1
    psm: 3
    oem: 3
    dpi: 300
    language: eng
    timeout_seconds: 30
    zone_types:
      - HeaderFields
      - FooterNotes
  
  - name: test-profile-2
    psm: 7
    oem: 3
    language: eng
    whitelist: "0123456789.$,"
    timeout_seconds: 15
    zone_types:
      - TotalsBox

zone_defaults:
  HeaderFields:
    - test-profile-1
  TotalsBox:
    - test-profile-2
  LineItemsTable:
    - test-profile-1
  FooterNotes:
    - test-profile-1
  BarcodeArea: []
  LogoArea: []

settings:
  max_concurrent: 4
  default_timeout_seconds: 30
  retry_on_failure: true
  max_retries: 2
  min_confidence_threshold: 0.5
  track_word_confidence: true
  cache_results: true
  cache_ttl_seconds: 3600
"#;
        
        OcrProfileConfig::load_from_yaml(yaml).unwrap()
    }
    
    #[test]
    fn test_load_config_from_yaml() {
        let config = create_test_config();
        
        assert_eq!(config.profiles.len(), 2);
        assert_eq!(config.profiles[0].name, "test-profile-1");
        assert_eq!(config.profiles[1].name, "test-profile-2");
    }
    
    #[test]
    fn test_get_profile_by_name() {
        let config = create_test_config();
        
        let profile = config.get_profile("test-profile-1").unwrap();
        assert_eq!(profile.name, "test-profile-1");
        assert_eq!(profile.psm, 3);
        assert_eq!(profile.oem, 3);
        
        let result = config.get_profile("nonexistent");
        assert!(result.is_err());
    }
    
    #[test]
    fn test_get_profiles_for_zone() {
        let config = create_test_config();
        
        let profiles = config.get_profiles_for_zone(&ZoneType::HeaderFields);
        assert_eq!(profiles.len(), 1);
        assert_eq!(profiles[0].name, "test-profile-1");
        
        let profiles = config.get_profiles_for_zone(&ZoneType::TotalsBox);
        assert_eq!(profiles.len(), 1);
        assert_eq!(profiles[0].name, "test-profile-2");
    }
    
    #[test]
    fn test_get_profiles_by_zone_type() {
        let config = create_test_config();
        
        let profiles = config.get_profiles_by_zone_type(&ZoneType::HeaderFields);
        assert_eq!(profiles.len(), 1);
        assert_eq!(profiles[0].name, "test-profile-1");
    }
    
    #[test]
    fn test_get_profile_names() {
        let config = create_test_config();
        
        let names = config.get_profile_names();
        assert_eq!(names.len(), 2);
        assert!(names.contains(&"test-profile-1".to_string()));
        assert!(names.contains(&"test-profile-2".to_string()));
    }
    
    #[test]
    fn test_validate_duplicate_names() {
        let yaml = r#"
profiles:
  - name: duplicate
    psm: 3
    oem: 3
    language: eng
    timeout_seconds: 30
    zone_types: []
  - name: duplicate
    psm: 7
    oem: 3
    language: eng
    timeout_seconds: 15
    zone_types: []

zone_defaults:
  HeaderFields: []
  TotalsBox: []
  LineItemsTable: []
  FooterNotes: []
  BarcodeArea: []
  LogoArea: []

settings:
  max_concurrent: 4
  default_timeout_seconds: 30
  retry_on_failure: true
  max_retries: 2
  min_confidence_threshold: 0.5
  track_word_confidence: true
  cache_results: true
  cache_ttl_seconds: 3600
"#;
        
        let result = OcrProfileConfig::load_from_yaml(yaml);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Duplicate profile name"));
    }
    
    #[test]
    fn test_validate_invalid_psm() {
        let yaml = r#"
profiles:
  - name: invalid-psm
    psm: 99
    oem: 3
    language: eng
    timeout_seconds: 30
    zone_types: []

zone_defaults:
  HeaderFields: []
  TotalsBox: []
  LineItemsTable: []
  FooterNotes: []
  BarcodeArea: []
  LogoArea: []

settings:
  max_concurrent: 4
  default_timeout_seconds: 30
  retry_on_failure: true
  max_retries: 2
  min_confidence_threshold: 0.5
  track_word_confidence: true
  cache_results: true
  cache_ttl_seconds: 3600
"#;
        
        let result = OcrProfileConfig::load_from_yaml(yaml);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid PSM value"));
    }
    
    #[test]
    fn test_validate_invalid_oem() {
        let yaml = r#"
profiles:
  - name: invalid-oem
    psm: 3
    oem: 99
    language: eng
    timeout_seconds: 30
    zone_types: []

zone_defaults:
  HeaderFields: []
  TotalsBox: []
  LineItemsTable: []
  FooterNotes: []
  BarcodeArea: []
  LogoArea: []

settings:
  max_concurrent: 4
  default_timeout_seconds: 30
  retry_on_failure: true
  max_retries: 2
  min_confidence_threshold: 0.5
  track_word_confidence: true
  cache_results: true
  cache_ttl_seconds: 3600
"#;
        
        let result = OcrProfileConfig::load_from_yaml(yaml);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid OEM value"));
    }
    
    #[test]
    fn test_validate_unknown_profile_reference() {
        let yaml = r#"
profiles:
  - name: test-profile
    psm: 3
    oem: 3
    language: eng
    timeout_seconds: 30
    zone_types: []

zone_defaults:
  HeaderFields:
    - nonexistent-profile
  TotalsBox: []
  LineItemsTable: []
  FooterNotes: []
  BarcodeArea: []
  LogoArea: []

settings:
  max_concurrent: 4
  default_timeout_seconds: 30
  retry_on_failure: true
  max_retries: 2
  min_confidence_threshold: 0.5
  track_word_confidence: true
  cache_results: true
  cache_ttl_seconds: 3600
"#;
        
        let result = OcrProfileConfig::load_from_yaml(yaml);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("unknown profile"));
    }
    
    #[test]
    fn test_ocr_settings_default() {
        let settings = OcrSettings::default();
        
        assert_eq!(settings.max_concurrent, 4);
        assert_eq!(settings.default_timeout_seconds, 30);
        assert!(settings.retry_on_failure);
        assert_eq!(settings.max_retries, 2);
        assert_eq!(settings.min_confidence_threshold, 0.5);
        assert!(settings.track_word_confidence);
        assert!(settings.cache_results);
        assert_eq!(settings.cache_ttl_seconds, 3600);
    }
    
    #[test]
    fn test_zone_defaults_get_profiles() {
        let config = create_test_config();
        
        let profiles = config.zone_defaults.get_profiles_for_zone(&ZoneType::HeaderFields);
        assert_eq!(profiles.len(), 1);
        assert_eq!(profiles[0], "test-profile-1");
        
        let profiles = config.zone_defaults.get_profiles_for_zone(&ZoneType::BarcodeArea);
        assert_eq!(profiles.len(), 0);
    }
}
