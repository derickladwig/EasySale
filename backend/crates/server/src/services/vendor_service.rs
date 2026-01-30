use crate::models::vendor::{Vendor, VendorTemplate};
use chrono::Utc;
use sqlx::SqlitePool;
use uuid::Uuid;

/// Service for vendor CRUD operations
pub struct VendorService {
    pool: SqlitePool,
}

impl VendorService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Create a new vendor
    /// Requirements: 5.1, 20.4
    pub async fn create_vendor(
        &self,
        tenant_id: &str,
        req: crate::models::CreateVendorRequest,
    ) -> Result<Vendor, String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let identifiers_str = serde_json::to_string(&req.identifiers.unwrap_or(serde_json::json!({})))
            .unwrap_or_else(|_| "{}".to_string());

        let vendor = sqlx::query_as::<_, Vendor>(
            r#"
            INSERT INTO vendors (
                id, name, tax_id, email, phone, address, website,
                identifiers, tenant_id, is_active, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            RETURNING *
            "#,
        )
        .bind(&id)
        .bind(&req.name)
        .bind(&req.tax_id)
        .bind(&req.email)
        .bind(&req.phone)
        .bind(&req.address)
        .bind(&req.website)
        .bind(&identifiers_str)
        .bind(tenant_id)
        .bind(&now)
        .bind(&now)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| format!("Failed to create vendor: {}", e))?;

        Ok(vendor)
    }

    /// Get vendor by ID
    /// Requirements: 5.2, 19.1
    pub async fn get_vendor(
        &self,
        tenant_id: &str,
        id: &str,
    ) -> Result<Option<Vendor>, String> {
        sqlx::query_as::<_, Vendor>(
            r#"
            SELECT * FROM vendors
            WHERE id = ? AND tenant_id = ?
            "#,
        )
        .bind(id)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| format!("Failed to get vendor: {}", e))
    }

    /// List vendors with pagination
    /// Requirements: 5.2, 19.1
    pub async fn list_vendors(
        &self,
        tenant_id: &str,
    ) -> Result<Vec<Vendor>, String> {
        sqlx::query_as::<_, Vendor>(
            r#"
            SELECT * FROM vendors
            WHERE tenant_id = ? AND is_active = 1
            ORDER BY name ASC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| format!("Failed to list vendors: {}", e))
    }

    /// Detect vendor from bill text or filename
    /// Requirements: 5.1, 5.2, 5.4
    pub async fn detect_vendor(
        &self,
        text: &str,
        filename: Option<&str>,
        tenant_id: &str,
    ) -> Result<Option<(Vendor, f64)>, String> {
        let vendors = self.list_vendors(tenant_id).await?;

        let mut best_match: Option<(Vendor, f64)> = None;
        let search_text = format!(
            "{} {}",
            text.to_lowercase(),
            filename.unwrap_or("").to_lowercase()
        );

        for vendor in vendors {
            if let Ok(identifiers) = vendor.get_identifiers() {
                if let Some(keywords) = identifiers.get("keywords").and_then(|k| k.as_array()) {
                    let mut match_count = 0;
                    let total_keywords = keywords.len();

                    for keyword in keywords {
                        if let Some(kw) = keyword.as_str() {
                            if search_text.contains(&kw.to_lowercase()) {
                                match_count += 1;
                            }
                        }
                    }

                    if match_count > 0 {
                        let confidence = match_count as f64 / total_keywords as f64;
                        if best_match.is_none() || confidence > best_match.as_ref().unwrap().1 {
                            best_match = Some((vendor.clone(), confidence));
                        }
                    }
                }
            }
        }

        Ok(best_match)
    }

    /// Get vendor templates
    /// Requirements: 4.1, 4.2
    pub async fn get_vendor_templates(
        &self,
        tenant_id: &str,
    ) -> Result<Vec<VendorTemplate>, String> {
        sqlx::query_as::<_, VendorTemplate>(
            r#"
            SELECT * FROM vendor_templates
            WHERE tenant_id = ? AND active = 1
            ORDER BY version DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| format!("Failed to get vendor templates: {}", e))
    }

    /// Update vendor
    pub async fn update_vendor(
        &self,
        tenant_id: &str,
        id: &str,
        req: crate::models::UpdateVendorRequest,
    ) -> Result<Vendor, String> {
        let now = Utc::now().to_rfc3339();

        // Convert identifiers to string if present
        let identifiers_str = req.identifiers.as_ref()
            .map(|i| serde_json::to_string(i).unwrap_or_else(|_| "{}".to_string()));

        // Convert is_active to integer if present
        let is_active_int = req.is_active.map(|b| if b { 1 } else { 0 });

        sqlx::query(
            r#"
            UPDATE vendors 
            SET name = COALESCE(?, name),
                tax_id = COALESCE(?, tax_id),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                address = COALESCE(?, address),
                website = COALESCE(?, website),
                identifiers = COALESCE(?, identifiers),
                is_active = COALESCE(?, is_active),
                updated_at = ?
            WHERE id = ? AND tenant_id = ?
            "#,
        )
        .bind(&req.name)
        .bind(&req.tax_id)
        .bind(&req.email)
        .bind(&req.phone)
        .bind(&req.address)
        .bind(&req.website)
        .bind(identifiers_str)
        .bind(is_active_int)
        .bind(&now)
        .bind(id)
        .bind(tenant_id)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to update vendor: {}", e))?;

        self.get_vendor(tenant_id, id).await?
            .ok_or_else(|| "Vendor not found after update".to_string())
    }

    /// Delete vendor (soft delete)
    pub async fn delete_vendor(
        &self,
        tenant_id: &str,
        id: &str,
    ) -> Result<(), String> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            UPDATE vendors 
            SET is_active = 0, updated_at = ?
            WHERE id = ? AND tenant_id = ?
            "#,
        )
        .bind(&now)
        .bind(id)
        .bind(tenant_id)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to delete vendor: {}", e))?;

        Ok(())
    }

    /// Create vendor template
    pub async fn create_vendor_template(
        &self,
        tenant_id: &str,
        req: crate::models::CreateVendorTemplateRequest,
    ) -> Result<VendorTemplate, String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let config_json = serde_json::to_string(&req.config)
            .unwrap_or_else(|_| "{}".to_string());

        // Get the next version number for this vendor
        let max_version: Option<i32> = sqlx::query_scalar(
            "SELECT MAX(version) FROM vendor_templates WHERE vendor_id = ? AND tenant_id = ?"
        )
        .bind(&req.vendor_id)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| format!("Failed to get max version: {}", e))?
        .flatten();

        let version = max_version.unwrap_or(0) + 1;

        let template = sqlx::query_as::<_, VendorTemplate>(
            r#"
            INSERT INTO vendor_templates (
                id, vendor_id, name, version, config_json, active, tenant_id, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
            RETURNING *
            "#,
        )
        .bind(&id)
        .bind(&req.vendor_id)
        .bind(&req.name)
        .bind(version)
        .bind(&config_json)
        .bind(tenant_id)
        .bind(&now)
        .bind(&now)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| format!("Failed to create vendor template: {}", e))?;

        Ok(template)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[tokio::test]
    async fn test_detect_vendor() {
        // This would require a test database setup
        // Placeholder for actual test implementation
    }

    #[test]
    fn test_vendor_detection_logic() {
        let text = "Invoice from ACME Corporation Invoice #12345";
        let keywords = vec!["acme", "corporation"];
        
        let mut match_count = 0;
        for keyword in &keywords {
            if text.to_lowercase().contains(keyword) {
                match_count += 1;
            }
        }
        
        let confidence = match_count as f64 / keywords.len() as f64;
        assert_eq!(confidence, 1.0);
    }
}
