// Business logic services
// This module contains services that implement business logic
//
// Feature-gated modules:
// - document-processing: PDF/image handling (document_ingest_service, bill_ingest_service)
// - ocr: OCR and image enhancement (image_preprocessing, orientation_service, zone_*, ocr_*, etc.)
// - document-cleanup: Document cleanup engine (cleanup_engine, mask_engine)

// ============================================================================
// CORE SERVICES (always included)
// ============================================================================

pub mod alert_service;
pub mod artifact_storage;
pub mod attribute_validator;
pub mod audit_logger;
pub mod backup_service;
#[cfg(test)]
pub mod backup_service_pbt;
pub mod barcode_service;
pub mod bulk_operation_safety;
pub mod conflict_resolver;
pub mod credential_service;
pub mod dry_run_executor;
pub mod file_service;
pub mod google_drive_service;
pub mod health_check;
pub mod id_mapper;
pub mod offline_credit_checker;
pub mod password_service;
pub mod product_lookup_service;
pub mod product_service;
pub mod receiving_service;
pub mod restore_service;
pub mod retention_service;
pub mod scheduler_service;
pub mod search_service;
pub mod settings_resolution;
pub mod settings_scope_enforcement;
pub mod sync_direction_control;
pub mod sync_orchestrator;
pub mod sync_scheduler;
pub mod sync_logger;
pub mod sync_queue_processor;
#[cfg(feature = "notifications")]
pub mod sync_notifier;
pub mod tenant_resolver;
pub mod unit_conversion_service;
pub mod variant_service;
pub mod branding_asset_service;
pub mod invoice_service;
pub mod tax_service;
pub mod discount_service;
pub mod estimate_service;
pub mod pdf_service;
pub mod transaction_service;
pub mod email_service;
pub mod notification_trigger_service;
pub mod email_queue_processor;
pub mod threat_monitor;
pub mod encryption_service;
pub mod rate_limit_service;

#[cfg(feature = "document-processing")]
pub mod vendor_service;

// ============================================================================
// DOCUMENT PROCESSING SERVICES (feature-gated: document-processing)
// ============================================================================

#[cfg(feature = "document-processing")]
pub mod document_ingest_service;

// ============================================================================
// BILL INGEST SERVICE (feature-gated: ocr - requires OCR services)
// ============================================================================

#[cfg(feature = "ocr")]
pub mod bill_ingest_service;

// ============================================================================
// OCR SERVICES (feature-gated: ocr)
// ============================================================================

#[cfg(feature = "ocr")]
pub mod image_preprocessing;
#[cfg(feature = "ocr")]
pub mod orientation_service;
#[cfg(feature = "ocr")]
pub mod variant_generator;
#[cfg(feature = "ocr")]
pub mod zone_detector_service;
#[cfg(feature = "ocr")]
pub mod zone_cropper;
#[cfg(feature = "ocr")]
pub mod ocr_engine;
#[cfg(feature = "ocr")]
pub mod ocr_service;
#[cfg(feature = "ocr")]
pub mod ocr_job_processor;
#[cfg(feature = "ocr")]
pub mod multi_pass_ocr;
#[cfg(feature = "ocr")]
pub mod parsing_service;
#[cfg(feature = "ocr")]
pub mod confidence_calibrator;
#[cfg(feature = "ocr")]
pub mod field_resolver;
#[cfg(feature = "ocr")]
pub mod early_stop_checker;
#[cfg(feature = "ocr")]
pub mod candidate_generator;
#[cfg(feature = "ocr")]
pub mod matching_engine;
#[cfg(feature = "ocr")]
pub mod validation_engine;

// Temporarily commented out due to compilation errors - needs fixing
// #[cfg(feature = "ocr")]
// pub mod ocr_orchestrator;
// #[cfg(feature = "ocr")]
// pub mod validation_rule_engine;
// #[cfg(feature = "ocr")]
// pub mod review_case_service;
// #[cfg(feature = "ocr")]
// pub mod review_queue_service;
// #[cfg(feature = "ocr")]
// pub mod review_session_service;
// #[cfg(feature = "ocr")]
// pub mod approval_gate_service;

// ============================================================================
// DOCUMENT CLEANUP SERVICES (feature-gated: document-cleanup)
// ============================================================================

#[cfg(feature = "document-cleanup")]
pub mod cleanup_engine;
#[cfg(feature = "document-cleanup")]
pub mod mask_engine;

// ============================================================================
// ACCOUNTING INTEGRATION SERVICES (feature-gated: export)
// ============================================================================

#[cfg(feature = "export")]
pub mod ap_integration_service;
#[cfg(feature = "export")]
pub mod accounting_integration_service;
#[cfg(feature = "export")]
pub mod inventory_integration_service;

// ============================================================================
// RE-EXPORTS: CORE SERVICES (always available)
// ============================================================================

pub use alert_service::AlertService;
#[allow(unused_imports)]
pub use artifact_storage::{ArtifactStorage, StorageConfig, StorageError};
pub use audit_logger::AuditLogger;
pub use backup_service::BackupService;
pub use barcode_service::BarcodeService;
pub use conflict_resolver::ConflictResolver;
pub use credential_service::CredentialService;
pub use file_service::FileService;
pub use google_drive_service::GoogleDriveService;
pub use health_check::HealthCheckService;
pub use offline_credit_checker::OfflineCreditChecker;
#[allow(unused_imports)]
pub use password_service::{PasswordService, PasswordError};
#[allow(unused_imports)]
pub use product_lookup_service::{ProductLookupService, ProductLookupResult};
pub use product_service::ProductService;
pub use receiving_service::ReceivingService;
pub use restore_service::RestoreService;
pub use retention_service::RetentionService;
pub use scheduler_service::SchedulerService;
pub use search_service::SearchService;
#[allow(unused_imports)]
pub use settings_scope_enforcement::SettingsScopeEnforcement;
pub use sync_direction_control::SyncDirectionControl;
pub use sync_orchestrator::SyncOrchestrator;
pub use sync_scheduler::SyncScheduler;
pub use tenant_resolver::TenantResolver;
pub use unit_conversion_service::UnitConversionService;
pub use variant_service::VariantService;
#[allow(unused_imports)]
pub use branding_asset_service::{BrandingAssetService, AssetType, CropRegion, BrandingAsset, UploadResult, BrandingAssetError};
pub use tax_service::TaxService;
pub use discount_service::DiscountService;
pub use transaction_service::TransactionService;
pub use email_service::{EmailService, EmailProvider, EmailMessage, EmailTemplate, NotificationPreferences, NotificationPreferencesUpdate};
pub use notification_trigger_service::NotificationTriggerService;
pub use email_queue_processor::{EmailQueueProcessor, QueueStats};
pub use threat_monitor::{
    ThreatMonitor, ThreatMonitorConfig, ThreatEvent, ThreatEventType, 
    Severity, BlockInfo, SessionInfo, SecurityAlert, DashboardStats, EventFilters,
    create_threat_monitor, create_threat_monitor_with_config,
};
pub use encryption_service::{
    EncryptionService, EncryptionError, 
    create_encryption_service, create_encryption_service_with_key, try_create_encryption_service,
    SENSITIVE_SETTINGS_FIELDS, SENSITIVE_INTEGRATION_FIELDS,
};
pub use rate_limit_service::{
    RateLimitTracker, RateLimitConfig, RateLimitResult, RateLimitStats, ViolationInfo, LimitType,
    create_rate_limit_tracker, create_rate_limit_tracker_with_config,
    classify_endpoint, is_exempt_endpoint,
};
#[cfg(feature = "document-processing")]
pub use vendor_service::VendorService;

// ============================================================================
// RE-EXPORTS: NOTIFICATION SERVICES (feature-gated: notifications)
// ============================================================================

#[cfg(feature = "notifications")]
#[allow(unused_imports)]
pub use sync_notifier::{
    SyncNotifier, NotificationConfig, NotificationChannelConfig, NotificationFilters,
    NotificationEvent, NotificationSeverity, NotificationType,
};

// ============================================================================
// RE-EXPORTS: DOCUMENT PROCESSING (feature-gated)
// ============================================================================

#[cfg(feature = "document-processing")]
#[allow(unused_imports)]
pub use document_ingest_service::{DocumentIngestService, IngestConfig, IngestError, IngestResult};
#[cfg(feature = "ocr")]
pub use bill_ingest_service::BillIngestService;

// ============================================================================
// RE-EXPORTS: OCR SERVICES (feature-gated)
// ============================================================================

#[cfg(feature = "ocr")]
#[allow(unused_imports)]
pub use orientation_service::{OrientationService, OrientationConfig, OrientationResult, OrientationError, RotationEvidence, RotationScore};
#[cfg(feature = "ocr")]
#[allow(unused_imports)]
pub use variant_generator::{VariantGenerator, VariantConfig, VariantGenerationResult, RankedVariant, ScoreBreakdown, VariantError};
#[cfg(feature = "ocr")]
#[allow(unused_imports)]
pub use zone_detector_service::{ZoneDetectorService, ZoneDetectorConfig, ZoneDetectorError, DetectedZone, ZoneDetectionResult, ZoneMap};
#[cfg(feature = "ocr")]
#[allow(unused_imports)]
pub use zone_cropper::{ZoneCropper, ZoneCropperConfig, ZoneCropperError, ZoneCropResult, CoordinateMapping};
#[cfg(feature = "ocr")]
#[allow(unused_imports)]
pub use ocr_engine::{OcrEngine, OcrProfile, OcrResult, OcrError, TesseractEngine};
#[cfg(feature = "ocr")]
#[allow(unused_imports)]
pub use ocr_job_processor::OcrJobProcessor;
#[cfg(feature = "ocr")]
#[allow(unused_imports)]
pub use candidate_generator::{CandidateGenerator, FieldCandidate, CandidateGenerationResult, CandidateGeneratorError};
#[cfg(feature = "ocr")]
#[allow(unused_imports)]
pub use confidence_calibrator::{ConfidenceCalibrator, CalibrationDataPoint, CalibrationStats, ConfidenceCalibratorError};
#[cfg(feature = "ocr")]
#[allow(unused_imports)]
pub use early_stop_checker::{EarlyStopChecker, ProcessingBudget, EarlyStopDecision, BudgetStatus};
#[cfg(feature = "ocr")]
#[allow(unused_imports)]
pub use field_resolver::{FieldResolver, FieldValue, ResolutionResult, FieldResolverError, CrossFieldValidation, ValidationType, Contradiction, ContradictionSeverity};
#[cfg(feature = "ocr")]
#[allow(unused_imports)]
pub use validation_engine::ValidationEngineService;

// ============================================================================
// RE-EXPORTS: DOCUMENT CLEANUP (feature-gated)
// ============================================================================

#[cfg(feature = "document-cleanup")]
#[allow(unused_imports)]
pub use cleanup_engine::{CleanupEngine, CleanupEngineConfig, CleanupEngineError, CleanupShield, ShieldType, ApplyMode, CleanupDetectionResult};
// Note: mask_engine types are deprecated - use cleanup_engine types instead

// ============================================================================
// RE-EXPORTS: ACCOUNTING INTEGRATION (feature-gated)
// ============================================================================

#[cfg(feature = "export")]
#[allow(unused_imports)]
pub use ap_integration_service::{ApIntegrationService, InvoiceData, BillResult, ApError};
#[cfg(feature = "export")]
#[allow(unused_imports)]
pub use accounting_integration_service::{AccountingIntegrationService, JournalEntryData, JournalLine, JournalResult, AccountingError};
#[cfg(feature = "export")]
#[allow(unused_imports)]
pub use inventory_integration_service::{InventoryIntegrationService, LineItemData, IntegrationResult, IntegrationError};
