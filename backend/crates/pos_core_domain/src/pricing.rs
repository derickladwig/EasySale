//! Pricing calculation logic

use rust_decimal::Decimal;
use pos_core_models::{LineItem, PricingEngine, DomainError, DomainResult};

/// Default implementation of pricing engine
#[derive(Debug, Clone, Default)]
pub struct DefaultPricingEngine {
    /// Tolerance for decimal comparison (e.g., 0.01 for penny rounding)
    pub tolerance: Decimal,
}

impl DefaultPricingEngine {
    /// Create a new pricing engine with default tolerance (0.01)
    #[must_use] 
    pub fn new() -> Self {
        Self {
            tolerance: Decimal::new(1, 2), // 0.01
        }
    }

    /// Create a pricing engine with custom tolerance
    #[must_use] 
    pub const fn with_tolerance(tolerance: Decimal) -> Self {
        Self { tolerance }
    }
}

impl PricingEngine for DefaultPricingEngine {
    fn calculate_subtotal(&self, items: &[LineItem]) -> DomainResult<Decimal> {
        if items.is_empty() {
            return Ok(Decimal::ZERO);
        }

        let mut subtotal = Decimal::ZERO;
        for item in items {
            let line_total = self.calculate_line_total(item)?;
            subtotal += line_total;
        }

        Ok(subtotal)
    }

    fn calculate_line_total(&self, item: &LineItem) -> DomainResult<Decimal> {
        if item.quantity < Decimal::ZERO {
            return Err(DomainError::InvalidInput(
                "Quantity cannot be negative".to_string(),
            ));
        }

        if item.unit_price < Decimal::ZERO {
            return Err(DomainError::InvalidInput(
                "Unit price cannot be negative".to_string(),
            ));
        }

        // Use pre-calculated line total if available, otherwise calculate
        Ok(item.line_total.unwrap_or_else(|| item.calculate_line_total()))
    }

    fn validate_subtotal(&self, items: &[LineItem], subtotal: Decimal) -> DomainResult<bool> {
        let calculated = self.calculate_subtotal(items)?;
        let diff = (calculated - subtotal).abs();
        Ok(diff <= self.tolerance)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_line_item_calculation() {
        let item = LineItem::new("PROD-001".to_string(), dec!(2.0), dec!(10.50));
        assert_eq!(item.calculate_line_total(), dec!(21.00));
    }

    #[test]
    fn test_calculate_subtotal() {
        let engine = DefaultPricingEngine::new();
        let items = vec![
            LineItem::new("PROD-001".to_string(), dec!(2.0), dec!(10.00)),
            LineItem::new("PROD-002".to_string(), dec!(1.0), dec!(5.50)),
        ];

        let subtotal = engine.calculate_subtotal(&items).unwrap();
        assert_eq!(subtotal, dec!(25.50));
    }

    #[test]
    fn test_calculate_subtotal_empty() {
        let engine = DefaultPricingEngine::new();
        let items = vec![];

        let subtotal = engine.calculate_subtotal(&items).unwrap();
        assert_eq!(subtotal, Decimal::ZERO);
    }

    #[test]
    fn test_negative_quantity_error() {
        let engine = DefaultPricingEngine::new();
        let item = LineItem::new("PROD-001".to_string(), dec!(-1.0), dec!(10.00));

        let result = engine.calculate_line_total(&item);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), DomainError::InvalidInput(_)));
    }

    #[test]
    fn test_negative_price_error() {
        let engine = DefaultPricingEngine::new();
        let item = LineItem::new("PROD-001".to_string(), dec!(1.0), dec!(-10.00));

        let result = engine.calculate_line_total(&item);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), DomainError::InvalidInput(_)));
    }

    #[test]
    fn test_validate_subtotal() {
        let engine = DefaultPricingEngine::new();
        let items = vec![
            LineItem::new("PROD-001".to_string(), dec!(2.0), dec!(10.00)),
            LineItem::new("PROD-002".to_string(), dec!(1.0), dec!(5.50)),
        ];

        // Exact match
        assert!(engine.validate_subtotal(&items, dec!(25.50)).unwrap());

        // Within tolerance
        assert!(engine.validate_subtotal(&items, dec!(25.51)).unwrap());

        // Outside tolerance
        assert!(!engine.validate_subtotal(&items, dec!(26.00)).unwrap());
    }
}
