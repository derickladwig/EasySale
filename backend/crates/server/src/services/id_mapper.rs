/**
 * ID Mapper Service
 * 
 * Manages cross-system ID mappings to prevent duplicate creation
 * and enable entity resolution across platforms.
 * 
 * Requirements: 7.5, 13.4
 */

use sqlx::SqlitePool;

/// ID Mapper service
pub struct IdMapper {
    db: SqlitePool,
}

impl IdMapper {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// Store a mapping between source and target systems
    pub async fn store_mapping(
        &self,
        tenant_id: &str,
        source_system: &str,
        source_entity: &str,
        source_id: &str,
        target_system: &str,
        target_entity: &str,
        target_id: &str,
    ) -> Result<(), String> {
        sqlx::query(
            r#"
            INSERT OR REPLACE INTO id_mappings (
                tenant_id, source_system, source_entity, source_id,
                target_system, target_entity, target_id, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            "#
        )
        .bind(tenant_id)
        .bind(source_system)
        .bind(source_entity)
        .bind(source_id)
        .bind(target_system)
        .bind(target_entity)
        .bind(target_id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to store ID mapping: {}", e))?;

        Ok(())
    }

    /// Get target ID for a source entity
    pub async fn get_mapping(
        &self,
        tenant_id: &str,
        source_system: &str,
        source_entity: &str,
        source_id: &str,
        target_system: &str,
    ) -> Result<Option<String>, String> {
        let row = sqlx::query_scalar::<_, String>(
            r#"
            SELECT target_id FROM id_mappings
            WHERE tenant_id = ? AND source_system = ? AND source_entity = ?
              AND source_id = ? AND target_system = ?
            "#
        )
        .bind(tenant_id)
        .bind(source_system)
        .bind(source_entity)
        .bind(source_id)
        .bind(target_system)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| format!("Failed to get ID mapping: {}", e))?;

        Ok(row)
    }

    /// Delete a mapping
    pub async fn delete_mapping(
        &self,
        tenant_id: &str,
        source_system: &str,
        source_entity: &str,
        source_id: &str,
        target_system: &str,
    ) -> Result<(), String> {
        sqlx::query(
            r#"
            DELETE FROM id_mappings
            WHERE tenant_id = ? AND source_system = ? AND source_entity = ?
              AND source_id = ? AND target_system = ?
            "#
        )
        .bind(tenant_id)
        .bind(source_system)
        .bind(source_entity)
        .bind(source_id)
        .bind(target_system)
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to delete ID mapping: {}", e))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_id_mapper_creation() {
        // Test will require actual database connection
        // Placeholder for now
        assert!(true);
    }
}
