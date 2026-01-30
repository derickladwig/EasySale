use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CreditTransactionType {
    Charge,
    Payment,
    ServiceCharge,
    Adjustment,
}

impl CreditTransactionType {
    pub fn as_str(&self) -> &str {
        match self {
            CreditTransactionType::Charge => "Charge",
            CreditTransactionType::Payment => "Payment",
            CreditTransactionType::ServiceCharge => "ServiceCharge",
            CreditTransactionType::Adjustment => "Adjustment",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreditAccount {
    pub id: String,
    pub tenant_id: String,
    pub customer_id: String,
    pub credit_limit: f64,
    pub current_balance: f64,
    pub available_credit: f64,
    pub payment_terms_days: i32,
    pub service_charge_rate: Option<f64>,
    pub is_active: bool,
    pub last_statement_date: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CreditTransaction {
    pub id: String,
    pub tenant_id: String,
    pub credit_account_id: String,
    pub transaction_type: String,
    pub amount: f64,
    pub reference_id: String,
    pub transaction_date: String,
    pub due_date: Option<String>,
    pub days_overdue: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCreditAccountRequest {
    pub customer_id: String,
    pub credit_limit: f64,
    pub payment_terms_days: i32,
    pub service_charge_rate: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordChargeRequest {
    pub amount: f64,
    pub reference_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordPaymentRequest {
    pub amount: f64,
}
