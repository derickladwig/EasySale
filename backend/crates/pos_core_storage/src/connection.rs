//! Database connection management

use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use std::env;
use std::path::Path;
use std::time::Duration;

use crate::error::{StorageError, StorageResult};

/// Type alias for the database pool
pub type DatabasePool = SqlitePool;

/// Initialize database connection pool with configuration
///
/// # Configuration
///
/// The database path is read from the `DATABASE_PATH` environment variable.
/// If not set, defaults to `./data/pos.db`.
///
/// Special values:
/// - `:memory:` - Creates an in-memory database with shared cache
/// - `sqlite:...` - Uses the provided `SQLite` URL directly
/// - Any other path - Creates a file-based database at that location
///
/// # Errors
///
/// Returns `StorageError::ConnectionError` if:
/// - The database directory cannot be created
/// - The database connection cannot be established
/// - The connection pool cannot be initialized
pub async fn init_pool() -> StorageResult<DatabasePool> {
    let database_path = env::var("DATABASE_PATH")
        .unwrap_or_else(|_| "./data/pos.db".to_string());
    
    tracing::info!("Initializing database at: {}", database_path);
    
    // Handle different database path formats
    let database_url = if database_path == ":memory:" {
        // Use shared cache for in-memory database so migrations work
        "sqlite::memory:?cache=shared".to_string()
    } else if database_path.starts_with("sqlite:") {
        // Already has sqlite: prefix - add create_if_missing
        format!("{database_path}?mode=rwc")
    } else {
        // Ensure parent directory exists for file-based databases
        if let Some(parent) = Path::new(&database_path).parent() {
            if !parent.exists() {
                tracing::info!("Creating database directory: {:?}", parent);
                std::fs::create_dir_all(parent).map_err(|e| {
                    tracing::error!("Failed to create database directory: {}", e);
                    StorageError::ConfigurationError(
                        format!("Failed to create database directory: {e}")
                    )
                })?;
            }
        }
        
        // Add sqlite: prefix for file paths with create_if_missing mode
        format!("sqlite:{database_path}?mode=rwc")
    };
    
    tracing::info!("Connecting to database with URL: {}", database_url);
    
    // Create connection pool with sensible defaults
    let pool = SqlitePoolOptions::new()
        .max_connections(5) // Reasonable for SQLite
        .acquire_timeout(Duration::from_secs(30))
        .connect(&database_url)
        .await
        .map_err(|e| {
            tracing::error!("Failed to connect to database: {}", e);
            StorageError::ConnectionError(e.to_string())
        })?;
    
    tracing::info!("Database connection pool established successfully");
    
    Ok(pool)
}

/// Initialize database pool with custom configuration
///
/// # Arguments
///
/// * `database_url` - The `SQLite` database URL
/// * `max_connections` - Maximum number of connections in the pool
/// * `acquire_timeout` - Timeout for acquiring a connection from the pool
///
/// # Errors
///
/// Returns `StorageError::ConnectionError` if the connection cannot be established
pub async fn init_pool_with_config(
    database_url: &str,
    max_connections: u32,
    acquire_timeout: Duration,
) -> StorageResult<DatabasePool> {
    tracing::info!("Initializing database pool with custom config");
    
    let pool = SqlitePoolOptions::new()
        .max_connections(max_connections)
        .acquire_timeout(acquire_timeout)
        .connect(database_url)
        .await
        .map_err(|e| {
            tracing::error!("Failed to connect to database: {}", e);
            StorageError::ConnectionError(e.to_string())
        })?;
    
    tracing::info!("Database connection pool established successfully");
    
    Ok(pool)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_init_pool_memory() {
        // Set environment variable for in-memory database
        env::set_var("DATABASE_PATH", ":memory:");
        
        let result = init_pool().await;
        assert!(result.is_ok());
        
        let pool = result.unwrap();
        
        // Verify we can execute a query
        let result = sqlx::query("SELECT 1")
            .execute(&pool)
            .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_init_pool_with_config() {
        let result = init_pool_with_config(
            "sqlite::memory:",
            3,
            Duration::from_secs(10),
        ).await;
        
        assert!(result.is_ok());
    }
}
