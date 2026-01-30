/**
 * WooCommerce to Supabase Flow
 * 
 * Sync flow: WooCommerce entities → Supabase data warehouse
 * 
 * Steps:
 * 1. Fetch WooCommerce entities (orders, customers, products)
 * 2. Transform to internal format
 * 3. Upsert to Supabase tables
 * 4. Store raw JSON alongside parsed data
 * 5. Update sync state
 * 
 * Requirements: 2.7, 13.3, 13.4
 */

use crate::connectors::woocommerce::client::WooCommerceClient;
use crate::connectors::woocommerce::transformers::WooCommerceTransformers;
use crate::connectors::supabase::client::SupabaseClient;
use crate::models::external_entities::InternalOrder;
use sqlx::SqlitePool;

/// WooCommerce to Supabase sync flow
pub struct WooToSupabaseFlow {
    woo_client: WooCommerceClient,
    supabase_client: SupabaseClient,
}

impl WooToSupabaseFlow {
    pub fn new(
        _db: SqlitePool,
        woo_client: WooCommerceClient,
        supabase_client: SupabaseClient,
    ) -> Self {
        Self {
            woo_client,
            supabase_client,
        }
    }

    /// Get reference to WooCommerce client
    pub fn woo_client(&self) -> &WooCommerceClient {
        &self.woo_client
    }

    /// Get reference to Supabase client
    pub fn supabase_client(&self) -> &SupabaseClient {
        &self.supabase_client
    }

    /// Sync a single order from WooCommerce to Supabase
    pub async fn sync_order(
        &self,
        order_id: i64,
        dry_run: bool,
    ) -> Result<SyncResult, String> {
        // 1. Fetch WooCommerce order
        let woo_order = self.woo_client
            .get_order(order_id)
            .await
            .map_err(|e| format!("Failed to fetch WooCommerce order: {}", e))?;

        // 2. Transform to internal format
        let internal_order = WooCommerceTransformers::order_to_internal(&woo_order)
            .map_err(|e| format!("Failed to transform order: {}", e))?;

        if dry_run {
            return Ok(SyncResult {
                entity_id: order_id.to_string(),
                action: "preview".to_string(),
                supabase_id: None,
            });
        }

        // 3. Upsert to Supabase orders table
        let woo_order_value = serde_json::to_value(&woo_order)
            .map_err(|e| format!("Failed to serialize order: {}", e))?;
        let supabase_id = self.upsert_order(&internal_order, &woo_order_value).await?;

        // 4. Upsert order lines
        self.upsert_order_lines(&supabase_id, &internal_order).await?;

        Ok(SyncResult {
            entity_id: order_id.to_string(),
            action: "upserted".to_string(),
            supabase_id: Some(supabase_id),
        })
    }

    /// Sync a single customer from WooCommerce to Supabase
    pub async fn sync_customer(
        &self,
        customer_id: i64,
        dry_run: bool,
    ) -> Result<SyncResult, String> {
        // 1. Fetch WooCommerce customer
        let woo_customer = self.woo_client
            .get_customer(customer_id)
            .await
            .map_err(|e| format!("Failed to fetch WooCommerce customer: {}", e))?;

        // 2. Transform to internal format
        let internal_customer = WooCommerceTransformers::customer_to_internal(&woo_customer)
            .map_err(|e| format!("Failed to transform customer: {}", e))?;

        if dry_run {
            return Ok(SyncResult {
                entity_id: customer_id.to_string(),
                action: "preview".to_string(),
                supabase_id: None,
            });
        }

        // 3. Upsert to Supabase customers table
        let woo_customer_value = serde_json::to_value(&woo_customer)
            .map_err(|e| format!("Failed to serialize customer: {}", e))?;
        let supabase_id = self.upsert_customer(&internal_customer, &woo_customer_value).await?;

        Ok(SyncResult {
            entity_id: customer_id.to_string(),
            action: "upserted".to_string(),
            supabase_id: Some(supabase_id),
        })
    }

    /// Sync a single product from WooCommerce to Supabase
    pub async fn sync_product(
        &self,
        product_id: i64,
        dry_run: bool,
    ) -> Result<SyncResult, String> {
        // 1. Fetch WooCommerce product
        let woo_product = self.woo_client
            .get_product(product_id)
            .await
            .map_err(|e| format!("Failed to fetch WooCommerce product: {}", e))?;

        // 2. Transform to internal format
        let internal_product = WooCommerceTransformers::product_to_internal(&woo_product)
            .map_err(|e| format!("Failed to transform product: {}", e))?;

        if dry_run {
            return Ok(SyncResult {
                entity_id: product_id.to_string(),
                action: "preview".to_string(),
                supabase_id: None,
            });
        }

        // 3. Upsert to Supabase products table
        let woo_product_value = serde_json::to_value(&woo_product)
            .map_err(|e| format!("Failed to serialize product: {}", e))?;
        let supabase_id = self.upsert_product(&internal_product, &woo_product_value).await?;

        Ok(SyncResult {
            entity_id: product_id.to_string(),
            action: "upserted".to_string(),
            supabase_id: Some(supabase_id),
        })
    }

    /// Upsert order to Supabase
    async fn upsert_order(
        &self,
        order: &InternalOrder,
        raw_data: &serde_json::Value,
    ) -> Result<String, String> {
        let order_data = serde_json::json!({
            "source": "woocommerce",
            "source_id": order.external_ids.get("woocommerce").unwrap_or(&order.id),
            "order_number": order.order_number,
            "status": format!("{:?}", order.status).to_lowercase(),
            "customer_id": order.customer.id,
            "billing_address": serde_json::to_value(&order.billing_address).unwrap_or(serde_json::Value::Null),
            "shipping_address": serde_json::to_value(&order.shipping_address).unwrap_or(serde_json::Value::Null),
            "subtotal": order.subtotal,
            "tax_total": order.tax_total,
            "shipping_total": order.shipping_total,
            "discount_total": order.discount_total,
            "total": order.total,
            "currency": order.currency,
            "raw_data": raw_data,
            "created_at": order.created_at,
            "updated_at": order.updated_at,
            "synced_at": chrono::Utc::now().to_rfc3339()
        });

        self.supabase_client
            .upsert("orders", &order_data)
            .await
            .map_err(|e| format!("Failed to upsert order: {}", e))
    }

    /// Upsert order lines to Supabase
    async fn upsert_order_lines(
        &self,
        order_id: &str,
        order: &InternalOrder,
    ) -> Result<(), String> {
        for line_item in &order.line_items {
            let line_data = serde_json::json!({
                "order_id": order_id,
                "source": "woocommerce",
                "source_id": line_item.id,
                "product_id": line_item.product_id,
                "sku": line_item.sku,
                "name": line_item.name,
                "quantity": line_item.quantity,
                "unit_price": line_item.unit_price,
                "total": line_item.total,
                "tax_class": line_item.tax_class,
                "created_at": chrono::Utc::now().to_rfc3339()
            });

            self.supabase_client
                .upsert("order_lines", &line_data)
                .await
                .map_err(|e| format!("Failed to upsert order line: {}", e))?;
        }

        Ok(())
    }

    /// Upsert customer to Supabase
    async fn upsert_customer(
        &self,
        customer: &crate::models::external_entities::InternalCustomer,
        raw_data: &serde_json::Value,
    ) -> Result<String, String> {
        let customer_data = serde_json::json!({
            "source": "woocommerce",
            "source_id": customer.external_ids.get("woocommerce").unwrap_or(&customer.id),
            "email": customer.email,
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "company": customer.company,
            "phone": customer.phone,
            "billing_address": serde_json::to_value(&customer.billing_address).unwrap_or(serde_json::Value::Null),
            "shipping_address": serde_json::to_value(&customer.shipping_address).unwrap_or(serde_json::Value::Null),
            "raw_data": raw_data,
            "created_at": customer.created_at,
            "updated_at": customer.updated_at,
            "synced_at": chrono::Utc::now().to_rfc3339()
        });

        self.supabase_client
            .upsert("customers", &customer_data)
            .await
            .map_err(|e| format!("Failed to upsert customer: {}", e))
    }

    /// Upsert product to Supabase
    async fn upsert_product(
        &self,
        product: &crate::models::external_entities::InternalProduct,
        raw_data: &serde_json::Value,
    ) -> Result<String, String> {
        let product_data = serde_json::json!({
            "source": "woocommerce",
            "source_id": product.external_ids.get("woocommerce").unwrap_or(&product.id),
            "sku": product.sku,
            "name": product.name,
            "description": product.description,
            "type": format!("{:?}", product.product_type).to_lowercase(),
            "price": product.price,
            "cost_price": product.cost_price,
            "taxable": product.taxable,
            "track_inventory": product.track_inventory,
            "stock_quantity": product.stock_quantity,
            "raw_data": raw_data,
            "created_at": product.created_at,
            "updated_at": product.updated_at,
            "synced_at": chrono::Utc::now().to_rfc3339()
        });

        self.supabase_client
            .upsert("products", &product_data)
            .await
            .map_err(|e| format!("Failed to upsert product: {}", e))
    }
}

/// Sync result
#[derive(Debug, Clone)]
pub struct SyncResult {
    pub entity_id: String,
    pub action: String,
    pub supabase_id: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync_result() {
        let result = SyncResult {
            entity_id: "123".to_string(),
            action: "upserted".to_string(),
            supabase_id: Some("uuid-456".to_string()),
        };

        assert_eq!(result.entity_id, "123");
        assert_eq!(result.action, "upserted");
        assert!(result.supabase_id.is_some());
    }
}
