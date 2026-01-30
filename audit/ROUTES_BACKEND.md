# Backend Routes Inventory

## Overview

This document catalogs all backend API endpoints in EasySale, their handlers, authentication requirements, and tenant scoping.

**Last Updated:** 2026-01-29  
**Source:** `backend/crates/server/src/main.rs`

## Public Endpoints (No Auth Required)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/health` | `health::health_check` | Health check |
| HEAD | `/health` | `health::health_check` | Health check (HEAD) |
| GET | `/api/capabilities` | `capabilities::get_capabilities` | Get system capabilities |
| GET | `/api/tenant/setup-status` | `tenant_operations::get_setup_status_handler` | Check tenant setup status |
| GET | `/api/login-theme/version` | `theme::get_login_theme_version` | Get login theme version |

## Fresh Install Endpoints (No Auth Required)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/fresh-install/check` | `fresh_install::check_fresh_install` | Check if fresh install |
| POST | `/api/fresh-install/upload-and-restore` | `fresh_install::upload_and_restore` | Upload and restore backup |
| GET | `/api/fresh-install/progress/{restore_job_id}` | `fresh_install::get_restore_progress` | Get restore progress |

## Protected Endpoints (Auth Required)

### Tenant Operations

| Method | Path | Handler | Permission | Tenant Scoped |
|--------|------|---------|------------|---------------|
| POST | `/api/tenant/setup-complete` | `tenant_operations::mark_setup_complete_handler` | (auth only) | Yes |

### Inventory & Products

| Method | Path | Handler | Permission | Tenant Scoped |
|--------|------|---------|------------|---------------|
| GET | `/api/inventory/items` | `inventory::get_inventory_items` | (auth only) | Yes |
| GET | `/api/products` | `products::get_products` | (auth only) | Yes |

### Customers

| Method | Path | Handler | Permission | Tenant Scoped |
|--------|------|---------|------------|---------------|
| GET | `/api/customers` | `customers::get_customers` | (auth only) | Yes |

### User Management

| Method | Path | Handler | Permission | Tenant Scoped |
|--------|------|---------|------------|---------------|
| GET | `/api/admin/users` | `users::get_users` | (auth only) | Yes |
| POST | `/api/users` | `user_handlers::create_user` | `manage_settings` | Yes |
| GET | `/api/users` | `user_handlers::list_users` | `manage_settings` | Yes |
| GET | `/api/users/{id}` | `user_handlers::get_user` | `manage_settings` | Yes |
| PUT | `/api/users/{id}` | `user_handlers::update_user` | `manage_settings` | Yes |
| DELETE | `/api/users/{id}` | `user_handlers::delete_user` | `manage_settings` | Yes |

### Stores & Stations

| Method | Path | Handler | Permission | Tenant Scoped |
|--------|------|---------|------------|---------------|
| POST | `/api/stores` | `stores::create_store` | `manage_settings` | Yes |
| GET | `/api/stores` | `stores::get_stores` | `manage_settings` | Yes |
| GET | `/api/stores/{id}` | `stores::get_store` | `manage_settings` | Yes |
| PUT | `/api/stores/{id}` | `stores::update_store` | `manage_settings` | Yes |
| DELETE | `/api/stores/{id}` | `stores::delete_store` | `manage_settings` | Yes |
| POST | `/api/stations` | `stores::create_station` | `manage_settings` | Yes |
| GET | `/api/stations` | `stores::get_stations` | `manage_settings` | Yes |
| GET | `/api/stations/{id}` | `stores::get_station` | `manage_settings` | Yes |
| PUT | `/api/stations/{id}` | `stores::update_station` | `manage_settings` | Yes |
| DELETE | `/api/stations/{id}` | `stores::delete_station` | `manage_settings` | Yes |

### Audit Logs

| Method | Path | Handler | Permission | Tenant Scoped |
|--------|------|---------|------------|---------------|
| GET | `/api/audit-logs` | `audit::list_audit_logs` | `manage_settings` | Yes |
| GET | `/api/audit-logs/export` | `audit::export_audit_logs` | `manage_settings` | Yes |
| GET | `/api/audit-logs/{id}` | `audit::get_audit_log` | `manage_settings` | Yes |

### Performance & Exports

| Method | Path | Handler | Permission | Tenant Scoped |
|--------|------|---------|------------|---------------|
| GET | `/api/performance/export` | `performance_export::export_performance_metrics` | `manage_settings` | Yes |

### Backup & Restore

| Method | Path | Handler | Permission | Tenant Scoped |
|--------|------|---------|------------|---------------|
| GET | `/api/backups/overview` | `backup::get_overview` | `manage_settings` | Yes |
| POST | `/api/backups` | `backup::create_backup` | `manage_settings` | Yes |
| GET | `/api/backups` | `backup::list_backups` | `manage_settings` | Yes |
| GET | `/api/backups/settings` | `backup::get_settings` | `manage_settings` | Yes |
| PUT | `/api/backups/settings` | `backup::update_settings` | `manage_settings` | Yes |
| POST | `/api/backups/retention/enforce` | `backup::enforce_retention` | `manage_settings` | Yes |
| GET | `/api/backups/{id}` | `backup::get_backup` | `manage_settings` | Yes |
| DELETE | `/api/backups/{id}` | `backup::delete_backup` | `manage_settings` | Yes |
| POST | `/api/backups/{id}/restore` | `backup::restore_backup` | `manage_settings` | Yes |
| GET | `/api/backups/restore-jobs` | `backup::list_restore_jobs` | `manage_settings` | Yes |
| GET | `/api/backups/restore-jobs/{id}` | `backup::get_restore_job` | `manage_settings` | Yes |
| GET | `/api/backups/restore-jobs/{id}/rollback-instructions` | `backup::get_rollback_instructions` | `manage_settings` | Yes |
| POST | `/api/backups/{id}/download-token` | `backup::generate_download_token` | `manage_settings` | Yes |
| GET | `/api/backups/download` | `backup::download_with_token` | (token auth) | Yes |
| DELETE | `/api/backups/download-tokens/cleanup` | `backup::cleanup_expired_tokens` | `manage_settings` | Yes |

### Feature Flags

| Method | Path | Handler | Permission | Tenant Scoped |
|--------|------|---------|------------|---------------|
| GET | `/api/feature-flags` | `feature_flags::get_feature_flags` | `manage_settings` | Yes |

## Document Cleanup Engine Endpoints (To Be Added)

### New Cleanup Endpoints

| Method | Path | Handler | Permission | Tenant Scoped | Description |
|--------|------|---------|------------|---------------|-------------|
| POST | `/api/cleanup/detect` | `cleanup::detect_shields` | `cleanup.view` | Yes | Auto-detect shields |
| POST | `/api/cleanup/resolve` | `cleanup::resolve_shields` | `cleanup.view` | Yes | Resolve with precedence |
| GET | `/api/cleanup/vendors/{vendor_id}/rules` | `cleanup::get_vendor_rules` | `cleanup.view` | Yes | Get vendor rules |
| PUT | `/api/cleanup/vendors/{vendor_id}/rules` | `cleanup::save_vendor_rules` | `cleanup.save_vendor_rules` | Yes | Save vendor rules |
| GET | `/api/cleanup/templates/{template_id}/rules` | `cleanup::get_template_rules` | `cleanup.view` | Yes | Get template rules |
| PUT | `/api/cleanup/templates/{template_id}/rules` | `cleanup::save_template_rules` | `cleanup.save_template_rules` | Yes | Save template rules |
| POST | `/api/cleanup/render-overlay` | `cleanup::render_overlay` | `cleanup.view` | Yes | Render overlay image |
| POST | `/api/review/{case_id}/cleanup-snapshot` | `cleanup::save_snapshot` | `cleanup.adjust_session` | Yes | Save shield snapshot |

### Backward-Compatible Mask Endpoints (Proxy)

| Method | Path | Proxies To | Description |
|--------|------|------------|-------------|
| POST | `/api/masks/detect` | `/api/cleanup/detect` | Detect masks (legacy) |
| GET | `/api/masks/vendor/{id}` | `/api/cleanup/vendors/{id}/rules` | Get vendor masks (legacy) |
| PUT | `/api/masks/vendor/{id}` | `/api/cleanup/vendors/{id}/rules` | Save vendor masks (legacy) |

## Multi-Tenant Scoping Rules

1. All protected endpoints derive `tenant_id` from the JWT token
2. All protected endpoints derive `store_id` from the JWT token or session
3. Database queries MUST include `tenant_id` and `store_id` filters
4. Cross-tenant access is impossible by design
5. Audit logs record tenant/store context for all operations

## Security Notes

- File paths are NEVER accepted from client requests
- Document/case IDs are used to look up file paths server-side
- Raw `image_path` parameter only available in dev mode behind feature flag
