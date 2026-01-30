use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::models::{ProductResponse, ValidationError};

/// Product lookup result with match information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductLookupResult {
    pub product: ProductResponse,
    pub match_type: String,      // 'sku', 'barcode', 'alternate', 'vendor_alias'
    pub matched_value: String,   // The value that matched
    pub confidence: f64,         // 1.0 for exact match, lower for fuzzy
}

/// Product lookup service for finding products by various identifiers
/// Supports: SKU, barcode, alternate SKUs, vendor SKU aliases
pub struct ProductLookupService {
    pool: SqlitePool,
}

impl ProductLookupService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Universal product lookup - searches all identifier types
    /// Returns all matching products with match information
    pub async fn lookup(
        &self,
        query: &str,
        tenant_id: &str,
    ) -> Result<Vec<ProductLookupResult>, Vec<ValidationError>> {
        let normalized = Self::normalize_sku(query);
        let mut results = Vec::new();

        // 1. Try exact SKU match
        if let Some(product) = self.lookup_by_sku(&normalized, tenant_id).await? {
            results.push(ProductLookupResult {
                product,
                match_type: "sku".to_string(),
                matched_value: normalized.clone(),
                confidence: 1.0,
            });
        }

        // 2. Try barcode match
        if let Some(product) = self.lookup_by_barcode(query, tenant_id).await? {
            // Avoid duplicates
            if !results.iter().any(|r| r.product.id == product.id) {
                results.push(ProductLookupResult {
                    product,
                    match_type: "barcode".to_string(),
                    matched_value: query.to_string(),
                    confidence: 1.0,
                });
            }
        }

        // 3. Try alternate SKU match
        let alt_matches = self.lookup_by_alternate_sku(&normalized, tenant_id).await?;
        for (product, sku_type, matched_sku) in alt_matches {
            if !results.iter().any(|r| r.product.id == product.id) {
                results.push(ProductLookupResult {
                    product,
                    match_type: format!("alternate_{}", sku_type),
                    matched_value: matched_sku,
                    confidence: 0.95,
                });
            }
        }

        // Sort by confidence (highest first)
        results.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap_or(std::cmp::Ordering::Equal));

        Ok(results)
    }

    /// Lookup by primary SKU
    async fn lookup_by_sku(
        &self,
        sku: &str,
        tenant_id: &str,
    ) -> Result<Option<ProductResponse>, Vec<ValidationError>> {
        let row: Option<ProductRow> = sqlx::query_as(
            r#"
            SELECT id, sku, name, description, category, subcategory,
                   unit_price, cost, quantity_on_hand, reorder_point,
                   attributes, parent_id, barcode, barcode_type, images,
                   tenant_id, store_id, is_active, sync_version, created_at, updated_at
            FROM products
            WHERE sku = ? AND tenant_id = ? AND is_active = 1
            "#
        )
        .bind(sku)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| vec![ValidationError {
            field: "sku".to_string(),
            message: format!("Database error: {}", e),
            code: Some("DB_ERROR".to_string()),
        }])?;

        Ok(row.map(|r| r.into_response()))
    }

    /// Lookup by barcode
    async fn lookup_by_barcode(
        &self,
        barcode: &str,
        tenant_id: &str,
    ) -> Result<Option<ProductResponse>, Vec<ValidationError>> {
        let row: Option<ProductRow> = sqlx::query_as(
            r#"
            SELECT id, sku, name, description, category, subcategory,
                   unit_price, cost, quantity_on_hand, reorder_point,
                   attributes, parent_id, barcode, barcode_type, images,
                   tenant_id, store_id, is_active, sync_version, created_at, updated_at
            FROM products
            WHERE barcode = ? AND tenant_id = ? AND is_active = 1
            "#
        )
        .bind(barcode)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| vec![ValidationError {
            field: "barcode".to_string(),
            message: format!("Database error: {}", e),
            code: Some("DB_ERROR".to_string()),
        }])?;

        Ok(row.map(|r| r.into_response()))
    }

    /// Lookup by alternate SKU (manufacturer, UPC, EAN, etc.)
    async fn lookup_by_alternate_sku(
        &self,
        alternate_sku: &str,
        tenant_id: &str,
    ) -> Result<Vec<(ProductResponse, String, String)>, Vec<ValidationError>> {
        let rows: Vec<ProductRowWithAlt> = sqlx::query_as(
            r#"
            SELECT p.id, p.sku, p.name, p.description, p.category, p.subcategory,
                   p.unit_price, p.cost, p.quantity_on_hand, p.reorder_point,
                   p.attributes, p.parent_id, p.barcode, p.barcode_type, p.images,
                   p.tenant_id, p.store_id, p.is_active, p.sync_version, p.created_at, p.updated_at,
                   a.sku_type, a.alternate_sku as alt_sku
            FROM products p
            JOIN product_alternate_skus a ON p.id = a.product_id
            WHERE a.alternate_sku = ? AND a.tenant_id = ? AND p.is_active = 1
            ORDER BY a.priority DESC
            "#
        )
        .bind(alternate_sku)
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .unwrap_or_default();

        Ok(rows.into_iter().map(|r| {
            let sku_type = r.sku_type.clone();
            let matched_sku = r.alt_sku.clone();
            (r.into_response(), sku_type, matched_sku)
        }).collect())
    }

    /// Normalize SKU for comparison
    fn normalize_sku(sku: &str) -> String {
        sku.trim()
            .to_uppercase()
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '-')
            .collect()
    }
}

/// Internal struct for database row mapping
#[derive(sqlx::FromRow)]
struct ProductRow {
    id: String,
    sku: String,
    name: String,
    description: Option<String>,
    category: String,
    subcategory: Option<String>,
    unit_price: f64,
    cost: f64,
    quantity_on_hand: f64,
    reorder_point: Option<f64>,
    attributes: String,
    parent_id: Option<String>,
    barcode: Option<String>,
    barcode_type: Option<String>,
    images: String,
    tenant_id: String,
    store_id: String,
    is_active: i64,
    sync_version: i64,
    created_at: String,
    updated_at: String,
}

impl ProductRow {
    fn into_response(self) -> ProductResponse {
        let attributes: serde_json::Value = serde_json::from_str(&self.attributes).unwrap_or(serde_json::json!({}));
        let images: Vec<String> = serde_json::from_str(&self.images).unwrap_or_default();
        let profit_margin = if self.unit_price > 0.0 { ((self.unit_price - self.cost) / self.unit_price) * 100.0 } else { 0.0 };
        let profit_amount = self.unit_price - self.cost;

        ProductResponse {
            id: self.id,
            sku: self.sku,
            name: self.name,
            description: self.description,
            category: self.category,
            subcategory: self.subcategory,
            unit_price: self.unit_price,
            cost: self.cost,
            quantity_on_hand: self.quantity_on_hand,
            reorder_point: self.reorder_point,
            attributes,
            parent_id: self.parent_id,
            barcode: self.barcode,
            barcode_type: self.barcode_type,
            images,
            tenant_id: self.tenant_id,
            store_id: self.store_id,
            is_active: self.is_active != 0,
            sync_version: self.sync_version,
            created_at: self.created_at,
            updated_at: self.updated_at,
            profit_margin,
            profit_amount,
        }
    }
}

/// Internal struct for database row mapping with alternate SKU info
#[derive(sqlx::FromRow)]
struct ProductRowWithAlt {
    id: String,
    sku: String,
    name: String,
    description: Option<String>,
    category: String,
    subcategory: Option<String>,
    unit_price: f64,
    cost: f64,
    quantity_on_hand: f64,
    reorder_point: Option<f64>,
    attributes: String,
    parent_id: Option<String>,
    barcode: Option<String>,
    barcode_type: Option<String>,
    images: String,
    tenant_id: String,
    store_id: String,
    is_active: i64,
    sync_version: i64,
    created_at: String,
    updated_at: String,
    sku_type: String,
    alt_sku: String,
}

impl ProductRowWithAlt {
    fn into_response(self) -> ProductResponse {
        let attributes: serde_json::Value = serde_json::from_str(&self.attributes).unwrap_or(serde_json::json!({}));
        let images: Vec<String> = serde_json::from_str(&self.images).unwrap_or_default();
        let profit_margin = if self.unit_price > 0.0 { ((self.unit_price - self.cost) / self.unit_price) * 100.0 } else { 0.0 };
        let profit_amount = self.unit_price - self.cost;

        ProductResponse {
            id: self.id,
            sku: self.sku,
            name: self.name,
            description: self.description,
            category: self.category,
            subcategory: self.subcategory,
            unit_price: self.unit_price,
            cost: self.cost,
            quantity_on_hand: self.quantity_on_hand,
            reorder_point: self.reorder_point,
            attributes,
            parent_id: self.parent_id,
            barcode: self.barcode,
            barcode_type: self.barcode_type,
            images,
            tenant_id: self.tenant_id,
            store_id: self.store_id,
            is_active: self.is_active != 0,
            sync_version: self.sync_version,
            created_at: self.created_at,
            updated_at: self.updated_at,
            profit_margin,
            profit_amount,
        }
    }
}
