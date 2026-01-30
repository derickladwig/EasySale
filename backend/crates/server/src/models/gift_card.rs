use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum GiftCardStatus {
    Active,
    Depleted,
    Expired,
    Cancelled,
}

impl GiftCardStatus {
    pub fn as_str(&self) -> &str {
        match self {
            GiftCardStatus::Active => "Active",
            GiftCardStatus::Depleted => "Depleted",
            GiftCardStatus::Expired => "Expired",
            GiftCardStatus::Cancelled => "Cancelled",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum GiftCardTransactionType {
    Issued,
    Reloaded,
    Redeemed,
    Refunded,
}

impl GiftCardTransactionType {
    pub fn as_str(&self) -> &str {
        match self {
            GiftCardTransactionType::Issued => "Issued",
            GiftCardTransactionType::Reloaded => "Reloaded",
            GiftCardTransactionType::Redeemed => "Redeemed",
            GiftCardTransactionType::Refunded => "Refunded",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GiftCard {
    pub id: String,
    pub tenant_id: String,
    pub card_number: String,
    pub initial_balance: f64,
    pub current_balance: f64,
    pub status: String,
    pub issued_date: String,
    pub expiry_date: Option<String>,
    pub customer_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[allow(dead_code)] // Future feature
pub struct GiftCardTransaction {
    pub id: String,
    pub tenant_id: String,
    pub gift_card_id: String,
    pub transaction_type: String,
    pub amount: f64,
    pub reference_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueGiftCardRequest {
    pub initial_balance: f64,
    pub customer_id: Option<String>,
    pub expiry_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedeemGiftCardRequest {
    pub amount: f64,
    pub reference_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReloadGiftCardRequest {
    pub amount: f64,
}
