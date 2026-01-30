use chrono::Utc;
use serde_json::Value;
use sqlx::SqlitePool;
use uuid::Uuid;

/// Audit logger service
/// Logs all operations for compliance and debugging
pub struct AuditLogger {
    pool: SqlitePool,
}

impl AuditLogger {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Log an operation
    pub async fn log(
        &self,
        entity_type: &str,
        entity_id: &str,
        operation: &str,
        user_id: Option<&str>,
        employee_id: Option<&str>,
        changes: Option<Value>,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
        is_offline: bool,
        store_id: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let changes_str = changes.map(|c| serde_json::to_string(&c).ok()).flatten();

        sqlx::query(
            r#"
            INSERT INTO audit_log (
                id, entity_type, entity_id, operation, user_id, employee_id,
                changes, ip_address, user_agent, is_offline, created_at, store_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&id)
        .bind(entity_type)
        .bind(entity_id)
        .bind(operation)
        .bind(user_id)
        .bind(employee_id)
        .bind(changes_str)
        .bind(ip_address)
        .bind(user_agent)
        .bind(is_offline)
        .bind(&now)
        .bind(store_id)
        .execute(&self.pool)
        .await?;

        Ok(id)
    }

    /// Log a create operation
    pub async fn log_create(
        &self,
        entity_type: &str,
        entity_id: &str,
        entity_data: Value,
        user_id: Option<&str>,
        is_offline: bool,
        store_id: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        self.log(
            entity_type,
            entity_id,
            "create",
            user_id,
            None,
            Some(entity_data),
            None,
            None,
            is_offline,
            store_id,
        )
        .await
    }

    /// Log an update operation
    pub async fn log_update(
        &self,
        entity_type: &str,
        entity_id: &str,
        old_data: Value,
        new_data: Value,
        user_id: Option<&str>,
        is_offline: bool,
        store_id: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let changes = serde_json::json!({
            "old": old_data,
            "new": new_data
        });

        self.log(
            entity_type,
            entity_id,
            "update",
            user_id,
            None,
            Some(changes),
            None,
            None,
            is_offline,
            store_id,
        )
        .await
    }

    /// Log a delete operation
    pub async fn log_delete(
        &self,
        entity_type: &str,
        entity_id: &str,
        entity_data: Value,
        user_id: Option<&str>,
        is_offline: bool,
        store_id: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        self.log(
            entity_type,
            entity_id,
            "delete",
            user_id,
            None,
            Some(entity_data),
            None,
            None,
            is_offline,
            store_id,
        )
        .await
    }

    /// Log a payment operation
    pub async fn log_payment(
        &self,
        entity_type: &str,
        entity_id: &str,
        amount: &str,
        payment_method: &str,
        user_id: Option<&str>,
        employee_id: Option<&str>,
        is_offline: bool,
        store_id: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let changes = serde_json::json!({
            "amount": amount,
            "payment_method": payment_method
        });

        self.log(
            entity_type,
            entity_id,
            "payment",
            user_id,
            employee_id,
            Some(changes),
            None,
            None,
            is_offline,
            store_id,
        )
        .await
    }

    /// Log a commission operation
    pub async fn log_commission(
        &self,
        entity_type: &str,
        entity_id: &str,
        employee_id: &str,
        amount: &str,
        is_offline: bool,
        store_id: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let changes = serde_json::json!({
            "employee_id": employee_id,
            "amount": amount
        });

        self.log(
            entity_type,
            entity_id,
            "commission",
            None,
            Some(employee_id),
            Some(changes),
            None,
            None,
            is_offline,
            store_id,
        )
        .await
    }

    /// Get audit trail for an entity
    pub async fn get_audit_trail(
        &self,
        entity_type: &str,
        entity_id: &str,
        limit: i32,
    ) -> Result<Vec<AuditLogEntry>, Box<dyn std::error::Error>> {
        let entries = sqlx::query_as::<_, AuditLogEntry>(
            r#"
            SELECT id, entity_type, entity_id, operation, user_id, employee_id,
                   changes, ip_address, user_agent, is_offline, created_at, store_id
            FROM audit_log
            WHERE entity_type = ? AND entity_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            "#
        )
        .bind(entity_type)
        .bind(entity_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(entries)
    }

    /// Get offline operations
    pub async fn get_offline_operations(
        &self,
        store_id: &str,
        limit: i32,
    ) -> Result<Vec<AuditLogEntry>, Box<dyn std::error::Error>> {
        let entries = sqlx::query_as::<_, AuditLogEntry>(
            r#"
            SELECT id, entity_type, entity_id, operation, user_id, employee_id,
                   changes, ip_address, user_agent, is_offline, created_at, store_id
            FROM audit_log
            WHERE store_id = ? AND is_offline = 1
            ORDER BY created_at DESC
            LIMIT ?
            "#
        )
        .bind(store_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(entries)
    }

    /// Get operations by user
    pub async fn get_user_operations(
        &self,
        user_id: &str,
        limit: i32,
    ) -> Result<Vec<AuditLogEntry>, Box<dyn std::error::Error>> {
        let entries = sqlx::query_as::<_, AuditLogEntry>(
            r#"
            SELECT id, entity_type, entity_id, operation, user_id, employee_id,
                   changes, ip_address, user_agent, is_offline, created_at, store_id
            FROM audit_log
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            "#
        )
        .bind(user_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(entries)
    }

    /// Get operations by date range
    pub async fn get_operations_by_date_range(
        &self,
        start_date: &str,
        end_date: &str,
        store_id: Option<&str>,
        limit: i32,
    ) -> Result<Vec<AuditLogEntry>, Box<dyn std::error::Error>> {
        let entries = if let Some(sid) = store_id {
            sqlx::query_as::<_, AuditLogEntry>(
                r#"
                SELECT id, entity_type, entity_id, operation, user_id, employee_id,
                       changes, ip_address, user_agent, is_offline, created_at, store_id
                FROM audit_log
                WHERE created_at >= ? AND created_at <= ? AND store_id = ?
                ORDER BY created_at DESC
                LIMIT ?
                "#
            )
            .bind(start_date)
            .bind(end_date)
            .bind(sid)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, AuditLogEntry>(
                r#"
                SELECT id, entity_type, entity_id, operation, user_id, employee_id,
                       changes, ip_address, user_agent, is_offline, created_at, store_id
                FROM audit_log
                WHERE created_at >= ? AND created_at <= ?
                ORDER BY created_at DESC
                LIMIT ?
                "#
            )
            .bind(start_date)
            .bind(end_date)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        };

        Ok(entries)
    }

    /// Log a settings change (for users, roles, stores, stations, settings)
    /// This method is specifically designed for Settings module audit logging
    /// 
    /// # Arguments
    /// * `entity_type` - Type of entity: "user", "role", "store", "station", "setting"
    /// * `entity_id` - ID of the entity being changed
    /// * `action` - Action performed: "create", "update", "delete"
    /// * `user_id` - ID of user performing the action
    /// * `username` - Username of user performing the action
    /// * `context_store_id` - Store ID from user context (optional)
    /// * `context_station_id` - Station ID from user context (optional)
    /// * `before_value` - Entity state before change (optional, for updates/deletes)
    /// * `after_value` - Entity state after change (optional, for creates/updates)
    /// * `is_offline` - Whether operation was performed offline
    pub async fn log_settings_change(
        &self,
        entity_type: &str,
        entity_id: &str,
        action: &str,
        user_id: &str,
        username: &str,
        context_store_id: Option<&str>,
        context_station_id: Option<&str>,
        before_value: Option<Value>,
        after_value: Option<Value>,
        is_offline: bool,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        
        // Build changes JSON with before/after values
        let changes = if before_value.is_some() || after_value.is_some() {
            let mut changes_obj = serde_json::Map::new();
            
            if let Some(before) = before_value {
                changes_obj.insert("before".to_string(), before);
            }
            
            if let Some(after) = after_value {
                changes_obj.insert("after".to_string(), after);
            }
            
            // Add context information
            changes_obj.insert("username".to_string(), Value::String(username.to_string()));
            if let Some(store_id) = context_store_id {
                changes_obj.insert("context_store_id".to_string(), Value::String(store_id.to_string()));
            }
            if let Some(station_id) = context_station_id {
                changes_obj.insert("context_station_id".to_string(), Value::String(station_id.to_string()));
            }
            
            Some(Value::Object(changes_obj))
        } else {
            None
        };
        
        let changes_str = changes.map(|c| serde_json::to_string(&c).ok()).flatten();
        
        // Use context_store_id if available, otherwise use a default
        let store_id_for_log = context_store_id.unwrap_or("system");

        sqlx::query(
            r#"
            INSERT INTO audit_log (
                id, entity_type, entity_id, operation, user_id, employee_id,
                changes, ip_address, user_agent, is_offline, created_at, store_id
            )
            VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, NULL, ?, ?, ?)
            "#
        )
        .bind(&id)
        .bind(entity_type)
        .bind(entity_id)
        .bind(action)
        .bind(user_id)
        .bind(changes_str)
        .bind(is_offline)
        .bind(&now)
        .bind(store_id_for_log)
        .execute(&self.pool)
        .await?;

        Ok(id)
    }
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct AuditLogEntry {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub user_id: Option<String>,
    pub employee_id: Option<String>,
    pub changes: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub is_offline: bool,
    pub created_at: String,
    pub store_id: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::create_test_db;

    #[tokio::test]
    async fn test_log_settings_change_create_user() {
        let pool = create_test_db().await.unwrap();
        let logger = AuditLogger::new(pool.clone());

        let user_data = serde_json::json!({
            "username": "newuser",
            "email": "newuser@example.com",
            "role": "cashier"
        });

        let result = logger.log_settings_change(
            "user",
            "user-123",
            "create",
            "admin-1",
            "admin",
            Some("store-1"),
            None,
            None,
            Some(user_data.clone()),
            false,
        ).await;

        assert!(result.is_ok());
        let log_id = result.unwrap();

        // Verify the log was created
        let entry = sqlx::query_as::<_, AuditLogEntry>(
            "SELECT * FROM audit_log WHERE id = ?"
        )
        .bind(&log_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(entry.entity_type, "user");
        assert_eq!(entry.entity_id, "user-123");
        assert_eq!(entry.operation, "create");
        assert_eq!(entry.user_id, Some("admin-1".to_string()));
        assert_eq!(entry.store_id, "store-1");
        assert!(!entry.is_offline);

        // Verify changes JSON contains after value and context
        let changes: Value = serde_json::from_str(&entry.changes.unwrap()).unwrap();
        assert_eq!(changes["after"], user_data);
        assert_eq!(changes["username"], "admin");
        assert_eq!(changes["context_store_id"], "store-1");
    }

    #[tokio::test]
    async fn test_log_settings_change_update_store() {
        let pool = create_test_db().await.unwrap();
        let logger = AuditLogger::new(pool.clone());

        let before = serde_json::json!({
            "name": "Old Store Name",
            "address": "123 Old St"
        });

        let after = serde_json::json!({
            "name": "New Store Name",
            "address": "456 New Ave"
        });

        let result = logger.log_settings_change(
            "store",
            "store-1",
            "update",
            "manager-1",
            "manager",
            Some("store-1"),
            Some("station-1"),
            Some(before.clone()),
            Some(after.clone()),
            false,
        ).await;

        assert!(result.is_ok());
        let log_id = result.unwrap();

        // Verify the log was created
        let entry = sqlx::query_as::<_, AuditLogEntry>(
            "SELECT * FROM audit_log WHERE id = ?"
        )
        .bind(&log_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(entry.entity_type, "store");
        assert_eq!(entry.entity_id, "store-1");
        assert_eq!(entry.operation, "update");
        assert_eq!(entry.user_id, Some("manager-1".to_string()));

        // Verify changes JSON contains before/after values and context
        let changes: Value = serde_json::from_str(&entry.changes.unwrap()).unwrap();
        assert_eq!(changes["before"], before);
        assert_eq!(changes["after"], after);
        assert_eq!(changes["username"], "manager");
        assert_eq!(changes["context_store_id"], "store-1");
        assert_eq!(changes["context_station_id"], "station-1");
    }

    #[tokio::test]
    async fn test_log_settings_change_delete_station() {
        let pool = create_test_db().await.unwrap();
        let logger = AuditLogger::new(pool.clone());

        let station_data = serde_json::json!({
            "name": "Station 1",
            "store_id": "store-1",
            "device_id": "device-123"
        });

        let result = logger.log_settings_change(
            "station",
            "station-1",
            "delete",
            "admin-1",
            "admin",
            Some("store-1"),
            None,
            Some(station_data.clone()),
            None,
            false,
        ).await;

        assert!(result.is_ok());
        let log_id = result.unwrap();

        // Verify the log was created
        let entry = sqlx::query_as::<_, AuditLogEntry>(
            "SELECT * FROM audit_log WHERE id = ?"
        )
        .bind(&log_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(entry.entity_type, "station");
        assert_eq!(entry.entity_id, "station-1");
        assert_eq!(entry.operation, "delete");
        assert_eq!(entry.user_id, Some("admin-1".to_string()));

        // Verify changes JSON contains before value
        let changes: Value = serde_json::from_str(&entry.changes.unwrap()).unwrap();
        assert_eq!(changes["before"], station_data);
        assert_eq!(changes["username"], "admin");
    }

    #[tokio::test]
    async fn test_log_settings_change_without_context() {
        let pool = create_test_db().await.unwrap();
        let logger = AuditLogger::new(pool.clone());

        let setting_data = serde_json::json!({
            "key": "tax_rate",
            "value": "0.13"
        });

        let result = logger.log_settings_change(
            "setting",
            "setting-1",
            "update",
            "admin-1",
            "admin",
            None,  // No store context
            None,  // No station context
            None,
            Some(setting_data.clone()),
            false,
        ).await;

        assert!(result.is_ok());
        let log_id = result.unwrap();

        // Verify the log was created with "system" as store_id
        let entry = sqlx::query_as::<_, AuditLogEntry>(
            "SELECT * FROM audit_log WHERE id = ?"
        )
        .bind(&log_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(entry.entity_type, "setting");
        assert_eq!(entry.store_id, "system");

        // Verify changes JSON doesn't contain context fields
        let changes: Value = serde_json::from_str(&entry.changes.unwrap()).unwrap();
        assert_eq!(changes["after"], setting_data);
        assert_eq!(changes["username"], "admin");
        assert!(changes.get("context_store_id").is_none());
        assert!(changes.get("context_station_id").is_none());
    }

    #[tokio::test]
    async fn test_log_settings_change_offline() {
        let pool = create_test_db().await.unwrap();
        let logger = AuditLogger::new(pool.clone());

        let user_data = serde_json::json!({
            "username": "offlineuser",
            "role": "cashier"
        });

        let result = logger.log_settings_change(
            "user",
            "user-456",
            "create",
            "manager-1",
            "manager",
            Some("store-2"),
            Some("station-2"),
            None,
            Some(user_data),
            true,  // Offline operation
        ).await;

        assert!(result.is_ok());
        let log_id = result.unwrap();

        // Verify the log was created with is_offline = true
        let entry = sqlx::query_as::<_, AuditLogEntry>(
            "SELECT * FROM audit_log WHERE id = ?"
        )
        .bind(&log_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(entry.entity_type, "user");
        assert!(entry.is_offline);
        assert_eq!(entry.store_id, "store-2");
    }
}