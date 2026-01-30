use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum LayawayStatus {
    Active,
    Completed,
    Cancelled,
    Overdue,
}

impl LayawayStatus {
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "Active" => Ok(LayawayStatus::Active),
            "Completed" => Ok(LayawayStatus::Completed),
            "Cancelled" => Ok(LayawayStatus::Cancelled),
            "Overdue" => Ok(LayawayStatus::Overdue),
            _ => Err(format!("Invalid layaway status: {}", s)),
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            LayawayStatus::Active => "Active",
            LayawayStatus::Completed => "Completed",
            LayawayStatus::Cancelled => "Cancelled",
            LayawayStatus::Overdue => "Overdue",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Layaway {
    pub id: String,
    pub tenant_id: String,
    pub customer_id: String,
    #[sqlx(rename = "status")]
    status_str: String,
    pub total_amount: f64,
    pub deposit_amount: f64,
    pub balance_due: f64,
    pub due_date: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
    pub sync_version: i64,
    pub store_id: String,
}

impl Layaway {
    pub fn status(&self) -> LayawayStatus {
        LayawayStatus::from_str(&self.status_str).unwrap_or(LayawayStatus::Active)
    }

    pub fn set_status(&mut self, status: LayawayStatus) {
        self.status_str = status.as_str().to_string();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LayawayItem {
    pub id: String,
    pub tenant_id: String,
    pub layaway_id: String,
    pub product_id: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total_price: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LayawayPayment {
    pub id: String,
    pub tenant_id: String,
    pub layaway_id: String,
    pub amount: f64,
    pub payment_method: String,
    pub payment_date: String,
    pub employee_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLayawayRequest {
    pub customer_id: String,
    pub items: Vec<CreateLayawayItemRequest>,
    pub deposit_amount: f64,
    pub due_date: Option<String>,
    pub store_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLayawayItemRequest {
    pub product_id: String,
    pub quantity: f64,
    pub unit_price: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLayawayPaymentRequest {
    pub amount: f64,
    pub payment_method: String,
    pub employee_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayawayResponse {
    pub id: String,
    pub customer_id: String,
    pub status: String,
    pub total_amount: f64,
    pub deposit_amount: f64,
    pub balance_due: f64,
    pub due_date: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
    pub items: Vec<LayawayItem>,
    pub payments: Vec<LayawayPayment>,
}

impl From<Layaway> for LayawayResponse {
    fn from(layaway: Layaway) -> Self {
        Self {
            id: layaway.id,
            customer_id: layaway.customer_id,
            status: layaway.status_str,
            total_amount: layaway.total_amount,
            deposit_amount: layaway.deposit_amount,
            balance_due: layaway.balance_due,
            due_date: layaway.due_date,
            created_at: layaway.created_at,
            updated_at: layaway.updated_at,
            completed_at: layaway.completed_at,
            items: Vec::new(),
            payments: Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_layaway_status_from_str() {
        assert_eq!(
            LayawayStatus::from_str("Active").unwrap(),
            LayawayStatus::Active
        );
        assert_eq!(
            LayawayStatus::from_str("Completed").unwrap(),
            LayawayStatus::Completed
        );
        assert_eq!(
            LayawayStatus::from_str("Cancelled").unwrap(),
            LayawayStatus::Cancelled
        );
        assert_eq!(
            LayawayStatus::from_str("Overdue").unwrap(),
            LayawayStatus::Overdue
        );
        assert!(LayawayStatus::from_str("Invalid").is_err());
    }

    #[test]
    fn test_layaway_status_as_str() {
        assert_eq!(LayawayStatus::Active.as_str(), "Active");
        assert_eq!(LayawayStatus::Completed.as_str(), "Completed");
        assert_eq!(LayawayStatus::Cancelled.as_str(), "Cancelled");
        assert_eq!(LayawayStatus::Overdue.as_str(), "Overdue");
    }
}
