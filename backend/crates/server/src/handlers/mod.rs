// HTTP request handlers
// This module contains all API endpoint handlers
//
// Feature-gated modules:
// - document-processing: vendor_bill, vendor, vendor_operations
// - ocr: ocr_ingest, ocr_operations, reocr, review_cases
// - document-cleanup: cleanup
// - export: export, performance_export, reporting (full)

// ============================================================================
// CORE HANDLERS (always included)
// ============================================================================

pub mod alerts;
pub mod audit;
pub mod auth;
pub mod backup;
pub mod barcodes;
pub mod cache;
pub mod capabilities;
pub mod commission;
pub mod config;
pub mod conflicts;
pub mod credit;
pub mod customer;
pub mod customers;
pub mod data_management;

// Integration handlers (feature-gated: integrations or full)
#[cfg(any(feature = "integrations", feature = "full"))]
pub mod data_manager;

// Payment handlers (feature-gated: payments or full)
#[cfg(any(feature = "payments", feature = "full"))]
pub mod payments;
pub mod feature_flags;
pub mod fresh_install;
pub mod files;
pub mod gift_card;
pub mod google_drive_oauth;
pub mod health;
pub mod health_check;
pub mod integrations;
pub mod inventory;
pub mod layaway;
pub mod loyalty;
pub mod mappings;
pub mod product;
pub mod product_advanced;
pub mod products;
pub mod promotion;
pub mod quickbooks;
pub mod quickbooks_crud;
pub mod quickbooks_transform;
pub mod quickbooks_invoice;
pub mod quickbooks_sales;
pub mod quickbooks_vendor;
pub mod quickbooks_bill;
pub mod quickbooks_refund;
pub mod reporting;
pub mod sales;
pub mod search_operations;
pub mod session_management;
pub mod settings;
pub mod settings_handlers;
pub mod settings_crud;
pub mod setup;
pub mod stats;
pub mod stores;
pub mod sync;
pub mod sync_config;
pub mod sync_operations;
pub mod sync_history;
pub mod units;
pub mod unit_conversion;
pub mod user_handlers;
pub mod users;
pub mod webhooks;
pub mod woocommerce;
pub mod woocommerce_bulk;
pub mod woocommerce_variations;
pub mod woocommerce_write;
pub mod work_order;
pub mod sync_direction;
pub mod credentials;
pub mod audit_operations;
pub mod backup_operations;
pub mod scheduler_operations;
pub mod retention_operations;
pub mod settings_resolution;
pub mod id_mapping;
pub mod conflict_operations;
pub mod file_operations;
pub mod receiving_operations;
pub mod tenant_operations;
pub mod supabase_operations;
pub mod schema_operations;
pub mod theme;
pub mod network;
pub mod oauth_management;
pub mod branding_assets;
pub mod zones;

// ============================================================================
// NOTIFICATION HANDLERS (feature-gated: notifications)
// ============================================================================

#[cfg(feature = "notifications")]
pub mod notifications;

// ============================================================================
// DOCUMENT PROCESSING HANDLERS (feature-gated: document-processing)
// ============================================================================

#[cfg(feature = "document-processing")]
pub mod vendor;

// ============================================================================
// VENDOR BILL HANDLERS (feature-gated: ocr - requires OCR services)
// ============================================================================

#[cfg(feature = "ocr")]
pub mod vendor_bill;
#[cfg(feature = "ocr")]
pub mod vendor_operations;

// ============================================================================
// OCR HANDLERS (feature-gated: ocr)
// ============================================================================

#[cfg(feature = "ocr")]
pub mod ocr_ingest;
#[cfg(feature = "ocr")]
pub mod ocr_operations;
#[cfg(feature = "ocr")]
pub mod reocr;
#[cfg(feature = "ocr")]
pub mod review_cases;

// ============================================================================
// DOCUMENT CLEANUP HANDLERS (feature-gated: document-cleanup)
// ============================================================================

#[cfg(feature = "document-cleanup")]
pub mod cleanup;
#[cfg(feature = "document-cleanup")]
#[cfg(test)]
mod cleanup_contract_tests;

// ============================================================================
// EXPORT HANDLERS (feature-gated: export)
// ============================================================================

#[cfg(feature = "export")]
pub mod export;
#[cfg(feature = "export")]
pub mod performance_export;
