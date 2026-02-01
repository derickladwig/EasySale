use actix_web::{get, post, web, HttpResponse, Responder};
use chrono::{Duration, Utc};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::{
    CreateCreditAccountRequest, CreditAccount, CreditTransaction, CreditTransactionType,
    RecordChargeRequest, RecordPaymentRequest,
};
use crate::services::OfflineCreditChecker;

/// POST /api/credit-accounts
/// Create a new credit account
#[post("/api/credit-accounts")]
pub async fn create_credit_account(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateCreditAccountRequest>,
) -> impl Responder {
    tracing::info!("Creating credit account for customer: {}", req.customer_id);

    // Validate credit limit
    if req.credit_limit <= 0.0 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Credit limit must be greater than zero"
        }));
    }

    let account_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let result = sqlx::query(
        "INSERT INTO credit_accounts (id, customer_id, credit_limit, current_balance, 
         available_credit, payment_terms_days, service_charge_rate, is_active, 
         last_statement_date, created_at, updated_at)
         VALUES (?, ?, ?, 0.0, ?, ?, ?, 1, NULL, ?, ?)",
    )
    .bind(&account_id)
    .bind(&req.customer_id)
    .bind(req.credit_limit)
    .bind(req.credit_limit) // Initially, available = limit
    .bind(req.payment_terms_days)
    .bind(req.service_charge_rate)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            tracing::info!("Credit account created successfully: {}", account_id);
            // Fetch and return the created account
            match sqlx::query_as::<_, CreditAccount>(
                "SELECT id, customer_id, credit_limit, current_balance, available_credit, 
                 payment_terms_days, service_charge_rate, is_active, last_statement_date, 
                 created_at, updated_at 
                 FROM credit_accounts 
                 WHERE id = ?",
            )
            .bind(&account_id)
            .fetch_one(pool.get_ref())
            .await
            {
                Ok(account) => HttpResponse::Created().json(account),
                Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Account created but failed to fetch"
                })),
            }
        }
        Err(e) => {
            tracing::error!("Failed to create credit account: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create credit account"
            }))
        }
    }
}

/// GET /api/credit-accounts/:id
/// Get a credit account by ID
#[get("/api/credit-accounts/{id}")]
pub async fn get_credit_account(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let account_id = path.into_inner();
    tracing::info!("Fetching credit account: {}", account_id);

    let result = sqlx::query_as::<_, CreditAccount>(
        "SELECT id, customer_id, credit_limit, current_balance, available_credit, 
         payment_terms_days, service_charge_rate, is_active, last_statement_date, 
         created_at, updated_at 
         FROM credit_accounts 
         WHERE id = ?",
    )
    .bind(&account_id)
    .fetch_one(pool.get_ref())
    .await;

    match result {
        Ok(account) => HttpResponse::Ok().json(account),
        Err(sqlx::Error::RowNotFound) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Credit account not found"
        })),
        Err(e) => {
            tracing::error!("Failed to fetch credit account: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch credit account"
            }))
        }
    }
}

/// POST /api/credit-accounts/:id/charge
/// Record a charge to a credit account
#[post("/api/credit-accounts/{id}/charge")]
pub async fn record_charge(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<RecordChargeRequest>,
) -> impl Responder {
    let account_id = path.into_inner();
    tracing::info!("Recording charge to credit account: {}", account_id);

    // Validate amount
    if req.amount <= 0.0 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Charge amount must be greater than zero"
        }));
    }

    // Start transaction
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to start transaction: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to start transaction"
            }));
        }
    };

    // Fetch account
    let account = match sqlx::query_as::<_, CreditAccount>(
        "SELECT id, customer_id, credit_limit, current_balance, available_credit, 
         payment_terms_days, service_charge_rate, is_active, last_statement_date, 
         created_at, updated_at 
         FROM credit_accounts 
         WHERE id = ?",
    )
    .bind(&account_id)
    .fetch_one(&mut *tx)
    .await
    {
        Ok(account) => account,
        Err(sqlx::Error::RowNotFound) => {
            let _ = tx.rollback().await;
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Credit account not found"
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch credit account: {:?}", e);
            let _ = tx.rollback().await;
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch credit account"
            }));
        }
    };

    // Check if account is active
    if !account.is_active {
        let _ = tx.rollback().await;
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Credit account is not active"
        }));
    }

    // Check credit limit
    let new_balance = account.current_balance + req.amount;
    if new_balance > account.credit_limit {
        let _ = tx.rollback().await;
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Charge would exceed credit limit",
            "credit_limit": account.credit_limit,
            "current_balance": account.current_balance,
            "available_credit": account.available_credit,
            "requested_charge": req.amount
        }));
    }

    let transaction_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let due_date = Utc::now() + Duration::days(account.payment_terms_days as i64);
    let due_date_str = due_date.to_rfc3339();

    // Record transaction
    let result = sqlx::query(
        "INSERT INTO credit_transactions (id, credit_account_id, transaction_type, amount, 
         reference_id, transaction_date, due_date, days_overdue)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
    )
    .bind(&transaction_id)
    .bind(&account_id)
    .bind(CreditTransactionType::Charge.as_str())
    .bind(req.amount)
    .bind(&req.reference_id)
    .bind(&now)
    .bind(&due_date_str)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to record charge: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to record charge"
        }));
    }

    // Update account balance
    let new_available = account.credit_limit - new_balance;
    let result = sqlx::query(
        "UPDATE credit_accounts 
         SET current_balance = ?, available_credit = ?, updated_at = ? 
         WHERE id = ?",
    )
    .bind(new_balance)
    .bind(new_available)
    .bind(&now)
    .bind(&account_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to update account balance: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to update account balance"
        }));
    }

    // Commit transaction
    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {:?}", e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to commit transaction"
        }));
    }

    tracing::info!(
        "Charge recorded successfully for account {} (new balance: {})",
        account_id,
        new_balance
    );

    HttpResponse::Ok().json(serde_json::json!({
        "message": "Charge recorded successfully",
        "transaction_id": transaction_id,
        "amount": req.amount,
        "new_balance": new_balance,
        "available_credit": new_available
    }))
}

/// POST /api/credit-accounts/:id/payment
/// Record a payment to a credit account
#[post("/api/credit-accounts/{id}/payment")]
pub async fn record_payment(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<RecordPaymentRequest>,
) -> impl Responder {
    let account_id = path.into_inner();
    tracing::info!("Recording payment to credit account: {}", account_id);

    // Validate amount
    if req.amount <= 0.0 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Payment amount must be greater than zero"
        }));
    }

    // Start transaction
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to start transaction: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to start transaction"
            }));
        }
    };

    // Fetch account
    let account = match sqlx::query_as::<_, CreditAccount>(
        "SELECT id, customer_id, credit_limit, current_balance, available_credit, 
         payment_terms_days, service_charge_rate, is_active, last_statement_date, 
         created_at, updated_at 
         FROM credit_accounts 
         WHERE id = ?",
    )
    .bind(&account_id)
    .fetch_one(&mut *tx)
    .await
    {
        Ok(account) => account,
        Err(sqlx::Error::RowNotFound) => {
            let _ = tx.rollback().await;
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Credit account not found"
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch credit account: {:?}", e);
            let _ = tx.rollback().await;
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch credit account"
            }));
        }
    };

    let transaction_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Record transaction
    let result = sqlx::query(
        "INSERT INTO credit_transactions (id, credit_account_id, transaction_type, amount, 
         reference_id, transaction_date, due_date, days_overdue)
         VALUES (?, ?, ?, ?, ?, ?, NULL, 0)",
    )
    .bind(&transaction_id)
    .bind(&account_id)
    .bind(CreditTransactionType::Payment.as_str())
    .bind(req.amount)
    .bind(&transaction_id) // Use transaction_id as reference
    .bind(&now)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to record payment: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to record payment"
        }));
    }

    // Update account balance
    let new_balance = (account.current_balance - req.amount).max(0.0);
    let new_available = account.credit_limit - new_balance;
    let result = sqlx::query(
        "UPDATE credit_accounts 
         SET current_balance = ?, available_credit = ?, updated_at = ? 
         WHERE id = ?",
    )
    .bind(new_balance)
    .bind(new_available)
    .bind(&now)
    .bind(&account_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to update account balance: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to update account balance"
        }));
    }

    // Commit transaction
    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {:?}", e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to commit transaction"
        }));
    }

    tracing::info!(
        "Payment recorded successfully for account {} (new balance: {})",
        account_id,
        new_balance
    );

    HttpResponse::Ok().json(serde_json::json!({
        "message": "Payment recorded successfully",
        "transaction_id": transaction_id,
        "amount": req.amount,
        "new_balance": new_balance,
        "available_credit": new_available
    }))
}

/// GET /api/credit-accounts/:id/statement
/// Generate AR statement for a credit account
#[get("/api/credit-accounts/{id}/statement")]
pub async fn generate_statement(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let account_id = path.into_inner();
    tracing::info!("Generating statement for credit account: {}", account_id);

    // Fetch account
    let account = match sqlx::query_as::<_, CreditAccount>(
        "SELECT id, customer_id, credit_limit, current_balance, available_credit, 
         payment_terms_days, service_charge_rate, is_active, last_statement_date, 
         created_at, updated_at 
         FROM credit_accounts 
         WHERE id = ?",
    )
    .bind(&account_id)
    .fetch_one(pool.get_ref())
    .await
    {
        Ok(account) => account,
        Err(sqlx::Error::RowNotFound) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Credit account not found"
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch credit account: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch credit account"
            }));
        }
    };

    // Fetch all transactions
    let transactions = match sqlx::query_as::<_, CreditTransaction>(
        "SELECT id, credit_account_id, transaction_type, amount, reference_id, 
         transaction_date, due_date, days_overdue 
         FROM credit_transactions 
         WHERE credit_account_id = ? 
         ORDER BY transaction_date DESC",
    )
    .bind(&account_id)
    .fetch_all(pool.get_ref())
    .await
    {
        Ok(txs) => txs,
        Err(e) => {
            tracing::error!("Failed to fetch transactions: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch transactions"
            }));
        }
    };

    // Calculate aging buckets
    let now = Utc::now();
    let mut aging_current = 0.0;
    let mut aging_30 = 0.0;
    let mut aging_60 = 0.0;
    let mut aging_90_plus = 0.0;

    for tx in &transactions {
        if tx.transaction_type == CreditTransactionType::Charge.as_str() {
            if let Some(due_date_str) = &tx.due_date {
                if let Ok(due_date) = chrono::DateTime::parse_from_rfc3339(due_date_str) {
                    let due_date_utc = due_date.with_timezone(&Utc);
                    let days_overdue = (now - due_date_utc).num_days();
                    if days_overdue < 0 {
                        aging_current += tx.amount;
                    } else if days_overdue < 30 {
                        aging_current += tx.amount;
                    } else if days_overdue < 60 {
                        aging_30 += tx.amount;
                    } else if days_overdue < 90 {
                        aging_60 += tx.amount;
                    } else {
                        aging_90_plus += tx.amount;
                    }
                }
            }
        }
    }

    HttpResponse::Ok().json(serde_json::json!({
        "account_id": account_id,
        "customer_id": account.customer_id,
        "statement_date": Utc::now().to_rfc3339(),
        "credit_limit": account.credit_limit,
        "current_balance": account.current_balance,
        "available_credit": account.available_credit,
        "aging": {
            "current": aging_current,
            "30_days": aging_30,
            "60_days": aging_60,
            "90_plus_days": aging_90_plus
        },
        "transactions": transactions
    }))
}

/// GET /api/credit-accounts/aging
/// Get aging report for all credit accounts
#[get("/api/credit-accounts/aging")]
pub async fn get_aging_report(pool: web::Data<SqlitePool>) -> impl Responder {
    tracing::info!("Generating aging report for all credit accounts");

    // This is a simplified version - in production, you'd want more sophisticated aging calculation
    let result = sqlx::query_as::<_, (String, String, f64, f64, f64)>(
        "SELECT ca.id, ca.customer_id, ca.credit_limit, ca.current_balance, ca.available_credit
         FROM credit_accounts ca
         WHERE ca.is_active = 1 AND ca.current_balance > 0
         ORDER BY ca.current_balance DESC"
    )
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(accounts) => {
            let report: Vec<serde_json::Value> = accounts
                .iter()
                .map(|(id, customer_id, credit_limit, current_balance, available_credit)| {
                    serde_json::json!({
                        "account_id": id,
                        "customer_id": customer_id,
                        "credit_limit": credit_limit,
                        "current_balance": current_balance,
                        "available_credit": available_credit
                    })
                })
                .collect();

            HttpResponse::Ok().json(report)
        }
        Err(e) => {
            tracing::error!("Failed to generate aging report: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to generate aging report"
            }))
        }
    }
}

/// POST /api/customers/:id/check-credit
/// Check if customer can be charged (offline-aware)
#[post("/api/customers/{id}/check-credit")]
pub async fn check_customer_credit(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<CheckCreditRequest>,
) -> impl Responder {
    let customer_id = path.into_inner();
    tracing::info!("Checking credit for customer: {}", customer_id);

    // Get credit account for customer
    let account = match sqlx::query_as::<_, CreditAccount>(
        "SELECT id, customer_id, credit_limit, current_balance, available_credit, 
         payment_terms_days, service_charge_rate, is_active, last_statement_date, 
         created_at, updated_at 
         FROM credit_accounts 
         WHERE customer_id = ? AND is_active = 1",
    )
    .bind(&customer_id)
    .fetch_optional(pool.get_ref())
    .await
    {
        Ok(Some(account)) => account,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "No active credit account found for customer"
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch credit account: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch credit account"
            }));
        }
    };

    // Use offline credit checker
    let checker = OfflineCreditChecker::new(pool.get_ref().clone());
    let amount_str = req.amount.to_string();
    
    match checker.can_charge(&account.id, &amount_str, req.is_offline.unwrap_or(false)).await {
        Ok((true, message)) => HttpResponse::Ok().json(serde_json::json!({
            "approved": true,
            "account_id": account.id,
            "credit_limit": account.credit_limit,
            "current_balance": account.current_balance,
            "available_credit": account.available_credit,
            "requested_amount": req.amount,
            "message": message
        })),
        Ok((false, message)) => HttpResponse::Ok().json(serde_json::json!({
            "approved": false,
            "account_id": account.id,
            "credit_limit": account.credit_limit,
            "current_balance": account.current_balance,
            "available_credit": account.available_credit,
            "requested_amount": req.amount,
            "message": message
        })),
        Err(e) => {
            tracing::error!("Failed to check credit: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to check credit: {}", e)
            }))
        }
    }
}

/// POST /api/transactions/verify-offline
/// Verify offline credit transactions after sync
#[post("/api/transactions/verify-offline")]
pub async fn verify_offline_transactions(
    pool: web::Data<SqlitePool>,
    req: web::Json<VerifyOfflineRequest>,
) -> impl Responder {
    tracing::info!("Verifying offline transactions for account: {}", req.account_id);

    let checker = OfflineCreditChecker::new(pool.get_ref().clone());
    
    match checker.verify_offline_transactions(&req.account_id).await {
        Ok(results) => {
            let results_json: Vec<serde_json::Value> = results
                .iter()
                .map(|r| serde_json::json!({
                    "verification_id": r.verification_id,
                    "amount": r.amount,
                    "status": r.status,
                    "message": r.message
                }))
                .collect();
            
            HttpResponse::Ok().json(serde_json::json!({
                "message": "Verification complete",
                "results": results_json
            }))
        }
        Err(e) => {
            tracing::error!("Failed to verify offline transactions: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to verify offline transactions: {}", e)
            }))
        }
    }
}

/// GET /api/transactions/pending-verifications
/// Get pending offline credit verifications
#[get("/api/transactions/pending-verifications")]
pub async fn get_pending_verifications(
    pool: web::Data<SqlitePool>,
    query: web::Query<PendingVerificationsQuery>,
) -> impl Responder {
    tracing::info!("Getting pending verifications");

    if let Some(account_id) = &query.account_id {
        let checker = OfflineCreditChecker::new(pool.get_ref().clone());
        
        match checker.get_pending_verifications(account_id).await {
            Ok(count) => HttpResponse::Ok().json(serde_json::json!({
                "account_id": account_id,
                "pending_count": count
            })),
            Err(e) => {
                tracing::error!("Failed to get pending verifications: {:?}", e);
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to get pending verifications: {}", e)
                }))
            }
        }
    } else {
        // Get all pending verifications
        #[derive(sqlx::FromRow)]
        struct PendingVerification {
            id: String,
            account_id: String,
            amount: String,
            created_at: String,
        }

        match sqlx::query_as::<_, PendingVerification>(
            "SELECT id, account_id, amount, created_at 
             FROM offline_credit_verifications 
             WHERE verification_status = 'pending' 
             ORDER BY created_at ASC"
        )
        .fetch_all(pool.get_ref())
        .await
        {
            Ok(verifications) => {
                let results: Vec<serde_json::Value> = verifications
                    .iter()
                    .map(|v| serde_json::json!({
                        "id": v.id,
                        "account_id": v.account_id,
                        "amount": v.amount,
                        "created_at": v.created_at
                    }))
                    .collect();
                
                HttpResponse::Ok().json(serde_json::json!({
                    "pending_verifications": results,
                    "total_count": results.len()
                }))
            }
            Err(e) => {
                tracing::error!("Failed to get pending verifications: {:?}", e);
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to get pending verifications: {}", e)
                }))
            }
        }
    }
}

// Request types
#[derive(serde::Deserialize)]
pub struct CheckCreditRequest {
    pub amount: f64,
    pub is_offline: Option<bool>,
}

#[derive(serde::Deserialize)]
pub struct VerifyOfflineRequest {
    pub account_id: String,
}

#[derive(serde::Deserialize)]
pub struct PendingVerificationsQuery {
    pub account_id: Option<String>,
}

// ============================================================================
// ENHANCED CREDIT LIMIT ENFORCEMENT (Ported from POS)
// ============================================================================

/// Credit limit check result with detailed status
#[derive(serde::Serialize)]
pub struct CreditLimitCheckResult {
    pub allowed: bool,
    pub account_id: String,
    pub customer_id: String,
    pub credit_limit: f64,
    pub current_balance: f64,
    pub available_credit: f64,
    pub requested_amount: f64,
    pub new_balance_if_approved: f64,
    pub utilization_percent: f64,
    pub warning_level: Option<String>,
    pub message: String,
}

/// Warning thresholds for credit utilization
const CREDIT_WARNING_THRESHOLD: f64 = 0.80; // 80%
const CREDIT_CRITICAL_THRESHOLD: f64 = 0.95; // 95%

/// POST /api/credit/check-limit
/// Comprehensive credit limit check with warnings
#[post("/api/credit/check-limit")]
pub async fn check_credit_limit(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreditLimitCheckRequest>,
) -> impl Responder {
    tracing::info!("Checking credit limit for customer: {}", req.customer_id);

    // Validate amount
    if req.amount <= 0.0 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Amount must be greater than zero"
        }));
    }

    // Get credit account for customer
    let account = match sqlx::query_as::<_, CreditAccount>(
        "SELECT id, customer_id, credit_limit, current_balance, available_credit, 
         payment_terms_days, service_charge_rate, is_active, last_statement_date, 
         created_at, updated_at 
         FROM credit_accounts 
         WHERE customer_id = ? AND is_active = 1",
    )
    .bind(&req.customer_id)
    .fetch_optional(pool.get_ref())
    .await
    {
        Ok(Some(account)) => account,
        Ok(None) => {
            // No credit account - check if customer has credit limit on customer record
            let customer_limit = sqlx::query_scalar::<_, Option<f64>>(
                "SELECT credit_limit FROM customers WHERE id = ?"
            )
            .bind(&req.customer_id)
            .fetch_optional(pool.get_ref())
            .await
            .ok()
            .flatten()
            .flatten();

            if let Some(limit) = customer_limit {
                if limit > 0.0 {
                    // Customer has a limit but no credit account - allow but warn
                    return HttpResponse::Ok().json(CreditLimitCheckResult {
                        allowed: req.amount <= limit,
                        account_id: String::new(),
                        customer_id: req.customer_id.clone(),
                        credit_limit: limit,
                        current_balance: 0.0,
                        available_credit: limit,
                        requested_amount: req.amount,
                        new_balance_if_approved: req.amount,
                        utilization_percent: (req.amount / limit) * 100.0,
                        warning_level: if req.amount > limit { Some("exceeded".to_string()) } else { None },
                        message: if req.amount <= limit {
                            "Credit available (no formal account)".to_string()
                        } else {
                            format!("Exceeds credit limit of ${:.2}", limit)
                        },
                    });
                }
            }

            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "No credit account found for customer",
                "customer_id": req.customer_id
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch credit account: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch credit account"
            }));
        }
    };

    // Calculate new balance and utilization
    let new_balance = account.current_balance + req.amount;
    let utilization = new_balance / account.credit_limit;
    let utilization_percent = utilization * 100.0;

    // Determine if allowed and warning level
    let allowed = new_balance <= account.credit_limit;
    let warning_level = if !allowed {
        Some("exceeded".to_string())
    } else if utilization >= CREDIT_CRITICAL_THRESHOLD {
        Some("critical".to_string())
    } else if utilization >= CREDIT_WARNING_THRESHOLD {
        Some("warning".to_string())
    } else {
        None
    };

    // Generate message
    let message = if !allowed {
        format!(
            "Credit limit exceeded. Limit: ${:.2}, Current: ${:.2}, Requested: ${:.2}",
            account.credit_limit, account.current_balance, req.amount
        )
    } else if warning_level.as_deref() == Some("critical") {
        format!(
            "Credit utilization at {:.1}% - approaching limit",
            utilization_percent
        )
    } else if warning_level.as_deref() == Some("warning") {
        format!(
            "Credit utilization at {:.1}% - consider payment",
            utilization_percent
        )
    } else {
        "Credit available".to_string()
    };

    HttpResponse::Ok().json(CreditLimitCheckResult {
        allowed,
        account_id: account.id,
        customer_id: account.customer_id,
        credit_limit: account.credit_limit,
        current_balance: account.current_balance,
        available_credit: account.available_credit,
        requested_amount: req.amount,
        new_balance_if_approved: new_balance,
        utilization_percent,
        warning_level,
        message,
    })
}

#[derive(serde::Deserialize)]
pub struct CreditLimitCheckRequest {
    pub customer_id: String,
    pub amount: f64,
}

/// GET /api/credit/utilization-warnings
/// Get all customers approaching or exceeding credit limits
#[get("/api/credit/utilization-warnings")]
pub async fn get_credit_utilization_warnings(
    pool: web::Data<SqlitePool>,
) -> impl Responder {
    tracing::info!("Getting credit utilization warnings");

    let result = sqlx::query_as::<_, (String, String, f64, f64, f64)>(
        "SELECT ca.id, ca.customer_id, ca.credit_limit, ca.current_balance, ca.available_credit
         FROM credit_accounts ca
         WHERE ca.is_active = 1 
         AND ca.credit_limit > 0
         AND (ca.current_balance / ca.credit_limit) >= ?
         ORDER BY (ca.current_balance / ca.credit_limit) DESC"
    )
    .bind(CREDIT_WARNING_THRESHOLD)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(accounts) => {
            let warnings: Vec<serde_json::Value> = accounts
                .iter()
                .map(|(id, customer_id, credit_limit, current_balance, available_credit)| {
                    let utilization = current_balance / credit_limit;
                    let level = if utilization >= 1.0 {
                        "exceeded"
                    } else if utilization >= CREDIT_CRITICAL_THRESHOLD {
                        "critical"
                    } else {
                        "warning"
                    };

                    serde_json::json!({
                        "account_id": id,
                        "customer_id": customer_id,
                        "credit_limit": credit_limit,
                        "current_balance": current_balance,
                        "available_credit": available_credit,
                        "utilization_percent": utilization * 100.0,
                        "warning_level": level
                    })
                })
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "warnings": warnings,
                "total_count": warnings.len(),
                "thresholds": {
                    "warning": CREDIT_WARNING_THRESHOLD * 100.0,
                    "critical": CREDIT_CRITICAL_THRESHOLD * 100.0
                }
            }))
        }
        Err(e) => {
            tracing::error!("Failed to get credit utilization warnings: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get credit utilization warnings"
            }))
        }
    }
}

/// PUT /api/credit-accounts/:id/limit
/// Update credit limit for an account
#[post("/api/credit-accounts/{id}/update-limit")]
pub async fn update_credit_limit(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<UpdateCreditLimitRequest>,
) -> impl Responder {
    let account_id = path.into_inner();
    tracing::info!("Updating credit limit for account: {}", account_id);

    // Validate new limit
    if req.new_limit < 0.0 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Credit limit cannot be negative"
        }));
    }

    // Get current account
    let account = match sqlx::query_as::<_, CreditAccount>(
        "SELECT id, customer_id, credit_limit, current_balance, available_credit, 
         payment_terms_days, service_charge_rate, is_active, last_statement_date, 
         created_at, updated_at 
         FROM credit_accounts 
         WHERE id = ?",
    )
    .bind(&account_id)
    .fetch_optional(pool.get_ref())
    .await
    {
        Ok(Some(account)) => account,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Credit account not found"
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch credit account: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch credit account"
            }));
        }
    };

    // Check if new limit would be below current balance
    if req.new_limit < account.current_balance {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "New credit limit cannot be less than current balance",
            "current_balance": account.current_balance,
            "requested_limit": req.new_limit
        }));
    }

    let now = Utc::now().to_rfc3339();
    let new_available = req.new_limit - account.current_balance;

    let result = sqlx::query(
        "UPDATE credit_accounts 
         SET credit_limit = ?, available_credit = ?, updated_at = ? 
         WHERE id = ?"
    )
    .bind(req.new_limit)
    .bind(new_available)
    .bind(&now)
    .bind(&account_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            tracing::info!(
                "Credit limit updated for account {} from {} to {}",
                account_id, account.credit_limit, req.new_limit
            );
            HttpResponse::Ok().json(serde_json::json!({
                "message": "Credit limit updated",
                "account_id": account_id,
                "old_limit": account.credit_limit,
                "new_limit": req.new_limit,
                "available_credit": new_available
            }))
        }
        Err(e) => {
            tracing::error!("Failed to update credit limit: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to update credit limit"
            }))
        }
    }
}

#[derive(serde::Deserialize)]
pub struct UpdateCreditLimitRequest {
    pub new_limit: f64,
    pub reason: Option<String>,
}
