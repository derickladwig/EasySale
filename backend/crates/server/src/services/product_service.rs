use crate::config::loader::ConfigLoader;
use crate::models::{
    CreateProductRequest, Product, ProductResponse, ProductSearchResponse,
    UpdateProductRequest, ValidationError,
};
use crate::services::attribute_validator::AttributeValidator;
use chrono::Utc;
use serde_json::json;
use sqlx::SqlitePool;
use uuid::Uuid;

/// Product service for business logic
/// Handles CRUD operations, validation, search indexing, audit logging, and sync queueing
pub struct ProductService {
    pool: SqlitePool,
    config_loader: ConfigLoader,
}

impl ProductService {
    pub fn new(pool: SqlitePool, config_loader: ConfigLoader) -> Self {
        Self {
            pool,
            config_loader,
        }
    }

    /// Create a new product
    /// Validates attributes, generates ID, saves to database, updates search index, logs, and queues sync
    pub async fn create_product(
        &self,
        req: CreateProductRequest,
        tenant_id: &str,
        user_id: &str,
    ) -> Result<ProductResponse, Vec<ValidationError>> {
        // Load category configuration
        let config = self.config_loader.get_config(tenant_id).await.map_err(|e| {
            vec![ValidationError {
                field: "category".to_string(),
                message: format!("Failed to load configuration: {}", e), code: None
            }]
        })?;

        let category_config = config
            .categories
            .iter()
            .find(|c| c.id == req.category)
            .ok_or_else(|| {
                vec![ValidationError {
                    field: "category".to_string(),
                    message: format!("Category '{}' not found", req.category), code: None
                }]
            })?;

        // Validate attributes against category configuration
        let attributes = req.attributes.unwrap_or(json!({}));
        AttributeValidator::validate(category_config, &attributes)?;

        // Validate SKU uniqueness
        self.validate_sku_unique(&req.sku, tenant_id, None).await?;

        // Validate barcode uniqueness if provided
        if let Some(ref barcode) = req.barcode {
            self.validate_barcode_unique(barcode, tenant_id, None)
                .await?;
        }

        // Generate unique ID
        let product_id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        // Prepare JSON fields
        let attributes_str = serde_json::to_string(&attributes).unwrap();
        let images_str = serde_json::to_string(&req.images.unwrap_or_default()).unwrap();

        // Insert product
        let result = sqlx::query(
            "INSERT INTO products (
                id, sku, name, description, category, subcategory,
                unit_price, cost, quantity_on_hand, reorder_point,
                attributes, parent_id, barcode, barcode_type, images,
                tenant_id, store_id, is_active, sync_version,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)",
        )
        .bind(&product_id)
        .bind(&req.sku)
        .bind(&req.name)
        .bind(&req.description)
        .bind(&req.category)
        .bind(&req.subcategory)
        .bind(req.unit_price)
        .bind(req.cost)
        .bind(req.quantity_on_hand.unwrap_or(0.0))
        .bind(req.reorder_point)
        .bind(&attributes_str)
        .bind(&req.parent_id)
        .bind(&req.barcode)
        .bind(&req.barcode_type)
        .bind(&images_str)
        .bind(tenant_id)
        .bind(&req.store_id)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "database".to_string(),
                message: format!("Failed to create product: {}", e), code: None
            }]
        })?;

        // Verify product was created
        if result.rows_affected() == 0 {
            return Err(vec![ValidationError {
                field: "database".to_string(),
                message: "Product creation failed - no rows inserted".to_string(),
                code: Some("INSERT_FAILED".to_string()),
            }]);
        }

        tracing::info!(
            "Product created: {} (SKU: {}) by user {} - {} row(s) affected",
            product_id,
            req.sku,
            user_id,
            result.rows_affected()
        );

        // Update search index
        self.update_search_index(&product_id, &req.name, &req.category, tenant_id, &attributes_str)
            .await?;

        // Log to audit log
        self.log_audit(
            tenant_id,
            &product_id,
            "create",
            user_id,
            Some(&json!({
                "sku": req.sku,
                "name": req.name,
                "category": req.category,
                "unit_price": req.unit_price,
                "cost": req.cost,
            })),
        )
        .await?;

        // Queue for sync
        self.queue_sync(tenant_id, &product_id, "create").await?;

        // Fetch and return created product
        self.get_product(&product_id, tenant_id).await
    }

    /// Update an existing product
    /// Validates attributes, tracks price changes, updates database, logs, and queues sync
    pub async fn update_product(
        &self,
        product_id: &str,
        req: UpdateProductRequest,
        tenant_id: &str,
        user_id: &str,
    ) -> Result<ProductResponse, Vec<ValidationError>> {
        // Fetch existing product
        let existing = self.get_product_model(product_id, tenant_id).await?;

        // Validate category if changed
        if let Some(ref category) = req.category {
            let config = self.config_loader.get_config(tenant_id).await.map_err(|e| {
                vec![ValidationError {
                    field: "category".to_string(),
                    message: format!("Failed to load configuration: {}", e), code: None
                }]
            })?;

            let category_config = config
                .categories
                .iter()
                .find(|c| c.id == *category)
                .ok_or_else(|| {
                    vec![ValidationError {
                        field: "category".to_string(),
                        message: format!("Category '{}' not found", category), code: None
                    }]
                })?;

            // Validate attributes if provided
            if let Some(ref attributes) = req.attributes {
                AttributeValidator::validate(category_config, attributes)?;
            }
        } else if let Some(ref attributes) = req.attributes {
            // Validate against existing category
            let config = self.config_loader.get_config(tenant_id).await.map_err(|e| {
                vec![ValidationError {
                    field: "category".to_string(),
                    message: format!("Failed to load configuration: {}", e), code: None
                }]
            })?;

            let category_config = config
                .categories
                .iter()
                .find(|c| c.id == existing.category)
                .ok_or_else(|| {
                    vec![ValidationError {
                        field: "category".to_string(),
                        message: format!("Category '{}' not found", existing.category), code: None
                    }]
                })?;

            AttributeValidator::validate(category_config, attributes)?;
        }

        // Validate SKU uniqueness if changed
        if let Some(ref sku) = req.sku {
            if sku != &existing.sku {
                self.validate_sku_unique(sku, tenant_id, Some(product_id))
                    .await?;
            }
        }

        // Validate barcode uniqueness if changed
        if let Some(ref barcode) = req.barcode {
            if Some(barcode) != existing.barcode.as_ref() {
                self.validate_barcode_unique(barcode, tenant_id, Some(product_id))
                    .await?;
            }
        }

        // Track price changes
        let price_changed = req.unit_price.is_some() && req.unit_price != Some(existing.unit_price);
        let cost_changed = req.cost.is_some() && req.cost != Some(existing.cost);

        if price_changed || cost_changed {
            self.log_price_change(
                product_id,
                tenant_id,
                existing.unit_price,
                req.unit_price.unwrap_or(existing.unit_price),
                Some(existing.cost),
                req.cost.or(Some(existing.cost)),
                user_id,
                None,
            )
            .await?;
        }

        // Build update query
        let now = Utc::now().to_rfc3339();
        let mut updates = Vec::new();
        let mut bind_count = 1;

        if req.sku.is_some() {
            updates.push(format!("sku = ?{}", bind_count));
            bind_count += 1;
        }
        if req.name.is_some() {
            updates.push(format!("name = ?{}", bind_count));
            bind_count += 1;
        }
        if req.description.is_some() {
            updates.push(format!("description = ?{}", bind_count));
            bind_count += 1;
        }
        if req.category.is_some() {
            updates.push(format!("category = ?{}", bind_count));
            bind_count += 1;
        }
        if req.subcategory.is_some() {
            updates.push(format!("subcategory = ?{}", bind_count));
            bind_count += 1;
        }
        if req.unit_price.is_some() {
            updates.push(format!("unit_price = ?{}", bind_count));
            bind_count += 1;
        }
        if req.cost.is_some() {
            updates.push(format!("cost = ?{}", bind_count));
            bind_count += 1;
        }
        if req.quantity_on_hand.is_some() {
            updates.push(format!("quantity_on_hand = ?{}", bind_count));
            bind_count += 1;
        }
        if req.reorder_point.is_some() {
            updates.push(format!("reorder_point = ?{}", bind_count));
            bind_count += 1;
        }
        if req.attributes.is_some() {
            updates.push(format!("attributes = ?{}", bind_count));
            bind_count += 1;
        }
        if req.barcode.is_some() {
            updates.push(format!("barcode = ?{}", bind_count));
            bind_count += 1;
        }
        if req.barcode_type.is_some() {
            updates.push(format!("barcode_type = ?{}", bind_count));
            bind_count += 1;
        }
        if req.images.is_some() {
            updates.push(format!("images = ?{}", bind_count));
            bind_count += 1;
        }
        if req.is_active.is_some() {
            updates.push(format!("is_active = ?{}", bind_count));
            bind_count += 1;
        }

        if updates.is_empty() {
            // No changes, return existing product
            return Ok(ProductResponse::from(existing));
        }

        updates.push(format!("updated_at = ?{}", bind_count));
        bind_count += 1;
        updates.push(format!("sync_version = sync_version + 1"));

        let query_str = format!(
            "UPDATE products SET {} WHERE id = ?{} AND tenant_id = ?{}",
            updates.join(", "),
            bind_count,
            bind_count + 1
        );

        // Execute update with dynamic binding
        let mut query = sqlx::query(&query_str);

        if let Some(ref sku) = req.sku {
            query = query.bind(sku);
        }
        if let Some(ref name) = req.name {
            query = query.bind(name);
        }
        if let Some(ref description) = req.description {
            query = query.bind(description);
        }
        if let Some(ref category) = req.category {
            query = query.bind(category);
        }
        if let Some(ref subcategory) = req.subcategory {
            query = query.bind(subcategory);
        }
        if let Some(unit_price) = req.unit_price {
            query = query.bind(unit_price);
        }
        if let Some(cost) = req.cost {
            query = query.bind(cost);
        }
        if let Some(quantity) = req.quantity_on_hand {
            query = query.bind(quantity);
        }
        if let Some(reorder) = req.reorder_point {
            query = query.bind(reorder);
        }
        if let Some(ref attributes) = req.attributes {
            let attrs_str = serde_json::to_string(attributes).unwrap();
            query = query.bind(attrs_str);
        }
        if let Some(ref barcode) = req.barcode {
            query = query.bind(barcode);
        }
        if let Some(ref barcode_type) = req.barcode_type {
            query = query.bind(barcode_type);
        }
        if let Some(ref images) = req.images {
            let images_str = serde_json::to_string(images).unwrap();
            query = query.bind(images_str);
        }
        if let Some(is_active) = req.is_active {
            query = query.bind(is_active);
        }

        query = query.bind(&now).bind(product_id).bind(tenant_id);

        query.execute(&self.pool).await.map_err(|e| {
            vec![ValidationError {
                field: "database".to_string(),
                message: format!("Failed to update product: {}", e), code: None
            }]
        })?;

        tracing::info!("Product updated: {} by user {}", product_id, user_id);

        // Update search index if name or category changed
        if req.name.is_some() || req.category.is_some() || req.attributes.is_some() {
            let updated = self.get_product_model(product_id, tenant_id).await?;
            self.update_search_index(
                product_id,
                &updated.name,
                &updated.category,
                tenant_id,
                &updated.attributes,
            )
            .await?;
        }

        // Log to audit log
        self.log_audit(
            tenant_id,
            product_id,
            "update",
            user_id,
            Some(&json!({
                "changes": req,
            })),
        )
        .await?;

        // Queue for sync
        self.queue_sync(tenant_id, product_id, "update").await?;

        // Fetch and return updated product
        self.get_product(product_id, tenant_id).await
    }

    /// Delete a product (soft delete)
    /// Sets is_active = false, logs, and queues sync
    pub async fn delete_product(
        &self,
        product_id: &str,
        tenant_id: &str,
        user_id: &str,
    ) -> Result<(), Vec<ValidationError>> {
        let now = Utc::now().to_rfc3339();

        let result = sqlx::query(
            "UPDATE products 
             SET is_active = 0, updated_at = ?, sync_version = sync_version + 1
             WHERE id = ? AND tenant_id = ?",
        )
        .bind(&now)
        .bind(product_id)
        .bind(tenant_id)
        .execute(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "database".to_string(),
                message: format!("Failed to delete product: {}", e), code: None
            }]
        })?;

        if result.rows_affected() == 0 {
            return Err(vec![ValidationError {
                field: "id".to_string(),
                message: "Product not found".to_string(), code: None}]);
        }

        tracing::info!("Product deleted: {} by user {}", product_id, user_id);

        // Log to audit log
        self.log_audit(tenant_id, product_id, "delete", user_id, None)
            .await?;

        // Queue for sync
        self.queue_sync(tenant_id, product_id, "delete").await?;

        Ok(())
    }

    /// Get a product by ID or SKU
    /// Returns product with parsed JSON fields
    pub async fn get_product(
        &self,
        product_id: &str,
        tenant_id: &str,
    ) -> Result<ProductResponse, Vec<ValidationError>> {
        let product = self.get_product_model(product_id, tenant_id).await?;
        Ok(ProductResponse::from(product))
    }

    /// Get product model (internal use)
    async fn get_product_model(
        &self,
        product_id: &str,
        tenant_id: &str,
    ) -> Result<Product, Vec<ValidationError>> {
        sqlx::query_as::<_, Product>(
            "SELECT * FROM products WHERE id = ? AND tenant_id = ?",
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

    /// List products with pagination, filtering, and sorting
    pub async fn list_products(
        &self,
        tenant_id: &str,
        category: Option<&str>,
        page: u32,
        page_size: u32,
        sort_by: Option<&str>,
        sort_order: Option<&str>,
    ) -> Result<ProductSearchResponse, Vec<ValidationError>> {
        let offset = page * page_size;
        let sort_field = sort_by.unwrap_or("name");
        let order = sort_order.unwrap_or("ASC");

        // Build query
        let mut query = "SELECT * FROM products WHERE tenant_id = ? AND is_active = 1".to_string();
        
        if let Some(cat) = category {
            query.push_str(&format!(" AND category = '{}'", cat));
        }

        query.push_str(&format!(" ORDER BY {} {} LIMIT {} OFFSET {}", sort_field, order, page_size, offset));

        // Fetch products
        let products = sqlx::query_as::<_, Product>(&query)
            .bind(tenant_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| {
                vec![ValidationError {
                    field: "database".to_string(),
                    message: format!("Failed to list products: {}", e), code: None
                }]
            })?;

        // Get total count
        let mut count_query = "SELECT COUNT(*) as count FROM products WHERE tenant_id = ? AND is_active = 1".to_string();
        if let Some(cat) = category {
            count_query.push_str(&format!(" AND category = '{}'", cat));
        }

        let total: (i64,) = sqlx::query_as(&count_query)
            .bind(tenant_id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| {
                vec![ValidationError {
                    field: "database".to_string(),
                    message: format!("Failed to count products: {}", e), code: None
                }]
            })?;

        let total = total.0 as u32;
        let has_more = (offset + products.len() as u32) < total;

        Ok(ProductSearchResponse {
            products: products.into_iter().map(ProductResponse::from).collect(),
            total,
            page,
            page_size,
            has_more,
        })
    }

    // Helper methods

    /// Validate SKU uniqueness
    async fn validate_sku_unique(
        &self,
        sku: &str,
        tenant_id: &str,
        exclude_id: Option<&str>,
    ) -> Result<(), Vec<ValidationError>> {
        let mut query = "SELECT COUNT(*) as count FROM products WHERE sku = ? AND tenant_id = ?".to_string();
        
        if let Some(id) = exclude_id {
            query.push_str(&format!(" AND id != '{}'", id));
        }

        let count: (i64,) = sqlx::query_as(&query)
            .bind(sku)
            .bind(tenant_id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| {
                vec![ValidationError {
                    field: "sku".to_string(),
                    message: format!("Failed to validate SKU: {}", e), code: None
                }]
            })?;

        if count.0 > 0 {
            return Err(vec![ValidationError {
                field: "sku".to_string(),
                message: format!("SKU '{}' already exists", sku), code: None
            }]);
        }

        Ok(())
    }

    /// Validate barcode uniqueness
    async fn validate_barcode_unique(
        &self,
        barcode: &str,
        tenant_id: &str,
        exclude_id: Option<&str>,
    ) -> Result<(), Vec<ValidationError>> {
        let mut query = "SELECT COUNT(*) as count FROM products WHERE barcode = ? AND tenant_id = ?".to_string();
        
        if let Some(id) = exclude_id {
            query.push_str(&format!(" AND id != '{}'", id));
        }

        let count: (i64,) = sqlx::query_as(&query)
            .bind(barcode)
            .bind(tenant_id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| {
                vec![ValidationError {
                    field: "barcode".to_string(),
                    message: format!("Failed to validate barcode: {}", e), code: None
                }]
            })?;

        if count.0 > 0 {
            return Err(vec![ValidationError {
                field: "barcode".to_string(),
                message: format!("Barcode '{}' already exists", barcode), code: None
            }]);
        }

        Ok(())
    }

    /// Update search index
    async fn update_search_index(
        &self,
        product_id: &str,
        name: &str,
        category: &str,
        tenant_id: &str,
        attributes_str: &str,
    ) -> Result<(), Vec<ValidationError>> {
        // Build searchable text from name and attributes
        let mut searchable_text = name.to_string();
        
        if let Ok(attrs) = serde_json::from_str::<serde_json::Value>(attributes_str) {
            if let Some(obj) = attrs.as_object() {
                for (_, value) in obj {
                    if let Some(s) = value.as_str() {
                        searchable_text.push(' ');
                        searchable_text.push_str(s);
                    }
                }
            }
        }

        // Delete existing entry
        sqlx::query("DELETE FROM product_search_index WHERE product_id = ?")
            .bind(product_id)
            .execute(&self.pool)
            .await
            .ok();

        // Insert new entry
        sqlx::query(
            "INSERT INTO product_search_index (product_id, searchable_text, category, tenant_id)
             VALUES (?, ?, ?, ?)",
        )
        .bind(product_id)
        .bind(&searchable_text)
        .bind(category)
        .bind(tenant_id)
        .execute(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "search_index".to_string(),
                message: format!("Failed to update search index: {}", e), code: None
            }]
        })?;

        Ok(())
    }

    /// Log price change to price history
    async fn log_price_change(
        &self,
        product_id: &str,
        tenant_id: &str,
        old_price: f64,
        new_price: f64,
        old_cost: Option<f64>,
        new_cost: Option<f64>,
        user_id: &str,
        reason: Option<&str>,
    ) -> Result<(), Vec<ValidationError>> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO product_price_history 
             (id, product_id, old_price, new_price, old_cost, new_cost, changed_by, changed_at, reason, tenant_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(product_id)
        .bind(old_price)
        .bind(new_price)
        .bind(old_cost)
        .bind(new_cost)
        .bind(user_id)
        .bind(&now)
        .bind(reason)
        .bind(tenant_id)
        .execute(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "price_history".to_string(),
                message: format!("Failed to log price change: {}", e), code: None
            }]
        })?;

        Ok(())
    }

    /// Log to audit log
    async fn log_audit(
        &self,
        tenant_id: &str,
        product_id: &str,
        action: &str,
        user_id: &str,
        details: Option<&serde_json::Value>,
    ) -> Result<(), Vec<ValidationError>> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let details_str = details.map(|d| serde_json::to_string(d).unwrap());

        sqlx::query(
            "INSERT INTO audit_logs 
             (id, tenant_id, entity_type, entity_id, action, user_id, details, created_at)
             VALUES (?, ?, 'product', ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(tenant_id)
        .bind(product_id)
        .bind(action)
        .bind(user_id)
        .bind(details_str)
        .bind(&now)
        .execute(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "audit_log".to_string(),
                message: format!("Failed to log audit: {}", e), code: None
            }]
        })?;

        Ok(())
    }

    /// Queue for sync
    async fn queue_sync(
        &self,
        tenant_id: &str,
        product_id: &str,
        operation: &str,
    ) -> Result<(), Vec<ValidationError>> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO sync_queue 
             (id, tenant_id, entity_type, entity_id, operation, created_at, status)
             VALUES (?, ?, 'product', ?, ?, ?, 'pending')",
        )
        .bind(&id)
        .bind(tenant_id)
        .bind(product_id)
        .bind(operation)
        .bind(&now)
        .execute(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "sync_queue".to_string(),
                message: format!("Failed to queue sync: {}", e), code: None
            }]
        })?;

        Ok(())
    }
}
