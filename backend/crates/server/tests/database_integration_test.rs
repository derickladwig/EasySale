/// Database Integration Tests
///
/// These tests verify that:
/// 1. Migrations run successfully on an empty database
/// 2. CRUD operations work correctly for all tables
/// 3. Referential integrity constraints are enforced
/// 4. Indexes are created and functional

use sqlx::{SqlitePool, Row};
use std::fs;
use std::path::Path;

/// Helper function to create a test database with migrations
async fn setup_test_db() -> SqlitePool {
    // Create in-memory database
    let pool = SqlitePool::connect(":memory:")
        .await
        .expect("Failed to create test database");
    
    // Run migrations
    let migration_dir = Path::new("migrations");
    let mut migrations: Vec<_> = fs::read_dir(migration_dir)
        .expect("Failed to read migrations directory")
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry.path().extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext == "sql")
                .unwrap_or(false)
        })
        .collect();
    
    // Sort migrations by filename
    migrations.sort_by_key(|entry| entry.file_name());
    
    // Execute each migration
    for migration in migrations {
        let sql = fs::read_to_string(migration.path())
            .expect("Failed to read migration file");
        
        sqlx::query(&sql)
            .execute(&pool)
            .await
            .expect("Failed to execute migration");
    }
    
    pool
}

#[tokio::test]
async fn test_migrations_run_successfully() {
    // Test that all migrations can be applied to an empty database
    let pool = setup_test_db().await;
    
    // Verify tables exist
    let tables: Vec<String> = sqlx::query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .fetch_all(&pool)
        .await
        .expect("Failed to query tables")
        .iter()
        .map(|row| row.get::<String, _>("name"))
        .collect();
    
    assert!(tables.contains(&"users".to_string()), "users table should exist");
    assert!(tables.contains(&"sessions".to_string()), "sessions table should exist");
}

#[tokio::test]
async fn test_users_crud_operations() {
    let pool = setup_test_db().await;
    
    // CREATE: Insert a new user
    let user_id = "test-user-001";
    let username = "testuser";
    let email = "test@example.com";
    let password_hash = "$argon2id$v=19$m=19456,t=2,p=1$test$testhash";
    let role = "cashier";
    
    let result = sqlx::query(
        "INSERT INTO users (id, username, email, password_hash, role, first_name, last_name) 
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(user_id)
    .bind(username)
    .bind(email)
    .bind(password_hash)
    .bind(role)
    .bind("Test")
    .bind("User")
    .execute(&pool)
    .await;
    
    assert!(result.is_ok(), "Failed to insert user");
    
    // READ: Query the user
    let user = sqlx::query("SELECT * FROM users WHERE id = ?")
        .bind(user_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch user");
    
    assert_eq!(user.get::<String, _>("username"), username);
    assert_eq!(user.get::<String, _>("email"), email);
    assert_eq!(user.get::<String, _>("role"), role);
    
    // UPDATE: Modify the user
    let new_email = "newemail@example.com";
    let update_result = sqlx::query("UPDATE users SET email = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(new_email)
        .bind(user_id)
        .execute(&pool)
        .await;
    
    assert!(update_result.is_ok(), "Failed to update user");
    
    // Verify update
    let updated_user = sqlx::query("SELECT email FROM users WHERE id = ?")
        .bind(user_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch updated user");
    
    assert_eq!(updated_user.get::<String, _>("email"), new_email);
    
    // DELETE: Remove the user
    let delete_result = sqlx::query("DELETE FROM users WHERE id = ?")
        .bind(user_id)
        .execute(&pool)
        .await;
    
    assert!(delete_result.is_ok(), "Failed to delete user");
    
    // Verify deletion
    let deleted_user = sqlx::query("SELECT * FROM users WHERE id = ?")
        .bind(user_id)
        .fetch_optional(&pool)
        .await
        .expect("Failed to query deleted user");
    
    assert!(deleted_user.is_none(), "User should be deleted");
}

#[tokio::test]
async fn test_sessions_crud_operations() {
    let pool = setup_test_db().await;
    
    // Use the default admin user from migrations
    let user_id = "user-admin-001";
    
    // CREATE: Insert a session
    let session_id = "test-session-001";
    let token = "test-token-12345";
    let expires_at = "2025-12-31T23:59:59Z";
    
    let result = sqlx::query(
        "INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)"
    )
    .bind(session_id)
    .bind(user_id)
    .bind(token)
    .bind(expires_at)
    .execute(&pool)
    .await;
    
    assert!(result.is_ok(), "Failed to insert session");
    
    // READ: Query the session
    let session = sqlx::query("SELECT * FROM sessions WHERE id = ?")
        .bind(session_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch session");
    
    assert_eq!(session.get::<String, _>("token"), token);
    assert_eq!(session.get::<String, _>("user_id"), user_id);
    
    // DELETE: Remove the session
    let delete_result = sqlx::query("DELETE FROM sessions WHERE id = ?")
        .bind(session_id)
        .execute(&pool)
        .await;
    
    assert!(delete_result.is_ok(), "Failed to delete session");
}

#[tokio::test]
async fn test_referential_integrity_cascade_delete() {
    let pool = setup_test_db().await;
    
    // Create a user
    let user_id = "test-user-cascade";
    sqlx::query(
        "INSERT INTO users (id, username, email, password_hash, role) 
         VALUES (?, ?, ?, ?, ?)"
    )
    .bind(user_id)
    .bind("cascadeuser")
    .bind("cascade@example.com")
    .bind("$argon2id$v=19$m=19456,t=2,p=1$test$testhash")
    .bind("cashier")
    .execute(&pool)
    .await
    .expect("Failed to insert user");
    
    // Create a session for the user
    let session_id = "test-session-cascade";
    sqlx::query(
        "INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)"
    )
    .bind(session_id)
    .bind(user_id)
    .bind("cascade-token")
    .bind("2025-12-31T23:59:59Z")
    .execute(&pool)
    .await
    .expect("Failed to insert session");
    
    // Delete the user (should cascade delete the session)
    sqlx::query("DELETE FROM users WHERE id = ?")
        .bind(user_id)
        .execute(&pool)
        .await
        .expect("Failed to delete user");
    
    // Verify session was also deleted
    let session = sqlx::query("SELECT * FROM sessions WHERE id = ?")
        .bind(session_id)
        .fetch_optional(&pool)
        .await
        .expect("Failed to query session");
    
    assert!(session.is_none(), "Session should be cascade deleted when user is deleted");
}

#[tokio::test]
async fn test_unique_constraints() {
    let pool = setup_test_db().await;
    
    // Insert first user
    let user_id_1 = "test-user-unique-1";
    let username = "uniqueuser";
    let email = "unique@example.com";
    
    sqlx::query(
        "INSERT INTO users (id, username, email, password_hash, role) 
         VALUES (?, ?, ?, ?, ?)"
    )
    .bind(user_id_1)
    .bind(username)
    .bind(email)
    .bind("$argon2id$v=19$m=19456,t=2,p=1$test$testhash")
    .bind("cashier")
    .execute(&pool)
    .await
    .expect("Failed to insert first user");
    
    // Try to insert second user with same username (should fail)
    let user_id_2 = "test-user-unique-2";
    let result_username = sqlx::query(
        "INSERT INTO users (id, username, email, password_hash, role) 
         VALUES (?, ?, ?, ?, ?)"
    )
    .bind(user_id_2)
    .bind(username) // Same username
    .bind("different@example.com")
    .bind("$argon2id$v=19$m=19456,t=2,p=1$test$testhash")
    .bind("cashier")
    .execute(&pool)
    .await;
    
    assert!(result_username.is_err(), "Should not allow duplicate username");
    
    // Try to insert second user with same email (should fail)
    let result_email = sqlx::query(
        "INSERT INTO users (id, username, email, password_hash, role) 
         VALUES (?, ?, ?, ?, ?)"
    )
    .bind(user_id_2)
    .bind("differentuser")
    .bind(email) // Same email
    .bind("$argon2id$v=19$m=19456,t=2,p=1$test$testhash")
    .bind("cashier")
    .execute(&pool)
    .await;
    
    assert!(result_email.is_err(), "Should not allow duplicate email");
}

#[tokio::test]
async fn test_indexes_exist() {
    let pool = setup_test_db().await;
    
    // Query all indexes
    let indexes: Vec<String> = sqlx::query(
        "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .fetch_all(&pool)
    .await
    .expect("Failed to query indexes")
    .iter()
    .map(|row| row.get::<String, _>("name"))
    .collect();
    
    // Verify expected indexes exist
    let expected_indexes = vec![
        "idx_users_username",
        "idx_users_email",
        "idx_users_role",
        "idx_sessions_token",
        "idx_sessions_user_id",
        "idx_sessions_expires_at",
    ];
    
    for expected_index in expected_indexes {
        assert!(
            indexes.contains(&expected_index.to_string()),
            "Index {} should exist",
            expected_index
        );
    }
}

#[tokio::test]
async fn test_default_users_seeded() {
    let pool = setup_test_db().await;
    
    // Verify default users exist
    let admin = sqlx::query("SELECT * FROM users WHERE username = ?")
        .bind("admin")
        .fetch_one(&pool)
        .await
        .expect("Admin user should exist");
    
    assert_eq!(admin.get::<String, _>("role"), "admin");
    assert_eq!(admin.get::<i32, _>("is_active"), 1);
    
    let cashier = sqlx::query("SELECT * FROM users WHERE username = ?")
        .bind("cashier")
        .fetch_one(&pool)
        .await
        .expect("Cashier user should exist");
    
    assert_eq!(cashier.get::<String, _>("role"), "cashier");
    
    let manager = sqlx::query("SELECT * FROM users WHERE username = ?")
        .bind("manager")
        .fetch_one(&pool)
        .await
        .expect("Manager user should exist");
    
    assert_eq!(manager.get::<String, _>("role"), "manager");
}

#[tokio::test]
async fn test_timestamp_defaults() {
    let pool = setup_test_db().await;
    
    // Insert user without specifying timestamps
    let user_id = "test-user-timestamps";
    sqlx::query(
        "INSERT INTO users (id, username, email, password_hash, role) 
         VALUES (?, ?, ?, ?, ?)"
    )
    .bind(user_id)
    .bind("timestampuser")
    .bind("timestamp@example.com")
    .bind("$argon2id$v=19$m=19456,t=2,p=1$test$testhash")
    .bind("cashier")
    .execute(&pool)
    .await
    .expect("Failed to insert user");
    
    // Verify timestamps were set
    let user = sqlx::query("SELECT created_at, updated_at FROM users WHERE id = ?")
        .bind(user_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch user");
    
    let created_at = user.get::<String, _>("created_at");
    let updated_at = user.get::<String, _>("updated_at");
    
    assert!(!created_at.is_empty(), "created_at should be set");
    assert!(!updated_at.is_empty(), "updated_at should be set");
    assert_eq!(created_at, updated_at, "created_at and updated_at should be equal on insert");
}

#[tokio::test]
async fn test_query_performance_with_indexes() {
    let pool = setup_test_db().await;
    
    // Insert multiple users
    for i in 0..100 {
        sqlx::query(
            "INSERT INTO users (id, username, email, password_hash, role) 
             VALUES (?, ?, ?, ?, ?)"
        )
        .bind(format!("user-{}", i))
        .bind(format!("user{}", i))
        .bind(format!("user{}@example.com", i))
        .bind("$argon2id$v=19$m=19456,t=2,p=1$test$testhash")
        .bind("cashier")
        .execute(&pool)
        .await
        .expect("Failed to insert user");
    }
    
    // Query by username (should use index)
    let start = std::time::Instant::now();
    let user = sqlx::query("SELECT * FROM users WHERE username = ?")
        .bind("user50")
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch user");
    let duration = start.elapsed();
    
    assert_eq!(user.get::<String, _>("username"), "user50");
    assert!(duration.as_millis() < 100, "Query should be fast with index (took {}ms)", duration.as_millis());
    
    // Query by email (should use index)
    let start = std::time::Instant::now();
    let user = sqlx::query("SELECT * FROM users WHERE email = ?")
        .bind("user75@example.com")
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch user");
    let duration = start.elapsed();
    
    assert_eq!(user.get::<String, _>("email"), "user75@example.com");
    assert!(duration.as_millis() < 100, "Query should be fast with index (took {}ms)", duration.as_millis());
}
