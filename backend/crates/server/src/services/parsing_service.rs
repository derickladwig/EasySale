use crate::models::vendor::VendorTemplate;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

/// Service for parsing OCR text into structured bill data
pub struct ParsingService;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedBill {
    pub header: BillHeader,
    pub line_items: Vec<LineItem>,
    pub totals: BillTotals,
    pub parsing_method: String,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BillHeader {
    pub invoice_no: Option<String>,
    pub invoice_date: Option<String>,
    pub po_number: Option<String>,
    pub vendor_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineItem {
    pub line_no: i32,
    pub vendor_sku: Option<String>,
    pub description: String,
    pub quantity: Option<String>,
    pub unit: Option<String>,
    pub unit_price: Option<String>,
    pub extended_price: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BillTotals {
    pub subtotal: Option<f64>,
    pub tax: Option<f64>,
    pub total: Option<f64>,
}

#[derive(Debug)]
pub enum ParsingError {
    InvalidTemplate(String),
    ParsingFailed(String),
    ValidationFailed(String),
}

impl std::fmt::Display for ParsingError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ParsingError::InvalidTemplate(msg) => write!(f, "Invalid template: {}", msg),
            ParsingError::ParsingFailed(msg) => write!(f, "Parsing failed: {}", msg),
            ParsingError::ValidationFailed(msg) => write!(f, "Validation failed: {}", msg),
        }
    }
}

impl std::error::Error for ParsingError {}

impl ParsingService {
    /// Parse OCR text using vendor template
    /// Requirements: 3.1, 3.2, 3.3
    pub fn parse_with_template(
        ocr_text: &str,
        template: &VendorTemplate,
    ) -> Result<ParsedBill, ParsingError> {
        let config = template.get_config()
            .map_err(|e| ParsingError::InvalidTemplate(format!("Invalid config JSON: {}", e)))?;

        // Extract header fields
        let header = Self::extract_header(ocr_text, &config)?;

        // Extract line items
        let line_items = Self::extract_line_items(ocr_text, &config)?;

        // Extract totals
        let totals = Self::extract_totals(ocr_text, &config)?;

        // Calculate confidence based on extracted fields
        let confidence = Self::calculate_parsing_confidence(&header, &line_items, &totals);

        Ok(ParsedBill {
            header,
            line_items,
            totals,
            parsing_method: "template".to_string(),
            confidence,
        })
    }

    /// Parse OCR text without template (generic parsing)
    /// Requirements: 3.6, 4.6
    pub fn parse_generic(ocr_text: &str) -> Result<ParsedBill, ParsingError> {
        // Extract header using common patterns
        let header = Self::extract_header_generic(ocr_text)?;

        // Extract line items using table detection
        let line_items = Self::extract_line_items_generic(ocr_text)?;

        // Extract totals using common patterns
        let totals = Self::extract_totals_generic(ocr_text)?;

        // Lower confidence for generic parsing
        let confidence = Self::calculate_parsing_confidence(&header, &line_items, &totals) * 0.8;

        Ok(ParsedBill {
            header,
            line_items,
            totals,
            parsing_method: "generic".to_string(),
            confidence,
        })
    }

    /// Extract header fields using template rules
    fn extract_header(ocr_text: &str, config: &JsonValue) -> Result<BillHeader, ParsingError> {
        let header_rules = config.get("header_fields")
            .ok_or_else(|| ParsingError::InvalidTemplate("Missing header_fields".to_string()))?;

        let invoice_no = Self::extract_field(ocr_text, header_rules, "invoice_no");
        let invoice_date = Self::extract_field(ocr_text, header_rules, "invoice_date");
        let po_number = Self::extract_field(ocr_text, header_rules, "po_number");
        let vendor_name = Self::extract_field(ocr_text, header_rules, "vendor_name");

        Ok(BillHeader {
            invoice_no,
            invoice_date,
            po_number,
            vendor_name,
        })
    }

    /// Extract header fields using generic patterns
    fn extract_header_generic(ocr_text: &str) -> Result<BillHeader, ParsingError> {
        // Common invoice number patterns
        let invoice_patterns = vec![
            r"(?i)invoice\s*#?\s*:?\s*([A-Z0-9-]+)",
            r"(?i)inv\s*#?\s*:?\s*([A-Z0-9-]+)",
            r"(?i)bill\s*#?\s*:?\s*([A-Z0-9-]+)",
        ];

        let invoice_no = Self::extract_with_patterns(ocr_text, &invoice_patterns);

        // Common date patterns
        let date_patterns = vec![
            r"(?i)date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            r"(?i)invoice\s+date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        ];

        let invoice_date = Self::extract_with_patterns(ocr_text, &date_patterns);

        // PO number patterns
        let po_patterns = vec![
            r"(?i)p\.?o\.?\s*#?\s*:?\s*([A-Z0-9-]+)",
            r"(?i)purchase\s+order\s*:?\s*([A-Z0-9-]+)",
        ];

        let po_number = Self::extract_with_patterns(ocr_text, &po_patterns);

        Ok(BillHeader {
            invoice_no,
            invoice_date,
            po_number,
            vendor_name: None,
        })
    }

    /// Extract line items using template rules
    fn extract_line_items(ocr_text: &str, config: &JsonValue) -> Result<Vec<LineItem>, ParsingError> {
        let line_rules = config.get("line_items")
            .ok_or_else(|| ParsingError::InvalidTemplate("Missing line_items".to_string()))?;

        // Split text into lines
        let lines: Vec<&str> = ocr_text.lines().collect();
        let mut line_items = Vec::new();

        // Find table start and end markers
        let start_marker = line_rules.get("start_marker")
            .and_then(|v| v.as_str())
            .unwrap_or("SKU");
        
        let end_marker = line_rules.get("end_marker")
            .and_then(|v| v.as_str())
            .unwrap_or("TOTAL");

        let mut in_table = false;
        let mut line_no = 1;

        for line in lines {
            if line.contains(start_marker) {
                in_table = true;
                continue;
            }

            if line.contains(end_marker) {
                break;
            }

            if in_table && !line.trim().is_empty() {
                if let Some(item) = Self::parse_line_item(line, line_no, line_rules) {
                    line_items.push(item);
                    line_no += 1;
                }
            }
        }

        Ok(line_items)
    }

    /// Extract line items using generic table detection
    fn extract_line_items_generic(ocr_text: &str) -> Result<Vec<LineItem>, ParsingError> {
        let lines: Vec<&str> = ocr_text.lines().collect();
        let mut line_items = Vec::new();
        let mut line_no = 1;

        // Look for lines with numeric patterns (likely line items)
        let item_pattern = Regex::new(r"([A-Z0-9-]+)\s+(.+?)\s+(\d+\.?\d*)\s+(\$?\d+\.?\d*)").unwrap();

        for line in lines {
            if let Some(captures) = item_pattern.captures(line) {
                let item = LineItem {
                    line_no,
                    vendor_sku: Some(captures.get(1).unwrap().as_str().to_string()),
                    description: captures.get(2).unwrap().as_str().trim().to_string(),
                    quantity: Some(captures.get(3).unwrap().as_str().to_string()),
                    unit: Some("EA".to_string()),
                    unit_price: Some(captures.get(4).unwrap().as_str().replace("$", "")),
                    extended_price: None,
                };
                line_items.push(item);
                line_no += 1;
            }
        }

        Ok(line_items)
    }

    /// Parse a single line item
    fn parse_line_item(line: &str, line_no: i32, _rules: &JsonValue) -> Option<LineItem> {
        // Simple whitespace-based parsing
        let parts: Vec<&str> = line.split_whitespace().collect();
        
        if parts.len() < 3 {
            return None;
        }

        Some(LineItem {
            line_no,
            vendor_sku: Some(parts[0].to_string()),
            description: parts[1..parts.len()-2].join(" "),
            quantity: parts.get(parts.len()-2).map(|s| s.to_string()),
            unit: Some("EA".to_string()),
            unit_price: parts.last().map(|s| s.replace("$", "")),
            extended_price: None,
        })
    }

    /// Extract totals using template rules
    fn extract_totals(ocr_text: &str, config: &JsonValue) -> Result<BillTotals, ParsingError> {
        let total_rules = config.get("totals")
            .ok_or_else(|| ParsingError::InvalidTemplate("Missing totals".to_string()))?;

        let subtotal = Self::extract_amount(ocr_text, total_rules, "subtotal");
        let tax = Self::extract_amount(ocr_text, total_rules, "tax");
        let total = Self::extract_amount(ocr_text, total_rules, "total");

        Ok(BillTotals {
            subtotal,
            tax,
            total,
        })
    }

    /// Extract totals using generic patterns
    fn extract_totals_generic(ocr_text: &str) -> Result<BillTotals, ParsingError> {
        let subtotal_patterns = vec![
            r"(?i)subtotal\s*:?\s*\$?\s*(\d+\.?\d*)",
            r"(?i)sub\s+total\s*:?\s*\$?\s*(\d+\.?\d*)",
        ];

        let tax_patterns = vec![
            r"(?i)tax\s*:?\s*\$?\s*(\d+\.?\d*)",
            r"(?i)sales\s+tax\s*:?\s*\$?\s*(\d+\.?\d*)",
        ];

        let total_patterns = vec![
            r"(?i)total\s*:?\s*\$?\s*(\d+\.?\d*)",
            r"(?i)grand\s+total\s*:?\s*\$?\s*(\d+\.?\d*)",
            r"(?i)amount\s+due\s*:?\s*\$?\s*(\d+\.?\d*)",
        ];

        let subtotal = Self::extract_amount_with_patterns(ocr_text, &subtotal_patterns);
        let tax = Self::extract_amount_with_patterns(ocr_text, &tax_patterns);
        let total = Self::extract_amount_with_patterns(ocr_text, &total_patterns);

        Ok(BillTotals {
            subtotal,
            tax,
            total,
        })
    }

    /// Extract a field using template rules
    fn extract_field(text: &str, rules: &JsonValue, field_name: &str) -> Option<String> {
        let field_rule = rules.get(field_name)?;
        let pattern = field_rule.get("pattern")?.as_str()?;
        
        let re = Regex::new(pattern).ok()?;
        let captures = re.captures(text)?;
        
        captures.get(1).map(|m| m.as_str().to_string())
    }

    /// Extract amount using template rules
    fn extract_amount(text: &str, rules: &JsonValue, field_name: &str) -> Option<f64> {
        let value_str = Self::extract_field(text, rules, field_name)?;
        value_str.replace("$", "").replace(",", "").parse().ok()
    }

    /// Extract text using multiple patterns
    fn extract_with_patterns(text: &str, patterns: &[&str]) -> Option<String> {
        for pattern in patterns {
            if let Ok(re) = Regex::new(pattern) {
                if let Some(captures) = re.captures(text) {
                    if let Some(m) = captures.get(1) {
                        return Some(m.as_str().to_string());
                    }
                }
            }
        }
        None
    }

    /// Extract amount using multiple patterns
    fn extract_amount_with_patterns(text: &str, patterns: &[&str]) -> Option<f64> {
        let value_str = Self::extract_with_patterns(text, patterns)?;
        value_str.replace("$", "").replace(",", "").parse().ok()
    }

    /// Calculate parsing confidence
    fn calculate_parsing_confidence(
        header: &BillHeader,
        line_items: &[LineItem],
        totals: &BillTotals,
    ) -> f64 {
        let mut score = 0.0;
        let mut max_score = 0.0;

        // Header fields (30% weight)
        max_score += 30.0;
        if header.invoice_no.is_some() { score += 15.0; }
        if header.invoice_date.is_some() { score += 10.0; }
        if header.po_number.is_some() { score += 5.0; }

        // Line items (50% weight)
        max_score += 50.0;
        if !line_items.is_empty() {
            score += 25.0;
            let items_with_sku = line_items.iter().filter(|i| i.vendor_sku.is_some()).count();
            score += (items_with_sku as f64 / line_items.len() as f64) * 25.0;
        }

        // Totals (20% weight)
        max_score += 20.0;
        if totals.total.is_some() { score += 15.0; }
        if totals.subtotal.is_some() { score += 3.0; }
        if totals.tax.is_some() { score += 2.0; }

        score / max_score
    }

    /// Validate parsed bill totals
    /// Requirements: 3.7
    pub fn validate_totals(parsed: &ParsedBill, tolerance_percent: f64) -> Result<(), ParsingError> {
        if let Some(total) = parsed.totals.total {
            // Calculate sum of line items
            let line_sum: f64 = parsed.line_items.iter()
                .filter_map(|item| {
                    item.extended_price.as_ref()
                        .and_then(|p| p.replace("$", "").replace(",", "").parse::<f64>().ok())
                })
                .sum();

            if line_sum > 0.0 {
                let difference = (total - line_sum).abs();
                let percent_diff = (difference / total) * 100.0;

                if percent_diff > tolerance_percent {
                    return Err(ParsingError::ValidationFailed(
                        format!("Total mismatch: expected ${:.2}, got ${:.2} ({:.1}% difference)",
                            total, line_sum, percent_diff)
                    ));
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_header_generic() {
        let ocr_text = r#"
            ACME Corporation
            Invoice #12345
            Date: 01/15/2024
            P.O. #PO-9876
        "#;

        let header = ParsingService::extract_header_generic(ocr_text).unwrap();
        assert_eq!(header.invoice_no, Some("12345".to_string()));
        assert!(header.invoice_date.is_some());
        assert_eq!(header.po_number, Some("PO-9876".to_string()));
    }

    #[test]
    fn test_extract_totals_generic() {
        let ocr_text = r#"
            Subtotal: $100.00
            Tax: $8.00
            Total: $108.00
        "#;

        let totals = ParsingService::extract_totals_generic(ocr_text).unwrap();
        assert_eq!(totals.subtotal, Some(100.0));
        assert_eq!(totals.tax, Some(8.0));
        assert_eq!(totals.total, Some(108.0));
    }

    #[test]
    fn test_calculate_parsing_confidence() {
        let header = BillHeader {
            invoice_no: Some("12345".to_string()),
            invoice_date: Some("2024-01-01".to_string()),
            po_number: None,
            vendor_name: None,
        };

        let line_items = vec![
            LineItem {
                line_no: 1,
                vendor_sku: Some("SKU-001".to_string()),
                description: "Test Item".to_string(),
                quantity: Some("1".to_string()),
                unit: Some("EA".to_string()),
                unit_price: Some("10.00".to_string()),
                extended_price: Some("10.00".to_string()),
            },
        ];

        let totals = BillTotals {
            subtotal: Some(10.0),
            tax: Some(0.8),
            total: Some(10.8),
        };

        let confidence = ParsingService::calculate_parsing_confidence(&header, &line_items, &totals);
        assert!(confidence > 0.7); // Should have high confidence
    }

    #[test]
    fn test_validate_totals() {
        let parsed = ParsedBill {
            header: BillHeader {
                invoice_no: Some("12345".to_string()),
                invoice_date: None,
                po_number: None,
                vendor_name: None,
            },
            line_items: vec![
                LineItem {
                    line_no: 1,
                    vendor_sku: Some("SKU-001".to_string()),
                    description: "Test Item".to_string(),
                    quantity: Some("1".to_string()),
                    unit: Some("EA".to_string()),
                    unit_price: Some("10.00".to_string()),
                    extended_price: Some("10.00".to_string()),
                },
            ],
            totals: BillTotals {
                subtotal: None,
                tax: None,
                total: Some(10.0),
            },
            parsing_method: "test".to_string(),
            confidence: 0.9,
        };

        // Should pass with exact match
        let result = ParsingService::validate_totals(&parsed, 5.0);
        assert!(result.is_ok());
    }
}
