use crate::models::{
    CreateProductVariantRequest, Product, ProductResponse, ProductVariant, ProductVariantResponse,
    ValidationError,
};
use chrono::Utc;
use serde_json::json;
use sqlx::SqlitePool;
use uuid::Uuid;

/// Variant service for product variant management
/// Handles parent-child product relationships and variant-specific attributes
pub struct VariantService {
    pool: SqlitePool,
}

impl VariantService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Create a product variant
    /// Validates parent exists, inherits common attributes, creates variant product and relationship
    pub async fn create_variant(
        &self,
        req: CreateProductVariantRequest,
        tenant_id: &str,
        user_id: &str,
    ) -> Result<ProductVariantResponse, Vec<ValidationError>> {
        // Validate parent exists and is not itself a variant
        let parent = self.get_product(&req.parent_id, tenant_id).await?;

        if parent.parent_id.is_some() {
            return Err(vec![ValidationError {
                field: "parent_id".to_string(),
                message: "Cannot create variant of a variant. Parent must be a base product.".to_string(), code: None}]);
        }

        // Create the variant product
        let variant_id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        // Inherit common attributes from parent, merge with variant-specific attributes
        let mut variant_attributes = parent.get_attributes().unwrap_or(json!({}));
        
        if let Some(ref variant_attrs) = req.variant_attributes {
            if let Some(variant_obj) = variant_attrs.as_object() {
                if let Some(attrs_obj) = variant_attributes.as_object_mut() {
                    for (key, value) in variant_obj {
                        attrs_obj.insert(key.clone(), value.clone());
                    }
                }
            }
        }

        let attributes_str = serde_json::to_string(&variant_attributes).unwrap();
        let images_str = serde_json::to_string(&req.variant_product.images.clone().unwrap_or_default()).unwrap();

        // Insert variant product
        sqlx::query(
            "INSERT INTO products (
                id, sku, name, description, category, subcategory,
                unit_price, cost, quantity_on_hand, reorder_point,
                attributes, parent_id, barcode, barcode_type, images,
                tenant_id, store_id, is_active, sync_version,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)",
        )
        .bind(&variant_id)
        .bind(&req.variant_product.sku)
        .bind(&req.variant_product.name)
        .bind(&req.variant_product.description)
        .bind(&req.variant_product.category)
        .bind(&req.variant_product.subcategory)
        .bind(req.variant_product.unit_price)
        .bind(req.variant_product.cost)
        .bind(req.variant_product.quantity_on_hand.unwrap_or(0.0))
        .bind(req.variant_product.reorder_point)
        .bind(&attributes_str)
        .bind(&req.parent_id) // Set parent_id
        .bind(&req.variant_product.barcode)
        .bind(&req.variant_product.barcode_type)
        .bind(&images_str)
        .bind(tenant_id)
        .bind(&req.variant_product.store_id)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "database".to_string(),
                message: format!("Failed to create variant product: {}", e), code: None
            }]
        })?;

        // Create variant relationship
        let relationship_id = Uuid::new_v4().to_string();
        let variant_attrs_str = serde_json::to_string(&req.variant_attributes.unwrap_or(json!({}))).unwrap();

        sqlx::query(
            "INSERT INTO product_variants (
                id, parent_id, variant_id, variant_attributes, display_order, tenant_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&relationship_id)
        .bind(&req.parent_id)
        .bind(&variant_id)
        .bind(&variant_attrs_str)
        .bind(req.display_order.unwrap_or(0))
        .bind(tenant_id)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "database".to_string(),
                message: format!("Failed to create variant relationship: {}", e), code: None
            }]
        })?;

        tracing::info!(
            "Variant created: {} for parent {} by user {}",
            variant_id,
            req.parent_id,
            user_id
        );

        // Fetch and return created variant
        self.get_variant(&relationship_id, tenant_id).await
    }

    /// Get all variants for a parent product
    /// Returns variants ordered by display_order
    pub async fn get_variants(
        &self,
        parent_id: &str,
        tenant_id: &str,
    ) -> Result<Vec<ProductVariantResponse>, Vec<ValidationError>> {
        // Fetch variant relationships
        let variants = sqlx::query_as::<_, ProductVariant>(
            "SELECT * FROM product_variants 
             WHERE parent_id = ? AND tenant_id = ?
             ORDER BY display_order ASC"
        )
        .bind(parent_id)
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "database".to_string(),
                message: format!("Failed to fetch variants: {}", e), code: None
            }]
        })?;

        let mut responses = Vec::new();

        for variant in variants {
            // Fetch variant product
            let variant_product = self.get_product(&variant.variant_id, tenant_id).await?;
            
            let variant_attrs = variant.get_variant_attributes().unwrap_or(json!({}));

            responses.push(ProductVariantResponse {
                id: variant.id,
                parent_id: variant.parent_id,
                variant_id: variant.variant_id,
                variant_attributes: variant_attrs,
                display_order: variant.display_order,
                variant_product: ProductResponse::from(variant_product),
                created_at: variant.created_at,
                updated_at: variant.updated_at,
            });
        }

        Ok(responses)
    }

    /// Update a variant
    /// Updates variant-specific attributes while maintaining parent relationship
    pub async fn update_variant(
        &self,
        variant_id: &str,
        variant_attributes: serde_json::Value,
        display_order: Option<i32>,
        tenant_id: &str,
        user_id: &str,
    ) -> Result<ProductVariantResponse, Vec<ValidationError>> {
        let now = Utc::now().to_rfc3339();

        // Fetch existing variant relationship
        let existing = sqlx::query_as::<_, ProductVariant>(
            "SELECT * FROM product_variants WHERE id = ? AND tenant_id = ?"
        )
        .bind(variant_id)
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "id".to_string(),
                message: format!("Variant not found: {}", e), code: None
            }]
        })?;

        // Update variant relationship
        let variant_attrs_str = serde_json::to_string(&variant_attributes).unwrap();

        sqlx::query(
            "UPDATE product_variants 
             SET variant_attributes = ?, display_order = ?, updated_at = ?
             WHERE id = ? AND tenant_id = ?"
        )
        .bind(&variant_attrs_str)
        .bind(display_order.unwrap_or(existing.display_order))
        .bind(&now)
        .bind(variant_id)
        .bind(tenant_id)
        .execute(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "database".to_string(),
                message: format!("Failed to update variant: {}", e), code: None
            }]
        })?;

        // Update variant product attributes
        let variant_product = self.get_product(&existing.variant_id, tenant_id).await?;
        let mut product_attrs = variant_product.get_attributes().unwrap_or(json!({}));

        if let Some(attrs_obj) = product_attrs.as_object_mut() {
            if let Some(variant_obj) = variant_attributes.as_object() {
                for (key, value) in variant_obj {
                    attrs_obj.insert(key.clone(), value.clone());
                }
            }
        }

        let product_attrs_str = serde_json::to_string(&product_attrs).unwrap();

        sqlx::query(
            "UPDATE products 
             SET attributes = ?, updated_at = ?, sync_version = sync_version + 1
             WHERE id = ? AND tenant_id = ?"
        )
        .bind(&product_attrs_str)
        .bind(&now)
        .bind(&existing.variant_id)
        .bind(tenant_id)
        .execute(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "database".to_string(),
                message: format!("Failed to update variant product: {}", e), code: None
            }]
        })?;

        tracing::info!("Variant updated: {} by user {}", variant_id, user_id);

        // Fetch and return updated variant
        self.get_variant(variant_id, tenant_id).await
    }

    /// Delete a variant
    /// Removes variant relationship and soft-deletes variant product
    pub async fn delete_variant(
        &self,
        variant_id: &str,
        tenant_id: &str,
        user_id: &str,
    ) -> Result<(), Vec<ValidationError>> {
        // Fetch variant relationship
        let variant = sqlx::query_as::<_, ProductVariant>(
            "SELECT * FROM product_variants WHERE id = ? AND tenant_id = ?"
        )
        .bind(variant_id)
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "id".to_string(),
                message: format!("Variant not found: {}", e), code: None
            }]
        })?;

        let now = Utc::now().to_rfc3339();

        // Soft delete variant product
        sqlx::query(
            "UPDATE products 
             SET is_active = 0, updated_at = ?, sync_version = sync_version + 1
             WHERE id = ? AND tenant_id = ?"
        )
        .bind(&now)
        .bind(&variant.variant_id)
        .bind(tenant_id)
        .execute(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "database".to_string(),
                message: format!("Failed to delete variant product: {}", e), code: None
            }]
        })?;

        // Delete variant relationship
        sqlx::query("DELETE FROM product_variants WHERE id = ? AND tenant_id = ?")
            .bind(variant_id)
            .bind(tenant_id)
            .execute(&self.pool)
            .await
            .map_err(|e| {
                vec![ValidationError {
                    field: "database".to_string(),
                    message: format!("Failed to delete variant relationship: {}", e), code: None
                }]
            })?;

        tracing::info!("Variant deleted: {} by user {}", variant_id, user_id);

        Ok(())
    }

    // Helper methods

    /// Get variant by ID
    async fn get_variant(
        &self,
        variant_id: &str,
        tenant_id: &str,
    ) -> Result<ProductVariantResponse, Vec<ValidationError>> {
        let variant = sqlx::query_as::<_, ProductVariant>(
            "SELECT * FROM product_variants WHERE id = ? AND tenant_id = ?"
        )
        .bind(variant_id)
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "id".to_string(),
                message: format!("Variant not found: {}", e), code: None
            }]
        })?;

        let variant_product = self.get_product(&variant.variant_id, tenant_id).await?;
        let variant_attrs = variant.get_variant_attributes().unwrap_or(json!({}));

        Ok(ProductVariantResponse {
            id: variant.id,
            parent_id: variant.parent_id,
            variant_id: variant.variant_id,
            variant_attributes: variant_attrs,
            display_order: variant.display_order,
            variant_product: ProductResponse::from(variant_product),
            created_at: variant.created_at,
            updated_at: variant.updated_at,
        })
    }

    /// Get product by ID
    async fn get_product(
        &self,
        product_id: &str,
        tenant_id: &str,
    ) -> Result<Product, Vec<ValidationError>> {
        sqlx::query_as::<_, Product>(
            "SELECT * FROM products WHERE id = ? AND tenant_id = ?"
        )
        .bind(product_id)
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "id".to_string(),
                message: format!("Product not found: {}", e), code: None
            }]
        })
    }

    /// Check if product has variants
    pub async fn has_variants(
        &self,
        parent_id: &str,
        tenant_id: &str,
    ) -> Result<bool, Vec<ValidationError>> {
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM product_variants WHERE parent_id = ? AND tenant_id = ?"
        )
        .bind(parent_id)
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "database".to_string(),
                message: format!("Failed to check variants: {}", e), code: None
            }]
        })?;

        Ok(count.0 > 0)
    }

    /// Get variant count for a parent
    pub async fn get_variant_count(
        &self,
        parent_id: &str,
        tenant_id: &str,
    ) -> Result<u32, Vec<ValidationError>> {
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM product_variants WHERE parent_id = ? AND tenant_id = ?"
        )
        .bind(parent_id)
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "database".to_string(),
                message: format!("Failed to count variants: {}", e), code: None
            }]
        })?;

        Ok(count.0 as u32)
    }
}
