//! Test utilities and helpers for backend testing
//!
//! This module provides common test utilities including:
//! - Mock database setup
//! - Test fixtures
//! - Helper functions for testing

pub mod fixtures;
pub mod mock_db;

use sqlx::{Pool, Sqlite, SqlitePool};
use std::sync::Once;

static INIT: Once = Once::new();

/// Initialize test environment (logging, etc.)
pub fn init_test_env() {
    INIT.call_once(|| {
        // Initialize test logging
        let _ = tracing_subscriber::fmt()
            .with_test_writer()
            .with_max_level(tracing::Level::DEBUG)
            .try_init();
    });
}

/// Create an in-memory SQLite database for testing
pub async fn create_test_db() -> Result<Pool<Sqlite>, sqlx::Error> {
    let pool = SqlitePool::connect(":memory:").await?;
    
    // Run migrations to create schema
    crate::db::migrations::run_migrations(&pool)
        .await
        .map_err(|e| sqlx::Error::Protocol(e.to_string()))?;
    
    Ok(pool)
}

/// Create a test database with seed data
pub async fn create_test_db_with_data() -> Result<Pool<Sqlite>, sqlx::Error> {
    let pool = create_test_db().await?;
    
    // Insert seed data here
    // fixtures::seed_users(&pool).await?;
    // fixtures::seed_products(&pool).await?;
    
    Ok(pool)
}

/// Alias for create_test_db for compatibility
pub async fn create_test_pool() -> Pool<Sqlite> {
    create_test_db().await.expect("Failed to create test pool")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_test_db() {
        init_test_env();
        let pool = create_test_db().await;
        assert!(pool.is_ok());
    }
}
