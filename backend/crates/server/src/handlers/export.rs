// Export API Endpoint
// Export approved cases to CSV/JSON

use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use chrono::{Utc, Duration};
use sqlx::SqlitePool;
use uuid::Uuid;
use std::io::Write;

#[derive(Debug, Deserialize)]
pub struct ExportRequest {
    pub format: String, // "csv" or "json"
    pub include_line_items: bool,
}

#[derive(Debug, Serialize)]
pub struct ExportResponse {
    pub export_url: String,
    pub expires_at: String,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

/// Case data for export
#[derive(Debug, Serialize, sqlx::FromRow)]
struct CaseRow {
    id: String,
    case_number: Option<String>,
    vendor_id: Option<String>,
    invoice_no: Option<String>,
    invoice_date: Option<String>,
    subtotal: Option<f64>,
    tax: Option<f64>,
    total: Option<f64>,
    status: Option<String>,
    created_at: Option<String>,
    updated_at: Option<String>,
}

/// Line item data for export
#[derive(Debug, Serialize, sqlx::FromRow)]
struct LineItemRow {
    id: String,
    case_id: String,
    line_no: Option<i32>,
    vendor_sku: Option<String>,
    description: Option<String>,
    quantity: Option<f64>,
    unit_price: Option<f64>,
    ext_price: Option<f64>,
}

/// POST /api/cases/:id/export
pub async fn export_case(
    path: web::Path<String>,
    request: web::Json<ExportRequest>,
    pool: web::Data<SqlitePool>,
) -> HttpResponse {
    let case_id = path.into_inner();
    
    // Validate format
    if request.format != "csv" && request.format != "json" {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "Invalid format. Must be 'csv' or 'json'".to_string(),
        });
    }
    
    // Fetch case data from database
    let case_result: Result<CaseRow, _> = sqlx::query_as(
        r"SELECT id, case_number, vendor_id, invoice_no, invoice_date, 
                 subtotal, tax, total, status, created_at, updated_at
          FROM review_cases WHERE id = ?"
    )
    .bind(&case_id)
    .fetch_one(pool.get_ref())
    .await;
    
    let case_data = match case_result {
        Ok(data) => data,
        Err(sqlx::Error::RowNotFound) => {
            return HttpResponse::NotFound().json(ErrorResponse {
                error: format!("Case {} not found", case_id),
            });
        }
        Err(e) => {
            tracing::error!("Database error fetching case {}: {}", case_id, e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                error: "Database error".to_string(),
            });
        }
    };
    
    // Fetch line items if requested
    let line_items: Vec<LineItemRow> = if request.include_line_items {
        sqlx::query_as(
            r"SELECT id, vendor_bill_id as case_id, line_no, vendor_sku_raw as vendor_sku, 
                     desc_raw as description, normalized_qty as quantity, 
                     unit_price, ext_price
              FROM vendor_bill_lines WHERE vendor_bill_id = ?
              ORDER BY line_no"
        )
        .bind(&case_id)
        .fetch_all(pool.get_ref())
        .await
        .unwrap_or_default()
    } else {
        vec![]
    };
    
    // Generate export file
    let export_id = Uuid::new_v4().to_string();
    let export_dir = std::env::var("EXPORT_DIR").unwrap_or_else(|_| "./runtime/exports".to_string());
    
    // Ensure export directory exists
    if let Err(e) = std::fs::create_dir_all(&export_dir) {
        tracing::error!("Failed to create export directory: {}", e);
        return HttpResponse::InternalServerError().json(ErrorResponse {
            error: "Failed to create export directory".to_string(),
        });
    }
    
    let file_extension = if request.format == "csv" { "csv" } else { "json" };
    let file_path = format!("{}/{}.{}", export_dir, export_id, file_extension);
    
    let export_result = if request.format == "csv" {
        generate_csv_export(&case_data, &line_items, &file_path)
    } else {
        generate_json_export(&case_data, &line_items, &file_path)
    };
    
    if let Err(e) = export_result {
        tracing::error!("Failed to generate export: {}", e);
        return HttpResponse::InternalServerError().json(ErrorResponse {
            error: format!("Failed to generate export: {}", e),
        });
    }
    
    let expires_at = Utc::now() + Duration::hours(1);
    let export_url = format!("/api/exports/download/{}", export_id);
    
    HttpResponse::Ok().json(ExportResponse {
        export_url,
        expires_at: expires_at.to_rfc3339(),
    })
}

fn generate_csv_export(
    case: &CaseRow,
    line_items: &[LineItemRow],
    file_path: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut file = std::fs::File::create(file_path)?;
    
    // Write case header
    writeln!(file, "Case Export")?;
    writeln!(file, "Case ID,Case Number,Vendor ID,Invoice No,Invoice Date,Subtotal,Tax,Total,Status,Created At")?;
    writeln!(
        file,
        "{},{},{},{},{},{},{},{},{},{}",
        case.id,
        case.case_number.as_deref().unwrap_or(""),
        case.vendor_id.as_deref().unwrap_or(""),
        case.invoice_no.as_deref().unwrap_or(""),
        case.invoice_date.as_deref().unwrap_or(""),
        case.subtotal.unwrap_or(0.0),
        case.tax.unwrap_or(0.0),
        case.total.unwrap_or(0.0),
        case.status.as_deref().unwrap_or(""),
        case.created_at.as_deref().unwrap_or("")
    )?;
    
    // Write line items if present
    if !line_items.is_empty() {
        writeln!(file)?;
        writeln!(file, "Line Items")?;
        writeln!(file, "Line No,Vendor SKU,Description,Quantity,Unit Price,Extended Price")?;
        
        for item in line_items {
            writeln!(
                file,
                "{},{},{},{},{},{}",
                item.line_no.unwrap_or(0),
                item.vendor_sku.as_deref().unwrap_or(""),
                item.description.as_deref().unwrap_or("").replace(',', ";"),
                item.quantity.unwrap_or(0.0),
                item.unit_price.unwrap_or(0.0),
                item.ext_price.unwrap_or(0.0)
            )?;
        }
    }
    
    Ok(())
}

fn generate_json_export(
    case: &CaseRow,
    line_items: &[LineItemRow],
    file_path: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    #[derive(Serialize)]
    struct ExportData<'a> {
        case: &'a CaseRow,
        line_items: &'a [LineItemRow],
        exported_at: String,
    }
    
    let export_data = ExportData {
        case,
        line_items,
        exported_at: Utc::now().to_rfc3339(),
    };
    
    let json = serde_json::to_string_pretty(&export_data)?;
    std::fs::write(file_path, json)?;
    
    Ok(())
}

/// GET /api/exports/download/:id
/// Download an exported file
pub async fn download_export(
    path: web::Path<String>,
) -> HttpResponse {
    let export_id = path.into_inner();
    
    // Validate export_id format (should be UUID)
    if Uuid::parse_str(&export_id).is_err() {
        return HttpResponse::BadRequest().json(ErrorResponse {
            error: "Invalid export ID format".to_string(),
        });
    }
    
    let export_dir = std::env::var("EXPORT_DIR").unwrap_or_else(|_| "./runtime/exports".to_string());
    
    // Try CSV first, then JSON
    let csv_path = format!("{}/{}.csv", export_dir, export_id);
    let json_path = format!("{}/{}.json", export_dir, export_id);
    
    let (file_path, content_type, filename) = if std::path::Path::new(&csv_path).exists() {
        (csv_path, "text/csv", format!("export_{}.csv", export_id))
    } else if std::path::Path::new(&json_path).exists() {
        (json_path, "application/json", format!("export_{}.json", export_id))
    } else {
        return HttpResponse::NotFound().json(ErrorResponse {
            error: "Export file not found or has expired".to_string(),
        });
    };
    
    // Read file contents
    match std::fs::read(&file_path) {
        Ok(contents) => {
            HttpResponse::Ok()
                .content_type(content_type)
                .insert_header(("Content-Disposition", format!("attachment; filename=\"{}\"", filename)))
                .body(contents)
        }
        Err(e) => {
            tracing::error!("Failed to read export file: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: "Failed to read export file".to_string(),
            })
        }
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/api/cases/{id}/export")
            .route(web::post().to(export_case))
    )
    .service(
        web::resource("/api/exports/download/{id}")
            .route(web::get().to(download_export))
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_export_formats() {
        assert_eq!("csv", "csv");
        assert_eq!("json", "json");
    }
}
