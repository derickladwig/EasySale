use actix_web::{get, post, web, HttpResponse, Responder};
use chrono::Utc;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

use crate::middleware::tenant::get_current_tenant_id;
use crate::models::{
    Commission, CommissionRule, CommissionRuleType,
    CreateCommissionRuleRequest,
};

/// GET /api/commissions/rules
/// List all commission rules
#[get("/api/commissions/rules")]
pub async fn list_commission_rules(pool: web::Data<SqlitePool>) -> impl Responder {
    tracing::info!("Listing commission rules");

    let result = sqlx::query_as::<_, CommissionRule>(
        "SELECT id, name, rule_type, rate, min_profit_threshold, applies_to_categories, 
         applies_to_products, is_active 
         FROM commission_rules 
         WHERE tenant_id = ?
         ORDER BY name ASC",
    )
    .bind(&get_current_tenant_id())
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(rules) => HttpResponse::Ok().json(rules),
        Err(e) => {
            tracing::error!("Failed to list commission rules: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to list commission rules"
            }))
        }
    }
}

/// POST /api/commissions/rules
/// Create a new commission rule
#[post("/api/commissions/rules")]
pub async fn create_commission_rule(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateCommissionRuleRequest>,
) -> impl Responder {
    tracing::info!("Creating commission rule: {}", req.name);

    // Validate rate
    if req.rate < 0.0 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Rate must be non-negative"
        }));
    }

    let rule_id = Uuid::new_v4().to_string();
    let applies_to_categories = req
        .applies_to_categories
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap());
    let applies_to_products = req
        .applies_to_products
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap());

    let result = sqlx::query(
        "INSERT INTO commission_rules (id, tenant_id, name, rule_type, rate, min_profit_threshold, 
         applies_to_categories, applies_to_products, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
    )
    .bind(&rule_id)
    .bind(&get_current_tenant_id())
    .bind(&req.name)
    .bind(req.rule_type.as_str())
    .bind(req.rate)
    .bind(req.min_profit_threshold)
    .bind(&applies_to_categories)
    .bind(&applies_to_products)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            tracing::info!("Commission rule created successfully: {}", rule_id);
            // Fetch and return the created rule
            match sqlx::query_as::<_, CommissionRule>(
                "SELECT id, name, rule_type, rate, min_profit_threshold, applies_to_categories, 
                 applies_to_products, is_active 
                 FROM commission_rules 
                 WHERE id = ? AND tenant_id = ?",
            )
            .bind(&rule_id)
            .bind(&get_current_tenant_id())
            .fetch_one(pool.get_ref())
            .await
            {
                Ok(rule) => HttpResponse::Created().json(rule),
                Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Rule created but failed to fetch"
                })),
            }
        }
        Err(e) => {
            tracing::error!("Failed to create commission rule: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create commission rule"
            }))
        }
    }
}

/// Calculate commission for a transaction
/// This is called internally when processing sales
pub async fn calculate_commission(
    pool: &SqlitePool,
    employee_id: &str,
    transaction_id: &str,
    sale_amount: f64,
    profit_amount: f64,
    product_id: Option<&str>,
    category_id: Option<&str>,
) -> Result<Vec<Commission>, sqlx::Error> {
    tracing::info!(
        "Calculating commission for employee {} on transaction {}",
        employee_id,
        transaction_id
    );

    // Fetch applicable commission rules
    let rules = sqlx::query_as::<_, CommissionRule>(
        "SELECT id, name, rule_type, rate, min_profit_threshold, applies_to_categories, 
         applies_to_products, is_active 
         FROM commission_rules 
         WHERE is_active = 1 AND tenant_id = ?",
    )
    .bind(&get_current_tenant_id())
    .fetch_all(pool)
    .await?;

    let mut commissions = Vec::new();

    for rule in rules {
        // Check if rule applies to this product/category
        let applies = check_rule_applicability(&rule, product_id, category_id);
        if !applies {
            continue;
        }

        // Check profit threshold
        if let Some(threshold) = rule.min_profit_threshold {
            if profit_amount < threshold {
                tracing::debug!(
                    "Profit {} below threshold {} for rule {}",
                    profit_amount,
                    threshold,
                    rule.name
                );
                continue;
            }
        }

        // Calculate commission amount based on rule type
        let commission_amount = match rule.rule_type() {
            CommissionRuleType::PercentOfSale => sale_amount * rule.rate,
            CommissionRuleType::PercentOfProfit => profit_amount * rule.rate,
            CommissionRuleType::FlatRatePerItem => rule.rate,
        };

        // Create commission record
        let commission_id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO commissions (id, tenant_id, employee_id, transaction_id, rule_id, sale_amount, 
             profit_amount, commission_amount, created_at, is_reversed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
        )
        .bind(&commission_id)
        .bind(&get_current_tenant_id())
        .bind(employee_id)
        .bind(transaction_id)
        .bind(&rule.id)
        .bind(sale_amount)
        .bind(profit_amount)
        .bind(commission_amount)
        .bind(&now)
        .execute(pool)
        .await?;

        commissions.push(Commission {
            id: commission_id.clone(),
            tenant_id: get_current_tenant_id(),
            employee_id: employee_id.to_string(),
            transaction_id: transaction_id.to_string(),
            rule_id: rule.id,
            sale_amount,
            profit_amount,
            commission_amount,
            created_at: now,
            is_reversed: false,
        });

        tracing::info!(
            "Commission calculated: {} for rule {} = {}",
            commission_id,
            rule.name,
            commission_amount
        );
    }

    Ok(commissions)
}

/// Reverse commission for a returned transaction
pub async fn reverse_commission(
    pool: &SqlitePool,
    transaction_id: &str,
) -> Result<(), sqlx::Error> {
    tracing::info!("Reversing commissions for transaction: {}", transaction_id);

    // Mark existing commissions as reversed
    sqlx::query(
        "UPDATE commissions 
         SET is_reversed = 1 
         WHERE transaction_id = ? AND is_reversed = 0 AND tenant_id = ?",
    )
    .bind(transaction_id)
    .bind(&get_current_tenant_id())
    .execute(pool)
    .await?;

    tracing::info!("Commissions reversed for transaction: {}", transaction_id);
    Ok(())
}

/// GET /api/commissions/employee/:id
/// Get commissions for an employee
#[get("/api/commissions/employee/{id}")]
pub async fn get_employee_commissions(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let employee_id = path.into_inner();
    tracing::info!("Fetching commissions for employee: {}", employee_id);

    let mut sql = "SELECT id, tenant_id, employee_id, transaction_id, rule_id, sale_amount, profit_amount, 
                   commission_amount, created_at, is_reversed 
                   FROM commissions 
                   WHERE employee_id = ? AND tenant_id = ?".to_string();

    // Add date range filters if provided
    if let Some(start_date) = query.get("start_date") {
        sql.push_str(&format!(" AND created_at >= '{}'", start_date));
    }
    if let Some(end_date) = query.get("end_date") {
        sql.push_str(&format!(" AND created_at <= '{}'", end_date));
    }

    sql.push_str(" ORDER BY created_at DESC");

    let result = sqlx::query_as::<_, Commission>(&sql)
        .bind(&employee_id)
        .bind(&get_current_tenant_id())
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(commissions) => {
            // Calculate totals
            let total_earned: f64 = commissions
                .iter()
                .filter(|c| !c.is_reversed)
                .map(|c| c.commission_amount)
                .sum();
            let total_reversed: f64 = commissions
                .iter()
                .filter(|c| c.is_reversed)
                .map(|c| c.commission_amount)
                .sum();

            HttpResponse::Ok().json(serde_json::json!({
                "employee_id": employee_id,
                "commissions": commissions,
                "total_earned": total_earned,
                "total_reversed": total_reversed,
                "net_commission": total_earned - total_reversed
            }))
        }
        Err(e) => {
            tracing::error!("Failed to fetch employee commissions: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch employee commissions"
            }))
        }
    }
}

/// GET /api/commissions/reports
/// Generate commission reports
#[get("/api/commissions/reports")]
pub async fn generate_commission_report(
    pool: web::Data<SqlitePool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    tracing::info!("Generating commission report");

    let mut sql = "SELECT employee_id, 
                   SUM(CASE WHEN is_reversed = 0 THEN commission_amount ELSE 0 END) as total_earned,
                   SUM(CASE WHEN is_reversed = 1 THEN commission_amount ELSE 0 END) as total_reversed,
                   SUM(CASE WHEN is_reversed = 0 THEN sale_amount ELSE 0 END) as total_sales,
                   SUM(CASE WHEN is_reversed = 0 THEN profit_amount ELSE 0 END) as total_profit,
                   COUNT(CASE WHEN is_reversed = 0 THEN 1 END) as transaction_count
                   FROM commissions 
                   WHERE tenant_id = ?".to_string();
    
    let tenant_id = get_current_tenant_id();
    let mut params: Vec<String> = vec![tenant_id.clone()];

    if let Some(start_date) = query.get("start_date") {
        sql.push_str(" AND created_at >= ?");
        params.push(start_date.clone());
    }
    if let Some(end_date) = query.get("end_date") {
        sql.push_str(" AND created_at <= ?");
        params.push(end_date.clone());
    }

    sql.push_str(" GROUP BY employee_id ORDER BY total_earned DESC");

    let mut query_builder = sqlx::query(&sql);
    for param in &params {
        query_builder = query_builder.bind(param);
    }
    
    let result = query_builder.fetch_all(pool.get_ref()).await;

    match result {
        Ok(rows) => {
            let report: Vec<serde_json::Value> = rows
                .iter()
                .map(|row| {
                    serde_json::json!({
                        "employee_id": row.get::<String, _>("employee_id"),
                        "total_earned": row.get::<f64, _>("total_earned"),
                        "total_reversed": row.get::<f64, _>("total_reversed"),
                        "net_commission": row.get::<f64, _>("total_earned") - row.get::<f64, _>("total_reversed"),
                        "total_sales": row.get::<f64, _>("total_sales"),
                        "total_profit": row.get::<f64, _>("total_profit"),
                        "transaction_count": row.get::<i32, _>("transaction_count")
                    })
                })
                .collect();

            HttpResponse::Ok().json(report)
        }
        Err(e) => {
            tracing::error!("Failed to generate commission report: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to generate commission report"
            }))
        }
    }
}

// Helper function to check if a rule applies to a product/category
pub fn check_rule_applicability(
    rule: &CommissionRule,
    product_id: Option<&str>,
    category_id: Option<&str>,
) -> bool {
    // If no filters specified, rule applies to all
    if rule.applies_to_categories.is_none() && rule.applies_to_products.is_none() {
        return true;
    }

    // Check product filter
    if let Some(products_json) = &rule.applies_to_products {
        if let Ok(products) = serde_json::from_str::<Vec<String>>(products_json) {
            if let Some(pid) = product_id {
                if products.contains(&pid.to_string()) {
                    return true;
                }
            }
        }
    }

    // Check category filter
    if let Some(categories_json) = &rule.applies_to_categories {
        if let Ok(categories) = serde_json::from_str::<Vec<String>>(categories_json) {
            if let Some(cid) = category_id {
                if categories.contains(&cid.to_string()) {
                    return true;
                }
            }
        }
    }

    false
}
