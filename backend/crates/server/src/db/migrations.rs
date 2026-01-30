use sqlx::SqlitePool;
use std::fs;

/// Run database migrations
pub async fn run_migrations(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    tracing::info!("Running database migrations...");

    // Create migrations tracking table if it doesn't exist
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS _migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )"
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create migrations table: {}", e))?;

    // Read and execute migration files in order
    let migrations = vec![
        "migrations/001_initial_schema.sql",
        "migrations/002_sales_customer_management.sql",
        "migrations/003_offline_sync.sql",
        "migrations/004_products_and_fitment.sql",
        "migrations/005_enhance_user_model.sql",
        "migrations/006_add_user_store_station.sql",
        "migrations/007_seed_default_admin.sql",
        "migrations/008_backup_subsystem.sql",
        "migrations/009_add_tenant_id.sql",
        "migrations/010_add_tenant_id_to_backups.sql",
        "migrations/011_backup_download_tokens.sql",
        "migrations/012_product_search_index.sql",
        "migrations/013_product_variants_table.sql",
        "migrations/014_product_relationships_table.sql",
        "migrations/015_product_price_history_table.sql",
        "migrations/016_product_templates_table.sql",
        "migrations/017_vendors_table.sql",
        "migrations/018_vendor_bills_table.sql",
        "migrations/019_vendor_bill_parses_table.sql",
        "migrations/020_vendor_bill_lines_table.sql",
        "migrations/021_create_backups_table.sql",
        "migrations/022_vendor_sku_aliases_table.sql",
        "migrations/023_performance_indexes.sql",
        "migrations/024_vendor_templates_table.sql",
        "migrations/025_integration_credentials.sql",
        "migrations/026_field_mappings.sql",
        "migrations/027_field_mappings_extended.sql",
        "migrations/028_sync_direction_control.sql",
        "migrations/029_sync_schedules.sql",
        "migrations/030_oauth_states.sql",
        "migrations/031_confirmation_tokens.sql",
        "migrations/032_sync_logs.sql",
        "migrations/033_webhook_configs.sql",
        "migrations/034_notification_configs.sql",
        "migrations/035_settings_table.sql",
        "migrations/036_feature_flags_table.sql",
        "migrations/037_add_display_name_to_users.sql",
        "migrations/038_integration_sync_state.sql",
        "migrations/039_remove_mock_data.sql",
        "migrations/040_theme_preferences.sql",
        "migrations/041_settings_registry_keys.sql",
        "migrations/042_accounting_tables.sql",
        "migrations/043_review_cases_tables.sql",
        "migrations/045_update_tenant_id_to_default.sql",
    ];

    for migration_file in migrations {
        // Check if migration has already been applied
        let already_applied: Option<(i32,)> = sqlx::query_as(
            "SELECT 1 FROM _migrations WHERE name = ?"
        )
        .bind(migration_file)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Failed to check migration status: {}", e))?;

        if already_applied.is_some() {
            tracing::debug!("Migration already applied, skipping: {}", migration_file);
            continue;
        }

        tracing::info!("Applying migration: {}", migration_file);
        
        let sql = fs::read_to_string(migration_file)
            .map_err(|e| format!("Failed to read migration file {}: {}", migration_file, e))?;

        // Parse SQL statements properly, handling parentheses
        let statements = parse_sql_statements(&sql);
        
        // Execute all statements - SQLite doesn't support true transactions for DDL,
        // but we execute all statements before recording the migration as complete
        let mut executed_count = 0;
        for (idx, statement) in statements.iter().enumerate() {
            let trimmed = statement.trim();
            if !trimmed.is_empty() && !trimmed.starts_with("--") {
                tracing::debug!("Executing statement {} in {}: {}...", idx, migration_file, &trimmed[..trimmed.len().min(60)]);
                match sqlx::query(trimmed).execute(pool).await {
                    Ok(_result) => {
                        executed_count += 1;
                    }
                    Err(e) => {
                        tracing::error!("Migration {} failed at statement {}: {}", migration_file, idx, e);
                        tracing::error!("SQL: {}", trimmed);
                        return Err(format!("Failed to execute migration {} statement {}: {}", migration_file, idx, e).into());
                    }
                }
            }
        }

        // Only record migration as applied after ALL statements succeed
        sqlx::query("INSERT INTO _migrations (name) VALUES (?)")
            .bind(migration_file)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to record migration {}: {}", migration_file, e))?;

        tracing::info!("Migration applied successfully: {} ({} statements)", migration_file, executed_count);
    }

    tracing::info!("Database migrations completed successfully");
    Ok(())
}

/// Parse SQL statements, properly handling semicolons inside parentheses, BEGIN...END blocks, and SQL comments
fn parse_sql_statements(sql: &str) -> Vec<String> {
    let mut statements = Vec::new();
    let mut current = String::new();
    let mut paren_depth = 0;
    let mut begin_end_depth: i32 = 0;
    let mut in_string = false;
    let mut string_char = ' ';
    let mut in_line_comment = false;
    
    let chars: Vec<char> = sql.chars().collect();
    let mut i = 0;
    
    while i < chars.len() {
        let c = chars[i];
        
        // Handle line comments (-- ...)
        if !in_string && !in_line_comment && c == '-' && i + 1 < chars.len() && chars[i + 1] == '-' {
            in_line_comment = true;
            i += 2;
            continue;
        }
        
        // End of line comment
        if in_line_comment {
            if c == '\n' {
                in_line_comment = false;
                current.push(c);
            }
            i += 1;
            continue;
        }
        
        // Handle string literals
        if !in_string && (c == '\'' || c == '"') {
            in_string = true;
            string_char = c;
            current.push(c);
        } else if in_string && c == string_char {
            // Check for escaped quote
            if i + 1 < chars.len() && chars[i + 1] == string_char {
                current.push(c);
                current.push(c);
                i += 1;
            } else {
                in_string = false;
                current.push(c);
            }
        } else if in_string {
            current.push(c);
        } else if c == '(' {
            paren_depth += 1;
            current.push(c);
        } else if c == ')' {
            paren_depth -= 1;
            current.push(c);
        } else {
            // Check for BEGIN keyword (case-insensitive)
            if !in_string && c.to_ascii_uppercase() == 'B' {
                let remaining: String = chars[i..].iter().take(5).collect();
                if remaining.to_uppercase() == "BEGIN" {
                    // Check if it's a word boundary (not part of another word)
                    let before_ok = i == 0 || !chars[i-1].is_alphanumeric();
                    let after_ok = i + 5 >= chars.len() || !chars[i+5].is_alphanumeric();
                    if before_ok && after_ok {
                        begin_end_depth += 1;
                    }
                }
            }
            
            // Check for END keyword (case-insensitive)
            if !in_string && c.to_ascii_uppercase() == 'E' {
                let remaining: String = chars[i..].iter().take(3).collect();
                if remaining.to_uppercase() == "END" {
                    // Check if it's a word boundary (not part of another word)
                    let before_ok = i == 0 || !chars[i-1].is_alphanumeric();
                    let after_ok = i + 3 >= chars.len() || !chars[i+3].is_alphanumeric();
                    if before_ok && after_ok {
                        // Don't decrement yet - wait until after the semicolon
                        current.push(c);
                        i += 1;
                        // Skip to the semicolon
                        while i < chars.len() && chars[i].is_whitespace() {
                            current.push(chars[i]);
                            i += 1;
                        }
                        if i < chars.len() && chars[i] == ';' {
                            current.push(';');
                            begin_end_depth = begin_end_depth.saturating_sub(1);
                            i += 1;
                        }
                        continue;
                    }
                }
            }
            
            // Handle semicolon - only split if not inside parens or BEGIN...END
            if c == ';' && paren_depth == 0 && begin_end_depth == 0 {
                // End of statement
                let trimmed = current.trim();
                if !trimmed.is_empty() {
                    statements.push(trimmed.to_string());
                }
                current.clear();
            } else {
                current.push(c);
            }
        }
        
        i += 1;
    }
    
    // Don't forget the last statement if it doesn't end with semicolon
    let trimmed = current.trim();
    if !trimmed.is_empty() {
        statements.push(trimmed.to_string());
    }
    
    statements
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::create_test_db;

    #[tokio::test]
    async fn test_run_migrations() {
        let pool = create_test_db().await.unwrap();
        let result = run_migrations(&pool).await;
        
        // Migrations should succeed
        assert!(result.is_ok());

        // Verify tables were created
        let tables: Vec<(String,)> = sqlx::query_as(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        .fetch_all(&pool)
        .await
        .unwrap();

        let table_names: Vec<String> = tables.into_iter().map(|(name,)| name).collect();
        assert!(table_names.contains(&"users".to_string()));
        assert!(table_names.contains(&"sessions".to_string()));
    }
}
