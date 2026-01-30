use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::FromRow;

/// Product model with dynamic attributes support
/// Supports configuration-driven product catalogs for any business type
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Product {
    pub id: String,
    pub sku: String,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub subcategory: Option<String>,
    pub unit_price: f64,
    pub cost: f64,
    pub quantity_on_hand: f64,
    pub reorder_point: Option<f64>,
    
    /// Dynamic attributes stored as JSON, validated against category configuration
    /// Example: {"color": "red", "size": "L"}
    /// Automotive module example: {"vehicleFitment": {"make": "Honda", "model": "Civic"}}
    #[sqlx(default)]
    pub attributes: String, // JSON string from database
    
    /// Parent product ID for variants (NULL for standalone products)
    pub parent_id: Option<String>,
    
    /// Barcode value (UPC, EAN, Code 128, QR, etc.)
    pub barcode: Option<String>,
    
    /// Barcode format identifier
    pub barcode_type: Option<String>,
    
    /// Array of image URLs stored as JSON
    /// Example: ["https://cdn.example.com/product1.jpg", "https://cdn.example.com/product2.jpg"]
    #[sqlx(default)]
    pub images: String, // JSON string from database
    
    /// Multi-tenant isolation
    pub tenant_id: String,
    pub store_id: String,
    
    /// Status and sync
    pub is_active: bool,
    pub sync_version: i64,
    pub created_at: String,
    pub updated_at: String,
}

impl Product {
    /// Parse attributes JSON string into JsonValue
    pub fn get_attributes(&self) -> Result<JsonValue, serde_json::Error> {
        serde_json::from_str(&self.attributes)
    }
    
    /// Set attributes from JsonValue
    pub fn set_attributes(&mut self, attrs: JsonValue) -> Result<(), serde_json::Error> {
        self.attributes = serde_json::to_string(&attrs)?;
        Ok(())
    }
    
    /// Parse images JSON string into Vec<String>
    pub fn get_images(&self) -> Result<Vec<String>, serde_json::Error> {
        serde_json::from_str(&self.images)
    }
    
    /// Set images from Vec<String>
    pub fn set_images(&mut self, imgs: Vec<String>) -> Result<(), serde_json::Error> {
        self.images = serde_json::to_string(&imgs)?;
        Ok(())
    }
    
    /// Check if this product is a variant (has a parent)
    pub fn is_variant(&self) -> bool {
        self.parent_id.is_some()
    }
    
    /// Calculate profit margin percentage
    pub fn profit_margin(&self) -> f64 {
        if self.unit_price == 0.0 {
            return 0.0;
        }
        ((self.unit_price - self.cost) / self.unit_price) * 100.0
    }
    
    /// Calculate profit amount
    pub fn profit_amount(&self) -> f64 {
        self.unit_price - self.cost
    }
}

/// Request to create a new product
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductRequest {
    pub sku: String,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub subcategory: Option<String>,
    pub unit_price: f64,
    pub cost: f64,
    pub quantity_on_hand: Option<f64>,
    pub reorder_point: Option<f64>,
    pub attributes: Option<JsonValue>,
    pub parent_id: Option<String>,
    pub barcode: Option<String>,
    pub barcode_type: Option<String>,
    pub images: Option<Vec<String>>,
    pub store_id: String,
}

/// Request to update an existing product
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProductRequest {
    pub sku: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub unit_price: Option<f64>,
    pub cost: Option<f64>,
    pub quantity_on_hand: Option<f64>,
    pub reorder_point: Option<f64>,
    pub attributes: Option<JsonValue>,
    pub barcode: Option<String>,
    pub barcode_type: Option<String>,
    pub images: Option<Vec<String>>,
    pub is_active: Option<bool>,
}

/// Product response with parsed JSON fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductResponse {
    pub id: String,
    pub sku: String,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub subcategory: Option<String>,
    pub unit_price: f64,
    pub cost: f64,
    pub quantity_on_hand: f64,
    pub reorder_point: Option<f64>,
    pub attributes: JsonValue,
    pub parent_id: Option<String>,
    pub barcode: Option<String>,
    pub barcode_type: Option<String>,
    pub images: Vec<String>,
    pub tenant_id: String,
    pub store_id: String,
    pub is_active: bool,
    pub sync_version: i64,
    pub created_at: String,
    pub updated_at: String,
    pub profit_margin: f64,
    pub profit_amount: f64,
}

impl From<Product> for ProductResponse {
    fn from(product: Product) -> Self {
        let attributes = product.get_attributes().unwrap_or(JsonValue::Object(serde_json::Map::new()));
        let images = product.get_images().unwrap_or_default();
        let profit_margin = product.profit_margin();
        let profit_amount = product.profit_amount();
        
        Self {
            id: product.id,
            sku: product.sku,
            name: product.name,
            description: product.description,
            category: product.category,
            subcategory: product.subcategory,
            unit_price: product.unit_price,
            cost: product.cost,
            quantity_on_hand: product.quantity_on_hand,
            reorder_point: product.reorder_point,
            attributes,
            parent_id: product.parent_id,
            barcode: product.barcode,
            barcode_type: product.barcode_type,
            images,
            tenant_id: product.tenant_id,
            store_id: product.store_id,
            is_active: product.is_active,
            sync_version: product.sync_version,
            created_at: product.created_at,
            updated_at: product.updated_at,
            profit_margin,
            profit_amount,
        }
    }
}

/// Product search request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductSearchRequest {
    pub query: Option<String>,
    pub category: Option<String>,
    pub filters: Option<JsonValue>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

/// Product search response with pagination
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductSearchResponse {
    pub products: Vec<ProductResponse>,
    pub total: u32,
    pub page: u32,
    pub page_size: u32,
    pub has_more: bool,
}

/// Bulk operation types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BulkOperation {
    Update,
    Delete,
    Import,
    Export,
}

/// Bulk operation request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BulkOperationRequest {
    pub operation: BulkOperation,
    pub product_ids: Option<Vec<String>>,
    pub updates: Option<JsonValue>,
    pub import_data: Option<Vec<JsonValue>>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_product_attributes() {
        let mut product = Product {
            id: "test-1".to_string(),
            sku: "TEST-001".to_string(),
            name: "Test Product".to_string(),
            description: None,
            category: "Test".to_string(),
            subcategory: None,
            unit_price: 100.0,
            cost: 60.0,
            quantity_on_hand: 10.0,
            reorder_point: Some(5.0),
            attributes: "{}".to_string(),
            parent_id: None,
            barcode: None,
            barcode_type: None,
            images: "[]".to_string(),
            tenant_id: "test-tenant".to_string(),
            store_id: "test-store".to_string(),
            is_active: true,
            sync_version: 1,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };

        // Test setting attributes
        let attrs = json!({"color": "red", "size": "L"});
        product.set_attributes(attrs.clone()).unwrap();
        
        // Test getting attributes
        let retrieved = product.get_attributes().unwrap();
        assert_eq!(retrieved, attrs);
    }

    #[test]
    fn test_product_images() {
        let mut product = Product {
            id: "test-1".to_string(),
            sku: "TEST-001".to_string(),
            name: "Test Product".to_string(),
            description: None,
            category: "Test".to_string(),
            subcategory: None,
            unit_price: 100.0,
            cost: 60.0,
            quantity_on_hand: 10.0,
            reorder_point: Some(5.0),
            attributes: "{}".to_string(),
            parent_id: None,
            barcode: None,
            barcode_type: None,
            images: "[]".to_string(),
            tenant_id: "test-tenant".to_string(),
            store_id: "test-store".to_string(),
            is_active: true,
            sync_version: 1,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };

        // Test setting images
        let imgs = vec!["image1.jpg".to_string(), "image2.jpg".to_string()];
        product.set_images(imgs.clone()).unwrap();
        
        // Test getting images
        let retrieved = product.get_images().unwrap();
        assert_eq!(retrieved, imgs);
    }

    #[test]
    fn test_is_variant() {
        let standalone = Product {
            id: "test-1".to_string(),
            sku: "TEST-001".to_string(),
            name: "Test Product".to_string(),
            description: None,
            category: "Test".to_string(),
            subcategory: None,
            unit_price: 100.0,
            cost: 60.0,
            quantity_on_hand: 10.0,
            reorder_point: Some(5.0),
            attributes: "{}".to_string(),
            parent_id: None,
            barcode: None,
            barcode_type: None,
            images: "[]".to_string(),
            tenant_id: "test-tenant".to_string(),
            store_id: "test-store".to_string(),
            is_active: true,
            sync_version: 1,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };

        assert!(!standalone.is_variant());

        let variant = Product {
            parent_id: Some("parent-1".to_string()),
            ..standalone
        };

        assert!(variant.is_variant());
    }

    #[test]
    fn test_profit_calculations() {
        let product = Product {
            id: "test-1".to_string(),
            sku: "TEST-001".to_string(),
            name: "Test Product".to_string(),
            description: None,
            category: "Test".to_string(),
            subcategory: None,
            unit_price: 100.0,
            cost: 60.0,
            quantity_on_hand: 10.0,
            reorder_point: Some(5.0),
            attributes: "{}".to_string(),
            parent_id: None,
            barcode: None,
            barcode_type: None,
            images: "[]".to_string(),
            tenant_id: "test-tenant".to_string(),
            store_id: "test-store".to_string(),
            is_active: true,
            sync_version: 1,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };

        assert_eq!(product.profit_amount(), 40.0);
        assert_eq!(product.profit_margin(), 40.0); // 40% margin
    }

    #[test]
    fn test_product_response_conversion() {
        let product = Product {
            id: "test-1".to_string(),
            sku: "TEST-001".to_string(),
            name: "Test Product".to_string(),
            description: Some("Test description".to_string()),
            category: "Test".to_string(),
            subcategory: Some("SubTest".to_string()),
            unit_price: 100.0,
            cost: 60.0,
            quantity_on_hand: 10.0,
            reorder_point: Some(5.0),
            attributes: r#"{"color":"red"}"#.to_string(),
            parent_id: None,
            barcode: Some("123456789".to_string()),
            barcode_type: Some("UPC-A".to_string()),
            images: r#"["image1.jpg"]"#.to_string(),
            tenant_id: "test-tenant".to_string(),
            store_id: "test-store".to_string(),
            is_active: true,
            sync_version: 1,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };

        let response: ProductResponse = product.into();
        
        assert_eq!(response.id, "test-1");
        assert_eq!(response.sku, "TEST-001");
        assert_eq!(response.profit_margin, 40.0);
        assert_eq!(response.profit_amount, 40.0);
        assert_eq!(response.images.len(), 1);
        assert_eq!(response.attributes["color"], "red");
    }
}

/// Product variant model for parent-child relationships
/// Represents a specific variation of a product (e.g., different size/color)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ProductVariant {
    pub id: String,
    pub parent_id: String,
    pub variant_id: String,
    
    /// JSON object containing only attributes that differ from parent
    /// Example: {"size": "L", "color": "Red"} while parent has other common attributes
    #[sqlx(default)]
    pub variant_attributes: String, // JSON string from database
    
    pub display_order: i32,
    pub tenant_id: String,
    pub created_at: String,
    pub updated_at: String,
}

impl ProductVariant {
    /// Parse variant_attributes JSON string into JsonValue
    pub fn get_variant_attributes(&self) -> Result<JsonValue, serde_json::Error> {
        serde_json::from_str(&self.variant_attributes)
    }
    
    /// Set variant_attributes from JsonValue
    pub fn set_variant_attributes(&mut self, attrs: JsonValue) -> Result<(), serde_json::Error> {
        self.variant_attributes = serde_json::to_string(&attrs)?;
        Ok(())
    }
}

/// Request to create a product variant
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductVariantRequest {
    pub parent_id: String,
    pub variant_product: CreateProductRequest,
    pub variant_attributes: Option<JsonValue>,
    pub display_order: Option<i32>,
}

/// Product variant response with full product details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductVariantResponse {
    pub id: String,
    pub parent_id: String,
    pub variant_id: String,
    pub variant_attributes: JsonValue,
    pub display_order: i32,
    pub variant_product: ProductResponse,
    pub created_at: String,
    pub updated_at: String,
}

/// Product relationship types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum RelationshipType {
    Related,
    Accessory,
    Alternative,
    Bundle,
}

impl RelationshipType {
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s.to_lowercase().as_str() {
            "related" => Ok(RelationshipType::Related),
            "accessory" => Ok(RelationshipType::Accessory),
            "alternative" => Ok(RelationshipType::Alternative),
            "bundle" => Ok(RelationshipType::Bundle),
            _ => Err(format!("Invalid relationship type: {}", s)),
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            RelationshipType::Related => "related",
            RelationshipType::Accessory => "accessory",
            RelationshipType::Alternative => "alternative",
            RelationshipType::Bundle => "bundle",
        }
    }
}

/// Product relationship model for related products, accessories, alternatives, bundles
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ProductRelationship {
    pub id: String,
    pub product_id: String,
    pub related_product_id: String,
    
    #[sqlx(rename = "relationship_type")]
    relationship_type_str: String,
    
    pub display_order: i32,
    pub tenant_id: String,
    pub created_at: String,
    pub updated_at: String,
}

impl ProductRelationship {
    pub fn relationship_type(&self) -> RelationshipType {
        RelationshipType::from_str(&self.relationship_type_str)
            .unwrap_or(RelationshipType::Related)
    }

    pub fn set_relationship_type(&mut self, rel_type: RelationshipType) {
        self.relationship_type_str = rel_type.as_str().to_string();
    }
}

/// Request to create a product relationship
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductRelationshipRequest {
    pub product_id: String,
    pub related_product_id: String,
    pub relationship_type: RelationshipType,
    pub display_order: Option<i32>,
}

/// Product relationship response with full product details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductRelationshipResponse {
    pub id: String,
    pub product_id: String,
    pub related_product_id: String,
    pub relationship_type: String,
    pub display_order: i32,
    pub related_product: ProductResponse,
    pub created_at: String,
    pub updated_at: String,
}

/// Product price history model for tracking price changes
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ProductPriceHistory {
    pub id: String,
    pub product_id: String,
    pub old_price: f64,
    pub new_price: f64,
    pub old_cost: Option<f64>,
    pub new_cost: Option<f64>,
    pub changed_by: String,
    pub changed_at: String,
    pub reason: Option<String>,
    pub tenant_id: String,
}

impl ProductPriceHistory {
    /// Calculate price change amount
    pub fn price_change(&self) -> f64 {
        self.new_price - self.old_price
    }
    
    /// Calculate price change percentage
    pub fn price_change_percent(&self) -> f64 {
        if self.old_price == 0.0 {
            return 0.0;
        }
        (self.price_change() / self.old_price) * 100.0
    }
    
    /// Calculate cost change amount (if both costs are present)
    pub fn cost_change(&self) -> Option<f64> {
        match (self.old_cost, self.new_cost) {
            (Some(old), Some(new)) => Some(new - old),
            _ => None,
        }
    }
    
    /// Calculate new profit margin percentage
    pub fn new_margin_percent(&self) -> f64 {
        if self.new_price == 0.0 {
            return 0.0;
        }
        let cost = self.new_cost.unwrap_or(0.0);
        ((self.new_price - cost) / self.new_price) * 100.0
    }
    
    /// Calculate old profit margin percentage
    pub fn old_margin_percent(&self) -> f64 {
        if self.old_price == 0.0 {
            return 0.0;
        }
        let cost = self.old_cost.unwrap_or(0.0);
        ((self.old_price - cost) / self.old_price) * 100.0
    }
}

/// Product price history response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductPriceHistoryResponse {
    pub id: String,
    pub product_id: String,
    pub product_sku: String,
    pub product_name: String,
    pub old_price: f64,
    pub new_price: f64,
    pub price_change: f64,
    pub price_change_percent: f64,
    pub old_cost: Option<f64>,
    pub new_cost: Option<f64>,
    pub cost_change: Option<f64>,
    pub new_margin_percent: f64,
    pub old_margin_percent: f64,
    pub changed_by: String,
    pub changed_by_username: Option<String>,
    pub changed_at: String,
    pub reason: Option<String>,
}

/// Product template model for reusable product templates
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ProductTemplate {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub subcategory: Option<String>,
    
    /// JSON object containing all template field values
    /// Example: {"viscosity": "5W-30", "volume": "5L", "type": "Synthetic"}
    #[sqlx(default)]
    pub template_attributes: String, // JSON string from database
    
    pub is_shared: bool, // true = shared across stores, false = store-specific
    pub created_by: String,
    pub tenant_id: String,
    pub store_id: Option<String>, // NULL if shared, specific store_id if store-specific
    pub created_at: String,
    pub updated_at: String,
}

impl ProductTemplate {
    /// Parse template_attributes JSON string into JsonValue
    pub fn get_template_attributes(&self) -> Result<JsonValue, serde_json::Error> {
        serde_json::from_str(&self.template_attributes)
    }
    
    /// Set template_attributes from JsonValue
    pub fn set_template_attributes(&mut self, attrs: JsonValue) -> Result<(), serde_json::Error> {
        self.template_attributes = serde_json::to_string(&attrs)?;
        Ok(())
    }
}

/// Request to create a product template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductTemplateRequest {
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub subcategory: Option<String>,
    pub template_attributes: JsonValue,
    pub is_shared: Option<bool>,
    pub store_id: Option<String>,
}

/// Request to update a product template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProductTemplateRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub template_attributes: Option<JsonValue>,
    pub is_shared: Option<bool>,
}

/// Product template response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductTemplateResponse {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub subcategory: Option<String>,
    pub template_attributes: JsonValue,
    pub is_shared: bool,
    pub sharing_type: String, // "Shared across all stores" or "Store-specific"
    pub created_by: String,
    pub created_by_username: Option<String>,
    pub tenant_id: String,
    pub store_id: Option<String>,
    pub store_name: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
