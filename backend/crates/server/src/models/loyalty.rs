use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum LoyaltyTransactionType {
    Earned,
    Redeemed,
    Adjusted,
    Expired,
}

impl LoyaltyTransactionType {
    pub fn as_str(&self) -> &str {
        match self {
            LoyaltyTransactionType::Earned => "Earned",
            LoyaltyTransactionType::Redeemed => "Redeemed",
            LoyaltyTransactionType::Adjusted => "Adjusted",
            LoyaltyTransactionType::Expired => "Expired",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LoyaltyTransaction {
    pub id: String,
    pub tenant_id: String,
    pub customer_id: String,
    pub transaction_type: String,
    pub points: i32,
    pub amount: Option<f64>,
    pub reference_id: Option<String>,
    pub created_at: String,
    pub employee_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedeemPointsRequest {
    pub points: i32,
    pub employee_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PriceLevel {
    pub id: String,
    pub tenant_id: String,
    pub product_id: String,
    pub pricing_tier: String,
    pub price: f64,
    pub markup_percentage: Option<f64>,
}
