use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

#[derive(Debug, Serialize, Deserialize)]
pub struct InventoryItem {
    pub id: String,
    pub name: String,
    pub sku: String,
    pub category: String,
    pub stock: f64,
    pub min_stock: f64,
    pub location: String,
    pub last_received: String,
    pub status: String,
}

pub async fn get_inventory_items(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse> {
    let items = sqlx::query_as!(
        InventoryItem,
        r#"
        SELECT 
            id as "id!",
            name as "name!",
            sku as "sku!",
            category as "category!",
            quantity_on_hand as "stock!",
            COALESCE(reorder_point, 0.0) as "min_stock!",
            'Main Warehouse' as "location!",
            datetime('now') as "last_received!",
            CASE 
                WHEN quantity_on_hand > COALESCE(reorder_point, 0.0) * 2 THEN 'in-stock'
                WHEN quantity_on_hand > COALESCE(reorder_point, 0.0) THEN 'low-stock'
                ELSE 'out-of-stock'
            END as "status!"
        FROM products
        WHERE is_active = 1
        ORDER BY name
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    Ok(HttpResponse::Ok().json(items))
}
