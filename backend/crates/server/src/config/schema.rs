use super::error::{ConfigError, ConfigResult};
use super::models::{DatabaseConfig, CustomTableConfig, CustomColumnConfig};

/// SQL type mapping for custom columns
#[derive(Debug, Clone)]
/// SQL type mapping for dynamic schema generation
/// 
/// Note: Currently unused - reserved for future dynamic schema generation from tenant config.
#[allow(dead_code)]
pub enum SqlType {
    Text,
    Integer,
    Real,
    Boolean,
    Date,
    DateTime,
    Json,
}

impl SqlType {
    /// Convert configuration column type to SQL type
    pub fn from_config_type(type_str: &str) -> ConfigResult<Self> {
        match type_str.to_lowercase().as_str() {
            "string" | "text" => Ok(SqlType::Text),
            "number" | "integer" | "int" => Ok(SqlType::Integer),
            "float" | "real" | "decimal" => Ok(SqlType::Real),
            "boolean" | "bool" => Ok(SqlType::Boolean),
            "date" => Ok(SqlType::Date),
            "datetime" | "timestamp" => Ok(SqlType::DateTime),
            "json" | "object" | "array" => Ok(SqlType::Json),
            "enum" => Ok(SqlType::Text), // Enums stored as text with CHECK constraint
            _ => Err(ConfigError::SchemaError(format!("Unknown column type: {}", type_str))),
        }
    }

    /// Get SQL type string for SQLite
    pub fn to_sql(&self) -> &str {
        match self {
            SqlType::Text => "TEXT",
            SqlType::Integer => "INTEGER",
            SqlType::Real => "REAL",
            SqlType::Boolean => "INTEGER", // SQLite uses 0/1 for boolean
            SqlType::Date => "TEXT", // ISO 8601 format
            SqlType::DateTime => "TEXT", // ISO 8601 format
            SqlType::Json => "TEXT", // JSON stored as text
        }
    }
}

/// Schema generator for dynamic tables and columns
/// Schema generator for dynamic table/column creation
/// 
/// Note: Currently unused - reserved for future dynamic schema generation from tenant config.
#[allow(dead_code)]
pub struct SchemaGenerator;

impl SchemaGenerator {

    /// Create SQL for creating a custom table
    pub fn create_table_migration(table: &CustomTableConfig) -> ConfigResult<String> {
        Self::validate_table_name(&table.name)?;

        let mut sql = format!("CREATE TABLE IF NOT EXISTS {} (\n", table.name);
        
        // Add ID column (primary key)
        sql.push_str("    id INTEGER PRIMARY KEY AUTOINCREMENT,\n");

        // Add custom columns
        for (i, column) in table.columns.iter().enumerate() {
            let column_def = Self::generate_column_definition(column)?;
            sql.push_str(&format!("    {}", column_def));
            
            if i < table.columns.len() - 1 {
                sql.push_str(",\n");
            } else {
                sql.push('\n');
            }
        }

        // Add standard audit columns
        sql.push_str(",\n    created_at TEXT NOT NULL DEFAULT (datetime('now'))");
        sql.push_str(",\n    updated_at TEXT NOT NULL DEFAULT (datetime('now'))");
        sql.push_str(",\n    deleted_at TEXT");
        
        sql.push_str("\n);");

        // Add indexes
        let mut indexes = Vec::new();
        
        // Index on deleted_at for soft delete queries
        indexes.push(format!(
            "CREATE INDEX IF NOT EXISTS idx_{}_{} ON {} ({});",
            table.name, "deleted_at", table.name, "deleted_at"
        ));

        // Index on unique columns
        for column in &table.columns {
            if column.unique.unwrap_or(false) {
                indexes.push(format!(
                    "CREATE UNIQUE INDEX IF NOT EXISTS idx_{}_{} ON {} ({});",
                    table.name, column.name, table.name, column.name
                ));
            }
        }

        // Combine table creation and indexes
        let mut full_migration = sql;
        for index in indexes {
            full_migration.push_str("\n\n");
            full_migration.push_str(&index);
        }

        Ok(full_migration)
    }

    /// Create SQL for adding a column to an existing table
    pub fn add_column_migration(table_name: &str, column: &CustomColumnConfig) -> ConfigResult<String> {
        Self::validate_table_name(table_name)?;
        
        let column_def = Self::generate_column_definition(column)?;
        
        Ok(format!(
            "ALTER TABLE {} ADD COLUMN {};",
            table_name, column_def
        ))
    }

    /// Generate column definition SQL
    fn generate_column_definition(column: &CustomColumnConfig) -> ConfigResult<String> {
        Self::validate_column_name(&column.name)?;

        let sql_type = SqlType::from_config_type(&column.col_type)?;
        let mut def = format!("{} {}", column.name, sql_type.to_sql());

        // Add NOT NULL constraint
        if column.required.unwrap_or(false) {
            def.push_str(" NOT NULL");
        }

        // Add DEFAULT value
        if let Some(default) = &column.default {
            let default_str = Self::format_default_value(default, &sql_type)?;
            def.push_str(&format!(" DEFAULT {}", default_str));
        }

        // Add CHECK constraint for enums
        if column.col_type == "enum" {
            if let Some(values) = &column.values {
                let values_str = values
                    .iter()
                    .map(|v| format!("'{}'", v.replace('\'', "''")))
                    .collect::<Vec<_>>()
                    .join(", ");
                def.push_str(&format!(" CHECK ({} IN ({}))", column.name, values_str));
            } else {
                return Err(ConfigError::SchemaError(
                    format!("Enum column '{}' must have 'values' defined", column.name)
                ));
            }
        }

        Ok(def)
    }

    /// Format default value for SQL
    fn format_default_value(value: &serde_json::Value, sql_type: &SqlType) -> ConfigResult<String> {
        match (value, sql_type) {
            (serde_json::Value::String(s), SqlType::Text | SqlType::Date | SqlType::DateTime) => {
                Ok(format!("'{}'", s.replace('\'', "''")))
            }
            (serde_json::Value::Number(n), SqlType::Integer) => {
                Ok(n.as_i64().unwrap_or(0).to_string())
            }
            (serde_json::Value::Number(n), SqlType::Real) => {
                Ok(n.as_f64().unwrap_or(0.0).to_string())
            }
            (serde_json::Value::Bool(b), SqlType::Boolean) => {
                Ok(if *b { "1" } else { "0" }.to_string())
            }
            (serde_json::Value::Null, _) => Ok("NULL".to_string()),
            (v, SqlType::Json) => {
                Ok(format!("'{}'", serde_json::to_string(v).unwrap().replace('\'', "''")))
            }
            _ => Err(ConfigError::SchemaError(
                format!("Invalid default value {:?} for type {:?}", value, sql_type)
            )),
        }
    }

    /// Validate table name (prevent SQL injection)
    fn validate_table_name(name: &str) -> ConfigResult<()> {
        if name.is_empty() {
            return Err(ConfigError::SchemaError("Table name cannot be empty".to_string()));
        }

        // Only allow alphanumeric and underscore
        if !name.chars().all(|c| c.is_alphanumeric() || c == '_') {
            return Err(ConfigError::SchemaError(
                format!("Invalid table name '{}': only alphanumeric and underscore allowed", name)
            ));
        }

        // Must start with letter or underscore
        if !name.chars().next().unwrap().is_alphabetic() && !name.starts_with('_') {
            return Err(ConfigError::SchemaError(
                format!("Invalid table name '{}': must start with letter or underscore", name)
            ));
        }

        // Check against SQLite reserved words
        let reserved = ["table", "index", "select", "insert", "update", "delete", "drop", "create"];
        if reserved.contains(&name.to_lowercase().as_str()) {
            return Err(ConfigError::SchemaError(
                format!("Table name '{}' is a reserved SQL keyword", name)
            ));
        }

        Ok(())
    }

    /// Validate column name (prevent SQL injection)
    fn validate_column_name(name: &str) -> ConfigResult<()> {
        if name.is_empty() {
            return Err(ConfigError::SchemaError("Column name cannot be empty".to_string()));
        }

        // Only allow alphanumeric and underscore
        if !name.chars().all(|c| c.is_alphanumeric() || c == '_') {
            return Err(ConfigError::SchemaError(
                format!("Invalid column name '{}': only alphanumeric and underscore allowed", name)
            ));
        }

        // Must start with letter or underscore
        if !name.chars().next().unwrap().is_alphabetic() && !name.starts_with('_') {
            return Err(ConfigError::SchemaError(
                format!("Invalid column name '{}': must start with letter or underscore", name)
            ));
        }

        Ok(())
    }

    /// Generate CREATE TABLE statement for a custom table
    pub fn create_custom_table(table: &CustomTableConfig) -> ConfigResult<String> {
        Self::create_table_migration(table)
    }

    /// Check if a table exists in the database
    pub async fn table_exists(pool: &sqlx::SqlitePool, table_name: &str) -> ConfigResult<bool> {
        let result = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?"
        )
        .bind(table_name)
        .fetch_one(pool)
        .await
        .map_err(|e| ConfigError::SchemaError(format!("Failed to check table existence: {}", e)))?;

        Ok(result > 0)
    }

    /// Check if a column exists in a table
    pub async fn column_exists(
        pool: &sqlx::SqlitePool,
        table_name: &str,
        column_name: &str,
    ) -> ConfigResult<bool> {
        let result = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM pragma_table_info(?) WHERE name=?"
        )
        .bind(table_name)
        .bind(column_name)
        .fetch_one(pool)
        .await
        .map_err(|e| ConfigError::SchemaError(format!("Failed to check column existence: {}", e)))?;

        Ok(result > 0)
    }

    /// Apply database configuration to the database
    pub async fn apply_config(
        pool: &sqlx::SqlitePool,
        db_config: &DatabaseConfig,
    ) -> ConfigResult<Vec<String>> {
        let mut applied_migrations = Vec::new();

        // Create custom tables
        if let Some(custom_tables) = &db_config.custom_tables {
            for table in custom_tables {
                if !Self::table_exists(pool, &table.name).await? {
                    let migration = Self::create_table_migration(table)?;
                    
                    sqlx::query(&migration)
                        .execute(pool)
                        .await
                        .map_err(|e| ConfigError::SchemaError(
                            format!("Failed to create table '{}': {}", table.name, e)
                        ))?;
                    
                    applied_migrations.push(format!("Created table: {}", table.name));
                }
            }
        }

        // Add custom columns to existing tables
        if let Some(custom_columns) = &db_config.custom_columns {
            for (table_name, columns) in custom_columns {
                // Check if table exists
                if !Self::table_exists(pool, table_name).await? {
                    return Err(ConfigError::SchemaError(
                        format!("Cannot add columns to non-existent table '{}'", table_name)
                    ));
                }

                for column in columns {
                    if !Self::column_exists(pool, table_name, &column.name).await? {
                        let migration = Self::add_column_migration(table_name, column)?;
                        
                        sqlx::query(&migration)
                            .execute(pool)
                            .await
                            .map_err(|e| ConfigError::SchemaError(
                                format!("Failed to add column '{}.{}': {}", table_name, column.name, e)
                            ))?;
                        
                        applied_migrations.push(format!("Added column: {}.{}", table_name, column.name));
                    }
                }
            }
        }

        Ok(applied_migrations)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sql_type_conversion() {
        assert!(matches!(SqlType::from_config_type("string").unwrap(), SqlType::Text));
        assert!(matches!(SqlType::from_config_type("number").unwrap(), SqlType::Integer));
        assert!(matches!(SqlType::from_config_type("boolean").unwrap(), SqlType::Boolean));
        assert!(matches!(SqlType::from_config_type("date").unwrap(), SqlType::Date));
        assert!(matches!(SqlType::from_config_type("json").unwrap(), SqlType::Json));
    }

    #[test]
    fn test_create_table_migration() {
        let table = CustomTableConfig {
            name: "custom_products".to_string(),
            columns: vec![
                CustomColumnConfig {
                    name: "name".to_string(),
                    label: Some("Product Name".to_string()),
                    col_type: "string".to_string(),
                    required: Some(true),
                    unique: Some(false),
                    default: None,
                    values: None,
                },
                CustomColumnConfig {
                    name: "price".to_string(),
                    label: Some("Price".to_string()),
                    col_type: "number".to_string(),
                    required: Some(true),
                    unique: Some(false),
                    default: Some(serde_json::json!(0)),
                    values: None,
                },
                CustomColumnConfig {
                    name: "status".to_string(),
                    label: Some("Status".to_string()),
                    col_type: "enum".to_string(),
                    required: Some(true),
                    unique: Some(false),
                    default: Some(serde_json::json!("active")),
                    values: Some(vec!["active".to_string(), "inactive".to_string()]),
                },
            ],
        };

        let sql = SchemaGenerator::create_table_migration(&table).unwrap();
        
        assert!(sql.contains("CREATE TABLE IF NOT EXISTS custom_products"));
        assert!(sql.contains("name TEXT NOT NULL"));
        assert!(sql.contains("price INTEGER NOT NULL DEFAULT 0"));
        assert!(sql.contains("status TEXT NOT NULL DEFAULT 'active'"));
        assert!(sql.contains("CHECK (status IN ('active', 'inactive'))"));
        assert!(sql.contains("created_at TEXT NOT NULL"));
        assert!(sql.contains("updated_at TEXT NOT NULL"));
        assert!(sql.contains("deleted_at TEXT"));
    }

    #[test]
    fn test_add_column_migration() {
        let column = CustomColumnConfig {
            name: "custom_field".to_string(),
            label: Some("Custom Field".to_string()),
            col_type: "string".to_string(),
            required: Some(false),
            unique: Some(false),
            default: None,
            values: None,
        };

        let sql = SchemaGenerator::add_column_migration("products", &column).unwrap();
        
        assert_eq!(sql, "ALTER TABLE products ADD COLUMN custom_field TEXT;");
    }

    #[test]
    fn test_validate_table_name() {
        assert!(SchemaGenerator::validate_table_name("valid_table").is_ok());
        assert!(SchemaGenerator::validate_table_name("_valid").is_ok());
        assert!(SchemaGenerator::validate_table_name("table123").is_ok());
        
        assert!(SchemaGenerator::validate_table_name("").is_err());
        assert!(SchemaGenerator::validate_table_name("123table").is_err());
        assert!(SchemaGenerator::validate_table_name("table-name").is_err());
        assert!(SchemaGenerator::validate_table_name("table name").is_err());
        assert!(SchemaGenerator::validate_table_name("select").is_err());
    }

    #[test]
    fn test_validate_column_name() {
        assert!(SchemaGenerator::validate_column_name("valid_column").is_ok());
        assert!(SchemaGenerator::validate_column_name("_valid").is_ok());
        assert!(SchemaGenerator::validate_column_name("column123").is_ok());
        
        assert!(SchemaGenerator::validate_column_name("").is_err());
        assert!(SchemaGenerator::validate_column_name("123column").is_err());
        assert!(SchemaGenerator::validate_column_name("column-name").is_err());
        assert!(SchemaGenerator::validate_column_name("column name").is_err());
    }

    #[test]
    fn test_format_default_value() {
        let sql_type = SqlType::Text;
        let value = serde_json::json!("default");
        assert_eq!(
            SchemaGenerator::format_default_value(&value, &sql_type).unwrap(),
            "'default'"
        );

        let sql_type = SqlType::Integer;
        let value = serde_json::json!(42);
        assert_eq!(
            SchemaGenerator::format_default_value(&value, &sql_type).unwrap(),
            "42"
        );

        let sql_type = SqlType::Boolean;
        let value = serde_json::json!(true);
        assert_eq!(
            SchemaGenerator::format_default_value(&value, &sql_type).unwrap(),
            "1"
        );
    }
}
