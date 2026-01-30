use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::SyncConflict;

/// Conflict resolution strategy
#[derive(Debug, Clone)]
pub enum ResolutionStrategy {
    /// Use the most recent version based on updated_at timestamp
    LastWriteWins,
    /// Use the local version
    LocalWins,
    /// Use the remote version
    RemoteWins,
    /// Merge both versions (requires custom logic per entity type)
    Merge,
}

/// Conflict resolver service
pub struct ConflictResolver {
    pool: SqlitePool,
}

impl ConflictResolver {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Detect and resolve conflicts between local and remote versions
    pub async fn resolve_conflict(
        &self,
        entity_type: &str,
        entity_id: &str,
        local_version: Value,
        remote_version: Value,
        local_store_id: &str,
        remote_store_id: &str,
    ) -> Result<(Value, String), Box<dyn std::error::Error>> {
        // Extract timestamps
        let local_updated_at = Self::extract_timestamp(&local_version, "updated_at")?;
        let remote_updated_at = Self::extract_timestamp(&remote_version, "updated_at")?;

        // Determine resolution strategy
        let strategy = Self::determine_strategy(entity_type);

        // Resolve based on strategy
        let (resolved_version, resolution_method) = match strategy {
            ResolutionStrategy::LastWriteWins => {
                if remote_updated_at > local_updated_at {
                    (remote_version.clone(), "remote_wins".to_string())
                } else {
                    (local_version.clone(), "local_wins".to_string())
                }
            }
            ResolutionStrategy::LocalWins => (local_version.clone(), "local_wins".to_string()),
            ResolutionStrategy::RemoteWins => (remote_version.clone(), "remote_wins".to_string()),
            ResolutionStrategy::Merge => {
                let merged = Self::merge_versions(entity_type, local_version.clone(), remote_version.clone())?;
                (merged, "merged".to_string())
            }
        };

        // Log the conflict
        self.log_conflict(
            entity_type,
            entity_id,
            &local_version,
            &remote_version,
            &local_updated_at,
            &remote_updated_at,
            local_store_id,
            remote_store_id,
            &resolution_method,
        )
        .await?;

        Ok((resolved_version, resolution_method))
    }

    /// Determine resolution strategy based on entity type
    fn determine_strategy(entity_type: &str) -> ResolutionStrategy {
        match entity_type {
            // For financial entities, use last-write-wins
            "layaway_payment" | "credit_transaction" | "gift_card_transaction" => {
                ResolutionStrategy::LastWriteWins
            }
            // For customer data, merge when possible
            "customer" => ResolutionStrategy::Merge,
            // Default to last-write-wins
            _ => ResolutionStrategy::LastWriteWins,
        }
    }

    /// Get suggested resolution strategy for UI display
    pub fn get_suggested_strategy(&self, entity_type: &str) -> String {
        let strategy = Self::determine_strategy(entity_type);
        match strategy {
            ResolutionStrategy::LastWriteWins => "last_write_wins".to_string(),
            ResolutionStrategy::LocalWins => "local_wins".to_string(),
            ResolutionStrategy::RemoteWins => "remote_wins".to_string(),
            ResolutionStrategy::Merge => "merge".to_string(),
        }
    }

    /// Extract timestamp from JSON value
    fn extract_timestamp(
        value: &Value,
        field: &str,
    ) -> Result<DateTime<Utc>, Box<dyn std::error::Error>> {
        let timestamp_str = value
            .get(field)
            .and_then(|v| v.as_str())
            .ok_or("Missing or invalid timestamp")?;

        let timestamp = DateTime::parse_from_rfc3339(timestamp_str)?
            .with_timezone(&Utc);

        Ok(timestamp)
    }

    /// Merge two versions of an entity
    fn merge_versions(
        entity_type: &str,
        local: Value,
        remote: Value,
    ) -> Result<Value, Box<dyn std::error::Error>> {
        match entity_type {
            "customer" => Self::merge_customer(local, remote),
            _ => {
                // For entities without custom merge logic, use last-write-wins
                let local_updated = Self::extract_timestamp(&local, "updated_at")?;
                let remote_updated = Self::extract_timestamp(&remote, "updated_at")?;

                if remote_updated > local_updated {
                    Ok(remote)
                } else {
                    Ok(local)
                }
            }
        }
    }

    /// Merge customer data
    fn merge_customer(
        local: Value,
        remote: Value,
    ) -> Result<Value, Box<dyn std::error::Error>> {
        let mut merged = local.clone();

        // Merge fields, preferring non-null values
        if let Some(obj) = merged.as_object_mut() {
            if let Some(remote_obj) = remote.as_object() {
                // Merge contact information (prefer non-null)
                if let Some(email) = remote_obj.get("email") {
                    if !email.is_null() {
                        obj.insert("email".to_string(), email.clone());
                    }
                }
                if let Some(phone) = remote_obj.get("phone") {
                    if !phone.is_null() {
                        obj.insert("phone".to_string(), phone.clone());
                    }
                }

                // For financial fields, use the most recent values
                let local_updated = Self::extract_timestamp(&local, "updated_at")?;
                let remote_updated = Self::extract_timestamp(&remote, "updated_at")?;

                if remote_updated > local_updated {
                    // Use remote values for financial fields
                    if let Some(loyalty_points) = remote_obj.get("loyalty_points") {
                        obj.insert("loyalty_points".to_string(), loyalty_points.clone());
                    }
                    if let Some(store_credit) = remote_obj.get("store_credit") {
                        obj.insert("store_credit".to_string(), store_credit.clone());
                    }
                    if let Some(credit_balance) = remote_obj.get("credit_balance") {
                        obj.insert("credit_balance".to_string(), credit_balance.clone());
                    }
                }

                // Use the most recent updated_at timestamp
                obj.insert("updated_at".to_string(), remote_obj.get("updated_at").unwrap().clone());
            }
        }

        Ok(merged)
    }

    /// Log a conflict to the database
    async fn log_conflict(
        &self,
        entity_type: &str,
        entity_id: &str,
        local_version: &Value,
        remote_version: &Value,
        local_updated_at: &DateTime<Utc>,
        remote_updated_at: &DateTime<Utc>,
        local_store_id: &str,
        remote_store_id: &str,
        _resolution_method: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let local_version_str = serde_json::to_string(local_version)?;
        let remote_version_str = serde_json::to_string(remote_version)?;
        let local_updated_str = local_updated_at.to_rfc3339();
        let remote_updated_str = remote_updated_at.to_rfc3339();

        sqlx::query(
            r#"
            INSERT INTO sync_conflicts (
                id, entity_type, entity_id, local_version, remote_version,
                local_updated_at, remote_updated_at, local_store_id, remote_store_id,
                resolution_status, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'resolved', ?)
            "#
        )
        .bind(&id)
        .bind(entity_type)
        .bind(entity_id)
        .bind(&local_version_str)
        .bind(&remote_version_str)
        .bind(&local_updated_str)
        .bind(&remote_updated_str)
        .bind(local_store_id)
        .bind(remote_store_id)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Check if a conflict exists for an entity
    pub async fn has_conflict(
        &self,
        entity_type: &str,
        entity_id: &str,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        let count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM sync_conflicts
            WHERE entity_type = ? AND entity_id = ? AND resolution_status = 'pending'
            "#
        )
        .bind(entity_type)
        .bind(entity_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(count > 0)
    }

    /// Get pending conflicts
    pub async fn get_pending_conflicts(
        &self,
    ) -> Result<Vec<SyncConflict>, Box<dyn std::error::Error>> {
        let conflicts = sqlx::query_as::<_, SyncConflict>(
            r#"
            SELECT * FROM sync_conflicts
            WHERE resolution_status = 'pending'
            ORDER BY created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(conflicts)
    }
}
