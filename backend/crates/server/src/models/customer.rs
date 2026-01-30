use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[allow(clippy::upper_case_acronyms)]
pub enum PricingTier {
    Retail,
    Wholesale,
    Contractor,
    VIP,
}

impl PricingTier {
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "Retail" => Ok(PricingTier::Retail),
            "Wholesale" => Ok(PricingTier::Wholesale),
            "Contractor" => Ok(PricingTier::Contractor),
            "VIP" => Ok(PricingTier::VIP),
            _ => Err(format!("Invalid pricing tier: {s}")),
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            PricingTier::Retail => "Retail",
            PricingTier::Wholesale => "Wholesale",
            PricingTier::Contractor => "Contractor",
            PricingTier::VIP => "VIP",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Customer {
    pub id: String,
    pub tenant_id: String,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    #[sqlx(rename = "pricing_tier")]
    pricing_tier_str: String,
    pub loyalty_points: i32,
    pub store_credit: f64,
    pub credit_limit: Option<f64>,
    pub credit_balance: f64,
    pub created_at: String,
    pub updated_at: String,
    pub sync_version: i64,
    pub store_id: String,
}

impl Customer {
    pub fn pricing_tier(&self) -> PricingTier {
        PricingTier::from_str(&self.pricing_tier_str).unwrap_or(PricingTier::Retail)
    }

    pub fn set_pricing_tier(&mut self, tier: PricingTier) {
        self.pricing_tier_str = tier.as_str().to_string();
    }
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCustomerRequest {
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub pricing_tier: Option<PricingTier>,
    pub store_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCustomerRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub pricing_tier: Option<PricingTier>,
    pub loyalty_points: Option<i32>,
    pub store_credit: Option<f64>,
    pub credit_limit: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerResponse {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub pricing_tier: String,
    pub loyalty_points: i32,
    pub store_credit: f64,
    pub credit_limit: Option<f64>,
    pub credit_balance: f64,
    pub created_at: String,
    pub updated_at: String,
}

impl From<Customer> for CustomerResponse {
    fn from(customer: Customer) -> Self {
        Self {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            pricing_tier: customer.pricing_tier_str,
            loyalty_points: customer.loyalty_points,
            store_credit: customer.store_credit,
            credit_limit: customer.credit_limit,
            credit_balance: customer.credit_balance,
            created_at: customer.created_at,
            updated_at: customer.updated_at,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pricing_tier_from_str() {
        assert_eq!(PricingTier::from_str("Retail").unwrap(), PricingTier::Retail);
        assert_eq!(PricingTier::from_str("Wholesale").unwrap(), PricingTier::Wholesale);
        assert_eq!(PricingTier::from_str("Contractor").unwrap(), PricingTier::Contractor);
        assert_eq!(PricingTier::from_str("VIP").unwrap(), PricingTier::VIP);
        assert!(PricingTier::from_str("Invalid").is_err());
    }

    #[test]
    fn test_pricing_tier_as_str() {
        assert_eq!(PricingTier::Retail.as_str(), "Retail");
        assert_eq!(PricingTier::Wholesale.as_str(), "Wholesale");
        assert_eq!(PricingTier::Contractor.as_str(), "Contractor");
        assert_eq!(PricingTier::VIP.as_str(), "VIP");
    }
}
