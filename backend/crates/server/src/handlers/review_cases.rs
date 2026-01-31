// Review Case API Endpoints
// Endpoints for managing review cases

use actix_web::{web, HttpResponse, HttpRequest, HttpMessage};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct ListCasesQuery {
    pub state: Option<String>,
    pub vendor: Option<String>,
    pub min_conf: Option<u8>,
    pub sort: Option<String>,
    pub page: Option<usize>,
    pub per_page: Option<usize>,
    pub tenant_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ListCasesResponse {
    pub cases: Vec<ReviewCaseSummary>,
    pub total: usize,
    pub page: usize,
    pub per_page: usize,
}

#[derive(Debug, Serialize)]
pub struct ReviewCaseSummary {
    pub case_id: String,
    pub state: String,
    pub vendor_name: Option<String>,
    pub confidence: u8,
    pub created_at: String,
    pub fields_needing_attention: usize,
    pub validation_result: Option<ValidationSummary>,
}

#[derive(Debug, Serialize)]
pub struct CaseDetailResponse {
    pub case_id: String,
    pub state: String,
    pub vendor_name: Option<String>,
    pub confidence: u8,
    pub source_file_path: String,
    pub source_file_type: Option<String>,
    pub extracted_fields: Vec<ExtractedField>,
    pub validation_result: ValidationResult,
    pub decisions: Vec<FieldDecision>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct ValidationSummary {
    pub hard_flags: Vec<String>,
    pub soft_flags: Vec<String>,
    pub can_approve: bool,
}

#[derive(Debug, Deserialize)]
pub struct DecideFieldRequest {
    pub field: String,
    pub chosen_value: String,
    pub source: String,
}

#[derive(Debug, Serialize)]
pub struct DecideFieldResponse {
    pub updated_confidence: u8,
    pub validation_result: ValidationSummary,
}

#[derive(Debug, Serialize)]
pub struct ApproveResponse {
    pub approved: bool,
    pub blocking_reasons: Vec<String>,
    pub state: String,
}

#[derive(Debug, Serialize)]
pub struct UndoResponse {
    pub restored_decision: String,
    pub current_state: String,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

// Database row structures
#[derive(Debug, FromRow)]
pub struct ReviewCaseRow {
    pub id: String,
    pub tenant_id: String,
    pub state: String,
    pub vendor_id: Option<String>,
    pub vendor_name: Option<String>,
    pub confidence: i32,
    pub source_file_path: String,
    pub source_file_type: Option<String>,
    pub extracted_data: Option<String>,
    pub validation_result: Option<String>,
    pub ocr_raw_text: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub created_by: Option<String>,
    pub approved_by: Option<String>,
    pub approved_at: Option<String>,
}

#[derive(Debug, FromRow)]
pub struct CaseListItem {
    pub case_id: String,
    pub state: String,
    pub vendor_name: Option<String>,
    pub confidence: i32,
    pub created_at: String,
    pub fields_decided: i32,
    pub validation_result: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct ExtractedField {
    pub name: String,
    pub value: String,
    pub confidence: u8,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct ValidationResult {
    pub hard_flags: Vec<String>,
    pub soft_flags: Vec<String>,
    pub can_approve: bool,
}

#[derive(Debug, Serialize, FromRow)]
pub struct FieldDecision {
    pub field_name: String,
    pub chosen_value: String,
    pub decided_at: String,
}

/// GET /api/cases?state=&vendor=&min_conf=&sort=
pub async fn list_cases(
    query: web::Query<ListCasesQuery>,
    pool: web::Data<SqlitePool>,
    user_ctx: web::ReqData<crate::models::UserContext>,
) -> HttpResponse {
    let page = query.page.unwrap_or(1);
    let per_page = query.per_page.unwrap_or(20);
    let offset = (page - 1) * per_page;
    // Use tenant_id from authenticated user context for security
    let tenant_id = user_ctx.tenant_id.as_str();
    
    // Build WHERE clause with filters
    let mut where_clauses = vec!["tenant_id = ?"];
    let mut count_where_clauses = vec!["tenant_id = ?"];
    
    if query.state.is_some() {
        where_clauses.push("state = ?");
        count_where_clauses.push("state = ?");
    }
    if query.vendor.is_some() {
        where_clauses.push("vendor_name LIKE ?");
        count_where_clauses.push("vendor_name LIKE ?");
    }
    if query.min_conf.is_some() {
        where_clauses.push("confidence >= ?");
        count_where_clauses.push("confidence >= ?");
    }
    
    let where_clause = where_clauses.join(" AND ");
    let count_where_clause = count_where_clauses.join(" AND ");
    
    // Build main query
    let sql = format!(
        "SELECT id as case_id, state, vendor_name, confidence, created_at, validation_result,
         (SELECT COUNT(*) FROM review_case_decisions WHERE case_id = review_cases.id) as fields_decided
         FROM review_cases WHERE {} ORDER BY created_at DESC LIMIT ? OFFSET ?",
        where_clause
    );
    
    // Build count query with same filters
    let count_sql = format!(
        "SELECT COUNT(*) FROM review_cases WHERE {}",
        count_where_clause
    );
    
    // Build query with proper bindings
    let mut query_builder = sqlx::query_as::<_, CaseListItem>(&sql);
    query_builder = query_builder.bind(tenant_id);
    
    if let Some(ref state) = query.state {
        query_builder = query_builder.bind(state);
    }
    if let Some(ref vendor) = query.vendor {
        query_builder = query_builder.bind(format!("%{}%", vendor));
    }
    if let Some(min_conf) = query.min_conf {
        query_builder = query_builder.bind(min_conf as i32);
    }
    
    query_builder = query_builder.bind(per_page as i64);
    query_builder = query_builder.bind(offset as i64);
    
    // Build count query with same bindings
    let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql);
    count_query = count_query.bind(tenant_id);
    
    if let Some(ref state) = query.state {
        count_query = count_query.bind(state);
    }
    if let Some(ref vendor) = query.vendor {
        count_query = count_query.bind(format!("%{}%", vendor));
    }
    if let Some(min_conf) = query.min_conf {
        count_query = count_query.bind(min_conf as i32);
    }
    
    // Execute queries
    let cases_result = query_builder.fetch_all(pool.get_ref()).await;
    let total_result = count_query.fetch_one(pool.get_ref()).await;
    
    match (cases_result, total_result) {
        (Ok(cases), Ok(total)) => {
            // Convert to response format
            let case_summaries: Vec<ReviewCaseSummary> = cases.into_iter().map(|case| {
                // Parse validation_result JSON if present
                let validation_result = case.validation_result
                    .and_then(|json_str| serde_json::from_str::<ValidationResult>(&json_str).ok())
                    .map(|vr| ValidationSummary {
                        hard_flags: vr.hard_flags,
                        soft_flags: vr.soft_flags,
                        can_approve: vr.can_approve,
                    });
                
                ReviewCaseSummary {
                    case_id: case.case_id,
                    state: case.state,
                    vendor_name: case.vendor_name,
                    confidence: case.confidence as u8,
                    created_at: case.created_at,
                    fields_needing_attention: case.fields_decided as usize,
                    validation_result,
                }
            }).collect();
                
            HttpResponse::Ok().json(ListCasesResponse {
                cases: case_summaries,
                total: total as usize,
                page,
                per_page,
            })
        }
        (Err(e), _) | (_, Err(e)) => {
            log::error!("Failed to list cases: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: "Failed to list cases".to_string(),
            })
        }
    }
}

/// GET /api/cases/:id
pub async fn get_case(
    path: web::Path<String>,
    pool: web::Data<SqlitePool>,
) -> HttpResponse {
    let case_id = path.into_inner();
    
    // Query case from database
    let case_result = sqlx::query_as::<_, ReviewCaseRow>(
        "SELECT * FROM review_cases WHERE id = ?"
    )
    .bind(&case_id)
    .fetch_optional(pool.get_ref())
    .await;
    
    match case_result {
        Ok(Some(case)) => {
            // Parse extracted_data JSON
            let extracted_fields: Vec<ExtractedField> = if let Some(ref data) = case.extracted_data {
                serde_json::from_str(data).unwrap_or_default()
            } else {
                vec![]
            };
            
            // Parse validation_result JSON
            let validation_result: ValidationResult = if let Some(ref result) = case.validation_result {
                serde_json::from_str(result).unwrap_or_default()
            } else {
                ValidationResult::default()
            };
            
            // Get decisions
            let decisions = sqlx::query_as::<_, FieldDecision>(
                "SELECT field_name, chosen_value, decided_at FROM review_case_decisions 
                 WHERE case_id = ? ORDER BY decided_at"
            )
            .bind(&case_id)
            .fetch_all(pool.get_ref())
            .await
            .unwrap_or_default();
            
            HttpResponse::Ok().json(CaseDetailResponse {
                case_id: case.id,
                state: case.state,
                vendor_name: case.vendor_name,
                confidence: case.confidence as u8,
                source_file_path: case.source_file_path,
                source_file_type: case.source_file_type,
                extracted_fields,
                validation_result,
                decisions,
                created_at: case.created_at,
                updated_at: case.updated_at,
            })
        }
        Ok(None) => HttpResponse::NotFound().json(ErrorResponse {
            error: "Case not found".to_string(),
        }),
        Err(e) => {
            log::error!("Failed to get case {}: {}", case_id, e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: "Failed to get case".to_string(),
            })
        }
    }
}

/// POST /api/cases/:id/decide
pub async fn decide_field(
    path: web::Path<String>,
    request: web::Json<DecideFieldRequest>,
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
) -> HttpResponse {
    let case_id = path.into_inner();
    let decision_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    
    // Extract user_id from UserContext
    let user_id = match req.extensions().get::<crate::models::UserContext>() {
        Some(context) => context.user_id.clone(),
        None => {
            log::warn!("User context not found in request, using default");
            "system".to_string()
        }
    };
    
    // Get current case data to retrieve original value
    let case_result = sqlx::query_as::<_, ReviewCaseRow>(
        "SELECT * FROM review_cases WHERE id = ?"
    )
    .bind(&case_id)
    .fetch_optional(pool.get_ref())
    .await;
    
    let original_value = match case_result {
        Ok(Some(case)) => {
            // Parse extracted_data to find original value for this field
            if let Some(ref data) = case.extracted_data {
                let extracted_fields: Vec<ExtractedField> = serde_json::from_str(data).unwrap_or_default();
                extracted_fields.iter()
                    .find(|f| f.name == request.field)
                    .map(|f| f.value.clone())
            } else {
                None
            }
        }
        Ok(None) => {
            return HttpResponse::NotFound().json(ErrorResponse {
                error: "Case not found".to_string(),
            });
        }
        Err(e) => {
            log::error!("Failed to fetch case: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                error: "Failed to fetch case".to_string(),
            });
        }
    };
    
    // Insert decision into database with user_id and original_value
    let insert_result = sqlx::query(
        "INSERT INTO review_case_decisions (id, case_id, field_name, original_value, chosen_value, source, decided_at, decided_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&decision_id)
    .bind(&case_id)
    .bind(&request.field)
    .bind(original_value)
    .bind(&request.chosen_value)
    .bind(&request.source)
    .bind(&now)
    .bind(&user_id)
    .execute(pool.get_ref())
    .await;
    
    match insert_result {
        Ok(_) => {
            // Recalculate confidence based on decisions
            let updated_confidence = recalculate_case_confidence(&case_id, pool.get_ref()).await;
            
            // Recalculate validation result
            let validation_result = recalculate_validation(&case_id, pool.get_ref()).await;
            
            // Update case updated_at timestamp
            let _ = sqlx::query(
                "UPDATE review_cases SET updated_at = ? WHERE id = ?"
            )
            .bind(&now)
            .bind(&case_id)
            .execute(pool.get_ref())
            .await;
            
            HttpResponse::Ok().json(DecideFieldResponse {
                updated_confidence,
                validation_result,
            })
        }
        Err(e) => {
            log::error!("Failed to save decision: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: "Failed to save decision".to_string(),
            })
        }
    }
}

/// Recalculate case confidence based on field decisions
async fn recalculate_case_confidence(case_id: &str, pool: &SqlitePool) -> u8 {
    // Get the case with extracted fields
    let case_result = sqlx::query_as::<_, ReviewCaseRow>(
        "SELECT * FROM review_cases WHERE id = ?"
    )
    .bind(case_id)
    .fetch_optional(pool)
    .await;
    
    let case = match case_result {
        Ok(Some(c)) => c,
        _ => return 0,
    };
    
    // Parse extracted fields
    let extracted_fields: Vec<ExtractedField> = if let Some(ref data) = case.extracted_data {
        serde_json::from_str(data).unwrap_or_default()
    } else {
        return 0;
    };
    
    if extracted_fields.is_empty() {
        return 0;
    }
    
    // Get count of decided fields
    let decided_count_result = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM review_case_decisions WHERE case_id = ?"
    )
    .bind(case_id)
    .fetch_one(pool)
    .await;
    
    let decided_count = decided_count_result.unwrap_or(0) as usize;
    
    // Calculate weighted confidence:
    // - Original OCR confidence for undecided fields
    // - 100% confidence for decided fields (human verified)
    let total_fields = extracted_fields.len();
    let undecided_count = total_fields.saturating_sub(decided_count);
    
    let ocr_confidence_sum: u32 = extracted_fields.iter()
        .map(|f| f.confidence as u32)
        .sum();
    
    let avg_ocr_confidence = if total_fields > 0 {
        ocr_confidence_sum / total_fields as u32
    } else {
        0
    };
    
    // Weighted average: decided fields at 100%, undecided at their OCR confidence
    let total_confidence = (decided_count * 100) + (undecided_count * avg_ocr_confidence as usize);
    let new_confidence = if total_fields > 0 {
        (total_confidence / total_fields) as u8
    } else {
        0
    };
    
    // Update the case confidence in database
    let _ = sqlx::query(
        "UPDATE review_cases SET confidence = ? WHERE id = ?"
    )
    .bind(new_confidence as i32)
    .bind(case_id)
    .execute(pool)
    .await;
    
    new_confidence
}

/// Recalculate validation result based on current field values
async fn recalculate_validation(case_id: &str, pool: &SqlitePool) -> ValidationSummary {
    // Get the case with extracted fields
    let case_result = sqlx::query_as::<_, ReviewCaseRow>(
        "SELECT * FROM review_cases WHERE id = ?"
    )
    .bind(case_id)
    .fetch_optional(pool)
    .await;
    
    let case = match case_result {
        Ok(Some(c)) => c,
        _ => return ValidationSummary {
            hard_flags: vec![],
            soft_flags: vec![],
            can_approve: false,
        },
    };
    
    // Parse extracted fields
    let extracted_fields: Vec<ExtractedField> = if let Some(ref data) = case.extracted_data {
        serde_json::from_str(data).unwrap_or_default()
    } else {
        vec![]
    };
    
    let mut hard_flags = Vec::new();
    let mut soft_flags = Vec::new();
    
    // Validation rules
    // Hard flags: critical fields missing or very low confidence
    for field in &extracted_fields {
        match field.name.as_str() {
            "invoice_number" | "total" => {
                if field.value.is_empty() {
                    hard_flags.push(format!("Missing required field: {}", field.name));
                } else if field.confidence < 50 {
                    hard_flags.push(format!("Low confidence on required field: {} ({}%)", field.name, field.confidence));
                }
            }
            "invoice_date" | "vendor_name" => {
                if field.value.is_empty() {
                    soft_flags.push(format!("Missing recommended field: {}", field.name));
                } else if field.confidence < 70 {
                    soft_flags.push(format!("Low confidence on field: {} ({}%)", field.name, field.confidence));
                }
            }
            _ => {}
        }
    }
    
    // Check if all hard flags are resolved by decisions
    let decisions_result = sqlx::query_as::<_, FieldDecision>(
        "SELECT field_name, chosen_value, decided_at FROM review_case_decisions WHERE case_id = ?"
    )
    .bind(case_id)
    .fetch_all(pool)
    .await;
    
    if let Ok(decisions) = decisions_result {
        // Remove hard flags for fields that have been decided
        hard_flags.retain(|flag| {
            !decisions.iter().any(|d| flag.contains(&d.field_name))
        });
    }
    
    let can_approve = hard_flags.is_empty();
    
    // Update validation result in database
    let validation_json = serde_json::json!({
        "hard_flags": hard_flags,
        "soft_flags": soft_flags,
        "can_approve": can_approve,
    });
    
    let _ = sqlx::query(
        "UPDATE review_cases SET validation_result = ? WHERE id = ?"
    )
    .bind(validation_json.to_string())
    .bind(case_id)
    .execute(pool)
    .await;
    
    ValidationSummary {
        hard_flags,
        soft_flags,
        can_approve,
    }
}

/// POST /api/cases/:id/approve
pub async fn approve_case(
    path: web::Path<String>,
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
) -> HttpResponse {
    let case_id = path.into_inner();
    let now = chrono::Utc::now().to_rfc3339();
    
    // Extract user_id from UserContext
    let user_id = match req.extensions().get::<crate::models::UserContext>() {
        Some(context) => context.user_id.clone(),
        None => {
            log::warn!("User context not found in request, using default");
            "system".to_string()
        }
    };
    
    // Update case state to Approved and record approver
    let update_result = sqlx::query(
        "UPDATE review_cases SET state = 'Approved', approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&user_id)
    .bind(&now)
    .bind(&now)
    .bind(&case_id)
    .execute(pool.get_ref())
    .await;
    
    match update_result {
        Ok(result) => {
            if result.rows_affected() > 0 {
                HttpResponse::Ok().json(ApproveResponse {
                    approved: true,
                    blocking_reasons: vec![],
                    state: "Approved".to_string(),
                })
            } else {
                HttpResponse::NotFound().json(ErrorResponse {
                    error: "Case not found".to_string(),
                })
            }
        }
        Err(e) => {
            log::error!("Failed to approve case: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: "Failed to approve case".to_string(),
            })
        }
    }
}

/// POST /api/cases/:id/undo
pub async fn undo_decision(
    path: web::Path<String>,
    pool: web::Data<SqlitePool>,
) -> HttpResponse {
    let case_id = path.into_inner();
    let now = chrono::Utc::now().to_rfc3339();
    
    // Get the last decision before deleting it
    let last_decision_result = sqlx::query_as::<_, FieldDecision>(
        "SELECT field_name, chosen_value, decided_at 
         FROM review_case_decisions 
         WHERE case_id = ? 
         ORDER BY decided_at DESC 
         LIMIT 1"
    )
    .bind(&case_id)
    .fetch_optional(pool.get_ref())
    .await;
    
    let last_decision = match last_decision_result {
        Ok(Some(decision)) => decision,
        Ok(None) => {
            return HttpResponse::NotFound().json(ErrorResponse {
                error: "No decisions to undo".to_string(),
            });
        }
        Err(e) => {
            log::error!("Failed to fetch last decision: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                error: "Failed to fetch last decision".to_string(),
            });
        }
    };
    
    // Delete the last decision
    let delete_result = sqlx::query(
        "DELETE FROM review_case_decisions 
         WHERE case_id = ? AND decided_at = ?"
    )
    .bind(&case_id)
    .bind(&last_decision.decided_at)
    .execute(pool.get_ref())
    .await;
    
    match delete_result {
        Ok(result) => {
            if result.rows_affected() > 0 {
                // Recalculate confidence after removing the decision
                let _updated_confidence = recalculate_case_confidence(&case_id, pool.get_ref()).await;
                
                // Recalculate validation result
                let validation_result = recalculate_validation(&case_id, pool.get_ref()).await;
                
                // Determine new case state
                // If case was Approved and now has hard flags, move back to NeedsReview
                let case_result = sqlx::query_as::<_, ReviewCaseRow>(
                    "SELECT * FROM review_cases WHERE id = ?"
                )
                .bind(&case_id)
                .fetch_optional(pool.get_ref())
                .await;
                
                let new_state = match case_result {
                    Ok(Some(case)) => {
                        if case.state == "Approved" && !validation_result.can_approve {
                            // Move back to NeedsReview if validation fails
                            let _ = sqlx::query(
                                "UPDATE review_cases SET state = 'NeedsReview', updated_at = ? WHERE id = ?"
                            )
                            .bind(&now)
                            .bind(&case_id)
                            .execute(pool.get_ref())
                            .await;
                            "NeedsReview".to_string()
                        } else if case.state == "Approved" {
                            // Stay approved if still valid
                            "Approved".to_string()
                        } else {
                            // For other states, move to InReview
                            let _ = sqlx::query(
                                "UPDATE review_cases SET state = 'InReview', updated_at = ? WHERE id = ?"
                            )
                            .bind(&now)
                            .bind(&case_id)
                            .execute(pool.get_ref())
                            .await;
                            "InReview".to_string()
                        }
                    }
                    _ => {
                        // Default to InReview if we can't determine state
                        let _ = sqlx::query(
                            "UPDATE review_cases SET updated_at = ? WHERE id = ?"
                        )
                        .bind(&now)
                        .bind(&case_id)
                        .execute(pool.get_ref())
                        .await;
                        "InReview".to_string()
                    }
                };
                
                HttpResponse::Ok().json(UndoResponse {
                    restored_decision: format!("Undone decision for field: {}", last_decision.field_name),
                    current_state: new_state,
                })
            } else {
                HttpResponse::NotFound().json(ErrorResponse {
                    error: "No decisions to undo".to_string(),
                })
            }
        }
        Err(e) => {
            log::error!("Failed to undo decision: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: "Failed to undo decision".to_string(),
            })
        }
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/api/cases")
            .route(web::get().to(list_cases))
    )
    .service(
        web::resource("/api/cases/{id}")
            .route(web::get().to(get_case))
    )
    .service(
        web::resource("/api/cases/{id}/decide")
            .route(web::post().to(decide_field))
    )
    .service(
        web::resource("/api/cases/{id}/approve")
            .route(web::post().to(approve_case))
    )
    .service(
        web::resource("/api/cases/{id}/undo")
            .route(web::post().to(undo_decision))
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_parse_field_type() {
        // Test field type parsing
        assert_eq!("invoice_number", "invoice_number");
        assert_eq!("invoice_date", "invoice_date");
        assert_eq!("total", "total");
    }
    
    #[tokio::test]
    async fn test_recalculate_confidence_all_decided() {
        // Test confidence calculation when all fields are decided
        // Setup: Create a test database with a case and decisions
        let pool = setup_test_db().await;
        
        // Create a test case with 3 fields at 70%, 80%, 90% confidence
        let case_id = "test-case-1";
        let extracted_data = serde_json::json!([
            {"name": "invoice_number", "value": "INV-001", "confidence": 70, "source": "ocr"},
            {"name": "invoice_date", "value": "2024-01-15", "confidence": 80, "source": "ocr"},
            {"name": "total", "value": "100.00", "confidence": 90, "source": "ocr"}
        ]);
        
        sqlx::query(
            "INSERT INTO review_cases (id, tenant_id, state, confidence, source_file_path, extracted_data, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(case_id)
        .bind("test-tenant")
        .bind("NeedsReview")
        .bind(80)
        .bind("/test/path.pdf")
        .bind(extracted_data.to_string())
        .bind("2024-01-15T10:00:00Z")
        .bind("2024-01-15T10:00:00Z")
        .execute(&pool)
        .await
        .unwrap();
        
        // Add decisions for all 3 fields
        for field_name in &["invoice_number", "invoice_date", "total"] {
            sqlx::query(
                "INSERT INTO review_case_decisions (id, case_id, field_name, chosen_value, source, decided_at)
                 VALUES (?, ?, ?, ?, ?, ?)"
            )
            .bind(format!("decision-{}", field_name))
            .bind(case_id)
            .bind(field_name)
            .bind("verified-value")
            .bind("user")
            .bind("2024-01-15T10:05:00Z")
            .execute(&pool)
            .await
            .unwrap();
        }
        
        // Recalculate confidence
        let new_confidence = recalculate_case_confidence(case_id, &pool).await;
        
        // All fields decided = 100% confidence
        assert_eq!(new_confidence, 100);
    }
    
    #[tokio::test]
    async fn test_recalculate_confidence_partial_decided() {
        // Test confidence calculation when some fields are decided
        let pool = setup_test_db().await;
        
        let case_id = "test-case-2";
        let extracted_data = serde_json::json!([
            {"name": "invoice_number", "value": "INV-001", "confidence": 60, "source": "ocr"},
            {"name": "invoice_date", "value": "2024-01-15", "confidence": 80, "source": "ocr"},
            {"name": "total", "value": "100.00", "confidence": 90, "source": "ocr"}
        ]);
        
        sqlx::query(
            "INSERT INTO review_cases (id, tenant_id, state, confidence, source_file_path, extracted_data, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(case_id)
        .bind("test-tenant")
        .bind("NeedsReview")
        .bind(76)
        .bind("/test/path.pdf")
        .bind(extracted_data.to_string())
        .bind("2024-01-15T10:00:00Z")
        .bind("2024-01-15T10:00:00Z")
        .execute(&pool)
        .await
        .unwrap();
        
        // Add decision for 1 out of 3 fields
        sqlx::query(
            "INSERT INTO review_case_decisions (id, case_id, field_name, chosen_value, source, decided_at)
             VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind("decision-1")
        .bind(case_id)
        .bind("invoice_number")
        .bind("verified-value")
        .bind("user")
        .bind("2024-01-15T10:05:00Z")
        .execute(&pool)
        .await
        .unwrap();
        
        // Recalculate confidence
        let new_confidence = recalculate_case_confidence(case_id, &pool).await;
        
        // 1 decided (100%) + 2 undecided (avg 85%) = (100 + 85 + 85) / 3 = 90
        assert!(new_confidence >= 88 && new_confidence <= 92, "Expected ~90, got {}", new_confidence);
    }
    
    #[tokio::test]
    async fn test_recalculate_validation_hard_flags() {
        // Test validation with missing required fields
        let pool = setup_test_db().await;
        
        let case_id = "test-case-3";
        let extracted_data = serde_json::json!([
            {"name": "invoice_number", "value": "", "confidence": 0, "source": "ocr"},
            {"name": "total", "value": "100.00", "confidence": 95, "source": "ocr"}
        ]);
        
        sqlx::query(
            "INSERT INTO review_cases (id, tenant_id, state, confidence, source_file_path, extracted_data, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(case_id)
        .bind("test-tenant")
        .bind("NeedsReview")
        .bind(47)
        .bind("/test/path.pdf")
        .bind(extracted_data.to_string())
        .bind("2024-01-15T10:00:00Z")
        .bind("2024-01-15T10:00:00Z")
        .execute(&pool)
        .await
        .unwrap();
        
        // Recalculate validation
        let validation = recalculate_validation(case_id, &pool).await;
        
        // Should have hard flag for missing invoice_number
        assert!(!validation.hard_flags.is_empty());
        assert!(validation.hard_flags.iter().any(|f| f.contains("invoice_number")));
        assert!(!validation.can_approve);
    }
    
    #[tokio::test]
    async fn test_recalculate_validation_resolved_by_decision() {
        // Test that decisions resolve validation flags
        let pool = setup_test_db().await;
        
        let case_id = "test-case-4";
        let extracted_data = serde_json::json!([
            {"name": "invoice_number", "value": "", "confidence": 0, "source": "ocr"},
            {"name": "total", "value": "100.00", "confidence": 95, "source": "ocr"}
        ]);
        
        sqlx::query(
            "INSERT INTO review_cases (id, tenant_id, state, confidence, source_file_path, extracted_data, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(case_id)
        .bind("test-tenant")
        .bind("NeedsReview")
        .bind(47)
        .bind("/test/path.pdf")
        .bind(extracted_data.to_string())
        .bind("2024-01-15T10:00:00Z")
        .bind("2024-01-15T10:00:00Z")
        .execute(&pool)
        .await
        .unwrap();
        
        // Add decision for the missing field
        sqlx::query(
            "INSERT INTO review_case_decisions (id, case_id, field_name, chosen_value, source, decided_at)
             VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind("decision-1")
        .bind(case_id)
        .bind("invoice_number")
        .bind("INV-001")
        .bind("user")
        .bind("2024-01-15T10:05:00Z")
        .execute(&pool)
        .await
        .unwrap();
        
        // Recalculate validation
        let validation = recalculate_validation(case_id, &pool).await;
        
        // Hard flag should be resolved
        assert!(validation.hard_flags.is_empty());
        assert!(validation.can_approve);
    }
    
    #[tokio::test]
    async fn test_approve_case_updates_state_and_approver() {
        // Test that approving a case updates state, approved_by, and approved_at
        let pool = setup_test_db().await;
        
        let case_id = "test-case-5";
        let extracted_data = serde_json::json!([
            {"name": "invoice_number", "value": "INV-001", "confidence": 95, "source": "ocr"},
            {"name": "total", "value": "100.00", "confidence": 95, "source": "ocr"}
        ]);
        
        // Create a case in NeedsReview state
        sqlx::query(
            "INSERT INTO review_cases (id, tenant_id, state, confidence, source_file_path, extracted_data, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(case_id)
        .bind("test-tenant")
        .bind("NeedsReview")
        .bind(95)
        .bind("/test/path.pdf")
        .bind(extracted_data.to_string())
        .bind("2024-01-15T10:00:00Z")
        .bind("2024-01-15T10:00:00Z")
        .execute(&pool)
        .await
        .unwrap();
        
        // Approve the case (simulating with system user since we don't have HttpRequest in tests)
        let update_result = sqlx::query(
            "UPDATE review_cases SET state = 'Approved', approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?"
        )
        .bind("test-user")
        .bind("2024-01-15T10:10:00Z")
        .bind("2024-01-15T10:10:00Z")
        .bind(case_id)
        .execute(&pool)
        .await;
        
        assert!(update_result.is_ok());
        assert_eq!(update_result.unwrap().rows_affected(), 1);
        
        // Verify the case was updated correctly
        let case = sqlx::query_as::<_, ReviewCaseRow>(
            "SELECT * FROM review_cases WHERE id = ?"
        )
        .bind(case_id)
        .fetch_one(&pool)
        .await
        .unwrap();
        
        assert_eq!(case.state, "Approved");
        assert_eq!(case.approved_by, Some("test-user".to_string()));
        assert_eq!(case.approved_at, Some("2024-01-15T10:10:00Z".to_string()));
    }
    
    #[tokio::test]
    async fn test_undo_decision_recalculates_confidence() {
        // Test that undoing a decision recalculates confidence correctly
        let pool = setup_test_db().await;
        
        let case_id = "test-case-undo-1";
        let extracted_data = serde_json::json!([
            {"name": "invoice_number", "value": "INV-001", "confidence": 70, "source": "ocr"},
            {"name": "total", "value": "100.00", "confidence": 90, "source": "ocr"}
        ]);
        
        // Create a case
        sqlx::query(
            "INSERT INTO review_cases (id, tenant_id, state, confidence, source_file_path, extracted_data, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(case_id)
        .bind("test-tenant")
        .bind("NeedsReview")
        .bind(80)
        .bind("/test/path.pdf")
        .bind(extracted_data.to_string())
        .bind("2024-01-15T10:00:00Z")
        .bind("2024-01-15T10:00:00Z")
        .execute(&pool)
        .await
        .unwrap();
        
        // Add a decision for invoice_number
        sqlx::query(
            "INSERT INTO review_case_decisions (id, case_id, field_name, original_value, chosen_value, source, decided_at, decided_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind("decision-1")
        .bind(case_id)
        .bind("invoice_number")
        .bind("INV-001")
        .bind("INV-001-VERIFIED")
        .bind("user")
        .bind("2024-01-15T10:05:00Z")
        .bind("test-user")
        .execute(&pool)
        .await
        .unwrap();
        
        // Recalculate confidence after decision (should be higher)
        let confidence_after_decision = recalculate_case_confidence(case_id, &pool).await;
        assert!(confidence_after_decision > 80, "Confidence should increase after decision");
        
        // Now undo the decision
        let delete_result = sqlx::query(
            "DELETE FROM review_case_decisions 
             WHERE case_id = ? AND decided_at = ?"
        )
        .bind(case_id)
        .bind("2024-01-15T10:05:00Z")
        .execute(&pool)
        .await
        .unwrap();
        
        assert_eq!(delete_result.rows_affected(), 1);
        
        // Recalculate confidence after undo (should return to original)
        let confidence_after_undo = recalculate_case_confidence(case_id, &pool).await;
        assert_eq!(confidence_after_undo, 80, "Confidence should return to original after undo");
    }
    
    #[tokio::test]
    async fn test_undo_decision_updates_state_from_approved() {
        // Test that undoing a decision on an Approved case moves it back to NeedsReview if validation fails
        let pool = setup_test_db().await;
        
        let case_id = "test-case-undo-2";
        let extracted_data = serde_json::json!([
            {"name": "invoice_number", "value": "", "confidence": 0, "source": "ocr"},
            {"name": "total", "value": "100.00", "confidence": 95, "source": "ocr"}
        ]);
        
        // Create an approved case
        sqlx::query(
            "INSERT INTO review_cases (id, tenant_id, state, confidence, source_file_path, extracted_data, created_at, updated_at, approved_by, approved_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(case_id)
        .bind("test-tenant")
        .bind("Approved")
        .bind(100)
        .bind("/test/path.pdf")
        .bind(extracted_data.to_string())
        .bind("2024-01-15T10:00:00Z")
        .bind("2024-01-15T10:00:00Z")
        .bind("test-user")
        .bind("2024-01-15T10:10:00Z")
        .execute(&pool)
        .await
        .unwrap();
        
        // Add a decision that resolved the missing invoice_number
        sqlx::query(
            "INSERT INTO review_case_decisions (id, case_id, field_name, original_value, chosen_value, source, decided_at, decided_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind("decision-1")
        .bind(case_id)
        .bind("invoice_number")
        .bind("")
        .bind("INV-001")
        .bind("user")
        .bind("2024-01-15T10:05:00Z")
        .bind("test-user")
        .execute(&pool)
        .await
        .unwrap();
        
        // Delete the decision (simulating undo)
        sqlx::query(
            "DELETE FROM review_case_decisions 
             WHERE case_id = ? AND decided_at = ?"
        )
        .bind(case_id)
        .bind("2024-01-15T10:05:00Z")
        .execute(&pool)
        .await
        .unwrap();
        
        // Recalculate validation
        let validation = recalculate_validation(case_id, &pool).await;
        
        // Should have hard flags now (missing invoice_number)
        assert!(!validation.can_approve, "Should not be approvable after undo");
        assert!(!validation.hard_flags.is_empty(), "Should have hard flags");
        
        // Update state based on validation
        if !validation.can_approve {
            sqlx::query(
                "UPDATE review_cases SET state = 'NeedsReview', updated_at = ? WHERE id = ?"
            )
            .bind("2024-01-15T10:15:00Z")
            .bind(case_id)
            .execute(&pool)
            .await
            .unwrap();
        }
        
        // Verify state changed
        let case = sqlx::query_as::<_, ReviewCaseRow>(
            "SELECT * FROM review_cases WHERE id = ?"
        )
        .bind(case_id)
        .fetch_one(&pool)
        .await
        .unwrap();
        
        assert_eq!(case.state, "NeedsReview", "State should change to NeedsReview after undo");
    }
    
    #[tokio::test]
    async fn test_undo_decision_no_decisions_to_undo() {
        // Test that undo returns error when there are no decisions
        let pool = setup_test_db().await;
        
        let case_id = "test-case-undo-3";
        let extracted_data = serde_json::json!([
            {"name": "invoice_number", "value": "INV-001", "confidence": 95, "source": "ocr"}
        ]);
        
        // Create a case with no decisions
        sqlx::query(
            "INSERT INTO review_cases (id, tenant_id, state, confidence, source_file_path, extracted_data, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(case_id)
        .bind("test-tenant")
        .bind("NeedsReview")
        .bind(95)
        .bind("/test/path.pdf")
        .bind(extracted_data.to_string())
        .bind("2024-01-15T10:00:00Z")
        .bind("2024-01-15T10:00:00Z")
        .execute(&pool)
        .await
        .unwrap();
        
        // Try to fetch last decision (should be None)
        let last_decision = sqlx::query_as::<_, FieldDecision>(
            "SELECT field_name, chosen_value, decided_at 
             FROM review_case_decisions 
             WHERE case_id = ? 
             ORDER BY decided_at DESC 
             LIMIT 1"
        )
        .bind(case_id)
        .fetch_optional(&pool)
        .await
        .unwrap();
        
        assert!(last_decision.is_none(), "Should have no decisions to undo");
    }
    
    // Helper function to set up test database
    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect(":memory:").await.unwrap();
        
        // Create tables
        sqlx::query(
            "CREATE TABLE review_cases (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                state TEXT NOT NULL,
                vendor_id TEXT,
                vendor_name TEXT,
                confidence INTEGER DEFAULT 0,
                source_file_path TEXT NOT NULL,
                source_file_type TEXT,
                extracted_data TEXT,
                validation_result TEXT,
                ocr_raw_text TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT,
                approved_by TEXT,
                approved_at TEXT
            )"
        )
        .execute(&pool)
        .await
        .unwrap();
        
        sqlx::query(
            "CREATE TABLE review_case_decisions (
                id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL,
                field_name TEXT NOT NULL,
                original_value TEXT,
                chosen_value TEXT NOT NULL,
                source TEXT NOT NULL,
                decided_at TEXT NOT NULL,
                decided_by TEXT
            )"
        )
        .execute(&pool)
        .await
        .unwrap();
        
        pool
    }
}
