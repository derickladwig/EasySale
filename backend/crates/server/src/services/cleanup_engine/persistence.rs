//! Persistence layer for Document Cleanup Engine
//!
//! Provides database operations for cleanup rules with:
//! - Multi-tenant isolation (tenant_id + store_id)
//! - Versioned updates with NO DELETES policy (archive pattern)
//! - Audit logging for all changes
//! - Fail-open fallback to in-memory storage
//!
//! # Architecture
//! - All persistence methods require tenant_id and store_id
//! - Updates use versioned insert + archive (supersede pattern)
//! - Audit log records all changes with action type
//! - Database errors fall back to in-memory with warnings

use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::sync::RwLock;
use tracing::{info, warn};
use uuid::Uuid;

use super::types::CleanupShield;

/// Vendor cleanup rule record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VendorCleanupRule {
    pub id: String,
    pub tenant_id: String,
    pub store_id: String,
    pub vendor_id: String,
    pub doc_type: Option<String>,
    pub rules: Vec<CleanupShield>,
    pub enabled: bool,
    pub archived_at: Option<String>,
    pub version: i32,
    pub created_at: String,
    pub updated_at: Option<String>,
    pub created_by: Option<String>,
}


/// Template cleanup rule record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateCleanupRule {
    pub id: String,
    pub tenant_id: String,
    pub store_id: String,
    pub template_id: String,
    pub vendor_id: String,
    pub doc_type: Option<String>,
    pub rules: Vec<CleanupShield>,
    pub enabled: bool,
    pub archived_at: Option<String>,
    pub version: i32,
    pub created_at: String,
    pub updated_at: Option<String>,
    pub created_by: Option<String>,
}

/// Audit log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupAuditEntry {
    pub id: String,
    pub tenant_id: String,
    pub store_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub action: String,
    pub diff_json: Option<String>,
    pub user_id: String,
    pub created_at: String,
}

/// Review case shields snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewCaseShields {
    pub id: String,
    pub tenant_id: String,
    pub store_id: String,
    pub review_case_id: String,
    pub resolved_shields: Vec<CleanupShield>,
    pub overlay_artifact_path: Option<String>,
    pub created_at: String,
}


/// Persistence error types
#[derive(Debug, thiserror::Error)]
pub enum PersistenceError {
    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Rule not found: {entity_type} {entity_id}")]
    NotFound {
        entity_type: String,
        entity_id: String,
    },

    #[error("Invalid tenant context")]
    InvalidTenantContext,
}

impl From<sqlx::Error> for PersistenceError {
    fn from(err: sqlx::Error) -> Self {
        PersistenceError::DatabaseError(err.to_string())
    }
}

impl From<serde_json::Error> for PersistenceError {
    fn from(err: serde_json::Error) -> Self {
        PersistenceError::SerializationError(err.to_string())
    }
}

/// In-memory fallback storage for fail-open behavior
#[derive(Debug, Default)]
struct InMemoryFallback {
    vendor_rules: HashMap<String, VendorCleanupRule>,
    template_rules: HashMap<String, TemplateCleanupRule>,
}


/// Cleanup persistence service
///
/// Provides database operations for cleanup rules with multi-tenant isolation.
/// Falls back to in-memory storage on database errors (fail-open).
pub struct CleanupPersistence {
    pool: Option<SqlitePool>,
    fallback: RwLock<InMemoryFallback>,
}

impl CleanupPersistence {
    /// Create a new persistence service with database pool
    ///
    /// # Arguments
    /// * `pool` - SQLite connection pool
    #[must_use]
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool: Some(pool),
            fallback: RwLock::new(InMemoryFallback::default()),
        }
    }

    /// Create a persistence service without database (in-memory only)
    ///
    /// Useful for testing or when database is unavailable.
    #[must_use]
    pub fn in_memory() -> Self {
        Self {
            pool: None,
            fallback: RwLock::new(InMemoryFallback::default()),
        }
    }

    /// Generate a composite key for vendor rules
    fn vendor_key(tenant_id: &str, store_id: &str, vendor_id: &str, doc_type: Option<&str>) -> String {
        format!(
            "{}:{}:{}:{}",
            tenant_id,
            store_id,
            vendor_id,
            doc_type.unwrap_or("_all")
        )
    }

    /// Generate a composite key for template rules
    fn template_key(tenant_id: &str, store_id: &str, template_id: &str, doc_type: Option<&str>) -> String {
        format!(
            "{}:{}:{}:{}",
            tenant_id,
            store_id,
            template_id,
            doc_type.unwrap_or("_all")
        )
    }


    // ========================================================================
    // Vendor Rules
    // ========================================================================

    /// Save vendor cleanup rules with versioned insert + archive pattern
    ///
    /// # Arguments
    /// * `tenant_id` - Tenant identifier (from auth context)
    /// * `store_id` - Store identifier (from auth context)
    /// * `vendor_id` - Vendor identifier
    /// * `doc_type` - Optional document type filter
    /// * `rules` - Cleanup shields to save
    /// * `user_id` - User making the change
    ///
    /// # Errors
    /// Returns `PersistenceError` on database or serialization failure.
    /// Falls back to in-memory storage with warning on database error.
    pub async fn save_vendor_rules(
        &self,
        tenant_id: &str,
        store_id: &str,
        vendor_id: &str,
        doc_type: Option<&str>,
        rules: &[CleanupShield],
        user_id: &str,
    ) -> Result<(), PersistenceError> {
        let now = Utc::now().to_rfc3339();
        let rules_json = serde_json::to_string(rules)?;

        if let Some(pool) = &self.pool {
            match self
                .save_vendor_rules_db(pool, tenant_id, store_id, vendor_id, doc_type, &rules_json, user_id, &now)
                .await
            {
                Ok(()) => return Ok(()),
                Err(e) => {
                    warn!("Database error saving vendor rules, falling back to in-memory: {}", e);
                }
            }
        }

        // Fallback to in-memory
        self.save_vendor_rules_memory(tenant_id, store_id, vendor_id, doc_type, rules, user_id, &now);
        Ok(())
    }


    async fn save_vendor_rules_db(
        &self,
        pool: &SqlitePool,
        tenant_id: &str,
        store_id: &str,
        vendor_id: &str,
        doc_type: Option<&str>,
        rules_json: &str,
        user_id: &str,
        now: &str,
    ) -> Result<(), PersistenceError> {
        let mut tx = pool.begin().await?;

        // Find current active rule
        let current: Option<(String, i32)> = sqlx::query_as(
            r#"
            SELECT id, version FROM vendor_cleanup_rules
            WHERE tenant_id = ? AND store_id = ? AND vendor_id = ?
              AND (doc_type = ? OR (doc_type IS NULL AND ? IS NULL))
              AND archived_at IS NULL AND enabled = TRUE
            "#,
        )
        .bind(tenant_id)
        .bind(store_id)
        .bind(vendor_id)
        .bind(doc_type)
        .bind(doc_type)
        .fetch_optional(&mut *tx)
        .await?;

        let (old_id, new_version) = if let Some((id, version)) = current {
            // Archive the current rule (NO DELETES)
            sqlx::query(
                r#"
                UPDATE vendor_cleanup_rules
                SET archived_at = ?, enabled = FALSE, updated_at = ?
                WHERE id = ?
                "#,
            )
            .bind(now)
            .bind(now)
            .bind(&id)
            .execute(&mut *tx)
            .await?;

            (Some(id), version + 1)
        } else {
            (None, 1)
        };

        // Insert new version
        let new_id = Uuid::new_v4().to_string();
        sqlx::query(
            r#"
            INSERT INTO vendor_cleanup_rules
            (id, tenant_id, store_id, vendor_id, doc_type, rules_json, enabled, version, created_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?)
            "#,
        )
        .bind(&new_id)
        .bind(tenant_id)
        .bind(store_id)
        .bind(vendor_id)
        .bind(doc_type)
        .bind(rules_json)
        .bind(new_version)
        .bind(now)
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

        // Audit log
        let action = if old_id.is_some() { "supersede" } else { "create" };
        self.log_audit_tx(&mut tx, tenant_id, store_id, "vendor", vendor_id, action, user_id, now)
            .await?;

        tx.commit().await?;
        info!(
            "Saved vendor cleanup rules: tenant={}, store={}, vendor={}, version={}",
            tenant_id, store_id, vendor_id, new_version
        );
        Ok(())
    }


    fn save_vendor_rules_memory(
        &self,
        tenant_id: &str,
        store_id: &str,
        vendor_id: &str,
        doc_type: Option<&str>,
        rules: &[CleanupShield],
        user_id: &str,
        now: &str,
    ) {
        let key = Self::vendor_key(tenant_id, store_id, vendor_id, doc_type);
        let mut fallback = self.fallback.write().unwrap();

        let version = fallback
            .vendor_rules
            .get(&key)
            .map(|r| r.version + 1)
            .unwrap_or(1);

        let rule = VendorCleanupRule {
            id: Uuid::new_v4().to_string(),
            tenant_id: tenant_id.to_string(),
            store_id: store_id.to_string(),
            vendor_id: vendor_id.to_string(),
            doc_type: doc_type.map(String::from),
            rules: rules.to_vec(),
            enabled: true,
            archived_at: None,
            version,
            created_at: now.to_string(),
            updated_at: None,
            created_by: Some(user_id.to_string()),
        };

        fallback.vendor_rules.insert(key, rule);
        warn!(
            "Vendor rules saved to in-memory fallback: tenant={}, store={}, vendor={}",
            tenant_id, store_id, vendor_id
        );
    }

    /// Get vendor cleanup rules
    ///
    /// # Arguments
    /// * `tenant_id` - Tenant identifier (from auth context)
    /// * `store_id` - Store identifier (from auth context)
    /// * `vendor_id` - Vendor identifier
    /// * `doc_type` - Optional document type filter
    ///
    /// # Errors
    /// Returns `PersistenceError` on database or deserialization failure.
    pub async fn get_vendor_rules(
        &self,
        tenant_id: &str,
        store_id: &str,
        vendor_id: &str,
        doc_type: Option<&str>,
    ) -> Result<Vec<CleanupShield>, PersistenceError> {
        if let Some(pool) = &self.pool {
            match self.get_vendor_rules_db(pool, tenant_id, store_id, vendor_id, doc_type).await {
                Ok(rules) => return Ok(rules),
                Err(e) => {
                    warn!("Database error getting vendor rules, checking fallback: {}", e);
                }
            }
        }

        // Fallback to in-memory
        Ok(self.get_vendor_rules_memory(tenant_id, store_id, vendor_id, doc_type))
    }


    async fn get_vendor_rules_db(
        &self,
        pool: &SqlitePool,
        tenant_id: &str,
        store_id: &str,
        vendor_id: &str,
        doc_type: Option<&str>,
    ) -> Result<Vec<CleanupShield>, PersistenceError> {
        let row: Option<(String,)> = sqlx::query_as(
            r#"
            SELECT rules_json FROM vendor_cleanup_rules
            WHERE tenant_id = ? AND store_id = ? AND vendor_id = ?
              AND (doc_type = ? OR (doc_type IS NULL AND ? IS NULL))
              AND archived_at IS NULL AND enabled = TRUE
            ORDER BY version DESC
            LIMIT 1
            "#,
        )
        .bind(tenant_id)
        .bind(store_id)
        .bind(vendor_id)
        .bind(doc_type)
        .bind(doc_type)
        .fetch_optional(pool)
        .await?;

        match row {
            Some((rules_json,)) => {
                let rules: Vec<CleanupShield> = serde_json::from_str(&rules_json)?;
                Ok(rules)
            }
            None => Ok(vec![]),
        }
    }

    fn get_vendor_rules_memory(
        &self,
        tenant_id: &str,
        store_id: &str,
        vendor_id: &str,
        doc_type: Option<&str>,
    ) -> Vec<CleanupShield> {
        let key = Self::vendor_key(tenant_id, store_id, vendor_id, doc_type);
        let fallback = self.fallback.read().unwrap();
        fallback
            .vendor_rules
            .get(&key)
            .filter(|r| r.enabled && r.archived_at.is_none())
            .map(|r| r.rules.clone())
            .unwrap_or_default()
    }


    // ========================================================================
    // Template Rules
    // ========================================================================

    /// Save template cleanup rules with versioned insert + archive pattern
    ///
    /// # Arguments
    /// * `tenant_id` - Tenant identifier (from auth context)
    /// * `store_id` - Store identifier (from auth context)
    /// * `template_id` - Template identifier
    /// * `vendor_id` - Associated vendor identifier
    /// * `doc_type` - Optional document type filter
    /// * `rules` - Cleanup shields to save
    /// * `user_id` - User making the change
    ///
    /// # Errors
    /// Returns `PersistenceError` on database or serialization failure.
    /// Falls back to in-memory storage with warning on database error.
    pub async fn save_template_rules(
        &self,
        tenant_id: &str,
        store_id: &str,
        template_id: &str,
        vendor_id: &str,
        doc_type: Option<&str>,
        rules: &[CleanupShield],
        user_id: &str,
    ) -> Result<(), PersistenceError> {
        let now = Utc::now().to_rfc3339();
        let rules_json = serde_json::to_string(rules)?;

        if let Some(pool) = &self.pool {
            match self
                .save_template_rules_db(
                    pool, tenant_id, store_id, template_id, vendor_id, doc_type, &rules_json, user_id, &now,
                )
                .await
            {
                Ok(()) => return Ok(()),
                Err(e) => {
                    warn!("Database error saving template rules, falling back to in-memory: {}", e);
                }
            }
        }

        // Fallback to in-memory
        self.save_template_rules_memory(
            tenant_id, store_id, template_id, vendor_id, doc_type, rules, user_id, &now,
        );
        Ok(())
    }


    #[allow(clippy::too_many_arguments)]
    async fn save_template_rules_db(
        &self,
        pool: &SqlitePool,
        tenant_id: &str,
        store_id: &str,
        template_id: &str,
        vendor_id: &str,
        doc_type: Option<&str>,
        rules_json: &str,
        user_id: &str,
        now: &str,
    ) -> Result<(), PersistenceError> {
        let mut tx = pool.begin().await?;

        // Find current active rule
        let current: Option<(String, i32)> = sqlx::query_as(
            r#"
            SELECT id, version FROM template_cleanup_rules
            WHERE tenant_id = ? AND store_id = ? AND template_id = ?
              AND (doc_type = ? OR (doc_type IS NULL AND ? IS NULL))
              AND archived_at IS NULL AND enabled = TRUE
            "#,
        )
        .bind(tenant_id)
        .bind(store_id)
        .bind(template_id)
        .bind(doc_type)
        .bind(doc_type)
        .fetch_optional(&mut *tx)
        .await?;

        let (old_id, new_version) = if let Some((id, version)) = current {
            // Archive the current rule (NO DELETES)
            sqlx::query(
                r#"
                UPDATE template_cleanup_rules
                SET archived_at = ?, enabled = FALSE, updated_at = ?
                WHERE id = ?
                "#,
            )
            .bind(now)
            .bind(now)
            .bind(&id)
            .execute(&mut *tx)
            .await?;

            (Some(id), version + 1)
        } else {
            (None, 1)
        };

        // Insert new version
        let new_id = Uuid::new_v4().to_string();
        sqlx::query(
            r#"
            INSERT INTO template_cleanup_rules
            (id, tenant_id, store_id, template_id, vendor_id, doc_type, rules_json, enabled, version, created_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?)
            "#,
        )
        .bind(&new_id)
        .bind(tenant_id)
        .bind(store_id)
        .bind(template_id)
        .bind(vendor_id)
        .bind(doc_type)
        .bind(rules_json)
        .bind(new_version)
        .bind(now)
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

        // Audit log
        let action = if old_id.is_some() { "supersede" } else { "create" };
        self.log_audit_tx(&mut tx, tenant_id, store_id, "template", template_id, action, user_id, now)
            .await?;

        tx.commit().await?;
        info!(
            "Saved template cleanup rules: tenant={}, store={}, template={}, version={}",
            tenant_id, store_id, template_id, new_version
        );
        Ok(())
    }


    #[allow(clippy::too_many_arguments)]
    fn save_template_rules_memory(
        &self,
        tenant_id: &str,
        store_id: &str,
        template_id: &str,
        vendor_id: &str,
        doc_type: Option<&str>,
        rules: &[CleanupShield],
        user_id: &str,
        now: &str,
    ) {
        let key = Self::template_key(tenant_id, store_id, template_id, doc_type);
        let mut fallback = self.fallback.write().unwrap();

        let version = fallback
            .template_rules
            .get(&key)
            .map(|r| r.version + 1)
            .unwrap_or(1);

        let rule = TemplateCleanupRule {
            id: Uuid::new_v4().to_string(),
            tenant_id: tenant_id.to_string(),
            store_id: store_id.to_string(),
            template_id: template_id.to_string(),
            vendor_id: vendor_id.to_string(),
            doc_type: doc_type.map(String::from),
            rules: rules.to_vec(),
            enabled: true,
            archived_at: None,
            version,
            created_at: now.to_string(),
            updated_at: None,
            created_by: Some(user_id.to_string()),
        };

        fallback.template_rules.insert(key, rule);
        warn!(
            "Template rules saved to in-memory fallback: tenant={}, store={}, template={}",
            tenant_id, store_id, template_id
        );
    }

    /// Get template cleanup rules
    ///
    /// # Arguments
    /// * `tenant_id` - Tenant identifier (from auth context)
    /// * `store_id` - Store identifier (from auth context)
    /// * `template_id` - Template identifier
    /// * `doc_type` - Optional document type filter
    ///
    /// # Errors
    /// Returns `PersistenceError` on database or deserialization failure.
    pub async fn get_template_rules(
        &self,
        tenant_id: &str,
        store_id: &str,
        template_id: &str,
        doc_type: Option<&str>,
    ) -> Result<Vec<CleanupShield>, PersistenceError> {
        if let Some(pool) = &self.pool {
            match self.get_template_rules_db(pool, tenant_id, store_id, template_id, doc_type).await {
                Ok(rules) => return Ok(rules),
                Err(e) => {
                    warn!("Database error getting template rules, checking fallback: {}", e);
                }
            }
        }

        // Fallback to in-memory
        Ok(self.get_template_rules_memory(tenant_id, store_id, template_id, doc_type))
    }


    async fn get_template_rules_db(
        &self,
        pool: &SqlitePool,
        tenant_id: &str,
        store_id: &str,
        template_id: &str,
        doc_type: Option<&str>,
    ) -> Result<Vec<CleanupShield>, PersistenceError> {
        let row: Option<(String,)> = sqlx::query_as(
            r#"
            SELECT rules_json FROM template_cleanup_rules
            WHERE tenant_id = ? AND store_id = ? AND template_id = ?
              AND (doc_type = ? OR (doc_type IS NULL AND ? IS NULL))
              AND archived_at IS NULL AND enabled = TRUE
            ORDER BY version DESC
            LIMIT 1
            "#,
        )
        .bind(tenant_id)
        .bind(store_id)
        .bind(template_id)
        .bind(doc_type)
        .bind(doc_type)
        .fetch_optional(pool)
        .await?;

        match row {
            Some((rules_json,)) => {
                let rules: Vec<CleanupShield> = serde_json::from_str(&rules_json)?;
                Ok(rules)
            }
            None => Ok(vec![]),
        }
    }

    fn get_template_rules_memory(
        &self,
        tenant_id: &str,
        store_id: &str,
        template_id: &str,
        doc_type: Option<&str>,
    ) -> Vec<CleanupShield> {
        let key = Self::template_key(tenant_id, store_id, template_id, doc_type);
        let fallback = self.fallback.read().unwrap();
        fallback
            .template_rules
            .get(&key)
            .filter(|r| r.enabled && r.archived_at.is_none())
            .map(|r| r.rules.clone())
            .unwrap_or_default()
    }


    // ========================================================================
    // Audit Logging
    // ========================================================================

    async fn log_audit_tx(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
        tenant_id: &str,
        store_id: &str,
        entity_type: &str,
        entity_id: &str,
        action: &str,
        user_id: &str,
        now: &str,
    ) -> Result<(), PersistenceError> {
        let id = Uuid::new_v4().to_string();
        sqlx::query(
            r#"
            INSERT INTO cleanup_audit_log
            (id, tenant_id, store_id, entity_type, entity_id, action, user_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(tenant_id)
        .bind(store_id)
        .bind(entity_type)
        .bind(entity_id)
        .bind(action)
        .bind(user_id)
        .bind(now)
        .execute(&mut **tx)
        .await?;

        Ok(())
    }

    /// Get audit log entries for an entity
    ///
    /// # Arguments
    /// * `tenant_id` - Tenant identifier
    /// * `store_id` - Store identifier
    /// * `entity_type` - "vendor" or "template"
    /// * `entity_id` - Entity identifier
    ///
    /// # Errors
    /// Returns `PersistenceError` on database failure.
    pub async fn get_audit_log(
        &self,
        tenant_id: &str,
        store_id: &str,
        entity_type: &str,
        entity_id: &str,
    ) -> Result<Vec<CleanupAuditEntry>, PersistenceError> {
        let Some(pool) = &self.pool else {
            return Ok(vec![]);
        };

        let rows: Vec<(String, String, String, String, String, String, Option<String>, String, String)> =
            sqlx::query_as(
                r#"
                SELECT id, tenant_id, store_id, entity_type, entity_id, action, diff_json, user_id, created_at
                FROM cleanup_audit_log
                WHERE tenant_id = ? AND store_id = ? AND entity_type = ? AND entity_id = ?
                ORDER BY created_at DESC
                "#,
            )
            .bind(tenant_id)
            .bind(store_id)
            .bind(entity_type)
            .bind(entity_id)
            .fetch_all(pool)
            .await?;

        Ok(rows
            .into_iter()
            .map(|(id, tenant_id, store_id, entity_type, entity_id, action, diff_json, user_id, created_at)| {
                CleanupAuditEntry {
                    id,
                    tenant_id,
                    store_id,
                    entity_type,
                    entity_id,
                    action,
                    diff_json,
                    user_id,
                    created_at,
                }
            })
            .collect())
    }


    // ========================================================================
    // Review Case Shields
    // ========================================================================

    /// Save resolved shields snapshot for a review case
    ///
    /// # Arguments
    /// * `tenant_id` - Tenant identifier
    /// * `store_id` - Store identifier
    /// * `review_case_id` - Review case identifier
    /// * `shields` - Resolved shields to snapshot
    /// * `overlay_path` - Optional path to rendered overlay artifact
    ///
    /// # Errors
    /// Returns `PersistenceError` on database or serialization failure.
    pub async fn save_review_case_shields(
        &self,
        tenant_id: &str,
        store_id: &str,
        review_case_id: &str,
        shields: &[CleanupShield],
        overlay_path: Option<&str>,
    ) -> Result<String, PersistenceError> {
        let now = Utc::now().to_rfc3339();
        let shields_json = serde_json::to_string(shields)?;
        let id = Uuid::new_v4().to_string();

        let Some(pool) = &self.pool else {
            warn!("No database pool, review case shields not persisted");
            return Ok(id);
        };

        sqlx::query(
            r#"
            INSERT INTO review_case_shields
            (id, tenant_id, store_id, review_case_id, resolved_shields_json, overlay_artifact_path, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(tenant_id)
        .bind(store_id)
        .bind(review_case_id)
        .bind(&shields_json)
        .bind(overlay_path)
        .bind(&now)
        .execute(pool)
        .await?;

        info!(
            "Saved review case shields: tenant={}, store={}, case={}, shields={}",
            tenant_id,
            store_id,
            review_case_id,
            shields.len()
        );
        Ok(id)
    }

    /// Get resolved shields for a review case
    ///
    /// # Arguments
    /// * `tenant_id` - Tenant identifier
    /// * `store_id` - Store identifier
    /// * `review_case_id` - Review case identifier
    ///
    /// # Errors
    /// Returns `PersistenceError` on database or deserialization failure.
    pub async fn get_review_case_shields(
        &self,
        tenant_id: &str,
        store_id: &str,
        review_case_id: &str,
    ) -> Result<Option<ReviewCaseShields>, PersistenceError> {
        let Some(pool) = &self.pool else {
            return Ok(None);
        };

        let row: Option<(String, String, String, String, String, Option<String>, String)> = sqlx::query_as(
            r#"
            SELECT id, tenant_id, store_id, review_case_id, resolved_shields_json, overlay_artifact_path, created_at
            FROM review_case_shields
            WHERE tenant_id = ? AND store_id = ? AND review_case_id = ?
            ORDER BY created_at DESC
            LIMIT 1
            "#,
        )
        .bind(tenant_id)
        .bind(store_id)
        .bind(review_case_id)
        .fetch_optional(pool)
        .await?;

        match row {
            Some((id, tenant_id, store_id, review_case_id, shields_json, overlay_path, created_at)) => {
                let shields: Vec<CleanupShield> = serde_json::from_str(&shields_json)?;
                Ok(Some(ReviewCaseShields {
                    id,
                    tenant_id,
                    store_id,
                    review_case_id,
                    resolved_shields: shields,
                    overlay_artifact_path: overlay_path,
                    created_at,
                }))
            }
            None => Ok(None),
        }
    }
}
