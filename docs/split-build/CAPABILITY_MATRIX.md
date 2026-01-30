# EasySale Capability Matrix — LITE vs FULL Build Analysis

**Generated:** 2026-01-25  
**Agent:** D — Runtime Capabilities Matrix & Bloat Audit

## Executive Summary

This document maps all EasySale capabilities to their backend modules, feature flags, frontend routes, and database tables. Each capability is classified as:
- **LITE**: Essential for minimal POS operation
- **FULL**: Advanced features for enterprise deployments
- **BOTH**: Required in both builds

---

## 1. Core POS Capabilities

| Capability | Backend Module | Feature Flag | Frontend Route | DB Tables | Build |
|------------|----------------|--------------|----------------|-----------|-------|
| **Authentication** | `handlers/auth.rs` | - | `/login` | `users`, `sessions` | BOTH |
| **Product Lookup** | `handlers/product.rs` | - | `/lookup` | `products` | BOTH |
| **Barcode Scanning** | `handlers/barcodes.rs` | - | `/sell` | `products` | BOTH |
| **Sales Transactions** | `handlers/stats.rs` | - | `/sell` | `sales_transactions` | BOTH |
| **Customer Management** | `handlers/customer.rs` | - | `/customers` | `customers` | BOTH |
| **Basic Inventory** | `handlers/inventory.rs` | - | `/warehouse` | `products` | BOTH |
| **Receipt Printing** | `handlers/config.rs` | - | `/admin/receipts` | - | BOTH |
| **Dashboard Stats** | `handlers/stats.rs` | - | `/` (HomePage) | `sales_transactions` | BOTH |

**Evidence:**
- `backend/crates/server/src/main.rs:250-280` — Core routes registered
- `frontend/src/App.tsx:80-120` — Core routes defined
- `backend/migrations/001_initial_schema.sql` — Core tables

---

## 2. Inventory & Warehouse Capabilities

| Capability | Backend Module | Feature Flag | Frontend Route | DB Tables | Build |
|------------|----------------|--------------|----------------|-----------|-------|
| **Product CRUD** | `handlers/product.rs` | - | `/admin/pricing` | `products` | BOTH |
| **Product Variants** | `handlers/product_advanced.rs` | - | - | `product_variants` | FULL |
| **Product Relationships** | `handlers/product_advanced.rs` | - | - | `product_relationships` | FULL |
| **Price History** | `handlers/product_advanced.rs` | - | - | `product_price_history` | FULL |
| **Product Templates** | `handlers/product_advanced.rs` | - | - | `product_templates` | FULL |
| **Product Import** | `handlers/data_management.rs` | - | `/admin/data/import` | `products` | FULL |
| **Alternate SKUs** | `handlers/search_operations.rs` | - | - | `product_alternate_skus` | FULL |
| **Vehicle Fitment** | - | `automotive` module | - | `vehicle_fitment` | FULL |

**Evidence:**
- `backend/crates/server/src/handlers/product_advanced.rs` — Advanced product features
- `backend/migrations/013_product_variants_table.sql` — Variants schema
- `backend/migrations/004_products_and_fitment.sql` — Fitment tables

---

## 3. Sales Management Capabilities

| Capability | Backend Module | Feature Flag | Frontend Route | DB Tables | Build |
|------------|----------------|--------------|----------------|-----------|-------|
| **Layaway** | `handlers/layaway.rs` | `layaway` | `/sales` | `layaways`, `layaway_items`, `layaway_payments` | FULL |
| **Work Orders** | `handlers/work_order.rs` | `work_orders` | `/sales` | `work_orders`, `work_order_lines` | FULL |
| **Commissions** | `handlers/commission.rs` | `commissions` | `/sales` | `commissions`, `commission_rules`, `commission_splits` | FULL |
| **Gift Cards** | `handlers/gift_card.rs` | `gift_cards` | - | `gift_cards`, `gift_card_transactions` | FULL |
| **Promotions** | `handlers/promotion.rs` | `promotions` | - | `promotions`, `promotion_usage` | FULL |
| **Loyalty Points** | `handlers/loyalty.rs` | `loyalty` | - | `loyalty_transactions` | FULL |
| **Store Credit** | `handlers/loyalty.rs` | `store_credit` | - | `customers.store_credit` | FULL |
| **Credit Accounts** | `handlers/credit.rs` | `credit_accounts` | - | `credit_accounts`, `credit_transactions`, `ar_statements` | FULL |
| **Price Levels** | `handlers/loyalty.rs` | - | `/admin/pricing` | `price_levels` | FULL |

**Evidence:**
- `backend/crates/server/src/main.rs:310-380` — Sales management routes
- `backend/migrations/002_sales_customer_management.sql` — All sales tables
- `frontend/src/App.tsx:130-140` — SalesManagementPage route

---

## 4. Reporting & Analytics Capabilities

| Capability | Backend Module | Feature Flag | Frontend Route | DB Tables | Build |
|------------|----------------|--------------|----------------|-----------|-------|
| **Sales Reports** | `handlers/reporting.rs` | - | `/reporting` | `sales_transactions` | LITE |
| **Sales by Category** | `handlers/reporting.rs` | - | `/reporting` | `sales_transactions`, `products` | LITE |
| **Sales by Employee** | `handlers/reporting.rs` | - | `/reporting` | `sales_transactions` | FULL |
| **Sales by Tier** | `handlers/reporting.rs` | - | `/reporting` | `sales_transactions`, `customers` | FULL |
| **Customer Reports** | `handlers/reporting.rs` | - | `/reporting` | `customers`, `sales_transactions` | FULL |
| **Employee Reports** | `handlers/reporting.rs` | - | `/reporting` | `sales_transactions` | FULL |
| **Layaway Reports** | `handlers/reporting.rs` | - | `/reporting` | `layaways` | FULL |
| **Work Order Reports** | `handlers/reporting.rs` | - | `/reporting` | `work_orders` | FULL |
| **Promotion Reports** | `handlers/reporting.rs` | - | `/reporting` | `promotions`, `promotion_usage` | FULL |
| **Dashboard Metrics** | `handlers/reporting.rs` | - | `/` | `sales_transactions`, `layaways` | BOTH |
| **Report Export (CSV)** | `handlers/reporting.rs` | `export` | `/admin/exports` | - | FULL |
| **Performance Export** | `handlers/performance_export.rs` | - | `/admin/performance` | - | FULL |

**Evidence:**
- `backend/crates/server/src/handlers/reporting.rs:1-600` — All reporting endpoints
- `frontend/src/reporting/pages/ReportingPage.tsx` — Reporting UI

---

## 5. Integration Capabilities

| Capability | Backend Module | Feature Flag | Frontend Route | DB Tables | Build |
|------------|----------------|--------------|----------------|-----------|-------|
| **WooCommerce Sync** | `handlers/woocommerce*.rs` | `sync` | `/admin/integrations` | `integration_credentials`, `integration_sync_operations` | FULL |
| **QuickBooks Sync** | `handlers/quickbooks*.rs` | `sync` | `/admin/integrations` | `integration_credentials`, `oauth_states` | FULL |
| **Supabase Sync** | `handlers/supabase_operations.rs` | `sync` | - | `integration_credentials` | FULL |
| **Google Drive Backup** | `handlers/google_drive_oauth.rs` | - | `/admin/integrations` | `integration_credentials` | FULL |
| **Webhook Handling** | `handlers/webhooks.rs` | - | - | `integration_webhook_events` | FULL |
| **Field Mappings** | `handlers/mappings.rs` | - | `/admin/integrations` | `integration_field_mappings`, `field_mappings` | FULL |
| **OAuth Management** | `handlers/oauth_management.rs` | - | - | `oauth_states` | FULL |
| **Sync Scheduling** | `handlers/sync_operations.rs` | `sync_scheduler` | `/admin/health` | `sync_schedules` | FULL |
| **Sync Direction Control** | `handlers/sync_direction.rs` | - | - | `sync_direction_control` | FULL |

**Evidence:**
- `backend/crates/server/src/connectors/` — WooCommerce, QuickBooks, Supabase, Google Drive
- `backend/migrations/025_integration_credentials.sql` — Integration tables
- `backend/crates/server/src/main.rs:700-780` — Integration routes

---

## 6. OCR & Document Processing Capabilities

| Capability | Backend Module | Feature Flag | Frontend Route | DB Tables | Build |
|------------|----------------|--------------|----------------|-----------|-------|
| **Document Ingest** | `handlers/ocr_ingest.rs` | `multi_pass_ocr` | `/documents` | `ocr_jobs` | FULL |
| **OCR Processing** | `handlers/ocr_operations.rs` | `multi_pass_ocr` | - | `ocr_jobs` | FULL |
| **Review Cases** | `handlers/review_cases.rs` | - | `/review`, `/review/:caseId` | `review_cases`, `review_case_decisions` | FULL |
| **Re-OCR & Masking** | `handlers/reocr.rs` | - | - | `review_cases` | FULL |
| **Vendor Bill Upload** | `handlers/vendor_bill.rs` | `vendor_bill_automation` | `/vendor-bills/upload` | `vendor_bills` | FULL |
| **Vendor Bill Review** | `handlers/vendor_bill.rs` | - | `/vendor-bills/:id` | `vendor_bills`, `vendor_bill_lines` | FULL |
| **Vendor Templates** | `handlers/vendor.rs` | - | `/vendor-bills/templates` | `vendor_templates` | FULL |
| **SKU Aliases** | `handlers/vendor_bill.rs` | - | - | `vendor_sku_aliases` | FULL |
| **Image Preprocessing** | `services/image_preprocessing.rs` | - | - | - | FULL |
| **Zone Detection** | `services/zone_detector_service.rs` | - | - | - | FULL |
| **Mask Engine** | `services/mask_engine.rs` | - | - | - | FULL |

**Evidence:**
- `backend/crates/server/src/handlers/ocr_ingest.rs` — Full OCR ingest implementation
- `backend/migrations/046_ocr_jobs_table.sql` — OCR jobs schema
- `backend/migrations/043_review_cases_tables.sql` — Review cases schema
- `backend/crates/server/src/services/` — OCR services (mask_engine, zone_detector, etc.)

---

## 7. Admin & Configuration Capabilities

| Capability | Backend Module | Feature Flag | Frontend Route | DB Tables | Build |
|------------|----------------|--------------|----------------|-----------|-------|
| **User Management** | `handlers/user_handlers.rs` | - | `/admin/users` | `users` | BOTH |
| **Store/Station Mgmt** | `handlers/stores.rs` | - | `/admin/store`, `/admin/locations` | `stores`, `stations` | BOTH |
| **Feature Flags** | `handlers/feature_flags.rs` | - | `/admin/advanced` | `feature_flags` | FULL |
| **Settings CRUD** | `handlers/settings_crud.rs` | - | `/admin/*` | `settings` | BOTH |
| **Settings Resolution** | `handlers/settings_resolution.rs` | - | - | `settings` | FULL |
| **Audit Logs** | `handlers/audit.rs` | - | - | `audit_log` | FULL |
| **Backup Management** | `handlers/backup.rs` | - | `/admin/data` | `backups` | FULL |
| **Restore Operations** | `handlers/backup.rs` | - | - | `backups`, `restore_jobs` | FULL |
| **Fresh Install Wizard** | `handlers/fresh_install.rs` | - | `/fresh-install` | - | BOTH |
| **Setup Wizard** | `handlers/setup.rs` | - | `/setup`, `/admin/setup` | - | BOTH |
| **Network Config** | `handlers/network.rs` | - | `/admin/network` | - | BOTH |
| **Theme Preferences** | `handlers/theme.rs` | - | `/preferences` | `theme_preferences` | BOTH |
| **Tenant Operations** | `handlers/tenant_operations.rs` | - | - | `tenants` | BOTH |
| **Config Reload** | `handlers/config.rs` | - | - | - | FULL |
| **Schema Operations** | `handlers/schema_operations.rs` | - | - | - | FULL |

**Evidence:**
- `backend/crates/server/src/main.rs:200-250` — Admin routes
- `frontend/src/App.tsx:160-220` — Admin sub-routes
- `backend/migrations/035_settings_table.sql` — Settings schema

---

## 8. Sync & Offline Capabilities

| Capability | Backend Module | Feature Flag | Frontend Route | DB Tables | Build |
|------------|----------------|--------------|----------------|-----------|-------|
| **Sync Queue** | `handlers/sync.rs` | - | - | `sync_queue` | BOTH |
| **Sync Status** | `handlers/sync.rs` | - | `/admin/health` | `sync_state` | BOTH |
| **Conflict Resolution** | `handlers/conflicts.rs` | - | - | `sync_conflicts` | FULL |
| **Sync Orchestrator** | `services/sync_orchestrator.rs` | - | - | `sync_log` | FULL |
| **Sync Scheduler** | `services/sync_scheduler.rs` | `sync_scheduler` | - | `sync_schedules` | FULL |
| **Offline Credit Check** | `handlers/credit.rs` | - | - | `offline_credit_verifications` | FULL |
| **Sync Config** | `handlers/sync_config.rs` | - | - | `sync_direction_control` | FULL |
| **Sync History** | `handlers/sync_history.rs` | - | - | `sync_log` | FULL |

**Evidence:**
- `backend/migrations/003_offline_sync.sql` — Sync infrastructure tables
- `backend/crates/server/src/services/sync_orchestrator.rs` — Sync orchestration

---

## 9. Accounting Capabilities

| Capability | Backend Module | Feature Flag | Frontend Route | DB Tables | Build |
|------------|----------------|--------------|----------------|-----------|-------|
| **Chart of Accounts** | `services/accounting_integration_service.rs` | `export` | - | `chart_of_accounts` | FULL |
| **Journal Entries** | `services/accounting_integration_service.rs` | `export` | - | `journal_entries`, `journal_entry_lines` | FULL |
| **AP Integration** | `services/ap_integration_service.rs` | - | - | - | FULL |
| **Inventory Integration** | `services/inventory_integration_service.rs` | - | - | - | FULL |

**Evidence:**
- `backend/migrations/042_accounting_tables.sql` — Accounting schema
- `backend/crates/server/src/handlers/capabilities.rs:50-70` — Accounting mode feature flag

---

## 10. Health & Monitoring Capabilities

| Capability | Backend Module | Feature Flag | Frontend Route | DB Tables | Build |
|------------|----------------|--------------|----------------|-----------|-------|
| **Health Check** | `handlers/health.rs` | - | `/health` | - | BOTH |
| **System Health** | `handlers/health_check.rs` | - | - | - | BOTH |
| **Connectivity Check** | `handlers/health_check.rs` | - | - | - | FULL |
| **Cache Management** | `handlers/cache.rs` | - | - | - | BOTH |
| **Alert System** | `handlers/alerts.rs` | - | - | - | FULL |
| **File Management** | `handlers/files.rs` | - | - | - | FULL |

**Evidence:**
- `backend/crates/server/src/main.rs:190-200` — Health routes (public, no auth)
- `backend/crates/server/src/handlers/health_check.rs` — Health check implementation

---

## Database Tables Summary

### LITE Build Tables (Essential)
```
tenants, users, sessions, products, customers, sales_transactions, 
sales_line_items, sync_queue, sync_state, settings, stores, stations,
theme_preferences
```

### FULL Build Tables (Additional)
```
-- Sales Management
layaways, layaway_items, layaway_payments, work_orders, work_order_lines,
commissions, commission_rules, commission_splits, gift_cards, gift_card_transactions,
promotions, promotion_usage, loyalty_transactions, credit_accounts, credit_transactions,
ar_statements, price_levels

-- Product Advanced
product_variants, product_relationships, product_price_history, product_templates,
product_alternate_skus, vehicle_fitment, maintenance_schedules

-- Integrations
integration_credentials, integration_status, integration_field_mappings,
integration_sync_operations, integration_webhook_events, oauth_states,
sync_schedules, sync_direction_control, field_mappings

-- OCR/Document Processing
ocr_jobs, review_cases, review_case_decisions, vendor_bills, vendor_bill_lines,
vendor_bill_parses, vendors, vendor_templates, vendor_sku_aliases

-- Sync & Offline
sync_log, sync_conflicts, offline_credit_verifications

-- Accounting
chart_of_accounts, journal_entries, journal_entry_lines

-- Admin
feature_flags, audit_log, backups, backup_download_tokens
```

---

## Feature Flags Summary

From `backend/migrations/036_feature_flags_table.sql`:
```sql
-- Default feature flags
('tenant_default', 'advanced_search', 1, 'Enable advanced product search features'),
('tenant_default', 'multi_pass_ocr', 1, 'Enable multi-pass OCR for bill processing'),
('tenant_default', 'vendor_bill_automation', 1, 'Enable automated vendor bill processing'),
('tenant_default', 'sync_scheduler', 1, 'Enable automatic sync scheduling'),
('tenant_default', 'webhook_notifications', 1, 'Enable webhook notifications');
```

From `backend/crates/server/src/handlers/capabilities.rs`:
- `export` — Cargo feature for accounting export
- `sync` — Cargo feature for full sync capabilities

---

## Frontend Route Summary

### LITE Routes
```
/login, /fresh-install, /setup, /, /sell, /lookup, /warehouse, /customers,
/preferences, /admin (basic), /admin/setup, /admin/users, /admin/store,
/admin/network, /admin/receipts
```

### FULL Routes (Additional)
```
/reporting, /sales, /documents, /vendor-bills/*, /review/*, /forms,
/admin/integrations, /admin/data/*, /admin/exports, /admin/capabilities,
/admin/health, /admin/advanced, /admin/performance, /vendor-bills/templates/*
```
