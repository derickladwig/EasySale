// OCR Orchestrator Service
// Runs OCR across (variant × zone × profile) with concurrency caps and timeouts
// Requirements: 2.2 (Multi-Pass OCR)

use crate::models::artifact::{OcrArtifact, OcrWord, ZoneType};
use crate::models::ocr_profile::{OcrProfileConfig, OcrProfileDef};
use crate::services::ocr_engine::{OcrEngine, OcrProfile, OcrResult};
use crate::services::zone_cropper::{ZoneCropResult, ZoneCropper};
use crate::services::variant_generator::RankedVariant;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Instant;
use thiserror::Error;
use tokio::sync::Semaphore;

/// OCR orchestrator errors
#[derive(Debug, Error)]
pub enum OcrOrchestratorError {
    #[error("OCR engine error: {0}")]
    EngineError(String),
    
    #[error("Profile configuration error: {0}")]
    ProfileError(String),
    
    #[error("Timeout exceeded: {0}")]
    TimeoutError(String),
    
    #[error("Concurrency limit exceeded")]
    ConcurrencyError,
    
    #[error("No profiles available for zone type: {0:?}")]
    NoProfilesError(ZoneType),
    
    #[error("Storage error: {0}")]
    StorageError(String),
}

/// Configuration for OCR orchestrator
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrchestratorConfig {
    /// Maximum concurrent OCR processes
    pub max_concurrent: usize,
    
    /// Maximum timeout per zone in seconds
    pub max_timeout_per_zone_seconds: u64,
    
    /// Maximum passes per zone
    pub max_passes_per_zone: usize,
    
    /// Enable parallel execution
    pub enable_parallel: bool,
    
    /// Store all OCR artifacts (even low confidence)
    pub store_all_artifacts: bool,
}

impl Default for OrchestratorConfig {
    fn default() -> Self {
        Self {
            max_concurrent: 4,
            max_timeout_per_zone_seconds: 30,
            max_passes_per_zone: 5,
            enable_parallel: true,
            store_all_artifacts: true,
        }
    }
}

/// Result of OCR orchestration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrchestrationResult {
    /// All OCR artifacts created
    pub ocr_artifacts: Vec<OcrArtifact>,
    
    /// Total processing time in milliseconds
    pub total_processing_time_ms: u64,
    
    /// Number of zones processed
    pub zones_processed: usize,
    
    /// Number of OCR passes executed
    pub passes_executed: usize,
    
    /// Number of passes that failed
    pub passes_failed: usize,
    
    /// Number of passes that timed out
    pub passes_timed_out: usize,
}

/// OCR pass metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
struct OcrPass {
    zone_artifact_id: String,
    zone_type: ZoneType,
    variant_id: String,
    profile_name: String,
    pass_number: usize,
}

/// OCR orchestrator service
pub struct OcrOrchestrator<E: OcrEngine> {
    engine: Arc<E>,
    profile_config: OcrProfileConfig,
    config: OrchestratorConfig,
}

impl<E: OcrEngine> OcrOrchestrator<E> {
    /// Create a new OCR orchestrator
    pub fn new(
        engine: Arc<E>,
        profile_config: OcrProfileConfig,
        config: OrchestratorConfig,
    ) -> Self {
        Self {
            engine,
            profile_config,
            config,
        }
    }
    
    /// Process zones from crop results
    pub async fn process_zones(
        &self,
        crop_results: &[ZoneCropResult],
        vendor_id: Option<&str>,
    ) -> Result<OrchestrationResult, OcrOrchestratorError> {
        let start_time = Instant::now();
        
        let mut ocr_artifacts = Vec::new();
        let mut passes_executed = 0;
        let mut passes_failed = 0;
        let mut passes_timed_out = 0;
        let mut zones_processed = 0;
        
        // Create semaphore for concurrency control
        let semaphore = Arc::new(Semaphore::new(self.config.max_concurrent));
        
        // Process each crop result
        for crop_result in crop_results {
            for zone_artifact in &crop_result.zone_artifacts {
                zones_processed += 1;
                
                // Get profiles for this zone type
                let profiles = self.profile_config.get_profiles_for_zone_with_vendor(
                    &zone_artifact.zone_type,
                    vendor_id,
                );
                
                if profiles.is_empty() {
                    continue; // Skip zones with no profiles
                }
                
                // Limit number of passes per zone
                let profiles_to_use = profiles
                    .into_iter()
                    .take(self.config.max_passes_per_zone)
                    .collect::<Vec<_>>();
                
                // Execute OCR passes
                if self.config.enable_parallel {
                    // Parallel execution
                    let mut handles = Vec::new();
                    
                    for (pass_num, profile_def) in profiles_to_use.iter().enumerate() {
                        let engine = Arc::clone(&self.engine);
                        let zone_path = zone_artifact.image_path.clone();
                        let zone_id = zone_artifact.artifact_id.clone();
                        let zone_type = zone_artifact.zone_type.clone();
                        let profile = self.convert_profile_def(profile_def);
                        let semaphore = Arc::clone(&semaphore);
                        
                        let handle = tokio::spawn(async move {
                            let _permit = semaphore.acquire().await.ok()?;
                            
                            let result = engine.process(&zone_path, &profile).await;
                            
                            Some((zone_id, zone_type, result, pass_num + 1))
                        });
                        
                        handles.push(handle);
                    }
                    
                    // Collect results
                    for handle in handles {
                        passes_executed += 1;
                        
                        match handle.await {
                            Ok(Some((zone_id, zone_type, Ok(ocr_result), pass_num))) => {
                                let artifact = self.create_ocr_artifact(
                                    &zone_id,
                                    &zone_type,
                                    &ocr_result,
                                    pass_num,
                                );
                                ocr_artifacts.push(artifact);
                            }
                            Ok(Some((_, _, Err(_), _))) => {
                                passes_failed += 1;
                            }
                            Ok(None) => {
                                passes_timed_out += 1;
                            }
                            Err(_) => {
                                passes_failed += 1;
                            }
                        }
                    }
                } else {
                    // Sequential execution
                    for (pass_num, profile_def) in profiles_to_use.iter().enumerate() {
                        passes_executed += 1;
                        
                        let profile = self.convert_profile_def(profile_def);
                        
                        match self.engine.process(&zone_artifact.image_path, &profile).await {
                            Ok(ocr_result) => {
                                let artifact = self.create_ocr_artifact(
                                    &zone_artifact.artifact_id,
                                    &zone_artifact.zone_type,
                                    &ocr_result,
                                    pass_num + 1,
                                );
                                ocr_artifacts.push(artifact);
                            }
                            Err(_) => {
                                passes_failed += 1;
                            }
                        }
                    }
                }
            }
        }
        
        let total_processing_time_ms = start_time.elapsed().as_millis() as u64;
        
        Ok(OrchestrationResult {
            ocr_artifacts,
            total_processing_time_ms,
            zones_processed,
            passes_executed,
            passes_failed,
            passes_timed_out,
        })
    }
    
    /// Convert profile definition to OCR profile
    fn convert_profile_def(&self, profile_def: &OcrProfileDef) -> OcrProfile {
        OcrProfile {
            name: profile_def.name.clone(),
            psm: profile_def.psm,
            oem: profile_def.oem,
            dpi: profile_def.dpi,
            language: profile_def.language.clone(),
            whitelist: profile_def.whitelist.clone(),
            blacklist: profile_def.blacklist.clone(),
            timeout_seconds: profile_def.timeout_seconds,
        }
    }
    
    /// Create OCR artifact from result
    fn create_ocr_artifact(
        &self,
        zone_id: &str,
        _zone_type: &ZoneType,
        ocr_result: &OcrResult,
        _pass_number: usize,
    ) -> OcrArtifact {
        OcrArtifact {
            artifact_id: uuid::Uuid::new_v4().to_string(),
            zone_id: zone_id.to_string(),
            profile: ocr_result.profile_used.clone(),
            engine: ocr_result.engine_name.clone(),
            text: ocr_result.text.clone(),
            avg_confidence: ocr_result.avg_confidence,
            words: ocr_result.words.clone(),
            processing_time_ms: ocr_result.processing_time_ms,
        }
    }
    
    /// Get statistics about orchestration
    pub fn get_stats(&self, result: &OrchestrationResult) -> OrchestratorStats {
        let success_rate = if result.passes_executed > 0 {
            ((result.passes_executed - result.passes_failed - result.passes_timed_out) as f64
                / result.passes_executed as f64)
                * 100.0
        } else {
            0.0
        };
        
        let avg_time_per_zone = if result.zones_processed > 0 {
            result.total_processing_time_ms / result.zones_processed as u64
        } else {
            0
        };
        
        OrchestratorStats {
            success_rate,
            avg_time_per_zone_ms: avg_time_per_zone,
            total_artifacts: result.ocr_artifacts.len(),
        }
    }
}

/// Orchestrator statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrchestratorStats {
    pub success_rate: f64,
    pub avg_time_per_zone_ms: u64,
    pub total_artifacts: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::artifact::{BoundingBox, ZoneArtifact, ZoneType};
    use crate::services::ocr_engine::{OcrEngine, OcrError, OcrProfile, OcrResult};
    use crate::services::zone_cropper::ZoneCropResult;
    use async_trait::async_trait;
    
    // Mock OCR engine for testing
    struct MockOcrEngine {
        should_fail: bool,
    }
    
    #[async_trait]
    impl OcrEngine for MockOcrEngine {
        async fn process(&self, _image_path: &str, profile: &OcrProfile) -> Result<OcrResult, OcrError> {
            if self.should_fail {
                return Err(OcrError::ProcessingFailed("Mock failure".to_string()));
            }
            
            Ok(OcrResult {
                text: "Mock OCR text".to_string(),
                avg_confidence: 0.95,
                words: vec![],
                processing_time_ms: 100,
                profile_used: profile.name.clone(),
                engine_name: "mock".to_string(),
            })
        }
        
        fn engine_name(&self) -> &str {
            "mock"
        }
        
        async fn is_available(&self) -> bool {
            true
        }
    }
    
    fn create_test_profile_config() -> OcrProfileConfig {
        let yaml = r#"
profiles:
  - name: test-profile
    psm: 3
    oem: 3
    dpi: 300
    language: eng
    timeout_seconds: 30
    zone_types:
      - HeaderFields

zone_defaults:
  HeaderFields:
    - test-profile
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
        
        OcrProfileConfig::load_from_yaml(yaml).unwrap()
    }
    
    fn create_test_crop_result() -> ZoneCropResult {
        ZoneCropResult {
            zone_artifacts: vec![
                ZoneArtifact {
                    artifact_id: "zone-1".to_string(),
                    variant_id: "variant-1".to_string(),
                    zone_type: ZoneType::HeaderFields,
                    bbox: BoundingBox::new(0, 0, 100, 100),
                    confidence: 0.9,
                    image_path: "/path/to/zone1.png".to_string(),
                    masks: vec![],
                },
            ],
            coordinate_mappings: vec![],
            processing_time_ms: 100,
            zones_cropped: 1,
            masks_applied: 0,
        }
    }
    
    #[tokio::test]
    async fn test_orchestrator_creation() {
        let engine = Arc::new(MockOcrEngine { should_fail: false });
        let profile_config = create_test_profile_config();
        let config = OrchestratorConfig::default();
        
        let orchestrator = OcrOrchestrator::new(engine, profile_config, config);
        assert_eq!(orchestrator.config.max_concurrent, 4);
    }
    
    #[tokio::test]
    async fn test_process_zones_success() {
        let engine = Arc::new(MockOcrEngine { should_fail: false });
        let profile_config = create_test_profile_config();
        let config = OrchestratorConfig::default();
        
        let orchestrator = OcrOrchestrator::new(engine, profile_config, config);
        let crop_results = vec![create_test_crop_result()];
        
        let result = orchestrator.process_zones(&crop_results, None).await.unwrap();
        
        assert_eq!(result.zones_processed, 1);
        assert_eq!(result.passes_executed, 1);
        assert_eq!(result.passes_failed, 0);
        assert_eq!(result.ocr_artifacts.len(), 1);
    }
    
    #[tokio::test]
    async fn test_process_zones_with_failure() {
        let engine = Arc::new(MockOcrEngine { should_fail: true });
        let profile_config = create_test_profile_config();
        let config = OrchestratorConfig::default();
        
        let orchestrator = OcrOrchestrator::new(engine, profile_config, config);
        let crop_results = vec![create_test_crop_result()];
        
        let result = orchestrator.process_zones(&crop_results, None).await.unwrap();
        
        assert_eq!(result.zones_processed, 1);
        assert_eq!(result.passes_executed, 1);
        assert_eq!(result.passes_failed, 1);
        assert_eq!(result.ocr_artifacts.len(), 0);
    }
    
    #[tokio::test]
    async fn test_get_stats() {
        let engine = Arc::new(MockOcrEngine { should_fail: false });
        let profile_config = create_test_profile_config();
        let config = OrchestratorConfig::default();
        
        let orchestrator = OcrOrchestrator::new(engine, profile_config, config);
        let crop_results = vec![create_test_crop_result()];
        
        let result = orchestrator.process_zones(&crop_results, None).await.unwrap();
        let stats = orchestrator.get_stats(&result);
        
        assert_eq!(stats.success_rate, 100.0);
        assert_eq!(stats.total_artifacts, 1);
        assert!(stats.avg_time_per_zone_ms > 0);
    }
    
    #[test]
    fn test_orchestrator_config_default() {
        let config = OrchestratorConfig::default();
        
        assert_eq!(config.max_concurrent, 4);
        assert_eq!(config.max_timeout_per_zone_seconds, 30);
        assert_eq!(config.max_passes_per_zone, 5);
        assert!(config.enable_parallel);
        assert!(config.store_all_artifacts);
    }
}
