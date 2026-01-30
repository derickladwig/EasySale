// Database access layer
// This module handles all database operations using SQLx

pub mod migrations;

// Re-export database pool initialization from pos_core_storage
#[allow(unused_imports)]
pub use pos_core_storage::{init_pool, DatabasePool};

// Re-export SqlitePool for compatibility with existing code
#[allow(unused_imports)]
pub use sqlx::sqlite::SqlitePool;
