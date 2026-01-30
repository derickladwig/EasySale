/**
 * WooCommerce to QuickBooks Flow
 * 
 * Sync flow: WooCommerce order → Internal → QuickBooks Invoice
 * 
 * Steps:
 * 1. Fetch WooCommerce order
 * 2. Transform to internal format
 * 3. Resolve customer (create if missing)
 * 4. Resolve items (create if missing)
 * 5. Create Invoice or SalesReceipt
 * 6. Store ID mapping
 * 7. Update sync state
 * 
 * Requirements: 2.2, 2.6, 11.4
 */

use crate::connectors::woocommerce::client::WooCommerceClient;
use crate::connectors::woocommerce::transformers::WooCommerceTransformers;
use crate::connectors::quickbooks::client::QuickBooksClient;
use crate::connectors::quickbooks::transformers::{QuickBooksTransformers, TransformerConfig};
use crate::services::id_mapper::IdMapper;
use crate::models::external_entities::{InternalOrder, PaymentStatus};
use sqlx::SqlitePool;

/// WooCommerce to QuickBooks sync flow
pub struct WooToQboFlow {
    woo_client: WooCommerceClient,
    qbo_client: QuickBooksClient,
    id_mapper: IdMapper,
    transformer_config: TransformerConfig,
}

impl WooToQboFlow {
    pub fn new(
        db: SqlitePool,
        woo_client: WooCommerceClient,
        qbo_client: QuickBooksClient,
        transformer_config: TransformerConfig,
    ) -> Self {
        let id_mapper = IdMapper::new(db);
        Self {
            woo_client,
            qbo_client,
            id_mapper,
            transformer_config,
        }
    }
    
    /// Create with default transformer configuration
    pub fn with_default_config(
        db: SqlitePool,
        woo_client: WooCommerceClient,
        qbo_client: QuickBooksClient,
    ) -> Self {
        Self::new(db, woo_client, qbo_client, TransformerConfig::default())
    }

    /// Get reference to WooCommerce client
    pub fn woo_client(&self) -> &WooCommerceClient {
        &self.woo_client
    }

    /// Get reference to QuickBooks client
    pub fn qbo_client(&self) -> &QuickBooksClient {
        &self.qbo_client
    }

    /// Sync a single order from WooCommerce to QuickBooks
    pub async fn sync_order(
        &self,
        tenant_id: &str,
        order_id: i64,
        dry_run: bool,
    ) -> Result<SyncOrderResult, String> {
        // 1. Fetch WooCommerce order
        let woo_order = self.woo_client
            .get_order(order_id)
            .await
            .map_err(|e| format!("Failed to fetch WooCommerce order: {}", e))?;

        // 2. Transform to internal format
        let internal_order = WooCommerceTransformers::order_to_internal(&woo_order)
            .map_err(|e| format!("Failed to transform order: {}", e))?;

        if dry_run {
            return Ok(SyncOrderResult {
                order_id: order_id.to_string(),
                action: "preview".to_string(),
                qbo_id: None,
                customer_created: false,
                items_created: 0,
            });
        }

        // 3. Resolve customer (create if missing)
        let customer_created = self.resolve_customer(tenant_id, &internal_order).await?;

        // 4. Resolve items (create if missing)
        let items_created = self.resolve_items(tenant_id, &internal_order).await?;

        // 5. Create Invoice or SalesReceipt based on payment status
        let qbo_id = match internal_order.payment_status {
            PaymentStatus::Paid => {
                // Create SalesReceipt for paid orders
                self.create_sales_receipt(tenant_id, &internal_order).await?
            }
            _ => {
                // Create Invoice for unpaid/partial orders
                self.create_invoice(tenant_id, &internal_order).await?
            }
        };

        // 6. Store ID mapping
        self.id_mapper.store_mapping(
            tenant_id,
            "woocommerce",
            "order",
            &order_id.to_string(),
            "quickbooks",
            "invoice",
            &qbo_id,
        ).await?;

        Ok(SyncOrderResult {
            order_id: order_id.to_string(),
            action: "created".to_string(),
            qbo_id: Some(qbo_id),
            customer_created,
            items_created,
        })
    }

    /// Resolve customer - create if doesn't exist
    async fn resolve_customer(
        &self,
        tenant_id: &str,
        order: &InternalOrder,
    ) -> Result<bool, String> {
        let customer_email = &order.customer.email;

        // Check if mapping exists
        if let Some(_qbo_customer_id) = self.id_mapper.get_mapping(
            tenant_id,
            "woocommerce",
            "customer",
            customer_email,
            "quickbooks",
        ).await? {
            // Customer already exists
            return Ok(false);
        }

        // Search for customer in QuickBooks by email
        if let Ok(Some(existing_customer)) = self.qbo_client.query_customer_by_email(customer_email).await {
            // Customer already exists - store mapping
            if let Some(id) = existing_customer.id {
                self.id_mapper.store_mapping(
                    tenant_id,
                    "woocommerce",
                    "customer",
                    customer_email,
                    "quickbooks",
                    "customer",
                    &id,
                ).await?;
                return Ok(false);
            }
        }

        // Create new customer using typed method
        let qbo_customer = QuickBooksTransformers::internal_customer_to_qbo(&order.customer)
            .map_err(|e| format!("Failed to transform customer: {}", e))?;
        
        let created_customer = self.qbo_client.create_customer(&qbo_customer)
            .await
            .map_err(|e| format!("Failed to create customer: {}", e))?;

        // Store mapping
        if let Some(id) = created_customer.id {
            self.id_mapper.store_mapping(
                tenant_id,
                "woocommerce",
                "customer",
                customer_email,
                "quickbooks",
                "customer",
                &id,
            ).await?;
        }

        Ok(true)
    }

    /// Resolve items - create if don't exist
    async fn resolve_items(
        &self,
        tenant_id: &str,
        order: &InternalOrder,
    ) -> Result<usize, String> {
        let mut items_created = 0;

        for line_item in &order.line_items {
            let sku = &line_item.sku;

            // Check if mapping exists
            if self.id_mapper.get_mapping(
                tenant_id,
                "woocommerce",
                "product",
                sku,
                "quickbooks",
            ).await?.is_some() {
                continue;
            }

            // Search for item in QuickBooks by SKU
            if let Ok(Some(existing_item)) = self.qbo_client.query_item_by_sku(sku).await {
                // Item already exists - store mapping
                if let Some(id) = existing_item.id {
                    self.id_mapper.store_mapping(
                        tenant_id,
                        "woocommerce",
                        "product",
                        sku,
                        "quickbooks",
                        "item",
                        &id,
                    ).await?;
                    continue;
                }
            }

            // Create new item using typed method
            use crate::connectors::quickbooks::item::{QBItem, AccountRef};
            
            let qbo_item = QBItem {
                id: None,
                sync_token: None,
                name: line_item.name.clone(),
                sku: Some(sku.clone()),
                item_type: "NonInventory".to_string(),
                description: None,
                active: Some(true),
                unit_price: Some(line_item.unit_price),
                purchase_cost: None,
                qty_on_hand: None,
                inv_start_date: None,
                income_account_ref: AccountRef {
                    value: "79".to_string(),  // Default sales income account
                    name: Some("Sales".to_string()),
                },
                expense_account_ref: None,
                asset_account_ref: None,
                track_qty_on_hand: None,
                meta_data: None,
            };

            let created_item = self.qbo_client.create_item(&qbo_item)
                .await
                .map_err(|e| format!("Failed to create item: {}", e))?;

            // Store mapping
            if let Some(id) = created_item.id {
                self.id_mapper.store_mapping(
                    tenant_id,
                    "woocommerce",
                    "product",
                    sku,
                    "quickbooks",
                    "item",
                    &id,
                ).await?;
                items_created += 1;
            }
        }

        Ok(items_created)
    }

    /// Create QuickBooks Invoice using transformer
    async fn create_invoice(
        &self,
        tenant_id: &str,
        order: &InternalOrder,
    ) -> Result<String, String> {
        // Get customer ID from mapping
        let customer_id = self.id_mapper.get_mapping(
            tenant_id,
            "woocommerce",
            "customer",
            &order.customer.email,
            "quickbooks",
        ).await?
        .ok_or_else(|| "Customer mapping not found".to_string())?;

        // Transform order to QuickBooks invoice using new transformer
        let qbo_invoice = QuickBooksTransformers::internal_order_to_qbo(
            order,
            &customer_id,
            &self.transformer_config,
        ).map_err(|e| format!("Failed to transform invoice: {}", e))?;

        // Create invoice via API
        let invoice_json = serde_json::to_value(&qbo_invoice)
            .map_err(|e| format!("Failed to serialize invoice: {}", e))?;
        
        let created = self.qbo_client.create("invoice", &invoice_json).await?;

        Ok(created.get("Invoice")
            .and_then(|i| i.get("Id"))
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string())
    }

    /// Create QuickBooks SalesReceipt (for paid orders)
    async fn create_sales_receipt(
        &self,
        tenant_id: &str,
        order: &InternalOrder,
    ) -> Result<String, String> {
        // Get customer ID from mapping
        let customer_id = self.id_mapper.get_mapping(
            tenant_id,
            "woocommerce",
            "customer",
            &order.customer.email,
            "quickbooks",
        ).await?
        .ok_or_else(|| "Customer mapping not found".to_string())?;

        // Transform order to QuickBooks invoice (same structure for SalesReceipt)
        let qbo_invoice = QuickBooksTransformers::internal_order_to_qbo(
            order,
            &customer_id,
            &self.transformer_config,
        ).map_err(|e| format!("Failed to transform sales receipt: {}", e))?;

        // Convert to SalesReceipt format (similar structure to Invoice)
        let sales_receipt = serde_json::json!({
            "DocNumber": qbo_invoice.doc_number,
            "TxnDate": qbo_invoice.txn_date,
            "CustomerRef": qbo_invoice.customer_ref,
            "Line": qbo_invoice.line,
            "BillAddr": qbo_invoice.bill_addr,
            "ShipAddr": qbo_invoice.ship_addr,
        });

        let created = self.qbo_client.create("salesreceipt", &sales_receipt).await?;

        Ok(created.get("SalesReceipt")
            .and_then(|sr| sr.get("Id"))
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string())
    }
}

/// Sync order result
#[derive(Debug, Clone)]
pub struct SyncOrderResult {
    pub order_id: String,
    pub action: String,
    pub qbo_id: Option<String>,
    pub customer_created: bool,
    pub items_created: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync_order_result() {
        let result = SyncOrderResult {
            order_id: "123".to_string(),
            action: "created".to_string(),
            qbo_id: Some("456".to_string()),
            customer_created: true,
            items_created: 2,
        };

        assert_eq!(result.order_id, "123");
        assert_eq!(result.action, "created");
        assert!(result.qbo_id.is_some());
        assert!(result.customer_created);
        assert_eq!(result.items_created, 2);
    }
}
