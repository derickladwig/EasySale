use crate::config::loader::ConfigLoader;
use crate::models::{Product, ProductResponse, ProductSearchRequest, ProductSearchResponse, ValidationError};
use sqlx::SqlitePool;

/// Search service for product search functionality
/// Handles full-text search, filtering, autocomplete, and search index management
pub struct SearchService {
    pool: SqlitePool,
    config_loader: ConfigLoader,
}

impl SearchService {
    pub fn new(pool: SqlitePool, config_loader: ConfigLoader) -> Self {
        Self {
            pool,
            config_loader,
        }
    }

    /// Full-text search with filters
    /// Uses FTS5 index for fast search, supports fuzzy matching and relevance ranking
    pub async fn search_products(
        &self,
        req: ProductSearchRequest,
        tenant_id: &str,
    ) -> Result<ProductSearchResponse, Vec<ValidationError>> {
        let page = req.page.unwrap_or(0);
        let page_size = req.page_size.unwrap_or(50).min(100); // Max 100 items per page
        let offset = page * page_size;

        // Build search query
        let mut query = String::from(
            "SELECT p.* FROM products p 
             INNER JOIN product_search_index psi ON p.id = psi.product_id
             WHERE p.tenant_id = ? AND p.is_active = 1"
        );

        let mut bind_values: Vec<String> = vec![tenant_id.to_string()];

        // Add full-text search if query provided
        if let Some(ref search_query) = req.query {
            if !search_query.trim().is_empty() {
                // FTS5 MATCH query with fuzzy matching support
                query.push_str(" AND psi.searchable_text MATCH ?");
                
                // Build FTS5 query with prefix matching and fuzzy support
                let fts_query = Self::build_fts_query(search_query);
                bind_values.push(fts_query);
            }
        }

        // Add category filter
        if let Some(ref category) = req.category {
            query.push_str(" AND p.category = ?");
            bind_values.push(category.clone());
        }

        // Add attribute filters
        if let Some(ref filters) = req.filters {
            if let Some(filter_obj) = filters.as_object() {
                for (key, value) in filter_obj {
                    // Use JSON_EXTRACT for attribute filtering
                    query.push_str(&format!(" AND JSON_EXTRACT(p.attributes, '$.{}') = ?", key));
                    bind_values.push(value.to_string().trim_matches('"').to_string());
                }
            }
        }

        // Add sorting
        let sort_by = req.sort_by.as_deref().unwrap_or("name");
        let sort_order = req.sort_order.as_deref().unwrap_or("ASC");
        
        // Validate sort fields to prevent SQL injection
        let valid_sort_fields = ["name", "sku", "unit_price", "cost", "quantity_on_hand", "created_at", "updated_at"];
        let sort_field = if valid_sort_fields.contains(&sort_by) {
            sort_by
        } else {
            "name"
        };

        let order = if sort_order.to_uppercase() == "DESC" { "DESC" } else { "ASC" };

        // Add relevance ranking if search query provided
        if req.query.is_some() {
            query.push_str(&format!(" ORDER BY psi.rank, p.{} {}", sort_field, order));
        } else {
            query.push_str(&format!(" ORDER BY p.{} {}", sort_field, order));
        }

        query.push_str(&format!(" LIMIT {} OFFSET {}", page_size, offset));

        // Execute search query
        let mut sql_query = sqlx::query_as::<_, Product>(&query);
        for value in &bind_values {
            sql_query = sql_query.bind(value);
        }

        let products = sql_query
            .fetch_all(&self.pool)
            .await
            .map_err(|e| {
                vec![ValidationError {
                    field: "search".to_string(),
                    message: format!("Search failed: {}", e), code: None
                }]
            })?;

        // Get total count
        let count_query = Self::build_count_query(&req, tenant_id);
        let mut count_sql = sqlx::query_as::<_, (i64,)>(&count_query);
        for value in &bind_values[..bind_values.len().saturating_sub(0)] {
            count_sql = count_sql.bind(value);
        }

        let total: (i64,) = count_sql
            .fetch_one(&self.pool)
            .await
            .unwrap_or((0,));

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

    /// Autocomplete suggestions
    /// Returns up to 10 suggestions after 3 characters
    pub async fn autocomplete(
        &self,
        query: &str,
        tenant_id: &str,
        category: Option<&str>,
        limit: u32,
    ) -> Result<Vec<String>, Vec<ValidationError>> {
        if query.len() < 3 {
            return Ok(Vec::new());
        }

        let limit = limit.min(10); // Max 10 suggestions

        let mut sql = String::from(
            "SELECT DISTINCT p.name FROM products p
             INNER JOIN product_search_index psi ON p.id = psi.product_id
             WHERE p.tenant_id = ? AND p.is_active = 1
             AND psi.searchable_text MATCH ?"
        );

        if let Some(_cat) = category {
            sql.push_str(" AND p.category = ?");
        }

        sql.push_str(&format!(" LIMIT {}", limit));

        // Build FTS5 query for prefix matching
        let fts_query = format!("{}*", query.trim());

        let mut query_builder = sqlx::query_as::<_, (String,)>(&sql)
            .bind(tenant_id)
            .bind(&fts_query);

        if let Some(cat) = category {
            query_builder = query_builder.bind(cat);
        }

        let results = query_builder
            .fetch_all(&self.pool)
            .await
            .map_err(|e| {
                vec![ValidationError {
                    field: "autocomplete".to_string(),
                    message: format!("Autocomplete failed: {}", e), code: None
                }]
            })?;

        Ok(results.into_iter().map(|(name,)| name).collect())
    }

    /// Update search index for a product
    /// Called automatically on product create/update
    pub async fn update_index(
        &self,
        product_id: &str,
        tenant_id: &str,
    ) -> Result<(), Vec<ValidationError>> {
        // Fetch product
        let product = sqlx::query_as::<_, Product>(
            "SELECT * FROM products WHERE id = ? AND tenant_id = ?"
        )
        .bind(product_id)
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "product".to_string(),
                message: format!("Product not found: {}", e), code: None
            }]
        })?;

        // Load category config to get search fields
        let config = self.config_loader.get_config(tenant_id).await.map_err(|e| {
            vec![ValidationError {
                field: "config".to_string(),
                message: format!("Failed to load config: {}", e), code: None
            }]
        })?;

        let category_config = config
            .categories
            .iter()
            .find(|c| c.id == product.category)
            .ok_or_else(|| {
                vec![ValidationError {
                    field: "category".to_string(),
                    message: format!("Category '{}' not found", product.category), code: None
                }]
            })?;

        // Build searchable text from configured search fields
        let mut searchable_text = vec![product.name.clone(), product.sku.clone()];

        if let Some(ref search_fields) = category_config.search_fields {
            if let Ok(attrs) = product.get_attributes() {
                if let Some(attrs_obj) = attrs.as_object() {
                    for field in search_fields {
                        if let Some(value) = attrs_obj.get(field) {
                            if let Some(s) = value.as_str() {
                                searchable_text.push(s.to_string());
                            } else if let Some(n) = value.as_f64() {
                                searchable_text.push(n.to_string());
                            }
                        }
                    }
                }
            }
        }

        let searchable_text_str = searchable_text.join(" ");

        // Delete existing entry
        sqlx::query("DELETE FROM product_search_index WHERE product_id = ?")
            .bind(product_id)
            .execute(&self.pool)
            .await
            .ok();

        // Insert new entry
        sqlx::query(
            "INSERT INTO product_search_index (product_id, searchable_text, category, tenant_id)
             VALUES (?, ?, ?, ?)"
        )
        .bind(product_id)
        .bind(&searchable_text_str)
        .bind(&product.category)
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

    /// Rebuild entire search index
    /// Used for maintenance or after configuration changes
    pub async fn rebuild_index(&self, tenant_id: &str) -> Result<u32, Vec<ValidationError>> {
        tracing::info!("Rebuilding search index for tenant: {}", tenant_id);

        // Delete all existing entries for tenant
        sqlx::query("DELETE FROM product_search_index WHERE tenant_id = ?")
            .bind(tenant_id)
            .execute(&self.pool)
            .await
            .map_err(|e| {
                vec![ValidationError {
                    field: "search_index".to_string(),
                    message: format!("Failed to clear search index: {}", e), code: None
                }]
            })?;

        // Fetch all active products for tenant
        let products = sqlx::query_as::<_, Product>(
            "SELECT * FROM products WHERE tenant_id = ? AND is_active = 1"
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "products".to_string(),
                message: format!("Failed to fetch products: {}", e), code: None
            }]
        })?;

        let mut indexed_count = 0;

        // Index each product
        for product in products {
            if let Err(e) = self.update_index(&product.id, tenant_id).await {
                tracing::warn!("Failed to index product {}: {:?}", product.id, e);
            } else {
                indexed_count += 1;
            }
        }

        tracing::info!("Rebuilt search index: {} products indexed", indexed_count);

        Ok(indexed_count)
    }

    // Helper methods

    /// Build FTS5 query with fuzzy matching support
    fn build_fts_query(query: &str) -> String {
        let terms: Vec<&str> = query.trim().split_whitespace().collect();
        
        if terms.is_empty() {
            return String::new();
        }

        // Build query with prefix matching for each term
        // Example: "honda civic" -> "honda* civic*"
        let fts_terms: Vec<String> = terms
            .iter()
            .map(|term| format!("{}*", term))
            .collect();

        fts_terms.join(" ")
    }

    /// Build count query for pagination
    fn build_count_query(req: &ProductSearchRequest, _tenant_id: &str) -> String {
        let mut query = String::from(
            "SELECT COUNT(*) FROM products p 
             INNER JOIN product_search_index psi ON p.id = psi.product_id
             WHERE p.tenant_id = ? AND p.is_active = 1"
        );

        if req.query.is_some() {
            query.push_str(" AND psi.searchable_text MATCH ?");
        }

        if req.category.is_some() {
            query.push_str(" AND p.category = ?");
        }

        if let Some(ref filters) = req.filters {
            if let Some(filter_obj) = filters.as_object() {
                for (key, _) in filter_obj {
                    query.push_str(&format!(" AND JSON_EXTRACT(p.attributes, '$.{}') = ?", key));
                }
            }
        }

        query
    }

    /// Search by barcode (fast lookup)
    pub async fn search_by_barcode(
        &self,
        barcode: &str,
        tenant_id: &str,
    ) -> Result<Option<ProductResponse>, Vec<ValidationError>> {
        let product = sqlx::query_as::<_, Product>(
            "SELECT * FROM products 
             WHERE barcode = ? AND tenant_id = ? AND is_active = 1
             LIMIT 1"
        )
        .bind(barcode)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "barcode".to_string(),
                message: format!("Barcode search failed: {}", e), code: None
            }]
        })?;

        Ok(product.map(ProductResponse::from))
    }

    /// Search by SKU (fast lookup)
    pub async fn search_by_sku(
        &self,
        sku: &str,
        tenant_id: &str,
    ) -> Result<Option<ProductResponse>, Vec<ValidationError>> {
        let product = sqlx::query_as::<_, Product>(
            "SELECT * FROM products 
             WHERE sku = ? AND tenant_id = ? AND is_active = 1
             LIMIT 1"
        )
        .bind(sku)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| {
            vec![ValidationError {
                field: "sku".to_string(),
                message: format!("SKU search failed: {}", e), code: None
            }]
        })?;

        Ok(product.map(ProductResponse::from))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_build_fts_query() {
        let service = SearchService {
            pool: sqlx::SqlitePool::connect("sqlite::memory:").await.unwrap(),
            config_loader: ConfigLoader::new("./configs", 300, false),
        };

        assert_eq!(SearchService::build_fts_query("honda"), "honda*");
        assert_eq!(SearchService::build_fts_query("honda civic"), "honda* civic*");
        assert_eq!(SearchService::build_fts_query("  honda  civic  "), "honda* civic*");
        assert_eq!(SearchService::build_fts_query(""), "");
    }
}
