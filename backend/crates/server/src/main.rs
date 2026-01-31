// Suppress dead code warnings for internal helpers, infrastructure, and optional features
#![allow(dead_code)]

mod auth;
mod config;
mod connectors;
mod db;
mod flows;
mod handlers;
mod mappers;
mod middleware;
mod models;
mod services;
mod validators;

#[cfg(test)]
mod test_utils;
#[cfg(test)]
mod test_constants;

use middleware::permissions::require_permission;
use middleware::context::ContextExtractor;

use actix_cors::Cors;
use actix_web::{middleware::Logger, web, App, HttpResponse, HttpServer};
use dotenv::dotenv;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load environment variables from .env file
    dotenv().ok();

    // Initialize tracing/logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Check for CLI commands
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 {
        match args[1].as_str() {
            "migrate-snapshots" => {
                return run_snapshot_migration().await;
            }
            "verify-snapshots" => {
                return verify_snapshot_migration().await;
            }
            "rollback-migration" => {
                return rollback_snapshot_migration().await;
            }
            _ => {
                eprintln!("Unknown command: {}", args[1]);
                eprintln!("Available commands:");
                eprintln!("  migrate-snapshots   - Create snapshots for historical transactions");
                eprintln!("  verify-snapshots    - Verify snapshot migration completeness");
                eprintln!("  rollback-migration  - Rollback snapshot migration");
                std::process::exit(1);
            }
        }
    }

    // Load configuration with runtime profile
    let profile_manager = match config::ProfileManager::load() {
        Ok(manager) => manager,
        Err(e) => {
            eprintln!("{e}");
            std::process::exit(1);
        }
    };
    
    let profile = profile_manager.profile();
    let config = profile_manager.config().clone();
    
    // Validate production secrets
    validate_production_config(&config, profile)?;
    
    tracing::info!(
        "Starting EasySale API server [profile: {}] for store: {} ({})",
        profile,
        config.store_name,
        config.store_id
    );
    
    // Log configuration source if provided
    if let Some(config_path) = profile_manager.config_path() {
        tracing::info!("Configuration loaded from: {}", config_path.display());
    }

    // Initialize database connection pool
    let pool = match db::init_pool().await {
        Ok(pool) => pool,
        Err(e) => {
            tracing::error!("Failed to initialize database pool: {}", e);
            std::process::exit(1);
        }
    };

    // Run migrations
    if let Err(e) = db::migrations::run_migrations(&pool).await {
        tracing::error!("Failed to run database migrations: {}", e);
        tracing::error!("Please check your migration files for syntax errors");
        std::process::exit(1);
    }

    tracing::info!("Database connection pool initialized");

    // Initialize backup service
    let backup_service = std::sync::Arc::new(services::BackupService::new(pool.clone()));
    
    // Initialize and start backup scheduler
    // Get store_id and tenant_id from environment - required in production
    let store_id = std::env::var("STORE_ID").unwrap_or_else(|_| "default-store".to_string());
    let tenant_id = std::env::var("TENANT_ID").unwrap_or_else(|_| "tenant_default".to_string());
    
    // Validate IDs are not default values in production
    if cfg!(not(debug_assertions)) {
        if store_id == "default-store" || store_id == "test" {
            return Err(std::io::Error::new(std::io::ErrorKind::InvalidInput, "Production deployment cannot use default store ID"));
        }
        if tenant_id == "tenant_default" || tenant_id == "test" {
            return Err(std::io::Error::new(std::io::ErrorKind::InvalidInput, "Production deployment cannot use default tenant ID"));
        }
    }    
    let scheduler = services::SchedulerService::new(
        pool.clone(),
        backup_service.clone(),
        store_id,
        tenant_id,
    )
        .await
        .expect("Failed to initialize backup scheduler");
    
    scheduler
        .start()
        .await
        .expect("Failed to start backup scheduler");
    
    // Check for missed backups on startup
    if let Err(e) = scheduler.check_missed_backups().await {
        tracing::warn!("Failed to check for missed backups: {}", e);
    }
    
    tracing::info!("Backup scheduler started");

    // Initialize sync orchestrator
    let sync_orchestrator = std::sync::Arc::new(services::SyncOrchestrator::new(pool.clone()));
    tracing::info!("Sync orchestrator initialized");

    // Initialize sync scheduler
    let sync_scheduler = std::sync::Arc::new(
        services::SyncScheduler::new(pool.clone(), sync_orchestrator.clone())
            .await
            .expect("Failed to initialize sync scheduler")
    );
    
    // Start sync scheduler
    if let Err(e) = sync_scheduler.start().await {
        tracing::warn!("Failed to start sync scheduler: {}", e);
    } else {
        tracing::info!("Sync scheduler started");
    }

    // Initialize tenant resolver
    let tenant_resolver = std::sync::Arc::new(services::TenantResolver::new(pool.clone()));
    tracing::info!("Tenant resolver initialized");

    // Initialize health check service (Task 22.1)
    let health_check_service = std::sync::Arc::new(services::HealthCheckService::new());
    tracing::info!("Health check service initialized");

    // Initialize configuration loader for tenant configs
    let config_dir = std::env::var("CONFIG_DIR").unwrap_or_else(|_| "configs".to_string());
    let config_loader = config::loader::ConfigLoader::new(&config_dir, 300, cfg!(debug_assertions));
    tracing::info!("Configuration loader initialized from: {}", config_dir);

    let host = config.api_host.clone();
    let port = config.api_port;

    // Start HTTP server
    HttpServer::new(move || {
        // Configure CORS - support credentials for httpOnly cookie auth
        // Note: allow_any_origin() cannot be used with supports_credentials()
        // Instead, we use permissive() which reflects the Origin header back
        // This allows LAN access while still supporting credentials
        let cors = Cors::permissive()
            .supports_credentials()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(Logger::default())
            // Configure JSON payload size limit (10MB for logo uploads in theme)
            .app_data(web::JsonConfig::default().limit(10 * 1024 * 1024))
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(config.clone()))
            .app_data(web::Data::new(profile))
            .app_data(web::Data::new(config_loader.clone()))
            .app_data(web::Data::new(sync_orchestrator.clone()))
            .app_data(web::Data::new(sync_scheduler.clone()))
            .app_data(web::Data::new(tenant_resolver.clone()))
            .app_data(web::Data::new(health_check_service.clone()))
            // Health check endpoint (public - no auth required, registered before ContextExtractor)
            .route("/health", web::get().to(handlers::health::health_check))
            .route("/health", web::head().to(handlers::health::health_check))
            // Capabilities endpoints (public - no auth required, registered before ContextExtractor)
            .route("/api/capabilities", web::get().to(handlers::capabilities::get_capabilities))
            .service(handlers::capabilities::get_config_capabilities)
            .service(handlers::capabilities::get_meta_capabilities)
            // Tenant setup status endpoint (public - no auth required for first-run detection)
            .route("/api/tenant/setup-status", web::get().to(handlers::tenant_operations::get_setup_status_handler))
            // Mark setup complete endpoint (public - called at end of wizard before login)
            .route("/api/tenant/setup-complete", web::post().to(handlers::tenant_operations::mark_setup_complete_handler))
            // Login theme version endpoint (public - no auth required)
            .route("/api/login-theme/version", web::get().to(handlers::theme::get_login_theme_version))
            // Theme endpoints (public - no auth required for setup wizard branding step)
            .route("/api/theme", web::get().to(handlers::theme::get_theme))
            .route("/api/theme", web::post().to(handlers::theme::set_theme))
            // Branding assets endpoints (public - no auth required for setup wizard)
            .configure(handlers::branding_assets::configure)
            // System health status endpoint (public - no auth required for setup wizard)
            .service(handlers::health_check::get_system_health)
            // Auth/me endpoint (public - returns 401 if not authenticated, not 500)
            .service(handlers::auth::get_current_user)
            // Network configuration endpoints (public - no auth required for setup wizard)
            // These must be accessible during initial setup before user is authenticated
            .service(
                web::scope("/api/network")
                    .route("/interfaces", web::get().to(handlers::network::get_interfaces))
                    .route("/config", web::get().to(handlers::network::get_config))
                    .route("/config", web::post().to(handlers::network::save_config))
            )
            // Setup wizard data import endpoint (public - no auth required during first-run setup)
            // This is separate from the protected /api/data-management/import endpoint
            .route("/api/setup/import", web::post().to(handlers::data_management::import_data))
            .wrap(ContextExtractor) // Extract user context from JWT for all routes EXCEPT those registered above
            // Fresh install endpoints (public - no auth required for fresh install)
            // Gated by ProfileGate middleware - allowed in prod only if database is empty
            .service(
                web::scope("/api/fresh-install")
                    .wrap(middleware::ProfileGate::new())
                    .service(
                        web::resource("/check")
                            .route(web::get().to(handlers::fresh_install::check_fresh_install))
                    )
                    .service(
                        web::resource("/upload-and-restore")
                            .route(web::post().to(handlers::fresh_install::upload_and_restore))
                    )
                    .service(
                        web::resource("/progress/{restore_job_id}")
                            .route(web::get().to(handlers::fresh_install::get_restore_progress))
                    )
            )
            // Configuration endpoints (public - no auth required)
            .service(handlers::config::get_config)
            .service(handlers::config::get_brand_config)
            .service(handlers::config::get_capabilities)
            // Authentication endpoints
            .service(handlers::auth::login)
            .service(handlers::auth::logout)
            // Note: get_current_user is registered BEFORE ContextExtractor to handle unauthenticated requests properly
            // Stats endpoints (dashboard data)
            .service(handlers::stats::get_dashboard_stats)
            .service(handlers::stats::get_recent_alerts)
            .service(handlers::stats::get_recent_transactions)
            // Inventory endpoints
            .service(
                web::resource("/api/inventory/items")
                    .route(web::get().to(handlers::inventory::get_inventory_items))
            )
            // Products list endpoint
            .service(
                web::resource("/api/products")
                    .route(web::get().to(handlers::products::get_products))
            )
            // Customers list endpoint
            .service(
                web::resource("/api/customers")
                    .route(web::get().to(handlers::customers::get_customers))
            )
            // Users list endpoint
            .service(
                web::resource("/api/admin/users")
                    .route(web::get().to(handlers::users::get_users))
            )
            // First admin creation (no auth required - fresh install only)
            .service(
                web::resource("/api/users/first-admin")
                    .route(web::post().to(handlers::user_handlers::create_first_admin))
            )
            // User management endpoints (protected with manage_settings permission)
            .service(
                web::resource("/api/users")
                    .route(web::post().to(handlers::user_handlers::create_user))
                    .route(web::get().to(handlers::user_handlers::list_users))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/users/{id}")
                    .route(web::get().to(handlers::user_handlers::get_user))
                    .route(web::put().to(handlers::user_handlers::update_user))
                    .route(web::delete().to(handlers::user_handlers::delete_user))
                    .wrap(require_permission("manage_settings"))
            )
            // Customer management endpoints
            .service(handlers::customer::create_customer)
            .service(handlers::customer::get_customer)
            .service(handlers::customer::update_customer)
            .service(handlers::customer::delete_customer)
            .service(handlers::customer::list_customers)
            .service(handlers::customer::get_customer_orders)
            // Zone management endpoints (for review editor)
            .service(handlers::zones::list_zones)
            .service(handlers::zones::create_zone)
            .service(handlers::zones::get_zone)
            .service(handlers::zones::update_zone)
            .service(handlers::zones::delete_zone)
            // Product catalog endpoints
            .service(handlers::product::list_products)
            .service(handlers::product::get_product)
            .service(handlers::product::create_product)
            .service(handlers::product::update_product)
            .service(handlers::product::delete_product)
            .service(handlers::product::search_products)
            .service(handlers::product::bulk_operations)
            .service(handlers::product::get_categories)
            .service(handlers::product::autocomplete)
            .service(handlers::product::lookup_by_barcode)
            .service(handlers::product::universal_lookup)
            .service(handlers::product::get_variants)
            .service(handlers::product::create_variant)
            .service(handlers::product::update_variant)
            .service(handlers::product::delete_variant)
            .service(handlers::product::has_variants)
            .service(handlers::product::get_variant_count)
            // Stock adjustment with audit trail
            .service(handlers::product::adjust_stock)
            .service(handlers::product::get_stock_history)
            // Product advanced features
            .service(handlers::product_advanced::get_product_relationships)
            .service(handlers::product_advanced::create_product_relationship)
            .service(handlers::product_advanced::delete_product_relationship)
            .service(handlers::product_advanced::get_price_history)
            .service(handlers::product_advanced::list_templates)
            .service(handlers::product_advanced::get_template)
            .service(handlers::product_advanced::create_template)
            .service(handlers::product_advanced::update_template)
            .service(handlers::product_advanced::delete_template)
            // Layaway endpoints
            .service(handlers::layaway::create_layaway)
            .service(handlers::layaway::get_layaway)
            .service(handlers::layaway::list_layaways)
            .service(handlers::layaway::record_layaway_payment)
            .service(handlers::layaway::complete_layaway)
            .service(handlers::layaway::cancel_layaway)
            .service(handlers::layaway::check_overdue_layaways)
            .service(handlers::layaway::get_overdue_layaways)
            // Work order endpoints
            .service(handlers::work_order::create_work_order)
            .service(handlers::work_order::get_work_order)
            .service(handlers::work_order::update_work_order)
            .service(handlers::work_order::list_work_orders)
            .service(handlers::work_order::add_work_order_line)
            .service(handlers::work_order::complete_work_order)
            // Commission endpoints
            .service(handlers::commission::list_commission_rules)
            .service(handlers::commission::create_commission_rule)
            .service(handlers::commission::get_employee_commissions)
            .service(handlers::commission::generate_commission_report)
            // Loyalty and pricing endpoints
            .service(handlers::loyalty::get_loyalty_balance)
            .service(handlers::loyalty::redeem_loyalty_points)
            .service(handlers::loyalty::get_price_levels)
            .service(handlers::loyalty::create_price_level)
            .service(handlers::loyalty::get_store_credit_balance)
            // Setup endpoint (for initial system configuration)
            // Gated by ProfileGate middleware - blocked in production
            .service(
                web::scope("/api/setup")
                    .wrap(middleware::ProfileGate::new())
                    .service(handlers::setup::initialize_system)
            )
            .service(handlers::loyalty::issue_store_credit)
            .service(handlers::loyalty::redeem_store_credit)
            .service(handlers::loyalty::adjust_loyalty_points)
            .service(handlers::loyalty::adjust_pricing_tier)
            // Credit account endpoints
            .service(handlers::credit::create_credit_account)
            .service(handlers::credit::get_credit_account)
            .service(handlers::credit::record_charge)
            .service(handlers::credit::record_payment)
            .service(handlers::credit::generate_statement)
            .service(handlers::credit::get_aging_report)
            // Offline credit checking endpoints
            .service(handlers::credit::check_customer_credit)
            .service(handlers::credit::verify_offline_transactions)
            .service(handlers::credit::get_pending_verifications)
            // Gift card endpoints
            .service(handlers::gift_card::issue_gift_card)
            .service(handlers::gift_card::check_balance)
            .service(handlers::gift_card::redeem_gift_card)
            .service(handlers::gift_card::reload_gift_card)
            // Promotion endpoints
            .service(handlers::promotion::create_promotion)
            .service(handlers::promotion::list_promotions)
            .service(handlers::promotion::update_promotion)
            .service(handlers::promotion::get_promotion_usage)
            .service(handlers::promotion::evaluate_promotions)
            .service(handlers::promotion::create_group_markdown)
            .service(handlers::promotion::list_group_markdowns)
            .service(handlers::promotion::deactivate_group_markdown)
            // Store and station endpoints (protected with manage_settings permission)
            .service(
                web::resource("/api/stores")
                    .route(web::post().to(handlers::stores::create_store))
                    .route(web::get().to(handlers::stores::get_stores))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/stores/{id}")
                    .route(web::get().to(handlers::stores::get_store))
                    .route(web::put().to(handlers::stores::update_store))
                    .route(web::delete().to(handlers::stores::delete_store))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/stations")
                    .route(web::post().to(handlers::stores::create_station))
                    .route(web::get().to(handlers::stores::get_stations))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/stations/{id}")
                    .route(web::get().to(handlers::stores::get_station))
                    .route(web::put().to(handlers::stores::update_station))
                    .route(web::delete().to(handlers::stores::delete_station))
                    .wrap(require_permission("manage_settings"))
            )
            // Audit log endpoints (protected with manage_settings permission)
            .service(
                web::resource("/api/audit-logs")
                    .route(web::get().to(handlers::audit::list_audit_logs))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/audit-logs/export")
                    .route(web::get().to(handlers::audit::export_audit_logs))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/audit-logs/{id}")
                    .route(web::get().to(handlers::audit::get_audit_log))
                    .wrap(require_permission("manage_settings"))
            )
            // Reporting endpoints
            .service(handlers::reporting::get_sales_report)
            .service(handlers::reporting::get_sales_by_category)
            .service(handlers::reporting::get_sales_by_employee)
            .service(handlers::reporting::get_sales_by_tier)
            .service(handlers::reporting::get_customer_report)
            .service(handlers::reporting::get_employee_report)
            .service(handlers::reporting::get_layaway_report)
            .service(handlers::reporting::get_work_order_report)
            .service(handlers::reporting::get_promotion_report)
            .service(handlers::reporting::get_dashboard_metrics)
            .service(handlers::reporting::export_report)
            // Performance export endpoint - feature-gated: export
            .configure(|_cfg| {
                #[cfg(feature = "export")]
                {
                    _cfg.service(
                        web::resource("/api/performance/export")
                            .route(web::get().to(handlers::performance_export::export_performance_metrics))
                            .wrap(require_permission("manage_settings"))
                    );
                }
            })
            // Sync and offline operation endpoints
            .service(handlers::sync::queue_sync_operation)
            .service(handlers::sync::get_sync_status)
            .service(handlers::sync::get_pending_sync_items)
            .service(handlers::sync::mark_sync_completed)
            .service(handlers::sync::mark_sync_failed)
            .service(handlers::sync::retry_failed_syncs)
            .service(handlers::sync::get_sync_conflicts)
            .service(handlers::sync::resolve_conflict)
            .service(handlers::sync::create_audit_log)
            .service(handlers::sync::get_audit_logs)
            .service(handlers::sync::get_sync_state)
            .service(handlers::sync::update_sync_state)
            // Conflict resolution endpoints
            .service(handlers::conflicts::list_conflicts)
            .service(handlers::conflicts::get_conflict)
            .service(handlers::conflicts::resolve_conflict)
            .service(handlers::conflicts::accept_local_version)
            .service(handlers::conflicts::accept_remote_version)
            .service(handlers::conflicts::get_conflict_stats)
            // Alert system endpoints
            .service(handlers::alerts::list_alerts)
            .service(handlers::alerts::get_alert)
            .service(handlers::alerts::acknowledge_alert)
            .service(handlers::alerts::create_alert)
            .service(handlers::alerts::get_alert_stats)
            .service(handlers::alerts::acknowledge_all_alerts)
            // Barcode endpoints
            .service(handlers::barcodes::generate_barcode)
            .service(handlers::barcodes::validate_barcode)
            .service(handlers::barcodes::get_products_by_barcode_type)
            .service(handlers::barcodes::generate_barcodes_bulk)
            .service(handlers::barcodes::get_barcode_types)
            // Health check endpoints (connectivity checks - require auth)
            .service(handlers::health_check::check_all_connectivity)
            .service(handlers::health_check::check_platform_connectivity)
            .service(handlers::health_check::clear_health_cache)
            // Note: get_system_health is registered before ContextExtractor (public endpoint)
            // Cache management endpoints
            .service(handlers::cache::clear_tenant_cache)
            // File management endpoints
            .service(handlers::files::list_files)
            .service(handlers::files::get_file)
            .service(handlers::files::download_file)
            .service(handlers::files::delete_file)
            .service(handlers::files::get_file_stats)
            // Unit conversion endpoints
            .service(handlers::units::convert_units)
            .service(handlers::units::get_conversions)
            .service(handlers::units::normalize_quantity)
            .service(handlers::units::get_unit_categories)
            .service(handlers::units::batch_convert)
            // Sync configuration endpoints
            .service(handlers::sync_config::get_sync_config)
            .service(handlers::sync_config::set_sync_direction)
            .service(handlers::sync_config::configure_entity_sync)
            .service(handlers::sync_config::get_sync_directions)
            .service(handlers::sync_config::get_conflict_strategies)
            .service(handlers::sync_config::test_sync_config)
            .service(handlers::sync_config::get_sync_config_stats)
            // Sync operations endpoints
            .service(handlers::sync_operations::trigger_sync)
            .service(handlers::sync_operations::sync_woocommerce_orders)
            .service(handlers::sync_operations::sync_woocommerce_products)
            .service(handlers::sync_operations::sync_woocommerce_customers)
            .service(handlers::sync_operations::list_sync_status)
            .service(handlers::sync_operations::get_sync_status)
            .service(handlers::sync_operations::retry_failed_records)
            .service(handlers::sync_operations::retry_single_failure)
            .service(handlers::sync_operations::list_failures)
            .service(handlers::sync_operations::check_confirmation_requirement)
            .service(handlers::sync_operations::execute_confirmed_operation)
            .service(handlers::sync_operations::get_circuit_breaker_status)
            // Dev-only endpoints (gated by profile - not registered in prod)
            // Task 9.4: Dev/debug/setup endpoint gating
            // Option A: Don't register dev endpoints in prod profile
            .configure(|cfg| {
                if !profile.is_prod() {
                    // /api/sync/dry-run - preview sync changes without execution
                    cfg.service(handlers::sync_operations::execute_dry_run);
                    // /api/settings/sandbox - toggle sandbox mode for testing
                    cfg.service(handlers::sync_operations::get_sandbox_status);
                    cfg.service(handlers::sync_operations::set_sandbox_mode);
                }
            })
            // Backup endpoints (protected with manage_settings permission)
            .service(
                web::resource("/api/backups/overview")
                    .route(web::get().to(handlers::backup::get_overview))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/backups")
                    .route(web::post().to(handlers::backup::create_backup))
                    .route(web::get().to(handlers::backup::list_backups))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/backups/settings")
                    .route(web::get().to(handlers::backup::get_settings))
                    .route(web::put().to(handlers::backup::update_settings))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/backups/retention/enforce")
                    .route(web::post().to(handlers::backup::enforce_retention))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/backups/{id}")
                    .route(web::get().to(handlers::backup::get_backup))
                    .route(web::delete().to(handlers::backup::delete_backup))
                    .wrap(require_permission("manage_settings"))
            )
            // Restore endpoints (protected with manage_settings permission)
            .service(
                web::resource("/api/backups/{id}/restore")
                    .route(web::post().to(handlers::backup::restore_backup))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/backups/restore-jobs")
                    .route(web::get().to(handlers::backup::list_restore_jobs))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/backups/restore-jobs/{id}")
                    .route(web::get().to(handlers::backup::get_restore_job))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/backups/restore-jobs/{id}/rollback-instructions")
                    .route(web::get().to(handlers::backup::get_rollback_instructions))
                    .wrap(require_permission("manage_settings"))
            )
            // Secure download endpoints (protected with manage_settings permission)
            .service(
                web::resource("/api/backups/{id}/download-token")
                    .route(web::post().to(handlers::backup::generate_download_token))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/backups/download")
                    .route(web::get().to(handlers::backup::download_with_token))
                    // No permission check - token validation is sufficient
            )
            .service(
                web::resource("/api/backups/download-tokens/cleanup")
                    .route(web::delete().to(handlers::backup::cleanup_expired_tokens))
                    .wrap(require_permission("manage_settings"))
            )
            // Google Drive OAuth endpoints (protected with manage_settings permission)
            .service(handlers::google_drive_oauth::connect_google_drive)
            .service(handlers::google_drive_oauth::google_drive_callback)
            .service(handlers::google_drive_oauth::get_google_drive_status)
            .service(handlers::google_drive_oauth::disconnect_google_drive)
            // Settings endpoints (protected with manage_settings permission)
            .configure(|cfg| {
                handlers::settings::configure(cfg);
                // Wrap all settings routes with permission check
                cfg.default_service(web::to(|| async { HttpResponse::Forbidden().finish() }));
            })
            // Feature flags endpoints (protected with manage_settings permission)
            .service(
                web::resource("/api/feature-flags")
                    .route(web::get().to(handlers::feature_flags::get_feature_flags))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/feature-flags/{name}")
                    .route(web::put().to(handlers::feature_flags::update_feature_flag))
                    .wrap(require_permission("manage_settings"))
            )
            // Configuration management endpoints (protected with manage_settings permission)
            .service(
                web::resource("/api/config/tenants")
                    .route(web::get().to(handlers::config::list_tenants))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/config/tenants/{tenant_id}")
                    .route(web::get().to(handlers::config::get_tenant_config))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/config/reload")
                    .route(web::post().to(handlers::config::reload_config))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/config/validate")
                    .route(web::post().to(handlers::config::validate_config))
                    .wrap(require_permission("manage_settings"))
            )
            .service(
                web::resource("/api/config/schema")
                    .route(web::get().to(handlers::config::get_config_schema))
                    .wrap(require_permission("manage_settings"))
            )
            // Vendor Bill Receiving endpoints (feature-gated: ocr - requires OCR services)
            .configure(|_cfg| {
                #[cfg(feature = "ocr")]
                {
                    _cfg.service(
                        web::resource("/api/vendor-bills/upload")
                            .route(web::post().to(handlers::vendor_bill::upload_bill))
                            .wrap(require_permission("upload_vendor_bills"))
                    );
                    _cfg.service(
                        web::resource("/api/vendor-bills")
                            .route(web::get().to(handlers::vendor_bill::list_bills))
                            .wrap(require_permission("view_vendor_bills"))
                    );
                    _cfg.service(
                        web::resource("/api/vendor-bills/{id}")
                            .route(web::get().to(handlers::vendor_bill::get_bill))
                            .wrap(require_permission("view_vendor_bills"))
                    );
                    _cfg.service(
                        web::resource("/api/vendor-bills/{id}/matches")
                            .route(web::put().to(handlers::vendor_bill::update_matches))
                            .wrap(require_permission("review_vendor_bills"))
                    );
                    _cfg.service(
                        web::resource("/api/vendor-bills/{id}/post")
                            .route(web::post().to(handlers::vendor_bill::post_receiving))
                            .wrap(require_permission("post_vendor_bills"))
                    );
                    _cfg.service(
                        web::resource("/api/vendor-sku-aliases")
                            .route(web::post().to(handlers::vendor_bill::create_alias))
                            .route(web::get().to(handlers::vendor_bill::list_aliases))
                            .wrap(require_permission("review_vendor_bills"))
                    );
                }
            })
            // Vendor management endpoints (feature-gated: document-processing)
            .configure(|_cfg| {
                #[cfg(feature = "document-processing")]
                {
                    // Vendor management endpoints
                    _cfg.service(handlers::vendor::create_vendor);
                    _cfg.service(handlers::vendor::get_vendor);
                    _cfg.service(handlers::vendor::list_vendors);
                    _cfg.service(handlers::vendor::update_vendor);
                    _cfg.service(handlers::vendor::delete_vendor);
                    _cfg.service(handlers::vendor::get_vendor_templates);
                    _cfg.service(handlers::vendor::create_vendor_template);
                }
            })
            // WooCommerce integration endpoints
            .service(handlers::woocommerce::lookup_product)
            .service(handlers::woocommerce::lookup_customer)
            .service(handlers::woocommerce::test_connection)
            // WooCommerce bulk operations
            .service(handlers::woocommerce_bulk::export_all_orders)
            .service(handlers::woocommerce_bulk::export_all_products)
            .service(handlers::woocommerce_bulk::export_all_customers)
            .service(handlers::woocommerce_bulk::get_order)
            .service(handlers::woocommerce_bulk::get_product)
            .service(handlers::woocommerce_bulk::get_customer)
            // WooCommerce variations
            .service(handlers::woocommerce_variations::get_product_variations)
            .service(handlers::woocommerce_variations::get_product_variation)
            // WooCommerce write operations
            .service(handlers::woocommerce_write::create_product)
            .service(handlers::woocommerce_write::update_product)
            .service(handlers::woocommerce_write::delete_product)
            .service(handlers::woocommerce_write::create_customer)
            .service(handlers::woocommerce_write::update_customer)
            .service(handlers::woocommerce_write::delete_customer)
            .service(handlers::woocommerce_write::create_order)
            .service(handlers::woocommerce_write::update_order)
            // QuickBooks integration endpoints
            .service(handlers::quickbooks::lookup_customer)
            .service(handlers::quickbooks::lookup_item)
            .service(handlers::quickbooks::test_connection)
            // QuickBooks CRUD operations
            .service(handlers::quickbooks_crud::get_customer)
            .service(handlers::quickbooks_crud::update_customer)
            .service(handlers::quickbooks_crud::deactivate_customer)
            .service(handlers::quickbooks_crud::query_customer_by_name)
            .service(handlers::quickbooks_crud::get_item)
            .service(handlers::quickbooks_crud::update_item)
            .service(handlers::quickbooks_crud::deactivate_item)
            .service(handlers::quickbooks_crud::query_item_by_name)
            // QuickBooks transformation operations
            .service(handlers::quickbooks_transform::transform_customer)
            .service(handlers::quickbooks_transform::transform_product)
            .service(handlers::quickbooks_transform::transform_order)
            .service(handlers::quickbooks_transform::check_transaction_type)
            // QuickBooks invoice operations
            .service(handlers::quickbooks_invoice::get_invoice)
            .service(handlers::quickbooks_invoice::query_invoice)
            .service(handlers::quickbooks_invoice::create_invoice)
            .service(handlers::quickbooks_invoice::update_invoice)
            .service(handlers::quickbooks_invoice::delete_invoice)
            // QuickBooks sales operations
            .service(handlers::quickbooks_sales::get_sales_receipt)
            .service(handlers::quickbooks_sales::create_sales_receipt)
            .service(handlers::quickbooks_sales::update_sales_receipt)
            .service(handlers::quickbooks_sales::void_sales_receipt)
            .service(handlers::quickbooks_sales::get_payment)
            .service(handlers::quickbooks_sales::query_payments)
            .service(handlers::quickbooks_sales::create_payment)
            .service(handlers::quickbooks_sales::update_payment)
            .service(handlers::quickbooks_sales::delete_payment)
            // QuickBooks vendor operations
            .service(handlers::quickbooks_vendor::get_vendor)
            .service(handlers::quickbooks_vendor::query_vendor)
            .service(handlers::quickbooks_vendor::query_vendor_by_email)
            .service(handlers::quickbooks_vendor::create_vendor)
            .service(handlers::quickbooks_vendor::update_vendor)
            .service(handlers::quickbooks_vendor::deactivate_vendor)
            .service(handlers::quickbooks_vendor::reactivate_vendor)
            // QuickBooks bill operations
            .service(handlers::quickbooks_bill::get_bill)
            .service(handlers::quickbooks_bill::query_bills_by_vendor)
            .service(handlers::quickbooks_bill::query_bill_by_doc_number)
            .service(handlers::quickbooks_bill::create_bill)
            .service(handlers::quickbooks_bill::update_bill)
            .service(handlers::quickbooks_bill::delete_bill)
            // QuickBooks refund operations
            .service(handlers::quickbooks_refund::get_credit_memo)
            .service(handlers::quickbooks_refund::create_credit_memo)
            .service(handlers::quickbooks_refund::update_credit_memo)
            .service(handlers::quickbooks_refund::get_refund_receipt)
            .service(handlers::quickbooks_refund::create_refund_receipt)
            .service(handlers::quickbooks_refund::update_refund_receipt)
            .service(handlers::quickbooks_refund::void_refund_receipt)
            // OAuth token management
            .service(handlers::oauth_management::refresh_quickbooks_token)
            .service(handlers::oauth_management::revoke_quickbooks_token)
            .service(handlers::oauth_management::check_token_status)
            // Integration endpoints (protected with manage_settings permission)
            .service(
                web::scope("/api")
                    .configure(handlers::integrations::configure)
                    .configure(handlers::mappings::configure)
                    .configure(handlers::data_management::configure)
                    .wrap(require_permission("manage_settings"))
            )
            // Webhook endpoints (public - authenticated by signature)
            .service(
                web::scope("/api")
                    .configure(handlers::webhooks::configure)
                    .configure(handlers::sync_history::configure)
            )
            // Vendor operations (SKU matching, OCR, parsing, sync logging) - feature-gated: ocr
            .configure(|_cfg| {
                #[cfg(feature = "ocr")]
                {
                    handlers::vendor_operations::configure(_cfg);
                }
            })
            // Search operations (index management, barcode/SKU search)
            .configure(handlers::search_operations::configure)
            // Sync direction control (conflict resolution, sync configuration)
            .configure(handlers::sync_direction::configure)
            // Credential management (secure storage of integration credentials)
            .configure(handlers::credentials::configure)
            // Audit operations (payment and commission logging)
            .configure(handlers::audit_operations::configure)
            // Backup operations (chain management and stats)
            .configure(handlers::backup_operations::configure)
            // Scheduler operations (job management)
            .configure(handlers::scheduler_operations::configure)
            // Retention operations (backup cleanup)
            .configure(handlers::retention_operations::configure)
            // Settings resolution (hierarchical settings)
            .configure(handlers::settings_resolution::configure)
            // ID mapping operations (external ID management)
            .configure(handlers::id_mapping::configure)
            // Conflict operations (conflict detection and resolution)
            .configure(handlers::conflict_operations::configure)
            // File operations (file upload and management)
            .configure(handlers::file_operations::configure)
            // Receiving operations (inventory receiving)
            .configure(handlers::receiving_operations::configure)
            // Sales operations (POS checkout)
            .configure(handlers::sales::configure)
            // Tenant operations (multi-tenant context and configuration)
            .configure(handlers::tenant_operations::configure)
            // Supabase operations (data warehouse sync)
            .configure(handlers::supabase_operations::configure)
            // Schema operations (dynamic table creation)
            .configure(handlers::schema_operations::configure)
            // Settings CRUD operations (get, list, upsert, delete settings)
            .configure(handlers::settings_crud::configure)
            // User management operations (user CRUD)
            .configure(handlers::user_handlers::configure)
            // Session management (create, validate, terminate sessions)
            .configure(handlers::session_management::configure)
            // OCR operations (image preprocessing, multi-pass OCR) - feature-gated: ocr
            .configure(|_cfg| {
                #[cfg(feature = "ocr")]
                {
                    handlers::ocr_operations::configure(_cfg);
                    // OCR ingest endpoint (invoice file upload)
                    _cfg.service(
                        web::resource("/api/ocr/ingest")
                            .route(web::post().to(handlers::ocr_ingest::ingest_invoice))
                            .wrap(require_permission("upload_vendor_bills"))
                    );
                    // Review case endpoints
                    handlers::review_cases::configure(_cfg);
                    // Re-OCR and mask endpoints
                    handlers::reocr::configure(_cfg);
                }
            })
            // Export endpoints - feature-gated: export
            .configure(|_cfg| {
                #[cfg(feature = "export")]
                {
                    handlers::export::configure(_cfg);
                }
            })
            // Data Manager endpoints - feature-gated: integrations or full
            .configure(|_cfg| {
                #[cfg(any(feature = "integrations", feature = "full"))]
                {
                    handlers::data_manager::configure(_cfg);
                }
            })
            // Payments endpoints - feature-gated: payments or full
            .configure(|_cfg| {
                #[cfg(any(feature = "payments", feature = "full"))]
                {
                    handlers::payments::configure(_cfg);
                }
            })
            // Unit conversion (convert units, normalize quantities)
            .configure(handlers::unit_conversion::configure)
            // Theme operations (theme preferences with scope resolution)
            .configure(handlers::theme::configure)
            // Notification settings (email, Slack, webhook alerts) - feature-gated: notifications
            .configure(|_cfg| {
                #[cfg(feature = "notifications")]
                {
                    handlers::notifications::configure(_cfg);
                }
            })
            // Note: Network configuration routes are registered BEFORE ContextExtractor
            // to allow access during setup wizard without authentication
    })
    .bind((host.as_str(), port))?
    .run()
    .await
}


/// Run snapshot migration for historical transactions
async fn run_snapshot_migration() -> std::io::Result<()> {
    use accounting_snapshots::MigrationJob;
    
    println!("Starting snapshot migration...");
    println!();
    
    // Initialize database
    let pool = match db::init_pool().await {
        Ok(pool) => pool,
        Err(e) => {
            eprintln!("Failed to initialize database: {e}");
            std::process::exit(1);
        }
    };
    
    // Run migrations first
    if let Err(e) = db::migrations::run_migrations(&pool).await {
        eprintln!("Failed to run database migrations: {e}");
        std::process::exit(1);
    }
    
    // Create migration job
    let migration = MigrationJob::new(pool);
    
    // Run migration
    match migration.run().await {
        Ok(stats) => {
            println!("Migration complete!");
            println!();
            println!("Summary:");
            println!("  Total finalized transactions: {}", stats.total_transactions);
            println!("  Already had snapshots:        {}", stats.existing_snapshots);
            println!("  Snapshots created:            {}", stats.created_snapshots);
            println!("  Failed transactions:          {}", stats.failed_transactions);
            
            if !stats.failed_ids.is_empty() {
                println!();
                println!("Failed transaction IDs:");
                for id in &stats.failed_ids {
                    println!("  - {id}");
                }
            }
            
            if stats.failed_transactions > 0 {
                std::process::exit(1);
            }
        }
        Err(e) => {
            eprintln!("Migration failed: {e}");
            std::process::exit(1);
        }
    }
    
    Ok(())
}

/// Verify snapshot migration completeness
async fn verify_snapshot_migration() -> std::io::Result<()> {
    use accounting_snapshots::MigrationJob;
    
    println!("Verifying snapshot migration...");
    println!();
    
    // Initialize database
    let pool = match db::init_pool().await {
        Ok(pool) => pool,
        Err(e) => {
            eprintln!("Failed to initialize database: {e}");
            std::process::exit(1);
        }
    };
    
    // Create migration job
    let migration = MigrationJob::new(pool);
    
    // Verify
    match migration.verify().await {
        Ok(result) => {
            println!("Verification complete!");
            println!();
            println!("Results:");
            println!("  Finalized transactions: {}", result.finalized_transactions);
            println!("  Snapshots:              {}", result.snapshots);
            println!("  Missing snapshots:      {}", result.missing_snapshots);
            
            println!();
            if result.missing_transaction_ids.is_empty() {
                println!("✓ All finalized transactions have snapshots");
            } else {
                println!("Transactions without snapshots:");
                for id in &result.missing_transaction_ids {
                    println!("  - {id}");
                }
                std::process::exit(1);
            }
        }
        Err(e) => {
            eprintln!("Verification failed: {e}");
            std::process::exit(1);
        }
    }
    
    Ok(())
}

/// Rollback snapshot migration
async fn rollback_snapshot_migration() -> std::io::Result<()> {
    use accounting_snapshots::MigrationJob;
    
    println!("WARNING: This will delete all snapshots created by migration!");
    println!("Press Ctrl+C to cancel, or Enter to continue...");
    
    let mut input = String::new();
    std::io::stdin().read_line(&mut input)?;
    
    println!("Rolling back migration...");
    println!();
    
    // Initialize database
    let pool = match db::init_pool().await {
        Ok(pool) => pool,
        Err(e) => {
            eprintln!("Failed to initialize database: {e}");
            std::process::exit(1);
        }
    };
    
    // Create migration job
    let migration = MigrationJob::new(pool);
    
    // Rollback
    match migration.rollback().await {
        Ok(deleted) => {
            println!("Rollback complete!");
            println!("  Deleted {deleted} snapshots");
        }
        Err(e) => {
            eprintln!("Rollback failed: {e}");
            std::process::exit(1);
        }
    }
    
    Ok(())
}
/// Validate production configuration for security
/// 
/// [2026-01-29] Extended to validate QuickBooks OAuth redirect URI
/// per docs/integrations/truth_sync/02_CONSOLIDATION_PLAN.md TASK-001
fn validate_production_config(config: &config::Config, profile: config::RuntimeProfile) -> std::io::Result<()> {
    if profile.is_prod() {
        // Validate JWT secret strength
        let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_default();
        if jwt_secret.len() < 32 {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "JWT_SECRET must be at least 32 characters for production"
            ));
        }
        
        // Validate store and tenant IDs are not defaults
        if config.store_id.starts_with("default") || config.store_id.starts_with("dev") {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "STORE_ID must be unique for production deployment"
            ));
        }
        
        let tenant_id = std::env::var("TENANT_ID").unwrap_or_default();
        if tenant_id.starts_with("tenant_default") || tenant_id.starts_with("dev") {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "TENANT_ID must be unique for production deployment"
            ));
        }
        
        // [2026-01-29] Validate QuickBooks OAuth redirect URI is configured and not localhost
        // This prevents OAuth flow failures in production
        if let Ok(qb_redirect) = std::env::var("QUICKBOOKS_REDIRECT_URI") {
            if qb_redirect.contains("localhost") || qb_redirect.contains("127.0.0.1") {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::InvalidInput,
                    "QUICKBOOKS_REDIRECT_URI cannot use localhost in production. Use your public domain."
                ));
            }
        }
        // Note: QUICKBOOKS_REDIRECT_URI is optional - only validated if QuickBooks integration is used
        // The handler will return a clear error if it's needed but not set
        
        tracing::info!("Production configuration validation passed");
    }
    
    Ok(())
}
