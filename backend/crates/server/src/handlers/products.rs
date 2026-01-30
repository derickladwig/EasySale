use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

#[derive(Debug, Serialize, Deserialize)]
pub struct Product {
    pub id: String,
    pub name: String,
    pub sku: String,
    pub price: f64,
    pub category: String,
    pub stock: f64,
    pub image: Option<String>,
}

pub async fn get_products(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse> {
    let products = sqlx::query_as!(
        Product,
        r#"
        SELECT 
            id as "id!",
            name as "name!",
            sku as "sku!",
            unit_price as "price!",
            category as "category!",
            quantity_on_hand as "stock!",
            CAST(NULL AS TEXT) as "image?"
        FROM products
        WHERE is_active = 1
        ORDER BY name
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    Ok(HttpResponse::Ok().json(products))
}
