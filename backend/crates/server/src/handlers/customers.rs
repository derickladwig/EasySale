use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

#[derive(Debug, Serialize, Deserialize)]
pub struct Customer {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    #[serde(rename = "type")]
    pub customer_type: String,
    pub tier: String,
    pub total_spent: f64,
    pub order_count: i64,
    pub last_order: String,
    pub address: Option<String>,
    pub company: Option<String>,
}

pub async fn get_customers(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse> {
    let customers = sqlx::query_as!(
        Customer,
        r#"
        SELECT 
            id as "id!",
            name as "name!",
            email as "email?",
            phone as "phone?",
            'individual' as "customer_type!",
            pricing_tier as "tier!",
            0.0 as "total_spent!",
            0 as "order_count!",
            datetime('now') as "last_order!",
            CAST(NULL AS TEXT) as "address?",
            CAST(NULL AS TEXT) as "company?"
        FROM customers
        ORDER BY name
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    Ok(HttpResponse::Ok().json(customers))
}
