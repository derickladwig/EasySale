use actix_web::{get, post, web, HttpResponse, Responder};
use sqlx::SqlitePool;

use crate::config::schema::SchemaGenerator;
use crate::config::models::{CustomTableConfig, CustomColumnConfig};

/// POST /api/schema/table/create
/// Create a custom table from configuration
#[post("/api/schema/table/create")]
pub async fn create_custom_table(
    _pool: web::Data<SqlitePool>,
    req: web::Json<CustomTableConfig>,
) -> impl Responder {
    tracing::info!("Creating custom table: {}", req.name);

    match SchemaGenerator::create_custom_table(&req) {
        Ok(sql) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Table creation SQL generated successfully",
            "sql": sql
        })),
        Err(e) => {
            tracing::error!("Failed to generate table creation SQL: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to generate table creation SQL: {}", e)
            }))
        }
    }
}

/// POST /api/schema/table/migration
/// Generate migration SQL for a table
#[post("/api/schema/table/migration")]
pub async fn create_table_migration(
    _pool: web::Data<SqlitePool>,
    req: web::Json<CustomTableConfig>,
) -> impl Responder {
    tracing::info!("Generating table migration for: {}", req.name);

    match SchemaGenerator::create_table_migration(&req) {
        Ok(sql) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Table migration SQL generated successfully",
            "sql": sql
        })),
        Err(e) => {
            tracing::error!("Failed to generate table migration: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to generate table migration: {}", e)
            }))
        }
    }
}

/// POST /api/schema/column/migration
/// Generate migration SQL for adding a column
#[post("/api/schema/column/migration")]
pub async fn add_column_migration(
    _pool: web::Data<SqlitePool>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let table_name = match req.get("table_name").and_then(|v| v.as_str()) {
        Some(name) => name,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "table_name is required"
            }));
        }
    };

    let column = match req.get("column") {
        Some(col) => match serde_json::from_value::<CustomColumnConfig>(col.clone()) {
            Ok(c) => c,
            Err(e) => {
                return HttpResponse::BadRequest().json(serde_json::json!({
                    "error": format!("Invalid column configuration: {}", e)
                }));
            }
        },
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "column is required"
            }));
        }
    };

    tracing::info!("Generating column migration for: {}.{}", table_name, column.name);

    match SchemaGenerator::add_column_migration(table_name, &column) {
        Ok(sql) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Column migration SQL generated successfully",
            "sql": sql
        })),
        Err(e) => {
            tracing::error!("Failed to generate column migration: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to generate column migration: {}", e)
            }))
        }
    }
}

/// GET /api/schema/table/:table_name/exists
/// Check if a table exists
#[get("/api/schema/table/{table_name}/exists")]
pub async fn table_exists(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let table_name = path.into_inner();
    tracing::info!("Checking if table exists: {}", table_name);

    match SchemaGenerator::table_exists(pool.get_ref(), &table_name).await {
        Ok(exists) => HttpResponse::Ok().json(serde_json::json!({
            "table_name": table_name,
            "exists": exists
        })),
        Err(e) => {
            tracing::error!("Failed to check table existence: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to check table existence: {}", e)
            }))
        }
    }
}

/// GET /api/schema/column/:table_name/:column_name/exists
/// Check if a column exists in a table
#[get("/api/schema/column/{table_name}/{column_name}/exists")]
pub async fn column_exists(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
) -> impl Responder {
    let (table_name, column_name) = path.into_inner();
    tracing::info!("Checking if column exists: {}.{}", table_name, column_name);

    match SchemaGenerator::column_exists(pool.get_ref(), &table_name, &column_name).await {
        Ok(exists) => HttpResponse::Ok().json(serde_json::json!({
            "table_name": table_name,
            "column_name": column_name,
            "exists": exists
        })),
        Err(e) => {
            tracing::error!("Failed to check column existence: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to check column existence: {}", e)
            }))
        }
    }
}

/// POST /api/schema/apply
/// Apply configuration to database (create tables/columns)
#[post("/api/schema/apply")]
pub async fn apply_config(
    pool: web::Data<SqlitePool>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let db_config = match req.get("database") {
        Some(cfg) => match serde_json::from_value::<crate::config::models::DatabaseConfig>(cfg.clone()) {
            Ok(c) => c,
            Err(e) => {
                return HttpResponse::BadRequest().json(serde_json::json!({
                    "error": format!("Invalid database configuration: {}", e)
                }));
            }
        },
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "database configuration is required"
            }));
        }
    };

    tracing::info!("Applying database configuration with {} tables", db_config.custom_tables.as_ref().map(|t| t.len()).unwrap_or(0));

    match SchemaGenerator::apply_config(pool.get_ref(), &db_config).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Configuration applied successfully"
        })),
        Err(e) => {
            tracing::error!("Failed to apply configuration: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to apply configuration: {}", e)
            }))
        }
    }
}

/// Configure schema operations routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(create_custom_table)
        .service(create_table_migration)
        .service(add_column_migration)
        .service(table_exists)
        .service(column_exists)
        .service(apply_config);
}
