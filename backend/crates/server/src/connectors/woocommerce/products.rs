/**
 * WooCommerce Products API
 * 
 * Handles product fetching with variations, SKU mapping, and attributes
 * 
 * Requirements: 12.2, 12.6, 2.1
 */

use serde::{Deserialize, Serialize};
use crate::models::ApiError;
use super::client::WooCommerceClient;

/// WooCommerce product type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProductType {
    Simple,
    Grouped,
    External,
    Variable,
}

/// WooCommerce product status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProductStatus {
    Draft,
    Pending,
    Private,
    Publish,
}

/// WooCommerce product
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WooCommerceProduct {
    pub id: i64,
    pub name: String,
    pub slug: String,
    pub permalink: String,
    pub date_created: String,
    pub date_created_gmt: String,
    pub date_modified: String,
    pub date_modified_gmt: String,
    #[serde(rename = "type")]
    pub product_type: String,
    pub status: String,
    pub featured: bool,
    pub catalog_visibility: String,
    pub description: String,
    pub short_description: String,
    pub sku: String,
    pub price: String,
    pub regular_price: String,
    pub sale_price: String,
    pub date_on_sale_from: Option<String>,
    pub date_on_sale_from_gmt: Option<String>,
    pub date_on_sale_to: Option<String>,
    pub date_on_sale_to_gmt: Option<String>,
    pub price_html: String,
    pub on_sale: bool,
    pub purchasable: bool,
    pub total_sales: i64,
    pub virtual_product: bool,
    pub downloadable: bool,
    pub external_url: String,
    pub button_text: String,
    pub tax_status: String,
    pub tax_class: String,
    pub manage_stock: bool,
    pub stock_quantity: Option<i32>,
    pub stock_status: String,
    pub backorders: String,
    pub backorders_allowed: bool,
    pub backordered: bool,
    pub sold_individually: bool,
    pub weight: String,
    pub dimensions: Dimensions,
    pub shipping_required: bool,
    pub shipping_taxable: bool,
    pub shipping_class: String,
    pub shipping_class_id: i64,
    pub reviews_allowed: bool,
    pub average_rating: String,
    pub rating_count: i64,
    pub related_ids: Vec<i64>,
    pub upsell_ids: Vec<i64>,
    pub cross_sell_ids: Vec<i64>,
    pub parent_id: i64,
    pub purchase_note: String,
    pub categories: Vec<Category>,
    pub tags: Vec<Tag>,
    pub images: Vec<Image>,
    pub attributes: Vec<Attribute>,
    pub default_attributes: Vec<DefaultAttribute>,
    pub variations: Vec<i64>,
    pub grouped_products: Vec<i64>,
    pub menu_order: i64,
    pub meta_data: Vec<MetaData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dimensions {
    pub length: String,
    pub width: String,
    pub height: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub slug: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: i64,
    pub name: String,
    pub slug: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Image {
    pub id: i64,
    pub date_created: String,
    pub date_created_gmt: String,
    pub date_modified: String,
    pub date_modified_gmt: String,
    pub src: String,
    pub name: String,
    pub alt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attribute {
    pub id: i64,
    pub name: String,
    pub position: i64,
    pub visible: bool,
    pub variation: bool,
    pub options: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DefaultAttribute {
    pub id: i64,
    pub name: String,
    pub option: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetaData {
    pub id: i64,
    pub key: String,
    pub value: serde_json::Value,
}

/// Product variation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductVariation {
    pub id: i64,
    pub date_created: String,
    pub date_created_gmt: String,
    pub date_modified: String,
    pub date_modified_gmt: String,
    pub description: String,
    pub permalink: String,
    pub sku: String,
    pub price: String,
    pub regular_price: String,
    pub sale_price: String,
    pub date_on_sale_from: Option<String>,
    pub date_on_sale_from_gmt: Option<String>,
    pub date_on_sale_to: Option<String>,
    pub date_on_sale_to_gmt: Option<String>,
    pub on_sale: bool,
    pub status: String,
    pub purchasable: bool,
    pub virtual_product: bool,
    pub downloadable: bool,
    pub tax_status: String,
    pub tax_class: String,
    pub manage_stock: bool,
    pub stock_quantity: Option<i32>,
    pub stock_status: String,
    pub backorders: String,
    pub backorders_allowed: bool,
    pub backordered: bool,
    pub weight: String,
    pub dimensions: Dimensions,
    pub shipping_class: String,
    pub shipping_class_id: i64,
    pub image: Option<Image>,
    pub attributes: Vec<VariationAttribute>,
    pub menu_order: i64,
    pub meta_data: Vec<MetaData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariationAttribute {
    pub id: i64,
    pub name: String,
    pub option: String,
}

/// Product query parameters
#[derive(Debug, Clone, Default)]
pub struct ProductQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub search: Option<String>,
    pub sku: Option<String>,
    pub status: Option<Vec<ProductStatus>>,
    pub product_type: Option<Vec<ProductType>>,
    pub category: Option<i64>,
    pub tag: Option<i64>,
    pub modified_after: Option<String>,
    pub order_by: Option<String>,
    pub order: Option<String>,
}

impl WooCommerceClient {
    /// Fetch products with pagination and filtering
    /// 
    /// Requirements: 12.2, 12.6
    pub async fn get_products(&self, query: ProductQuery) -> Result<Vec<WooCommerceProduct>, ApiError> {
        let mut params = Vec::new();
        
        // Pagination (max 100 per page)
        let per_page = query.per_page.unwrap_or(100).min(100);
        params.push(format!("per_page={}", per_page));
        
        if let Some(page) = query.page {
            params.push(format!("page={}", page));
        }
        
        // Search
        if let Some(search) = query.search {
            params.push(format!("search={}", urlencoding::encode(&search)));
        }
        
        // SKU filtering
        if let Some(sku) = query.sku {
            params.push(format!("sku={}", urlencoding::encode(&sku)));
        }
        
        // Status filtering
        if let Some(statuses) = query.status {
            let status_str = statuses
                .iter()
                .map(|s| serde_json::to_string(s).unwrap_or_default().trim_matches('"').to_string())
                .collect::<Vec<_>>()
                .join(",");
            params.push(format!("status={}", status_str));
        }
        
        // Type filtering
        if let Some(types) = query.product_type {
            let type_str = types
                .iter()
                .map(|t| serde_json::to_string(t).unwrap_or_default().trim_matches('"').to_string())
                .collect::<Vec<_>>()
                .join(",");
            params.push(format!("type={}", type_str));
        }
        
        // Category filtering
        if let Some(category) = query.category {
            params.push(format!("category={}", category));
        }
        
        // Tag filtering
        if let Some(tag) = query.tag {
            params.push(format!("tag={}", tag));
        }
        
        // Incremental sync support
        if let Some(modified_after) = query.modified_after {
            params.push(format!("modified_after={}", urlencoding::encode(&modified_after)));
        }
        
        // Ordering
        if let Some(order_by) = query.order_by {
            params.push(format!("orderby={}", order_by));
        }
        if let Some(order) = query.order {
            params.push(format!("order={}", order));
        }
        
        let endpoint = if params.is_empty() {
            "products".to_string()
        } else {
            format!("products?{}", params.join("&"))
        };
        
        let response = self.get(&endpoint).await?;
        let products: Vec<WooCommerceProduct> = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse products: {}", e)))?;
        
        Ok(products)
    }
    
    /// Fetch a single product by ID
    pub async fn get_product(&self, product_id: i64) -> Result<WooCommerceProduct, ApiError> {
        let endpoint = format!("products/{}", product_id);
        let response = self.get(&endpoint).await?;
        let product: WooCommerceProduct = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse product: {}", e)))?;
        
        Ok(product)
    }
    
    /// Fetch product by SKU
    /// 
    /// Requirements: 12.6 (SKU mapping)
    pub async fn get_product_by_sku(&self, sku: &str) -> Result<Option<WooCommerceProduct>, ApiError> {
        let query = ProductQuery {
            sku: Some(sku.to_string()),
            per_page: Some(1),
            ..Default::default()
        };
        
        let products = self.get_products(query).await?;
        Ok(products.into_iter().next())
    }
    
    /// Fetch all products with automatic pagination
    /// 
    /// Requirements: 5.4 (incremental sync)
    pub async fn get_all_products(&self, modified_after: Option<String>) -> Result<Vec<WooCommerceProduct>, ApiError> {
        let mut all_products = Vec::new();
        let mut page = 1;
        
        loop {
            let query = ProductQuery {
                page: Some(page),
                per_page: Some(100),
                modified_after: modified_after.clone(),
                ..Default::default()
            };
            
            let products = self.get_products(query).await?;
            
            if products.is_empty() {
                break;
            }
            
            all_products.extend(products);
            page += 1;
        }
        
        Ok(all_products)
    }
    
    /// Fetch variations for a variable product
    /// 
    /// Requirements: 12.6 (product variations)
    pub async fn get_product_variations(&self, product_id: i64) -> Result<Vec<ProductVariation>, ApiError> {
        let mut all_variations = Vec::new();
        let mut page = 1;
        
        loop {
            let endpoint = format!("products/{}/variations?per_page=100&page={}", product_id, page);
            let response = self.get(&endpoint).await?;
            let variations: Vec<ProductVariation> = response
                .json()
                .await
                .map_err(|e| ApiError::internal(format!("Failed to parse variations: {}", e)))?;
            
            if variations.is_empty() {
                break;
            }
            
            all_variations.extend(variations);
            page += 1;
        }
        
        Ok(all_variations)
    }
    
    /// Fetch a single variation
    pub async fn get_product_variation(&self, product_id: i64, variation_id: i64) -> Result<ProductVariation, ApiError> {
        let endpoint = format!("products/{}/variations/{}", product_id, variation_id);
        let response = self.get(&endpoint).await?;
        let variation: ProductVariation = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse variation: {}", e)))?;
        
        Ok(variation)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_product_query_builder() {
        let query = ProductQuery {
            page: Some(1),
            per_page: Some(50),
            search: Some("test".to_string()),
            sku: Some("TEST-SKU".to_string()),
            status: Some(vec![ProductStatus::Publish]),
            modified_after: Some("2024-01-01T00:00:00".to_string()),
            ..Default::default()
        };
        
        assert_eq!(query.page, Some(1));
        assert_eq!(query.per_page, Some(50));
        assert!(query.search.is_some());
        assert!(query.sku.is_some());
        assert!(query.status.is_some());
        assert!(query.modified_after.is_some());
    }
}
