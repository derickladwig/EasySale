//! Pricing types and trait definitions

use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use crate::errors::DomainResult;

/// Line item for pricing calculations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineItem {
    pub product_id: String,
    pub quantity: Decimal,
    pub unit_price: Decimal,
    pub line_total: Option<Decimal>, // Pre-calculated if available
}

impl LineItem {
    /// Create a new line item
    #[must_use] 
    pub const fn new(product_id: String, quantity: Decimal, unit_price: Decimal) -> Self {
        Self {
            product_id,
            quantity,
            unit_price,
            line_total: None,
        }
    }

    /// Calculate the line total (quantity × `unit_price`)
    #[must_use] 
    pub fn calculate_line_total(&self) -> Decimal {
        self.quantity * self.unit_price
    }
}

/// Trait for pricing calculation engines
pub trait PricingEngine {
    /// Calculate subtotal from line items
    fn calculate_subtotal(&self, items: &[LineItem]) -> DomainResult<Decimal>;

    /// Calculate line total for a single item
    fn calculate_line_total(&self, item: &LineItem) -> DomainResult<Decimal>;

    /// Validate that line totals sum to subtotal
    fn validate_subtotal(&self, items: &[LineItem], subtotal: Decimal) -> DomainResult<bool>;
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_line_item_creation() {
        let item = LineItem::new("PROD-001".to_string(), dec!(2.0), dec!(10.50));
        assert_eq!(item.product_id, "PROD-001");
        assert_eq!(item.quantity, dec!(2.0));
        assert_eq!(item.unit_price, dec!(10.50));
    }

    #[test]
    fn test_line_item_calculation() {
        let item = LineItem::new("PROD-001".to_string(), dec!(2.0), dec!(10.50));
        assert_eq!(item.calculate_line_total(), dec!(21.00));
    }
}
