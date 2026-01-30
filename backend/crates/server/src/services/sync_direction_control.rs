//! Sync Direction Control Service
//!
//! Manages sync direction configuration and conflict resolution:
//! - One-way sync (source → target only)
//! - Two-way sync with conflict resolution
//! - Source-of-truth designation per entity type
//! - Sync loop prevention
//!
//! Requirements: 4.1, 4.2, 4.4, 4.6

use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::collections::HashMap;
use uuid::Uuid;

/// Sync direction configuration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SyncDirection {
    OneWay,   // Source → Target only
    TwoWay,   // Bidirectional with conflict resolution
}

impl SyncDirection {
    pub fn as_str(&self) -> &str {
        match self {
            SyncDirection::OneWay => "one_way",
            SyncDirection::TwoWay => "two_way",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "one_way" => Ok(SyncDirection::OneWay),
            "two_way" => Ok(SyncDirection::TwoWay),
            _ => Err(format!("Invalid sync direction: {}", s)),
        }
    }
}

/// Source of truth designation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SourceOfTruth {
    Pos,       // POS system is authoritative
    Platform,  // External platform is authoritative
}

impl SourceOfTruth {
    pub fn as_str(&self) -> &str {
        match self {
            SourceOfTruth::Pos => "pos",
            SourceOfTruth::Platform => "platform",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "pos" => Ok(SourceOfTruth::Pos),
            "platform" => Ok(SourceOfTruth::Platform),
            _ => Err(format!("Invalid source of truth: {}", s)),
        }
    }
}

/// Conflict resolution strategy
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ConflictStrategy {
    SourceWins,   // Source system always wins
    TargetWins,   // Target system always wins
    NewestWins,   // Most recently updated wins
    Manual,       // Require manual resolution
}

impl ConflictStrategy {
    pub fn as_str(&self) -> &str {
        match self {
            ConflictStrategy::SourceWins => "source_wins",
            ConflictStrategy::TargetWins => "target_wins",
            ConflictStrategy::NewestWins => "newest_wins",
            ConflictStrategy::Manual => "manual",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "source_wins" => Ok(ConflictStrategy::SourceWins),
            "target_wins" => Ok(ConflictStrategy::TargetWins),
            "newest_wins" => Ok(ConflictStrategy::NewestWins),
            "manual" => Ok(ConflictStrategy::Manual),
            _ => Err(format!("Invalid conflict strategy: {}", s)),
        }
    }
}

/// Entity-specific sync configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntitySyncConfig {
    pub source_of_truth: SourceOfTruth,
    pub conflict_strategy: ConflictStrategy,
}

/// Complete sync configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConfig {
    pub entities: HashMap<String, EntitySyncConfig>,
}

impl SyncConfig {
    pub fn new() -> Self {
        Self {
            entities: HashMap::new(),
        }
    }

    pub fn add_entity(&mut self, entity_type: String, config: EntitySyncConfig) {
        self.entities.insert(entity_type, config);
    }

    pub fn get_entity_config(&self, entity_type: &str) -> Option<&EntitySyncConfig> {
        self.entities.get(entity_type)
    }
}

impl Default for SyncConfig {
    fn default() -> Self {
        Self::new()
    }
}

/// Sync conflict record
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyncConflict {
    pub id: String,
    pub tenant_id: String,
    pub credential_id: String,
    pub platform: String,
    pub entity_type: String,
    pub entity_id: String,
    pub platform_entity_id: Option<String>,
    pub pos_version: String,
    pub platform_version: String,
    pub pos_updated_at: String,
    pub platform_updated_at: String,
    pub resolution_strategy: String,
    pub resolved_version: Option<String>,
    pub resolved_data: Option<String>,
    pub resolved_at: Option<String>,
    pub resolved_by: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Sync Direction Control Service
pub struct SyncDirectionControl {
    db: SqlitePool,
}

impl SyncDirectionControl {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// Get sync direction for a credential
    pub async fn get_sync_direction(
        &self,
        credential_id: &str,
    ) -> Result<SyncDirection, String> {
        let row: (String,) = sqlx::query_as(
            "SELECT sync_direction FROM integration_credentials WHERE id = ?"
        )
        .bind(credential_id)
        .fetch_one(&self.db)
        .await
        .map_err(|e| format!("Failed to get sync direction: {}", e))?;

        SyncDirection::from_str(&row.0)
    }

    /// Set sync direction for a credential
    pub async fn set_sync_direction(
        &self,
        credential_id: &str,
        direction: SyncDirection,
    ) -> Result<(), String> {
        sqlx::query(
            "UPDATE integration_credentials SET sync_direction = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .bind(direction.as_str())
        .bind(credential_id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to set sync direction: {}", e))?;

        Ok(())
    }

    /// Get sync configuration for a credential
    pub async fn get_sync_config(
        &self,
        credential_id: &str,
    ) -> Result<SyncConfig, String> {
        let row: (Option<String>,) = sqlx::query_as(
            "SELECT sync_config FROM integration_credentials WHERE id = ?"
        )
        .bind(credential_id)
        .fetch_one(&self.db)
        .await
        .map_err(|e| format!("Failed to get sync config: {}", e))?;

        match row.0 {
            Some(json) => {
                serde_json::from_str(&json)
                    .map_err(|e| format!("Failed to parse sync config: {}", e))
            }
            None => Ok(SyncConfig::new()),
        }
    }

    /// Set sync configuration for a credential
    pub async fn set_sync_config(
        &self,
        credential_id: &str,
        config: &SyncConfig,
    ) -> Result<(), String> {
        let json = serde_json::to_string(config)
            .map_err(|e| format!("Failed to serialize sync config: {}", e))?;

        sqlx::query(
            "UPDATE integration_credentials SET sync_config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .bind(json)
        .bind(credential_id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to set sync config: {}", e))?;

        Ok(())
    }

    /// Check if an entity should be synced (sync loop prevention)
    pub async fn should_sync(
        &self,
        entity_type: &str,
        entity_id: &str,
        data_hash: &str,
    ) -> Result<bool, String> {
        // Check if this exact data was already synced
        let row: (i64,) = sqlx::query_as(
            r"
            SELECT COUNT(*) FROM integration_sync_operations
            WHERE entity_type = ? AND entity_id = ? AND sync_hash = ? AND already_synced = 1
            AND created_at > datetime('now', '-1 hour')
            "
        )
        .bind(entity_type)
        .bind(entity_id)
        .bind(data_hash)
        .fetch_one(&self.db)
        .await
        .map_err(|e| format!("Failed to check sync status: {}", e))?;

        Ok(row.0 == 0)
    }

    /// Mark an entity as synced
    pub async fn mark_synced(
        &self,
        operation_id: &str,
        data_hash: &str,
    ) -> Result<(), String> {
        sqlx::query(
            r"
            UPDATE integration_sync_operations
            SET already_synced = 1, sync_hash = ?
            WHERE id = ?
            "
        )
        .bind(data_hash)
        .bind(operation_id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to mark as synced: {}", e))?;

        Ok(())
    }

    /// Create a sync conflict record
    pub async fn create_conflict(
        &self,
        tenant_id: &str,
        credential_id: &str,
        platform: &str,
        entity_type: &str,
        entity_id: &str,
        platform_entity_id: Option<&str>,
        pos_version: &str,
        platform_version: &str,
        pos_updated_at: &str,
        platform_updated_at: &str,
        resolution_strategy: ConflictStrategy,
    ) -> Result<String, String> {
        let conflict_id = Uuid::new_v4().to_string();

        sqlx::query(
            r"
            INSERT INTO integration_sync_conflicts (
                id, tenant_id, credential_id, platform, entity_type, entity_id,
                platform_entity_id, pos_version, platform_version,
                pos_updated_at, platform_updated_at, resolution_strategy,
                status, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            "
        )
        .bind(&conflict_id)
        .bind(tenant_id)
        .bind(credential_id)
        .bind(platform)
        .bind(entity_type)
        .bind(entity_id)
        .bind(platform_entity_id)
        .bind(pos_version)
        .bind(platform_version)
        .bind(pos_updated_at)
        .bind(platform_updated_at)
        .bind(resolution_strategy.as_str())
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to create conflict: {}", e))?;

        Ok(conflict_id)
    }

    /// Resolve a conflict
    pub async fn resolve_conflict(
        &self,
        conflict_id: &str,
        resolved_version: &str,
        resolved_data: &str,
        resolved_by: Option<&str>,
    ) -> Result<(), String> {
        sqlx::query(
            r"
            UPDATE integration_sync_conflicts
            SET resolved_version = ?, resolved_data = ?, resolved_at = CURRENT_TIMESTAMP,
                resolved_by = ?, status = 'resolved', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "
        )
        .bind(resolved_version)
        .bind(resolved_data)
        .bind(resolved_by)
        .bind(conflict_id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to resolve conflict: {}", e))?;

        Ok(())
    }

    /// Get pending conflicts for a tenant
    pub async fn get_pending_conflicts(
        &self,
        tenant_id: &str,
    ) -> Result<Vec<SyncConflict>, String> {
        let conflicts = sqlx::query_as::<_, SyncConflict>(
            r"
            SELECT * FROM integration_sync_conflicts
            WHERE tenant_id = ? AND status = 'pending'
            ORDER BY created_at DESC
            "
        )
        .bind(tenant_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| format!("Failed to get pending conflicts: {}", e))?;

        Ok(conflicts)
    }

    /// Apply conflict resolution strategy
    pub async fn apply_resolution_strategy(
        &self,
        conflict_id: &str,
        strategy: ConflictStrategy,
        pos_data: &str,
        platform_data: &str,
        pos_updated_at: &str,
        platform_updated_at: &str,
    ) -> Result<String, String> {
        let resolved_data = match strategy {
            ConflictStrategy::SourceWins => pos_data.to_string(),
            ConflictStrategy::TargetWins => platform_data.to_string(),
            ConflictStrategy::NewestWins => {
                // Compare timestamps
                if pos_updated_at >= platform_updated_at {
                    pos_data.to_string()
                } else {
                    platform_data.to_string()
                }
            }
            ConflictStrategy::Manual => {
                // Don't auto-resolve, return error
                return Err("Manual resolution required".to_string());
            }
        };

        let resolved_version = match strategy {
            ConflictStrategy::SourceWins => "pos",
            ConflictStrategy::TargetWins => "platform",
            ConflictStrategy::NewestWins => {
                if pos_updated_at >= platform_updated_at {
                    "pos"
                } else {
                    "platform"
                }
            }
            ConflictStrategy::Manual => "manual",
        };

        self.resolve_conflict(conflict_id, resolved_version, &resolved_data, None).await?;

        Ok(resolved_data)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync_direction_conversion() {
        assert_eq!(SyncDirection::OneWay.as_str(), "one_way");
        assert_eq!(SyncDirection::TwoWay.as_str(), "two_way");

        assert_eq!(SyncDirection::from_str("one_way").unwrap(), SyncDirection::OneWay);
        assert_eq!(SyncDirection::from_str("two_way").unwrap(), SyncDirection::TwoWay);
        assert!(SyncDirection::from_str("invalid").is_err());
    }

    #[test]
    fn test_source_of_truth_conversion() {
        assert_eq!(SourceOfTruth::Pos.as_str(), "pos");
        assert_eq!(SourceOfTruth::Platform.as_str(), "platform");

        assert_eq!(SourceOfTruth::from_str("pos").unwrap(), SourceOfTruth::Pos);
        assert_eq!(SourceOfTruth::from_str("platform").unwrap(), SourceOfTruth::Platform);
        assert!(SourceOfTruth::from_str("invalid").is_err());
    }

    #[test]
    fn test_conflict_strategy_conversion() {
        assert_eq!(ConflictStrategy::SourceWins.as_str(), "source_wins");
        assert_eq!(ConflictStrategy::TargetWins.as_str(), "target_wins");
        assert_eq!(ConflictStrategy::NewestWins.as_str(), "newest_wins");
        assert_eq!(ConflictStrategy::Manual.as_str(), "manual");

        assert_eq!(ConflictStrategy::from_str("source_wins").unwrap(), ConflictStrategy::SourceWins);
        assert_eq!(ConflictStrategy::from_str("target_wins").unwrap(), ConflictStrategy::TargetWins);
        assert_eq!(ConflictStrategy::from_str("newest_wins").unwrap(), ConflictStrategy::NewestWins);
        assert_eq!(ConflictStrategy::from_str("manual").unwrap(), ConflictStrategy::Manual);
        assert!(ConflictStrategy::from_str("invalid").is_err());
    }

    #[test]
    fn test_sync_config() {
        let mut config = SyncConfig::new();
        
        config.add_entity(
            "customers".to_string(),
            EntitySyncConfig {
                source_of_truth: SourceOfTruth::Pos,
                conflict_strategy: ConflictStrategy::SourceWins,
            },
        );

        config.add_entity(
            "products".to_string(),
            EntitySyncConfig {
                source_of_truth: SourceOfTruth::Platform,
                conflict_strategy: ConflictStrategy::NewestWins,
            },
        );

        assert!(config.get_entity_config("customers").is_some());
        assert!(config.get_entity_config("products").is_some());
        assert!(config.get_entity_config("orders").is_none());

        let customer_config = config.get_entity_config("customers").unwrap();
        assert_eq!(customer_config.source_of_truth, SourceOfTruth::Pos);
        assert_eq!(customer_config.conflict_strategy, ConflictStrategy::SourceWins);
    }

    #[test]
    fn test_sync_config_serialization() {
        let mut config = SyncConfig::new();
        config.add_entity(
            "customers".to_string(),
            EntitySyncConfig {
                source_of_truth: SourceOfTruth::Pos,
                conflict_strategy: ConflictStrategy::NewestWins,
            },
        );

        let json = serde_json::to_string(&config).unwrap();
        let deserialized: SyncConfig = serde_json::from_str(&json).unwrap();

        assert_eq!(config.entities.len(), deserialized.entities.len());
        let customer_config = deserialized.get_entity_config("customers").unwrap();
        assert_eq!(customer_config.source_of_truth, SourceOfTruth::Pos);
        assert_eq!(customer_config.conflict_strategy, ConflictStrategy::NewestWins);
    }
}
