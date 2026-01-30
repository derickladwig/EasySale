use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::FromRow;

/// Vendor model for managing supplier information
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Vendor {
    pub id: String,
    pub name: String,
    pub tax_id: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub website: Option<String>,
    
    /// JSON object for vendor detection
    /// Example: {"keywords": ["ACME", "ACME SUPPLY"], "tax_ids": ["123456789"], "patterns": ["ACME.*INC"]}
    pub identifiers: String, // JSON string from database
    
    pub tenant_id: String,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl Vendor {
    /// Parse identifiers JSON string into JsonValue
    pub fn get_identifiers(&self) -> Result<JsonValue, serde_json::Error> {
        serde_json::from_str(&self.identifiers)
    }
    
    /// Set identifiers from JsonValue
    pub fn set_identifiers(&mut self, ids: JsonValue) -> Result<(), serde_json::Error> {
        self.identifiers = serde_json::to_string(&ids)?;
        Ok(())
    }
}

/// Request to create a new vendor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVendorRequest {
    pub name: String,
    pub tax_id: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub website: Option<String>,
    pub identifiers: Option<JsonValue>,
}

/// Request to update an existing vendor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateVendorRequest {
    pub name: Option<String>,
    pub tax_id: Option<String>,
    pub email: Option<String>,

    pub phone: Option<String>,
    pub address: Option<String>,
    pub website: Option<String>,
    pub identifiers: Option<JsonValue>,
    pub is_active: Option<bool>,
}

/// Vendor response with parsed JSON fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VendorResponse {
    pub id: String,
    pub name: String,
    pub tax_id: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub website: Option<String>,
    pub identifiers: JsonValue,
    pub tenant_id: String,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl From<Vendor> for VendorResponse {
    fn from(vendor: Vendor) -> Self {
        let identifiers = vendor.get_identifiers().unwrap_or(JsonValue::Object(serde_json::Map::new()));
        
        Self {
            id: vendor.id,
            name: vendor.name,
            tax_id: vendor.tax_id,
            email: vendor.email,
            phone: vendor.phone,
            address: vendor.address,
            website: vendor.website,
            identifiers,
            tenant_id: vendor.tenant_id,
            is_active: vendor.is_active,
            created_at: vendor.created_at,
            updated_at: vendor.updated_at,
        }
    }
}

/// Vendor Bill model for storing scanned/uploaded vendor invoices
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VendorBill {
    pub id: String,
    pub vendor_id: String,
    pub invoice_no: String,
    pub invoice_date: String,
    pub po_number: Option<String>,
    pub subtotal: f64,
    pub tax: f64,
    pub total: f64,
    pub currency: String,
    
    /// Status: DRAFT, REVIEW, POSTED, VOID
    pub status: String,
    
    /// File storage
    pub file_path: String,
    pub file_hash: String, // SHA256
    pub file_size: i64,
    pub mime_type: String,
    
    /// Idempotency key: hash of vendor_id + invoice_no + invoice_date
    pub idempotency_key: String,
    
    /// Posting info
    pub posted_at: Option<String>,
    pub posted_by: Option<String>,
    
    /// Multi-tenant
    pub tenant_id: String,
    pub store_id: String,
    
    pub created_at: String,
    pub updated_at: String,
}

impl VendorBill {
    /// Generate idempotency key from vendor_id, invoice_no, and invoice_date
    pub fn generate_idempotency_key(vendor_id: &str, invoice_no: &str, invoice_date: &str) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(vendor_id.as_bytes());
        hasher.update(invoice_no.as_bytes());
        hasher.update(invoice_date.as_bytes());
        format!("{:x}", hasher.finalize())
    }
    
    /// Check if bill is in a state that allows posting
    pub fn can_post(&self) -> bool {
        self.status == "REVIEW"
    }
    
    /// Check if bill has been posted
    pub fn is_posted(&self) -> bool {
        self.status == "POSTED"
    }
}

/// Bill status enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "UPPERCASE")]
pub enum BillStatus {
    Draft,
    Review,
    Posted,
    Void,
}

impl BillStatus {
    pub fn as_str(&self) -> &str {
        match self {
            BillStatus::Draft => "DRAFT",
            BillStatus::Review => "REVIEW",
            BillStatus::Posted => "POSTED",
            BillStatus::Void => "VOID",
        }
    }
    
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s.to_uppercase().as_str() {
            "DRAFT" => Ok(BillStatus::Draft),
            "REVIEW" => Ok(BillStatus::Review),
            "POSTED" => Ok(BillStatus::Posted),
            "VOID" => Ok(BillStatus::Void),
            _ => Err(format!("Invalid bill status: {}", s)),
        }
    }
}

/// Request to create a new vendor bill
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVendorBillRequest {
    pub vendor_id: String,
    pub file_path: String,
    pub file_hash: String,
    pub file_size: i64,
    pub mime_type: String,
    pub store_id: String,
}

/// Vendor Bill Parse model (OCR cache)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VendorBillParse {
    pub id: String,
    pub vendor_bill_id: String,
    
    /// Raw OCR output
    pub ocr_text: String,
    pub ocr_confidence: f64,
    
    /// Structured parse result (JSON)
    pub parsed_json: String,
    
    /// Versioning for cache invalidation
    pub template_id: Option<String>,
    pub template_version: i32,
    pub ocr_engine: String,
    pub config_hash: String,
    
    pub created_at: String,
}

impl VendorBillParse {
    /// Parse parsed_json string into JsonValue
    pub fn get_parsed_json(&self) -> Result<JsonValue, serde_json::Error> {
        serde_json::from_str(&self.parsed_json)
    }
    
    /// Set parsed_json from JsonValue
    pub fn set_parsed_json(&mut self, json: JsonValue) -> Result<(), serde_json::Error> {
        self.parsed_json = serde_json::to_string(&json)?;
        Ok(())
    }
    
    /// Generate cache key for lookup
    pub fn generate_cache_key(vendor_bill_id: &str, template_version: i32, config_hash: &str) -> String {
        format!("{}:{}:{}", vendor_bill_id, template_version, config_hash)
    }
}

/// Vendor Bill Line model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VendorBillLine {
    pub id: String,
    pub vendor_bill_id: String,
    pub line_no: i32,
    
    /// Raw vendor data
    pub vendor_sku_raw: String,
    pub vendor_sku_norm: String,
    pub desc_raw: String,
    pub qty_raw: String,
    pub unit_raw: String,
    pub unit_price_raw: String,
    pub ext_price_raw: String,
    
    /// Normalized/parsed values
    pub normalized_qty: f64,
    pub normalized_unit: String,
    pub unit_price: f64,
    pub ext_price: f64,
    
    /// Matching result
    pub matched_sku: Option<String>,
    pub match_confidence: f64,
    pub match_reason: String,
    
    /// User override flag
    pub user_overridden: bool,
    
    pub created_at: String,
    pub updated_at: String,
}

impl VendorBillLine {
    /// Normalize vendor SKU for matching
    pub fn normalize_sku(sku: &str) -> String {
        sku.trim()
            .to_uppercase()
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '-')
            .collect()
    }
    
    /// Check if line has a match
    pub fn has_match(&self) -> bool {
        self.matched_sku.is_some()
    }
    
    /// Check if match confidence is above threshold
    pub fn is_high_confidence(&self, threshold: f64) -> bool {
        self.match_confidence >= threshold
    }
}

/// Vendor SKU Alias model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VendorSkuAlias {
    pub id: String,
    pub vendor_id: String,
    pub vendor_sku_norm: String,
    pub internal_sku: String,
    
    /// Unit conversion: {"multiplier": 12, "from_unit": "CASE", "to_unit": "EA"}
    pub unit_conversion: Option<String>,
    
    pub priority: i32,
    pub last_seen_at: String,
    pub usage_count: i32,
    pub created_by: String,
    pub tenant_id: String,
    pub created_at: String,
    pub updated_at: String,
}

impl VendorSkuAlias {
    /// Parse unit_conversion JSON string into JsonValue
    pub fn get_unit_conversion(&self) -> Result<Option<JsonValue>, serde_json::Error> {
        match &self.unit_conversion {
            Some(json_str) => Ok(Some(serde_json::from_str(json_str)?)),
            None => Ok(None),
        }
    }
    
    /// Set unit_conversion from JsonValue
    pub fn set_unit_conversion(&mut self, conversion: Option<JsonValue>) -> Result<(), serde_json::Error> {
        self.unit_conversion = match conversion {
            Some(json) => Some(serde_json::to_string(&json)?),
            None => None,
        };
        Ok(())
    }
    
    /// Increment usage count
    pub fn increment_usage(&mut self) {
        self.usage_count += 1;
        self.last_seen_at = chrono::Utc::now().to_rfc3339();
    }
}

/// Request to create a vendor SKU alias
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVendorSkuAliasRequest {
    pub vendor_id: String,
    pub vendor_sku: String,
    pub internal_sku: String,
    pub unit_conversion: Option<JsonValue>,
    pub priority: Option<i32>,
}

/// Vendor Template model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VendorTemplate {
    pub id: String,
    pub vendor_id: String,
    pub name: String,
    pub version: i32,
    pub active: bool,
    
    /// Template configuration (JSON)
    pub config_json: String,
    
    pub tenant_id: String,
    pub created_at: String,
    pub updated_at: String,
}

impl VendorTemplate {
    /// Parse config_json string into JsonValue
    pub fn get_config(&self) -> Result<JsonValue, serde_json::Error> {
        serde_json::from_str(&self.config_json)
    }
    
    /// Set config_json from JsonValue
    pub fn set_config(&mut self, config: JsonValue) -> Result<(), serde_json::Error> {
        self.config_json = serde_json::to_string(&config)?;
        Ok(())
    }
    
    /// Generate config hash for cache invalidation
    pub fn generate_config_hash(&self) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(self.config_json.as_bytes());
        format!("{:x}", hasher.finalize())
    }
}

/// Request to create a vendor template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVendorTemplateRequest {
    pub vendor_id: String,
    pub name: String,
    pub config: JsonValue,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_vendor_identifiers() {
        let mut vendor = Vendor {
            id: "test-1".to_string(),
            name: "Test Vendor".to_string(),
            tax_id: None,
            email: None,
            phone: None,
            address: None,
            website: None,
            identifiers: "{}".to_string(),
            tenant_id: "test-tenant".to_string(),
            is_active: true,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };

        let ids = json!({"keywords": ["TEST", "TEST VENDOR"]});
        vendor.set_identifiers(ids.clone()).unwrap();
        
        let retrieved = vendor.get_identifiers().unwrap();
        assert_eq!(retrieved, ids);
    }

    #[test]
    fn test_idempotency_key_generation() {
        let key1 = VendorBill::generate_idempotency_key("vendor-1", "INV-001", "2024-01-01");
        let key2 = VendorBill::generate_idempotency_key("vendor-1", "INV-001", "2024-01-01");
        let key3 = VendorBill::generate_idempotency_key("vendor-1", "INV-002", "2024-01-01");
        
        assert_eq!(key1, key2);
        assert_ne!(key1, key3);
    }

    #[test]
    fn test_sku_normalization() {
        assert_eq!(VendorBillLine::normalize_sku("  ABC-123  "), "ABC-123");
        assert_eq!(VendorBillLine::normalize_sku("abc-123"), "ABC-123");
        assert_eq!(VendorBillLine::normalize_sku("ABC 123"), "ABC123");
        assert_eq!(VendorBillLine::normalize_sku("ABC#123"), "ABC123");
    }

    #[test]
    fn test_bill_status() {
        assert_eq!(BillStatus::Draft.as_str(), "DRAFT");
        assert_eq!(BillStatus::from_str("DRAFT").unwrap(), BillStatus::Draft);
        assert_eq!(BillStatus::from_str("draft").unwrap(), BillStatus::Draft);
        assert!(BillStatus::from_str("INVALID").is_err());
    }
}
