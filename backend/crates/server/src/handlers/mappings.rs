/**
 * Field Mapping API Handlers
 * 
 * Endpoints for managing field mapping configurations:
 * - GET /api/mappings - List all mappings for tenant
 * - GET /api/mappings/:id - Get specific mapping
 * - POST /api/mappings - Create or update mapping
 * - POST /api/mappings/import - Import mapping from JSON
 * - GET /api/mappings/:id/export - Export mapping as JSON
 * - POST /api/mappings/preview - Preview mapping with sample data
 * 
 * Requirements: 3.6, 14.2
 */

use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

use crate::mappers::{FieldMapping, MappingValidator, MappingEngine, TransformationRegistry};
use crate::models::errors::{ApiError, ValidationError};
use crate::auth::jwt::Claims;

#[derive(Debug, Deserialize)]
pub struct GetMappingsQuery {
    pub mapping_id: Option<String>,
    pub source_connector: Option<String>,
    pub target_connector: Option<String>,
    pub entity_type: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MappingResponse {
    pub mapping: FieldMapping,
    pub validation_status: String,
    pub validation_errors: Vec<ValidationError>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMappingRequest {
    pub mapping: FieldMapping,
}

#[derive(Debug, Deserialize)]
pub struct PreviewMappingRequest {
    pub mapping: FieldMapping,
    pub sample_data: JsonValue,
}

#[derive(Debug, Serialize)]
pub struct PreviewMappingResponse {
    pub source_data: JsonValue,
    pub target_data: JsonValue,
    pub validation_errors: Vec<ValidationError>,
    pub transformation_errors: Vec<String>,
}

/// GET /api/mappings - List all mappings for tenant
pub async fn get_mappings(
    claims: web::ReqData<Claims>,
    query: web::Query<GetMappingsQuery>,
    pool: web::Data<sqlx::SqlitePool>,
) -> Result<HttpResponse, ApiError> {
    let tenant_id = &claims.tenant_id;
    
    let mut sql = "SELECT * FROM field_mappings WHERE tenant_id = ?".to_string();
    let mut bindings = vec![tenant_id.clone()];
    
    if let Some(ref mapping_id) = query.mapping_id {
        sql.push_str(" AND mapping_id = ?");
        bindings.push(mapping_id.clone());
    }
    if let Some(ref source) = query.source_connector {
        sql.push_str(" AND source_connector = ?");
        bindings.push(source.clone());
    }
    if let Some(ref target) = query.target_connector {
        sql.push_str(" AND target_connector = ?");
        bindings.push(target.clone());
    }
    if let Some(ref entity) = query.entity_type {
        sql.push_str(" AND entity_type = ?");
        bindings.push(entity.clone());
    }
    
    let mut query_builder = sqlx::query(&sql);
    for binding in bindings {
        query_builder = query_builder.bind(binding);
    }
    
    let rows = query_builder.fetch_all(pool.get_ref()).await
        .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?;
    
    let mut mappings = Vec::new();
    for row in rows {
        use sqlx::Row;
        let mappings_json: String = row.get("mappings_json");
        let transformations_json: Option<String> = row.get("transformations_json");
        
        let mut mapping = FieldMapping::new(
            row.get("tenant_id"),
            row.get("mapping_id"),
            row.get("source_connector"),
            row.get("target_connector"),
            row.get("entity_type"),
        );
        
        // Parse mappings JSON
        if let Ok(field_maps) = serde_json::from_str(&mappings_json) {
            mapping.mappings = field_maps;
        }
        
        // Parse transformations JSON if present
        if let Some(trans_json) = transformations_json {
            if let Ok(transformations) = serde_json::from_str(&trans_json) {
                mapping.transformations = transformations;
            }
        }
        
        mappings.push(mapping);
    }
    
    Ok(HttpResponse::Ok().json(mappings))
}

/// GET /api/mappings/:id - Get specific mapping
pub async fn get_mapping(
    claims: web::ReqData<Claims>,
    mapping_id: web::Path<String>,
    pool: web::Data<sqlx::SqlitePool>,
) -> Result<HttpResponse, ApiError> {
    let tenant_id = &claims.tenant_id;
    let mapping_id = mapping_id.into_inner();
    
    let row = sqlx::query(
        "SELECT * FROM field_mappings WHERE tenant_id = ? AND mapping_id = ? AND is_active = 1"
    )
    .bind(tenant_id)
    .bind(&mapping_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?
    .ok_or_else(|| ApiError::not_found(format!("Mapping not found: {}", mapping_id)))?;
    
    use sqlx::Row;
    let mappings_json: String = row.get("mappings_json");
    let transformations_json: Option<String> = row.get("transformations_json");
    
    let mut mapping = FieldMapping::new(
        row.get("tenant_id"),
        row.get("mapping_id"),
        row.get("source_connector"),
        row.get("target_connector"),
        row.get("entity_type"),
    );
    
    if let Ok(field_maps) = serde_json::from_str(&mappings_json) {
        mapping.mappings = field_maps;
    }
    
    if let Some(trans_json) = transformations_json {
        if let Ok(transformations) = serde_json::from_str(&trans_json) {
            mapping.transformations = transformations;
        }
    }
    
    Ok(HttpResponse::Ok().json(mapping))
}

/// POST /api/mappings - Create or update mapping
pub async fn create_mapping(
    claims: web::ReqData<Claims>,
    req: web::Json<CreateMappingRequest>,
    pool: web::Data<sqlx::SqlitePool>,
) -> Result<HttpResponse, ApiError> {
    let tenant_id = &claims.tenant_id;
    let mapping = req.into_inner().mapping;
    
    // Ensure tenant_id matches
    if mapping.tenant_id != *tenant_id {
        return Err(ApiError::forbidden("Tenant ID mismatch"));
    }
    
    // Validate mapping
    let validator = MappingValidator::new();
    match validator.validate(&mapping) {
        Ok(_) => {
            // Serialize mappings and transformations
            let mappings_json = serde_json::to_string(&mapping.mappings)
                .map_err(|e| ApiError::internal(format!("Failed to serialize mappings: {}", e)))?;
            let transformations_json = if let Some(ref transformations) = mapping.transformations {
                if !transformations.is_empty() {
                    Some(serde_json::to_string(transformations)
                        .map_err(|e| ApiError::internal(format!("Failed to serialize transformations: {}", e)))?)
                } else {
                    None
                }
            } else {
                None
            };
            
            // Deactivate existing mapping with same mapping_id
            sqlx::query("UPDATE field_mappings SET is_active = 0 WHERE tenant_id = ? AND mapping_id = ?")
                .bind(tenant_id)
                .bind(&mapping.mapping_id)
                .execute(pool.get_ref())
                .await
                .map_err(|e| ApiError::internal(format!("Failed to deactivate old mapping: {}", e)))?;
            
            // Insert new mapping
            let id = uuid::Uuid::new_v4().to_string();
            sqlx::query(
                r#"INSERT INTO field_mappings 
                (id, tenant_id, mapping_id, source_connector, target_connector, entity_type, 
                 mappings_json, transformations_json, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)"#
            )
            .bind(&id)
            .bind(tenant_id)
            .bind(&mapping.mapping_id)
            .bind(&mapping.source_connector)
            .bind(&mapping.target_connector)
            .bind(&mapping.entity_type)
            .bind(&mappings_json)
            .bind(&transformations_json)
            .execute(pool.get_ref())
            .await
            .map_err(|e| ApiError::internal(format!("Failed to save mapping: {}", e)))?;
            
            Ok(HttpResponse::Ok().json(MappingResponse {
                mapping,
                validation_status: "valid".to_string(),
                validation_errors: Vec::new(),
            }))
        }
        Err(errors) => {
            Ok(HttpResponse::BadRequest().json(MappingResponse {
                mapping,
                validation_status: "invalid".to_string(),
                validation_errors: errors,
            }))
        }
    }
}

/// POST /api/mappings/import - Import mapping from JSON file
pub async fn import_mapping(
    claims: web::ReqData<Claims>,
    req: web::Json<FieldMapping>,
    pool: web::Data<sqlx::SqlitePool>,
) -> Result<HttpResponse, ApiError> {
    let tenant_id = &claims.tenant_id;
    let mut mapping = req.into_inner();
    
    // Set tenant_id from claims
    mapping.tenant_id = tenant_id.clone();
    
    // Validate mapping
    let validator = MappingValidator::new();
    match validator.validate(&mapping) {
        Ok(_) => {
            // Serialize mappings and transformations
            let mappings_json = serde_json::to_string(&mapping.mappings)
                .map_err(|e| ApiError::internal(format!("Failed to serialize mappings: {}", e)))?;
            let transformations_json = if let Some(ref transformations) = mapping.transformations {
                if !transformations.is_empty() {
                    Some(serde_json::to_string(transformations)
                        .map_err(|e| ApiError::internal(format!("Failed to serialize transformations: {}", e)))?)
                } else {
                    None
                }
            } else {
                None
            };
            
            // Deactivate existing mapping with same mapping_id
            sqlx::query("UPDATE field_mappings SET is_active = 0 WHERE tenant_id = ? AND mapping_id = ?")
                .bind(tenant_id)
                .bind(&mapping.mapping_id)
                .execute(pool.get_ref())
                .await
                .map_err(|e| ApiError::internal(format!("Failed to deactivate old mapping: {}", e)))?;
            
            // Insert new mapping
            let id = uuid::Uuid::new_v4().to_string();
            sqlx::query(
                r#"INSERT INTO field_mappings 
                (id, tenant_id, mapping_id, source_connector, target_connector, entity_type, 
                 mappings_json, transformations_json, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)"#
            )
            .bind(&id)
            .bind(tenant_id)
            .bind(&mapping.mapping_id)
            .bind(&mapping.source_connector)
            .bind(&mapping.target_connector)
            .bind(&mapping.entity_type)
            .bind(&mappings_json)
            .bind(&transformations_json)
            .execute(pool.get_ref())
            .await
            .map_err(|e| ApiError::internal(format!("Failed to save mapping: {}", e)))?;
            
            Ok(HttpResponse::Ok().json(MappingResponse {
                mapping,
                validation_status: "valid".to_string(),
                validation_errors: Vec::new(),
            }))
        }
        Err(errors) => {
            Ok(HttpResponse::BadRequest().json(MappingResponse {
                mapping,
                validation_status: "invalid".to_string(),
                validation_errors: errors,
            }))
        }
    }
}

/// GET /api/mappings/:id/export - Export mapping as JSON
pub async fn export_mapping(
    claims: web::ReqData<Claims>,
    mapping_id: web::Path<String>,
    pool: web::Data<sqlx::SqlitePool>,
) -> Result<HttpResponse, ApiError> {
    let tenant_id = &claims.tenant_id;
    let mapping_id = mapping_id.into_inner();
    
    let row = sqlx::query(
        "SELECT * FROM field_mappings WHERE tenant_id = ? AND mapping_id = ? AND is_active = 1"
    )
    .bind(tenant_id)
    .bind(&mapping_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?
    .ok_or_else(|| ApiError::not_found(format!("Mapping not found: {}", mapping_id)))?;
    
    use sqlx::Row;
    let mappings_json: String = row.get("mappings_json");
    let transformations_json: Option<String> = row.get("transformations_json");
    
    let mut mapping = FieldMapping::new(
        row.get("tenant_id"),
        row.get("mapping_id"),
        row.get("source_connector"),
        row.get("target_connector"),
        row.get("entity_type"),
    );
    
    if let Ok(field_maps) = serde_json::from_str(&mappings_json) {
        mapping.mappings = field_maps;
    }
    
    if let Some(trans_json) = transformations_json {
        if let Ok(transformations) = serde_json::from_str(&trans_json) {
            mapping.transformations = transformations;
        }
    }
    
    Ok(HttpResponse::Ok()
        .content_type("application/json")
        .insert_header(("Content-Disposition", format!("attachment; filename=\"{}.json\"", mapping_id)))
        .json(mapping))
}

/// POST /api/mappings/preview - Preview mapping with sample data
pub async fn preview_mapping(
    claims: web::ReqData<Claims>,
    req: web::Json<PreviewMappingRequest>,
) -> Result<HttpResponse, ApiError> {
    let _tenant_id = &claims.tenant_id; // Available for future validation if needed
    let preview_req = req.into_inner();
    let mapping = preview_req.mapping;
    let sample_data = preview_req.sample_data;
    
    // Validate mapping
    let validator = MappingValidator::new();
    let validation_errors = match validator.validate(&mapping) {
        Ok(_) => Vec::new(),
        Err(errors) => errors,
    };
    
    // Apply mapping to sample data
    let registry = TransformationRegistry::new();
    let engine = MappingEngine::new(registry);
    
    let (target_data, transformation_errors) = match engine.apply_mapping(&mapping, &sample_data) {
        Ok(data) => (data, Vec::new()),
        Err(err) => (JsonValue::Null, vec![err]),
    };
    
    Ok(HttpResponse::Ok().json(PreviewMappingResponse {
        source_data: sample_data,
        target_data,
        validation_errors,
        transformation_errors,
    }))
}

/// Configure mapping routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/mappings")
            .route("", web::get().to(get_mappings))
            .route("", web::post().to(create_mapping))
            .route("/import", web::post().to(import_mapping))
            .route("/preview", web::post().to(preview_mapping))
            .route("/{id}", web::get().to(get_mapping))
            .route("/{id}/export", web::get().to(export_mapping))
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mappers::schema::FieldMap;
    
    #[test]
    fn test_preview_mapping_valid() {
        let mut mapping = FieldMapping::new(
            "tenant-1".to_string(),
            "test".to_string(),
            "source".to_string(),
            "target".to_string(),
            "entity".to_string(),
        );
        
        mapping.add_mapping(FieldMap::new(
            "name".to_string(),
            "DisplayName".to_string(),
            true,
        ));
        
        let sample_data = serde_json::json!({
            "name": "John Doe"
        });
        
        let registry = TransformationRegistry::new();
        let engine = MappingEngine::new(registry);
        let result = engine.apply_mapping(&mapping, &sample_data);
        
        assert!(result.is_ok());
        let target = result.unwrap();
        assert_eq!(target["DisplayName"], "John Doe");
    }
}
