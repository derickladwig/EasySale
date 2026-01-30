use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PromotionType {
    PercentageOff,
    FixedAmountOff,
    BuyXGetY,
    QuantityDiscount,
}

impl PromotionType {
    pub fn as_str(&self) -> &str {
        match self {
            PromotionType::PercentageOff => "PercentageOff",
            PromotionType::FixedAmountOff => "FixedAmountOff",
            PromotionType::BuyXGetY => "BuyXGetY",
            PromotionType::QuantityDiscount => "QuantityDiscount",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Promotion {
    pub id: String,
    pub tenant_id: String,
    pub name: String,
    pub description: Option<String>,
    pub promotion_type: String,
    pub discount_value: f64,
    pub start_date: String,
    pub end_date: String,
    pub applies_to_categories: Option<String>,
    pub applies_to_products: Option<String>,
    pub applies_to_tiers: Option<String>,
    pub min_quantity: Option<i32>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PromotionUsage {
    pub id: String,
    pub tenant_id: String,
    pub promotion_id: String,
    pub transaction_id: String,
    pub customer_id: Option<String>,
    pub discount_amount: f64,
    pub items_affected: i32,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePromotionRequest {
    pub name: String,
    pub description: Option<String>,
    pub promotion_type: PromotionType,
    pub discount_value: f64,
    pub start_date: String,
    pub end_date: String,
    pub applies_to_categories: Option<Vec<String>>,
    pub applies_to_products: Option<Vec<String>>,
    pub applies_to_tiers: Option<Vec<String>>,
    pub min_quantity: Option<i32>,
}
