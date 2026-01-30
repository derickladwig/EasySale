/**
 * Dry Run Executor Service
 * 
 * Executes sync operations in dry run mode without making actual API calls.
 * Provides preview of changes that would be made.
 */

use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::SqlitePool;

use crate::services::id_mapper::IdMapper;

/// Dry run executor service
pub struct DryRunExecutor {
    db: SqlitePool,
    id_mapper: IdMapper,
}

/// Preview of a change that would be made
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangePreview {
    pub entity_id: String,
    pub entity_type: String,
    pub action: ChangeAction,
    pub target_system: String,
    pub payload_preview: JsonValue,
    pub dependencies: Vec<DependencyPreview>,
    pub validation_status: ValidationStatus,
    pub estimated_impact: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ChangeAction {
    Create,
    Update,
    Delete,
    Skip,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyPreview {
    pub entity_type: String,
    pub entity_id: String,
    pub action: ChangeAction,
    pub exists: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ValidationStatus {
    Valid,
    Warning,
    Error,
}

/// Dry run result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DryRunResult {
    pub changes: Vec<ChangePreview>,
    pub summary: DryRunSummary,
    pub warnings: Vec<String>,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DryRunSummary {
    pub total_records: usize,
    pub creates: usize,
    pub updates: usize,
    pub deletes: usize,
    pub skips: usize,
    pub errors: usize,
    pub warnings: usize,
}

impl DryRunExecutor {
    /// Create new dry run executor
    pub fn new(db: SqlitePool) -> Self {
        Self {
            id_mapper: IdMapper::new(db.clone()),
            db,
        }
    }

    /// Execute dry run for entity sync
    /// 
    /// This simulates the sync process without making actual API calls:
    /// 1. Fetch source data
    /// 2. Apply transformations and mappings
    /// 3. Resolve dependencies (check if they exist)
    /// 4. Validate payloads
    /// 5. Return preview of changes
    pub async fn execute_dry_run(
        &self,
        tenant_id: &str,
        source_system: &str,
        target_system: &str,
        entity_type: &str,
        entity_ids: Option<Vec<String>>,
    ) -> Result<DryRunResult, String> {
        tracing::info!(
            "Executing dry run: {} -> {} for {}",
            source_system,
            target_system,
            entity_type
        );

        let mut changes = Vec::new();
        let mut warnings = Vec::new();
        let mut errors = Vec::new();

        // Fetch source entities
        let source_entities = self
            .fetch_source_entities(tenant_id, source_system, entity_type, entity_ids)
            .await?;

        tracing::info!("Fetched {} source entities", source_entities.len());

        // Process each entity
        for source_entity in source_entities {
            match self
                .preview_entity_sync(
                    tenant_id,
                    source_system,
                    target_system,
                    entity_type,
                    &source_entity,
                )
                .await
            {
                Ok(preview) => {
                    // Collect warnings and errors
                    if preview.validation_status == ValidationStatus::Warning {
                        warnings.push(format!(
                            "{} {}: Validation warning",
                            entity_type, preview.entity_id
                        ));
                    } else if preview.validation_status == ValidationStatus::Error {
                        errors.push(format!(
                            "{} {}: Validation error",
                            entity_type, preview.entity_id
                        ));
                    }

                    changes.push(preview);
                }
                Err(e) => {
                    errors.push(format!("Failed to preview entity: {}", e));
                }
            }
        }

        // Generate summary
        let summary = Self::generate_summary(&changes);

        Ok(DryRunResult {
            changes,
            summary,
            warnings,
            errors,
        })
    }

    /// Preview sync for a single entity
    async fn preview_entity_sync(
        &self,
        tenant_id: &str,
        source_system: &str,
        target_system: &str,
        entity_type: &str,
        source_entity: &JsonValue,
    ) -> Result<ChangePreview, String> {
        // Extract entity ID
        let entity_id = source_entity
            .get("id")
            .and_then(|v| v.as_str())
            .ok_or("Missing entity ID")?
            .to_string();

        // Check if entity already exists in target system
        let target_id = self
            .id_mapper
            .get_mapping(tenant_id, source_system, entity_type, &entity_id, target_system)
            .await
            .ok()
            .flatten();

        let action = if target_id.is_some() {
            ChangeAction::Update
        } else {
            ChangeAction::Create
        };

        // Apply transformations and mappings
        // For now, just pass through the source entity
        // In production, this would load the mapping config and apply it
        let transformed = source_entity.clone();

        // Resolve dependencies (without creating them)
        let dependencies = self
            .resolve_dependencies(tenant_id, source_system, target_system, &transformed)
            .await?;

        // Validate payload
        let validation_status = Self::validate_payload(target_system, entity_type, &transformed);

        // Estimate impact
        let estimated_impact = match action {
            ChangeAction::Create => format!("Will create new {} in {}", entity_type, target_system),
            ChangeAction::Update => format!("Will update existing {} in {}", entity_type, target_system),
            ChangeAction::Delete => format!("Will delete {} from {}", entity_type, target_system),
            ChangeAction::Skip => format!("Will skip {} (no changes)", entity_type),
        };

        Ok(ChangePreview {
            entity_id,
            entity_type: entity_type.to_string(),
            action,
            target_system: target_system.to_string(),
            payload_preview: transformed,
            dependencies,
            validation_status,
            estimated_impact,
        })
    }

    /// Fetch source entities from database
    async fn fetch_source_entities(
        &self,
        tenant_id: &str,
        source_system: &str,
        entity_type: &str,
        entity_ids: Option<Vec<String>>,
    ) -> Result<Vec<JsonValue>, String> {
        // This is a simplified implementation
        // In production, this would fetch from the actual source system or cache

        let mut query = format!(
            "SELECT data FROM sync_cache WHERE tenant_id = ? AND source_system = ? AND entity_type = ?"
        );

        let mut params: Vec<String> = vec![
            tenant_id.to_string(),
            source_system.to_string(),
            entity_type.to_string(),
        ];

        if let Some(ids) = entity_ids {
            if !ids.is_empty() {
                let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
                query.push_str(&format!(" AND entity_id IN ({})", placeholders));
                params.extend(ids);
            }
        }

        query.push_str(" LIMIT 100"); // Safety limit for dry run

        let mut query_builder = sqlx::query_scalar::<_, String>(&query);
        for param in params {
            query_builder = query_builder.bind(param);
        }

        let results = query_builder
            .fetch_all(&self.db)
            .await
            .map_err(|e| format!("Failed to fetch entities: {}", e))?;

        // Parse JSON
        let entities: Vec<JsonValue> = results
            .iter()
            .filter_map(|s| serde_json::from_str(s).ok())
            .collect();

        Ok(entities)
    }

    /// Resolve dependencies without creating them
    async fn resolve_dependencies(
        &self,
        tenant_id: &str,
        source_system: &str,
        target_system: &str,
        payload: &JsonValue,
    ) -> Result<Vec<DependencyPreview>, String> {
        let mut dependencies = Vec::new();

        // Check for customer dependency
        if let Some(customer_id) = payload.get("customer_id").and_then(|v| v.as_str()) {
            let exists = self
                .id_mapper
                .get_mapping(tenant_id, source_system, "customer", customer_id, target_system)
                .await
                .ok()
                .flatten()
                .is_some();

            dependencies.push(DependencyPreview {
                entity_type: "customer".to_string(),
                entity_id: customer_id.to_string(),
                action: if exists {
                    ChangeAction::Skip
                } else {
                    ChangeAction::Create
                },
                exists,
            });
        }

        // Check for item dependencies in line items
        if let Some(line_items) = payload.get("line_items").and_then(|v| v.as_array()) {
            for item in line_items {
                if let Some(item_id) = item.get("item_id").and_then(|v| v.as_str()) {
                    let exists = self
                        .id_mapper
                        .get_mapping(tenant_id, source_system, "item", item_id, target_system)
                        .await
                        .ok()
                        .flatten()
                        .is_some();

                    dependencies.push(DependencyPreview {
                        entity_type: "item".to_string(),
                        entity_id: item_id.to_string(),
                        action: if exists {
                            ChangeAction::Skip
                        } else {
                            ChangeAction::Create
                        },
                        exists,
                    });
                }
            }
        }

        Ok(dependencies)
    }

    /// Validate payload for target system
    fn validate_payload(
        target_system: &str,
        entity_type: &str,
        payload: &JsonValue,
    ) -> ValidationStatus {
        // Basic validation - in production this would be more comprehensive
        match target_system {
            "quickbooks" => Self::validate_quickbooks_payload(entity_type, payload),
            "woocommerce" => Self::validate_woocommerce_payload(entity_type, payload),
            "supabase" => ValidationStatus::Valid, // Supabase is flexible
            _ => ValidationStatus::Warning,
        }
    }

    /// Validate QuickBooks payload
    fn validate_quickbooks_payload(entity_type: &str, payload: &JsonValue) -> ValidationStatus {
        match entity_type {
            "invoice" => {
                // Check required fields
                if payload.get("CustomerRef").is_none() {
                    return ValidationStatus::Error;
                }
                if payload.get("Line").and_then(|v| v.as_array()).map_or(true, |a| a.is_empty()) {
                    return ValidationStatus::Error;
                }
                
                // Check custom field limit (max 3)
                if let Some(custom_fields) = payload.get("CustomField").and_then(|v| v.as_array()) {
                    if custom_fields.len() > 3 {
                        return ValidationStatus::Warning;
                    }
                }
                
                ValidationStatus::Valid
            }
            "customer" => {
                if payload.get("DisplayName").is_none() {
                    return ValidationStatus::Error;
                }
                ValidationStatus::Valid
            }
            "item" => {
                if payload.get("Name").is_none() || payload.get("Type").is_none() {
                    return ValidationStatus::Error;
                }
                ValidationStatus::Valid
            }
            _ => ValidationStatus::Valid,
        }
    }

    /// Validate WooCommerce payload
    fn validate_woocommerce_payload(entity_type: &str, payload: &JsonValue) -> ValidationStatus {
        match entity_type {
            "order" => {
                if payload.get("line_items").and_then(|v| v.as_array()).map_or(true, |a| a.is_empty()) {
                    return ValidationStatus::Error;
                }
                ValidationStatus::Valid
            }
            "product" => {
                if payload.get("name").is_none() {
                    return ValidationStatus::Error;
                }
                ValidationStatus::Valid
            }
            _ => ValidationStatus::Valid,
        }
    }

    /// Generate summary statistics
    fn generate_summary(changes: &[ChangePreview]) -> DryRunSummary {
        let mut summary = DryRunSummary {
            total_records: changes.len(),
            creates: 0,
            updates: 0,
            deletes: 0,
            skips: 0,
            errors: 0,
            warnings: 0,
        };

        for change in changes {
            match change.action {
                ChangeAction::Create => summary.creates += 1,
                ChangeAction::Update => summary.updates += 1,
                ChangeAction::Delete => summary.deletes += 1,
                ChangeAction::Skip => summary.skips += 1,
            }

            match change.validation_status {
                ValidationStatus::Error => summary.errors += 1,
                ValidationStatus::Warning => summary.warnings += 1,
                ValidationStatus::Valid => {}
            }
        }

        summary
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_validate_quickbooks_invoice_missing_customer() {
        let payload = serde_json::json!({
            "Line": [{"Amount": 100.0}]
        });

        let status = DryRunExecutor::validate_quickbooks_payload("invoice", &payload);
        assert!(matches!(status, ValidationStatus::Error));
    }

    #[tokio::test]
    async fn test_validate_quickbooks_invoice_too_many_custom_fields() {
        let payload = serde_json::json!({
            "CustomerRef": {"value": "123"},
            "Line": [{"Amount": 100.0}],
            "CustomField": [
                {"Name": "Field1", "StringValue": "Value1"},
                {"Name": "Field2", "StringValue": "Value2"},
                {"Name": "Field3", "StringValue": "Value3"},
                {"Name": "Field4", "StringValue": "Value4"}
            ]
        });

        let status = DryRunExecutor::validate_quickbooks_payload("invoice", &payload);
        assert!(matches!(status, ValidationStatus::Warning));
    }

    #[tokio::test]
    async fn test_generate_summary() {
        let changes = vec![
            ChangePreview {
                entity_id: "1".to_string(),
                entity_type: "order".to_string(),
                action: ChangeAction::Create,
                target_system: "quickbooks".to_string(),
                payload_preview: serde_json::json!({}),
                dependencies: vec![],
                validation_status: ValidationStatus::Valid,
                estimated_impact: "".to_string(),
            },
            ChangePreview {
                entity_id: "2".to_string(),
                entity_type: "order".to_string(),
                action: ChangeAction::Update,
                target_system: "quickbooks".to_string(),
                payload_preview: serde_json::json!({}),
                dependencies: vec![],
                validation_status: ValidationStatus::Warning,
                estimated_impact: "".to_string(),
            },
        ];

        let summary = DryRunExecutor::generate_summary(&changes);
        assert_eq!(summary.total_records, 2);
        assert_eq!(summary.creates, 1);
        assert_eq!(summary.updates, 1);
        assert_eq!(summary.warnings, 1);
    }
}
