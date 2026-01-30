use actix_web::{get, post, web, HttpResponse, Responder};
use chrono::Utc;
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::{
    GiftCard, GiftCardStatus, GiftCardTransactionType,
    IssueGiftCardRequest, RedeemGiftCardRequest, ReloadGiftCardRequest,
};

/// Generate a unique gift card number
fn generate_card_number() -> String {
    // Generate a 16-digit card number (simplified - in production use proper algorithm)
    let uuid = Uuid::new_v4();
    let bytes = uuid.as_bytes();
    let mut number = String::new();
    for i in 0..16 {
        number.push_str(&format!("{}", bytes[i % 16] % 10));
    }
    number
}

/// POST /api/gift-cards
/// Issue a new gift card
#[post("/api/gift-cards")]
pub async fn issue_gift_card(
    pool: web::Data<SqlitePool>,
    req: web::Json<IssueGiftCardRequest>,
) -> impl Responder {
    tracing::info!("Issuing gift card with balance: {}", req.initial_balance);

    // Validate balance
    if req.initial_balance <= 0.0 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Initial balance must be greater than zero"
        }));
    }

    let card_id = Uuid::new_v4().to_string();
    let card_number = generate_card_number();
    let now = Utc::now().to_rfc3339();

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

    // Insert gift card
    let result = sqlx::query(
        "INSERT INTO gift_cards (id, card_number, initial_balance, current_balance, status, 
         issued_date, expiry_date, customer_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&card_id)
    .bind(&card_number)
    .bind(req.initial_balance)
    .bind(req.initial_balance)
    .bind(GiftCardStatus::Active.as_str())
    .bind(&now)
    .bind(&req.expiry_date)
    .bind(&req.customer_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to issue gift card: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to issue gift card"
        }));
    }

    // Record transaction
    let transaction_id = Uuid::new_v4().to_string();
    let result = sqlx::query(
        "INSERT INTO gift_card_transactions (id, gift_card_id, transaction_type, amount, 
         reference_id, created_at)
         VALUES (?, ?, ?, ?, NULL, ?)",
    )
    .bind(&transaction_id)
    .bind(&card_id)
    .bind(GiftCardTransactionType::Issued.as_str())
    .bind(req.initial_balance)
    .bind(&now)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to record gift card transaction: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to record gift card transaction"
        }));
    }

    // Commit transaction
    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {:?}", e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to commit transaction"
        }));
    }

    tracing::info!("Gift card issued successfully: {}", card_number);

    HttpResponse::Created().json(serde_json::json!({
        "id": card_id,
        "card_number": card_number,
        "initial_balance": req.initial_balance,
        "current_balance": req.initial_balance,
        "status": GiftCardStatus::Active.as_str(),
        "issued_date": now,
        "expiry_date": req.expiry_date,
        "customer_id": req.customer_id
    }))
}

/// GET /api/gift-cards/:number/balance
/// Check gift card balance
#[get("/api/gift-cards/{number}/balance")]
pub async fn check_balance(pool: web::Data<SqlitePool>, path: web::Path<String>) -> impl Responder {
    let card_number = path.into_inner();
    tracing::info!("Checking balance for gift card: {}", card_number);

    let result = sqlx::query_as::<_, GiftCard>(
        "SELECT id, card_number, initial_balance, current_balance, status, issued_date, 
         expiry_date, customer_id 
         FROM gift_cards 
         WHERE card_number = ?",
    )
    .bind(&card_number)
    .fetch_one(pool.get_ref())
    .await;

    match result {
        Ok(card) => HttpResponse::Ok().json(serde_json::json!({
            "card_number": card.card_number,
            "current_balance": card.current_balance,
            "status": card.status,
            "expiry_date": card.expiry_date
        })),
        Err(sqlx::Error::RowNotFound) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Gift card not found"
        })),
        Err(e) => {
            tracing::error!("Failed to check gift card balance: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to check gift card balance"
            }))
        }
    }
}

/// POST /api/gift-cards/:number/redeem
/// Redeem gift card
#[post("/api/gift-cards/{number}/redeem")]
pub async fn redeem_gift_card(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<RedeemGiftCardRequest>,
) -> impl Responder {
    let card_number = path.into_inner();
    tracing::info!("Redeeming {} from gift card: {}", req.amount, card_number);

    // Validate amount
    if req.amount <= 0.0 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Redemption amount must be greater than zero"
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

    // Fetch gift card
    let card = match sqlx::query_as::<_, GiftCard>(
        "SELECT id, card_number, initial_balance, current_balance, status, issued_date, 
         expiry_date, customer_id 
         FROM gift_cards 
         WHERE card_number = ?",
    )
    .bind(&card_number)
    .fetch_one(&mut *tx)
    .await
    {
        Ok(card) => card,
        Err(sqlx::Error::RowNotFound) => {
            let _ = tx.rollback().await;
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Gift card not found"
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch gift card: {:?}", e);
            let _ = tx.rollback().await;
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch gift card"
            }));
        }
    };

    // Check card status
    if card.status != GiftCardStatus::Active.as_str() {
        let _ = tx.rollback().await;
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": format!("Gift card is {}", card.status),
            "status": card.status
        }));
    }

    // Check expiry
    if let Some(expiry_date) = &card.expiry_date {
        if let Ok(expiry) = chrono::DateTime::parse_from_rfc3339(expiry_date) {
            if Utc::now() > expiry {
                let _ = tx.rollback().await;
                return HttpResponse::BadRequest().json(serde_json::json!({
                    "error": "Gift card has expired",
                    "expiry_date": expiry_date
                }));
            }
        }
    }

    // Check balance
    if req.amount > card.current_balance {
        let _ = tx.rollback().await;
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Insufficient balance",
            "current_balance": card.current_balance,
            "requested_amount": req.amount
        }));
    }

    let new_balance = card.current_balance - req.amount;
    let new_status = if new_balance <= 0.01 {
        GiftCardStatus::Depleted.as_str()
    } else {
        GiftCardStatus::Active.as_str()
    };

    // Update gift card balance
    let result = sqlx::query(
        "UPDATE gift_cards 
         SET current_balance = ?, status = ? 
         WHERE id = ?",
    )
    .bind(new_balance)
    .bind(new_status)
    .bind(&card.id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to update gift card: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to update gift card"
        }));
    }

    // Record transaction
    let transaction_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let result = sqlx::query(
        "INSERT INTO gift_card_transactions (id, gift_card_id, transaction_type, amount, 
         reference_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&transaction_id)
    .bind(&card.id)
    .bind(GiftCardTransactionType::Redeemed.as_str())
    .bind(req.amount)
    .bind(&req.reference_id)
    .bind(&now)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to record gift card transaction: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to record gift card transaction"
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
        "Gift card redeemed successfully: {} (new balance: {})",
        card_number,
        new_balance
    );

    HttpResponse::Ok().json(serde_json::json!({
        "message": "Gift card redeemed successfully",
        "amount_redeemed": req.amount,
        "new_balance": new_balance,
        "status": new_status
    }))
}

/// POST /api/gift-cards/:number/reload
/// Reload gift card
#[post("/api/gift-cards/{number}/reload")]
pub async fn reload_gift_card(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<ReloadGiftCardRequest>,
) -> impl Responder {
    let card_number = path.into_inner();
    tracing::info!("Reloading {} to gift card: {}", req.amount, card_number);

    // Validate amount
    if req.amount <= 0.0 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Reload amount must be greater than zero"
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

    // Fetch gift card
    let card = match sqlx::query_as::<_, GiftCard>(
        "SELECT id, card_number, initial_balance, current_balance, status, issued_date, 
         expiry_date, customer_id 
         FROM gift_cards 
         WHERE card_number = ?",
    )
    .bind(&card_number)
    .fetch_one(&mut *tx)
    .await
    {
        Ok(card) => card,
        Err(sqlx::Error::RowNotFound) => {
            let _ = tx.rollback().await;
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Gift card not found"
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch gift card: {:?}", e);
            let _ = tx.rollback().await;
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch gift card"
            }));
        }
    };

    // Check card status - can't reload cancelled cards
    if card.status == GiftCardStatus::Cancelled.as_str() {
        let _ = tx.rollback().await;
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Cannot reload cancelled gift card"
        }));
    }

    let new_balance = card.current_balance + req.amount;
    let new_status = GiftCardStatus::Active.as_str(); // Reactivate if depleted

    // Update gift card balance
    let result = sqlx::query(
        "UPDATE gift_cards 
         SET current_balance = ?, status = ? 
         WHERE id = ?",
    )
    .bind(new_balance)
    .bind(new_status)
    .bind(&card.id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to update gift card: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to update gift card"
        }));
    }

    // Record transaction
    let transaction_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let result = sqlx::query(
        "INSERT INTO gift_card_transactions (id, gift_card_id, transaction_type, amount, 
         reference_id, created_at)
         VALUES (?, ?, ?, ?, NULL, ?)",
    )
    .bind(&transaction_id)
    .bind(&card.id)
    .bind(GiftCardTransactionType::Reloaded.as_str())
    .bind(req.amount)
    .bind(&now)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to record gift card transaction: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to record gift card transaction"
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
        "Gift card reloaded successfully: {} (new balance: {})",
        card_number,
        new_balance
    );

    HttpResponse::Ok().json(serde_json::json!({
        "message": "Gift card reloaded successfully",
        "amount_added": req.amount,
        "new_balance": new_balance,
        "status": new_status
    }))
}
