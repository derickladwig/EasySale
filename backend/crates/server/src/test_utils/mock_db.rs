//! Mock database utilities for testing
//!
//! Provides helpers for creating and managing test databases

use sqlx::{Pool, Sqlite, SqlitePool};

/// Create a fresh in-memory database
pub async fn create_mock_db() -> Result<Pool<Sqlite>, sqlx::Error> {
    SqlitePool::connect(":memory:").await
}

/// Create a mock database with basic schema
pub async fn create_mock_db_with_schema() -> Result<Pool<Sqlite>, sqlx::Error> {
    let pool = create_mock_db().await?;
    
    // Create basic tables for testing
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            sku TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            cost REAL NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0,
            min_stock INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        "#,
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_mock_db() {
        let result = create_mock_db().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_create_mock_db_with_schema() {
        let pool = create_mock_db_with_schema().await.unwrap();
        
        // Verify tables were created
        let result = sqlx::query("SELECT name FROM sqlite_master WHERE type='table'")
            .fetch_all(&pool)
            .await;
        
        assert!(result.is_ok());
        let tables = result.unwrap();
        assert!(tables.len() >= 3); // users, products, sessions
    }

    #[tokio::test]
    async fn test_insert_user() {
        let pool = create_mock_db_with_schema().await.unwrap();
        
        let result = sqlx::query(
            "INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)"
        )
        .bind("user-001")
        .bind("testuser")
        .bind("test@example.com")
        .bind("hash")
        .bind("admin")
        .execute(&pool)
        .await;
        
        assert!(result.is_ok());
    }
}
