/**
 * Bulk Operation Safety Service
 * 
 * Provides safety controls for bulk operations including:
 * - Confirmation requirements for large operations
 * - Destructive operation warnings
 * - Sandbox/test mode support
 */

use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

/// Bulk operation safety service
pub struct BulkOperationSafety {
    db: SqlitePool,
    pending_confirmations: Arc<RwLock<HashMap<String, PendingConfirmation>>>,
}

/// Pending confirmation for bulk operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingConfirmation {
    pub token: String,
    pub operation_type: OperationType,
    pub entity_type: String,
    pub record_count: usize,
    pub is_destructive: bool,
    pub summary: OperationSummary,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub expires_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum OperationType {
    Update,
    Delete,
    Sync,
    Import,
    Export,
}

impl std::fmt::Display for OperationType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            OperationType::Update => write!(f, "Update"),
            OperationType::Delete => write!(f, "Delete"),
            OperationType::Sync => write!(f, "Sync"),
            OperationType::Import => write!(f, "Import"),
            OperationType::Export => write!(f, "Export"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationSummary {
    pub description: String,
    pub affected_records: usize,
    pub changes: Vec<ChangeDescription>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeDescription {
    pub field: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub record_count: usize,
}

/// Confirmation requirement result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfirmationRequirement {
    pub requires_confirmation: bool,
    pub reason: String,
    pub token: Option<String>,
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
    pub summary: OperationSummary,
}

impl BulkOperationSafety {
    /// Create new bulk operation safety service
    pub fn new(db: SqlitePool) -> Self {
        Self {
            db,
            pending_confirmations: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Check if operation requires confirmation
    /// 
    /// Operations requiring confirmation:
    /// - Affects > 10 records
    /// - Is destructive (delete, overwrite)
    /// - Modifies critical fields
    pub async fn check_confirmation_requirement(
        &self,
        operation_type: OperationType,
        entity_type: &str,
        record_count: usize,
        changes: Vec<ChangeDescription>,
    ) -> Result<ConfirmationRequirement, String> {
        // Check if operation is destructive
        let is_destructive = operation_type == OperationType::Delete;

        // Check if affects many records
        let affects_many = record_count > 10;

        // Check if modifies critical fields
        let modifies_critical = changes.iter().any(|c| {
            matches!(
                c.field.as_str(),
                "price" | "cost" | "quantity" | "status" | "is_active"
            )
        });

        let requires_confirmation = is_destructive || affects_many || modifies_critical;

        let reason = if is_destructive {
            format!("Destructive operation: {} will delete {} records", operation_type, record_count)
        } else if affects_many {
            format!("Large operation: affects {} records (threshold: 10)", record_count)
        } else if modifies_critical {
            "Modifies critical fields".to_string()
        } else {
            "No confirmation required".to_string()
        };

        let summary = OperationSummary {
            description: format!(
                "{:?} operation on {} affecting {} records",
                operation_type, entity_type, record_count
            ),
            affected_records: record_count,
            changes: changes.clone(),
            warnings: Self::generate_warnings(&operation_type, &changes, record_count),
        };

        if requires_confirmation {
            // Generate confirmation token
            let token = Uuid::new_v4().to_string();
            let created_at = chrono::Utc::now();
            let expires_at = created_at + chrono::Duration::minutes(5);

            let confirmation = PendingConfirmation {
                token: token.clone(),
                operation_type,
                entity_type: entity_type.to_string(),
                record_count,
                is_destructive,
                summary: summary.clone(),
                created_at,
                expires_at,
            };

            // Store pending confirmation
            let mut confirmations = self.pending_confirmations.write().await;
            confirmations.insert(token.clone(), confirmation);

            // Clean up expired confirmations
            self.cleanup_expired_confirmations(&mut confirmations).await;

            Ok(ConfirmationRequirement {
                requires_confirmation: true,
                reason,
                token: Some(token),
                expires_at: Some(expires_at),
                summary,
            })
        } else {
            Ok(ConfirmationRequirement {
                requires_confirmation: false,
                reason,
                token: None,
                expires_at: None,
                summary,
            })
        }
    }

    /// Validate confirmation token
    pub async fn validate_confirmation(&self, token: &str) -> Result<PendingConfirmation, String> {
        let confirmations = self.pending_confirmations.read().await;

        let confirmation = confirmations
            .get(token)
            .ok_or("Invalid or expired confirmation token")?;

        // Check if expired
        if confirmation.expires_at < chrono::Utc::now() {
            return Err("Confirmation token has expired".to_string());
        }

        Ok(confirmation.clone())
    }

    /// Consume confirmation token (use once)
    pub async fn consume_confirmation(&self, token: &str) -> Result<PendingConfirmation, String> {
        let mut confirmations = self.pending_confirmations.write().await;

        let confirmation = confirmations
            .remove(token)
            .ok_or("Invalid or expired confirmation token")?;

        // Check if expired
        if confirmation.expires_at < chrono::Utc::now() {
            return Err("Confirmation token has expired".to_string());
        }

        Ok(confirmation)
    }

    /// Generate warnings for operation
    fn generate_warnings(
        operation_type: &OperationType,
        changes: &[ChangeDescription],
        record_count: usize,
    ) -> Vec<String> {
        let mut warnings = Vec::new();

        if *operation_type == OperationType::Delete {
            warnings.push(format!(
                "⚠️ DESTRUCTIVE: This will permanently delete {} records",
                record_count
            ));
            warnings.push("This action cannot be undone".to_string());
        }

        if record_count > 100 {
            warnings.push(format!(
                "⚠️ LARGE OPERATION: Affects {} records. Consider processing in batches.",
                record_count
            ));
        }

        for change in changes {
            if change.field == "price" && change.record_count > 10 {
                warnings.push(format!(
                    "⚠️ PRICE CHANGE: Will update prices for {} products",
                    change.record_count
                ));
            }

            if change.field == "is_active" && change.new_value == Some("false".to_string()) {
                warnings.push(format!(
                    "⚠️ DEACTIVATION: Will deactivate {} records",
                    change.record_count
                ));
            }
        }

        warnings
    }

    /// Clean up expired confirmations
    async fn cleanup_expired_confirmations(&self, confirmations: &mut HashMap<String, PendingConfirmation>) {
        let now = chrono::Utc::now();
        confirmations.retain(|_, conf| conf.expires_at > now);
    }

    /// Check if sandbox mode is enabled for tenant
    pub async fn is_sandbox_mode(&self, tenant_id: &str) -> Result<bool, String> {
        let row: Option<(i64,)> = sqlx::query_as(
            "SELECT sandbox_mode FROM tenant_settings WHERE tenant_id = ?"
        )
        .bind(tenant_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| format!("Failed to check sandbox mode: {}", e))?;

        Ok(row.map(|(mode,)| mode == 1).unwrap_or(false))
    }

    /// Set sandbox mode for tenant
    pub async fn set_sandbox_mode(&self, tenant_id: &str, enabled: bool) -> Result<(), String> {
        sqlx::query(
            "INSERT INTO tenant_settings (tenant_id, sandbox_mode, updated_at)
             VALUES (?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(tenant_id) DO UPDATE SET
             sandbox_mode = excluded.sandbox_mode,
             updated_at = CURRENT_TIMESTAMP"
        )
        .bind(tenant_id)
        .bind(if enabled { 1 } else { 0 })
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to set sandbox mode: {}", e))?;

        Ok(())
    }

    /// Get sandbox configuration for tenant
    pub async fn get_sandbox_config(&self, tenant_id: &str) -> Result<SandboxConfig, String> {
        let row: Option<(String, String, String)> = sqlx::query_as(
            "SELECT woocommerce_sandbox_url, quickbooks_sandbox_realm, supabase_sandbox_project
             FROM tenant_settings WHERE tenant_id = ?"
        )
        .bind(tenant_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| format!("Failed to get sandbox config: {}", e))?;

        if let Some((woo_url, qbo_realm, supabase_project)) = row {
            Ok(SandboxConfig {
                woocommerce_url: Some(woo_url),
                quickbooks_realm: Some(qbo_realm),
                supabase_project: Some(supabase_project),
            })
        } else {
            Ok(SandboxConfig::default())
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SandboxConfig {
    pub woocommerce_url: Option<String>,
    pub quickbooks_realm: Option<String>,
    pub supabase_project: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_confirmation_required_for_large_operation() {
        let pool = sqlx::SqlitePool::connect(":memory:").await.unwrap();
        let safety = BulkOperationSafety::new(pool);

        let result = safety
            .check_confirmation_requirement(
                OperationType::Update,
                "products",
                50,
                vec![],
            )
            .await
            .unwrap();

        assert!(result.requires_confirmation);
        assert!(result.token.is_some());
    }

    #[tokio::test]
    async fn test_confirmation_required_for_destructive_operation() {
        let pool = sqlx::SqlitePool::connect(":memory:").await.unwrap();
        let safety = BulkOperationSafety::new(pool);

        let result = safety
            .check_confirmation_requirement(
                OperationType::Delete,
                "products",
                5,
                vec![],
            )
            .await
            .unwrap();

        assert!(result.requires_confirmation);
        assert!(result.summary.warnings.len() > 0);
    }

    #[tokio::test]
    async fn test_confirmation_not_required_for_small_operation() {
        let pool = sqlx::SqlitePool::connect(":memory:").await.unwrap();
        let safety = BulkOperationSafety::new(pool);

        let result = safety
            .check_confirmation_requirement(
                OperationType::Update,
                "products",
                5,
                vec![],
            )
            .await
            .unwrap();

        assert!(!result.requires_confirmation);
        assert!(result.token.is_none());
    }

    #[tokio::test]
    async fn test_token_validation() {
        let pool = sqlx::SqlitePool::connect(":memory:").await.unwrap();
        let safety = BulkOperationSafety::new(pool);

        let requirement = safety
            .check_confirmation_requirement(
                OperationType::Delete,
                "products",
                20,
                vec![],
            )
            .await
            .unwrap();

        let token = requirement.token.unwrap();

        // Valid token
        let validation = safety.validate_confirmation(&token).await;
        assert!(validation.is_ok());

        // Consume token
        let consumption = safety.consume_confirmation(&token).await;
        assert!(consumption.is_ok());

        // Token should be consumed
        let validation2 = safety.validate_confirmation(&token).await;
        assert!(validation2.is_err());
    }
}
