use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CommissionRuleType {
    PercentOfSale,
    PercentOfProfit,
    FlatRatePerItem,
}

impl CommissionRuleType {
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "PercentOfSale" => Ok(CommissionRuleType::PercentOfSale),
            "PercentOfProfit" => Ok(CommissionRuleType::PercentOfProfit),
            "FlatRatePerItem" => Ok(CommissionRuleType::FlatRatePerItem),
            _ => Err(format!("Invalid commission rule type: {}", s)),
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            CommissionRuleType::PercentOfSale => "PercentOfSale",
            CommissionRuleType::PercentOfProfit => "PercentOfProfit",
            CommissionRuleType::FlatRatePerItem => "FlatRatePerItem",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CommissionRule {
    pub id: String,
    pub tenant_id: String,
    pub name: String,
    #[sqlx(rename = "rule_type")]
    rule_type_str: String,
    pub rate: f64,
    pub min_profit_threshold: Option<f64>,
    pub applies_to_categories: Option<String>,
    pub applies_to_products: Option<String>,
    pub is_active: bool,
}

impl CommissionRule {
    pub fn rule_type(&self) -> CommissionRuleType {
        CommissionRuleType::from_str(&self.rule_type_str)
            .unwrap_or(CommissionRuleType::PercentOfSale)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Commission {
    pub id: String,
    pub tenant_id: String,
    pub employee_id: String,
    pub transaction_id: String,
    pub rule_id: String,
    pub sale_amount: f64,
    pub profit_amount: f64,
    pub commission_amount: f64,
    pub created_at: String,
    pub is_reversed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CommissionSplit {
    pub id: String,
    pub tenant_id: String,
    pub commission_id: String,
    pub employee_id: String,
    pub split_percentage: f64,
    pub split_amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCommissionRuleRequest {
    pub name: String,
    pub rule_type: CommissionRuleType,
    pub rate: f64,
    pub min_profit_threshold: Option<f64>,
    pub applies_to_categories: Option<Vec<String>>,
    pub applies_to_products: Option<Vec<String>>,
}
