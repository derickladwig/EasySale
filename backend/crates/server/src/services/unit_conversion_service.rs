use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::collections::HashMap;

/// Service for unit conversion
pub struct UnitConversionService {
    conversions: HashMap<String, ConversionRule>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversionRule {
    pub from_unit: String,
    pub to_unit: String,
    pub multiplier: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NormalizedQuantity {
    pub quantity: f64,
    pub unit: String,
    pub original_quantity: String,
    pub original_unit: String,
    pub conversion_applied: bool,
}

#[derive(Debug)]
pub enum ConversionError {
    InvalidQuantity(String),
    InvalidUnit(String),
    ConversionNotFound(String),
    ValidationFailed(String),
}

impl std::fmt::Display for ConversionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ConversionError::InvalidQuantity(msg) => write!(f, "Invalid quantity: {}", msg),
            ConversionError::InvalidUnit(msg) => write!(f, "Invalid unit: {}", msg),
            ConversionError::ConversionNotFound(msg) => write!(f, "Conversion not found: {}", msg),
            ConversionError::ValidationFailed(msg) => write!(f, "Validation failed: {}", msg),
        }
    }
}

impl std::error::Error for ConversionError {}

impl UnitConversionService {
    /// Create new service with default conversions
    /// Requirements: 8.1, 8.2
    pub fn new() -> Self {
        let mut conversions = HashMap::new();

        // Common volume conversions
        conversions.insert("GAL->L".to_string(), ConversionRule {
            from_unit: "GAL".to_string(),
            to_unit: "L".to_string(),
            multiplier: 3.78541,
        });
        conversions.insert("L->GAL".to_string(), ConversionRule {
            from_unit: "L".to_string(),
            to_unit: "GAL".to_string(),
            multiplier: 0.264_172,
        });
        conversions.insert("QT->L".to_string(), ConversionRule {
            from_unit: "QT".to_string(),
            to_unit: "L".to_string(),
            multiplier: 0.946_353,
        });

        // Common quantity conversions
        conversions.insert("CASE->EA".to_string(), ConversionRule {
            from_unit: "CASE".to_string(),
            to_unit: "EA".to_string(),
            multiplier: 12.0, // Default case size
        });
        conversions.insert("BOX->EA".to_string(), ConversionRule {
            from_unit: "BOX".to_string(),
            to_unit: "EA".to_string(),
            multiplier: 12.0,
        });
        conversions.insert("DOZEN->EA".to_string(), ConversionRule {
            from_unit: "DOZEN".to_string(),
            to_unit: "EA".to_string(),
            multiplier: 12.0,
        });

        // Weight conversions
        conversions.insert("LB->KG".to_string(), ConversionRule {
            from_unit: "LB".to_string(),
            to_unit: "KG".to_string(),
            multiplier: 0.453_592,
        });
        conversions.insert("KG->LB".to_string(), ConversionRule {
            from_unit: "KG".to_string(),
            to_unit: "LB".to_string(),
            multiplier: 2.20462,
        });
        conversions.insert("OZ->G".to_string(), ConversionRule {
            from_unit: "OZ".to_string(),
            to_unit: "G".to_string(),
            multiplier: 28.3495,
        });

        Self { conversions }
    }

    /// Load conversions from configuration
    /// 
    /// Note: Currently unused - reserved for loading custom conversions from tenant config.
    #[allow(dead_code)]
    pub fn from_config(config: &JsonValue) -> Self {
        let mut service = Self::new();

        if let Some(custom_conversions) = config.get("unit_conversions").and_then(|v| v.as_array()) {
            for conv in custom_conversions {
                if let Ok(rule) = serde_json::from_value::<ConversionRule>(conv.clone()) {
                    let key = format!("{}->{}",  rule.from_unit, rule.to_unit);
                    service.conversions.insert(key, rule);
                }
            }
        }

        service
    }

    /// Add vendor-specific conversion
    /// Requirements: 8.2, 8.3
    /// 
    /// Note: Currently unused - reserved for adding custom conversions dynamically.
    #[allow(dead_code)]
    pub fn add_conversion(&mut self, from_unit: &str, to_unit: &str, multiplier: f64) {
        let key = format!("{}->{}",  from_unit.to_uppercase(), to_unit.to_uppercase());
        self.conversions.insert(key, ConversionRule {
            from_unit: from_unit.to_uppercase(),
            to_unit: to_unit.to_uppercase(),
            multiplier,
        });
    }

    /// Normalize quantity with unit conversion
    /// Requirements: 8.3, 8.7
    pub fn normalize_quantity(
        &self,
        quantity_str: &str,
        unit_str: &str,
        target_unit: Option<&str>,
    ) -> Result<NormalizedQuantity, ConversionError> {
        // Parse quantity
        let quantity = self.parse_quantity(quantity_str)?;
        let unit = unit_str.trim().to_uppercase();

        // If no target unit specified, return as-is
        let target = if let Some(t) = target_unit {
            t.to_uppercase()
        } else {
            return Ok(NormalizedQuantity {
                quantity,
                unit: unit.clone(),
                original_quantity: quantity_str.to_string(),
                original_unit: unit_str.to_string(),
                conversion_applied: false,
            });
        };

        // If units match, no conversion needed
        if unit == target {
            return Ok(NormalizedQuantity {
                quantity,
                unit: unit.clone(),
                original_quantity: quantity_str.to_string(),
                original_unit: unit_str.to_string(),
                conversion_applied: false,
            });
        }

        // Find conversion rule
        let key = format!("{}->{}", unit, target);
        if let Some(rule) = self.conversions.get(&key) {
            let converted_qty = quantity * rule.multiplier;
            
            // Validate result
            self.validate_quantity(converted_qty)?;

            return Ok(NormalizedQuantity {
                quantity: converted_qty,
                unit: target,
                original_quantity: quantity_str.to_string(),
                original_unit: unit_str.to_string(),
                conversion_applied: true,
            });
        }

        Err(ConversionError::ConversionNotFound(format!(
            "No conversion found from {} to {}",
            unit, target
        )))
    }

    /// Apply vendor-specific conversion from alias
    pub fn apply_alias_conversion(
        &self,
        quantity: f64,
        unit_conversion: &JsonValue,
    ) -> Result<NormalizedQuantity, ConversionError> {
        let multiplier = unit_conversion.get("multiplier")
            .and_then(|v| v.as_f64())
            .unwrap_or(1.0);
        
        let from_unit = unit_conversion.get("from_unit")
            .and_then(|v| v.as_str())
            .unwrap_or("EA");
        
        let to_unit = unit_conversion.get("to_unit")
            .and_then(|v| v.as_str())
            .unwrap_or("EA");

        let converted_qty = quantity * multiplier;
        self.validate_quantity(converted_qty)?;

        Ok(NormalizedQuantity {
            quantity: converted_qty,
            unit: to_unit.to_string(),
            original_quantity: quantity.to_string(),
            original_unit: from_unit.to_string(),
            conversion_applied: multiplier != 1.0,
        })
    }

    /// Parse quantity string
    fn parse_quantity(&self, quantity_str: &str) -> Result<f64, ConversionError> {
        let cleaned = quantity_str
            .trim()
            .replace(",", "")
            .replace(" ", "");

        cleaned.parse::<f64>()
            .map_err(|_| ConversionError::InvalidQuantity(format!("Cannot parse: {}", quantity_str)))
    }

    /// Validate quantity is reasonable
    /// Requirements: 8.7
    fn validate_quantity(&self, quantity: f64) -> Result<(), ConversionError> {
        if quantity < 0.0 {
            return Err(ConversionError::ValidationFailed("Quantity cannot be negative".to_string()));
        }

        if quantity > 1_000_000.0 {
            return Err(ConversionError::ValidationFailed("Quantity exceeds maximum (1,000,000)".to_string()));
        }

        if quantity.is_nan() || quantity.is_infinite() {
            return Err(ConversionError::ValidationFailed("Invalid quantity value".to_string()));
        }

        Ok(())
    }

    /// Get available conversions for a unit
    pub fn get_conversions_for_unit(&self, unit: &str) -> Vec<&ConversionRule> {
        let unit_upper = unit.to_uppercase();
        self.conversions.values()
            .filter(|rule| rule.from_unit == unit_upper)
            .collect()
    }
}

impl Default for UnitConversionService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_normalize_quantity_no_conversion() {
        let service = UnitConversionService::new();
        
        let result = service.normalize_quantity("10", "EA", Some("EA")).unwrap();
        assert_eq!(result.quantity, 10.0);
        assert_eq!(result.unit, "EA");
        assert!(!result.conversion_applied);
    }

    #[test]
    fn test_normalize_quantity_with_conversion() {
        let service = UnitConversionService::new();
        
        let result = service.normalize_quantity("1", "CASE", Some("EA")).unwrap();
        assert_eq!(result.quantity, 12.0);
        assert_eq!(result.unit, "EA");
        assert!(result.conversion_applied);
    }

    #[test]
    fn test_normalize_quantity_volume() {
        let service = UnitConversionService::new();
        
        let result = service.normalize_quantity("1", "GAL", Some("L")).unwrap();
        assert!((result.quantity - 3.78541).abs() < 0.001);
        assert_eq!(result.unit, "L");
        assert!(result.conversion_applied);
    }

    #[test]
    fn test_add_custom_conversion() {
        let mut service = UnitConversionService::new();
        service.add_conversion("PALLET", "EA", 48.0);
        
        let result = service.normalize_quantity("2", "PALLET", Some("EA")).unwrap();
        assert_eq!(result.quantity, 96.0);
        assert_eq!(result.unit, "EA");
    }

    #[test]
    fn test_apply_alias_conversion() {
        let service = UnitConversionService::new();
        
        let unit_conversion = json!({
            "multiplier": 6.0,
            "from_unit": "PACK",
            "to_unit": "EA"
        });
        
        let result = service.apply_alias_conversion(5.0, &unit_conversion).unwrap();
        assert_eq!(result.quantity, 30.0);
        assert_eq!(result.unit, "EA");
        assert!(result.conversion_applied);
    }

    #[test]
    fn test_validate_quantity_negative() {
        let service = UnitConversionService::new();
        let result = service.validate_quantity(-10.0);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_quantity_too_large() {
        let service = UnitConversionService::new();
        let result = service.validate_quantity(2_000_000.0);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_quantity_with_commas() {
        let service = UnitConversionService::new();
        let result = service.parse_quantity("1,234.56").unwrap();
        assert_eq!(result, 1234.56);
    }

    #[test]
    fn test_get_conversions_for_unit() {
        let service = UnitConversionService::new();
        let conversions = service.get_conversions_for_unit("GAL");
        assert!(!conversions.is_empty());
        assert!(conversions.iter().any(|c| c.to_unit == "L"));
    }

    #[test]
    fn test_from_config() {
        let config = json!({
            "unit_conversions": [
                {
                    "from_unit": "CUSTOM",
                    "to_unit": "EA",
                    "multiplier": 24.0
                }
            ]
        });
        
        let service = UnitConversionService::from_config(&config);
        let result = service.normalize_quantity("1", "CUSTOM", Some("EA")).unwrap();
        assert_eq!(result.quantity, 24.0);
    }
}
