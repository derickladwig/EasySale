/**
 * Supabase CRUD Operations
 * 
 * Implements upsert operations with idempotency for data warehousing.
 * 
 * Requirements: 13.3, 13.4, 13.5, 13.6
 */

use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

use crate::models::ApiError;
use super::client::SupabaseClient;

// ============================================================================
// Upsert Operations
// ============================================================================

/// Result of an upsert operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpsertResult {
    pub records_affected: usize,
    pub operation: String, // "insert" or "update"
}

/// Supabase operations trait
pub struct SupabaseOperations {
    client: SupabaseClient,
}

impl SupabaseOperations {
    pub fn new(client: SupabaseClient) -> Self {
        Self { client }
    }
    
    /// Upsert record using ON CONFLICT
    /// 
    /// Requirements: 13.3, 13.4
    pub async fn upsert(
        &self,
        table: &str,
        record: &JsonValue,
        conflict_columns: &[&str],
    ) -> Result<UpsertResult, ApiError> {
        // Build conflict resolution header
        let conflict_str = conflict_columns.join(",");
        let resolution = format!("resolution=merge-duplicates,on_conflict={}", conflict_str);
        
        let response = self.client
            .authenticated_request(reqwest::Method::POST, table)
            .header("Prefer", &resolution)
            .json(record)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Upsert failed: {}", e)))?;
        
        if !response.status().is_success() {
            let status = response.status().as_u16();
            let body = response.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Upsert failed: {} - {}",
                status,
                body
            )));
        }
        
        let result: Vec<JsonValue> = response.json().await
            .map_err(|e| ApiError::internal(format!("Failed to parse upsert response: {}", e)))?;
        
        Ok(UpsertResult {
            records_affected: result.len(),
            operation: "upsert".to_string(),
        })
    }
    
    /// Bulk upsert multiple records
    /// 
    /// Requirements: 13.3, 13.4
    pub async fn bulk_upsert(
        &self,
        table: &str,
        records: &[JsonValue],
        conflict_columns: &[&str],
    ) -> Result<UpsertResult, ApiError> {
        if records.is_empty() {
            return Ok(UpsertResult {
                records_affected: 0,
                operation: "upsert".to_string(),
            });
        }
        
        // Build conflict resolution header
        let conflict_str = conflict_columns.join(",");
        let resolution = format!("resolution=merge-duplicates,on_conflict={}", conflict_str);
        
        let response = self.client
            .authenticated_request(reqwest::Method::POST, table)
            .header("Prefer", &resolution)
            .json(records)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Bulk upsert failed: {}", e)))?;
        
        if !response.status().is_success() {
            let status = response.status().as_u16();
            let body = response.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Bulk upsert failed: {} - {}",
                status,
                body
            )));
        }
        
        let result: Vec<JsonValue> = response.json().await
            .map_err(|e| ApiError::internal(format!("Failed to parse bulk upsert response: {}", e)))?;
        
        Ok(UpsertResult {
            records_affected: result.len(),
            operation: "bulk_upsert".to_string(),
        })
    }
    
    /// Query records with pagination
    /// 
    /// Requirements: 13.3
    pub async fn query(
        &self,
        table: &str,
        filters: Option<&str>,
        limit: Option<u32>,
        offset: Option<u32>,
    ) -> Result<Vec<JsonValue>, ApiError> {
        let mut endpoint = table.to_string();
        let mut query_params = Vec::new();
        
        if let Some(filter) = filters {
            query_params.push(filter.to_string());
        }
        
        if let Some(lim) = limit {
            query_params.push(format!("limit={}", lim));
        }
        
        if let Some(off) = offset {
            query_params.push(format!("offset={}", off));
        }
        
        if !query_params.is_empty() {
            endpoint.push('?');
            endpoint.push_str(&query_params.join("&"));
        }
        
        let response = self.client.get(&endpoint).await?;
        
        if !response.status().is_success() {
            let status = response.status().as_u16();
            let body = response.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Query failed: {} - {}",
                status,
                body
            )));
        }
        
        let records: Vec<JsonValue> = response.json().await
            .map_err(|e| ApiError::internal(format!("Failed to parse query response: {}", e)))?;
        
        Ok(records)
    }
    
    /// Delete records
    /// 
    /// Requirements: 13.3
    pub async fn delete(&self, table: &str, filters: &str) -> Result<usize, ApiError> {
        let endpoint = format!("{}?{}", table, filters);
        
        let response = self.client.delete(&endpoint).await?;
        
        if !response.status().is_success() {
            let status = response.status().as_u16();
            let body = response.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Delete failed: {} - {}",
                status,
                body
            )));
        }
        
        let result: Vec<JsonValue> = response.json().await
            .map_err(|e| ApiError::internal(format!("Failed to parse delete response: {}", e)))?;
        
        Ok(result.len())
    }
}

// ============================================================================
// ID Mapping Service
// ============================================================================

/// ID mapping for cross-system entity tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdMapping {
    pub source_system: String,
    pub source_entity: String,
    pub source_id: String,
    pub target_system: String,
    pub target_entity: String,
    pub target_id: String,
    pub created_at: String,
}

impl IdMapping {
    pub fn new(
        source_system: String,
        source_entity: String,
        source_id: String,
        target_system: String,
        target_entity: String,
        target_id: String,
    ) -> Self {
        Self {
            source_system,
            source_entity,
            source_id,
            target_system,
            target_entity,
            target_id,
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

/// ID mapping service
/// 
/// Requirements: 7.5, 13.4
pub struct IdMappingService {
    operations: SupabaseOperations,
}

impl IdMappingService {
    pub fn new(operations: SupabaseOperations) -> Self {
        Self { operations }
    }
    
    /// Store ID mapping
    pub async fn store_mapping(&self, mapping: &IdMapping) -> Result<(), ApiError> {
        let record = serde_json::to_value(mapping)
            .map_err(|e| ApiError::internal(format!("Failed to serialize mapping: {}", e)))?;
        
        self.operations
            .upsert(
                "id_mappings",
                &record,
                &["source_system", "source_entity", "source_id", "target_system", "target_entity"],
            )
            .await?;
        
        Ok(())
    }
    
    /// Lookup target ID from source ID
    pub async fn lookup_target_id(
        &self,
        source_system: &str,
        source_entity: &str,
        source_id: &str,
        target_system: &str,
        target_entity: &str,
    ) -> Result<Option<String>, ApiError> {
        let filters = format!(
            "source_system=eq.{}&source_entity=eq.{}&source_id=eq.{}&target_system=eq.{}&target_entity=eq.{}",
            source_system, source_entity, source_id, target_system, target_entity
        );
        
        let records = self.operations.query("id_mappings", Some(&filters), Some(1), None).await?;
        
        if let Some(record) = records.first() {
            if let Some(target_id) = record.get("target_id").and_then(|v| v.as_str()) {
                return Ok(Some(target_id.to_string()));
            }
        }
        
        Ok(None)
    }
    
    /// Lookup source ID from target ID
    pub async fn lookup_source_id(
        &self,
        target_system: &str,
        target_entity: &str,
        target_id: &str,
        source_system: &str,
        source_entity: &str,
    ) -> Result<Option<String>, ApiError> {
        let filters = format!(
            "target_system=eq.{}&target_entity=eq.{}&target_id=eq.{}&source_system=eq.{}&source_entity=eq.{}",
            target_system, target_entity, target_id, source_system, source_entity
        );
        
        let records = self.operations.query("id_mappings", Some(&filters), Some(1), None).await?;
        
        if let Some(record) = records.first() {
            if let Some(source_id) = record.get("source_id").and_then(|v| v.as_str()) {
                return Ok(Some(source_id.to_string()));
            }
        }
        
        Ok(None)
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_upsert_result() {
        let result = UpsertResult {
            records_affected: 5,
            operation: "upsert".to_string(),
        };
        
        assert_eq!(result.records_affected, 5);
        assert_eq!(result.operation, "upsert");
    }
    
    #[test]
    fn test_id_mapping_new() {
        let mapping = IdMapping::new(
            "woocommerce".to_string(),
            "order".to_string(),
            "123".to_string(),
            "quickbooks".to_string(),
            "invoice".to_string(),
            "456".to_string(),
        );
        
        assert_eq!(mapping.source_system, "woocommerce");
        assert_eq!(mapping.source_entity, "order");
        assert_eq!(mapping.source_id, "123");
        assert_eq!(mapping.target_system, "quickbooks");
        assert_eq!(mapping.target_entity, "invoice");
        assert_eq!(mapping.target_id, "456");
        assert!(!mapping.created_at.is_empty());
    }
}
