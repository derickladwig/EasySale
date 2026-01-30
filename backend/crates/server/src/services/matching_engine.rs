use crate::models::product::Product;
use crate::models::vendor::{VendorBillLine, VendorSkuAlias};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

/// Engine for matching vendor SKUs to internal products
pub struct MatchingEngine {
    pool: SqlitePool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchResult {
    pub matched_sku: String,
    pub confidence: f64,
    pub reason: String,
    pub alternatives: Vec<MatchCandidate>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchCandidate {
    pub sku: String,
    pub name: String,
    pub confidence: f64,
    pub reason: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub product_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cost: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantity_on_hand: Option<f64>,
}

/// Request for getting match suggestions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchSuggestionsRequest {
    pub vendor_sku: String,
    pub description: String,
    pub vendor_id: Option<String>,
    pub limit: Option<usize>,
}

/// Response containing match suggestions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchSuggestionsResponse {
    pub suggestions: Vec<MatchCandidate>,
    pub total_candidates: usize,
}

impl MatchingEngine {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Match a vendor bill line to internal products
    /// Requirements: 6.1, 6.3, 10.1
    pub async fn match_line(
        &self,
        line: &VendorBillLine,
        vendor_id: &str,
        tenant_id: &str,
    ) -> Result<MatchResult, sqlx::Error> {
        let vendor_sku_norm = VendorBillLine::normalize_sku(&line.vendor_sku_raw);

        // Try matching strategies in order
        
        // 1. Exact alias match (confidence = 1.0)
        if let Some(result) = self.match_by_alias(&vendor_sku_norm, vendor_id, tenant_id).await? {
            return Ok(result);
        }

        // 2. Exact internal SKU match (confidence = 0.9)
        if let Some(result) = self.match_by_exact_sku(&vendor_sku_norm, tenant_id).await? {
            return Ok(result);
        }

        // 3. MPN/Barcode match (confidence = 0.85)
        if let Some(result) = self.match_by_mpn_or_barcode(&vendor_sku_norm, tenant_id).await? {
            return Ok(result);
        }

        // 4. Fuzzy description match (confidence = similarity * 0.8)
        if let Some(result) = self.match_by_description(&line.desc_raw, tenant_id).await? {
            return Ok(result);
        }

        // 5. Historical match (confidence = 0.75)
        if let Some(result) = self.match_by_history(
            &vendor_sku_norm,
            &line.desc_raw,
            vendor_id,
            tenant_id
        ).await? {
            return Ok(result);
        }

        // No match found - gather alternatives for user review
        let alternatives = self.get_suggestions(&vendor_sku_norm, &line.desc_raw, tenant_id, 5).await?;

        Ok(MatchResult {
            matched_sku: String::new(),
            confidence: 0.0,
            reason: "No match found".to_string(),
            alternatives,
        })
    }

    /// Get match suggestions for a vendor SKU and description
    /// Returns ranked list of potential matches for user selection
    pub async fn get_suggestions(
        &self,
        vendor_sku_norm: &str,
        description: &str,
        tenant_id: &str,
        limit: usize,
    ) -> Result<Vec<MatchCandidate>, sqlx::Error> {
        let mut candidates: Vec<MatchCandidate> = Vec::new();

        // Get all active products for matching
        let products = sqlx::query_as::<_, Product>(
            r#"
            SELECT * FROM products
            WHERE tenant_id = ? AND is_active = 1
            LIMIT 500
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await?;

        for product in products {
            let mut best_confidence = 0.0;
            let mut best_reason = String::new();

            // Check SKU similarity
            let sku_norm = Self::normalize_for_matching(&product.sku);
            let sku_similarity = Self::calculate_similarity(vendor_sku_norm, &sku_norm);
            if sku_similarity > best_confidence {
                best_confidence = sku_similarity * 0.85; // SKU match penalty
                best_reason = format!("SKU similarity ({:.0}%)", sku_similarity * 100.0);
            }

            // Check description similarity
            let desc_similarity = Self::calculate_similarity(description, &product.name);
            if desc_similarity * 0.8 > best_confidence {
                best_confidence = desc_similarity * 0.8; // Description match penalty
                best_reason = format!("Description similarity ({:.0}%)", desc_similarity * 100.0);
            }

            // Check barcode match
            if let Some(ref barcode) = product.barcode {
                let barcode_norm = Self::normalize_for_matching(barcode);
                if barcode_norm == vendor_sku_norm {
                    best_confidence = 0.85;
                    best_reason = "Barcode match".to_string();
                }
            }

            // Only include candidates with reasonable confidence
            if best_confidence > 0.3 {
                candidates.push(MatchCandidate {
                    sku: product.sku.clone(),
                    name: product.name.clone(),
                    confidence: best_confidence,
                    reason: best_reason,
                    product_id: Some(product.id.clone()),
                    category: Some(product.category.clone()),
                    cost: Some(product.cost),
                    quantity_on_hand: Some(product.quantity_on_hand),
                });
            }
        }

        // Sort by confidence descending
        candidates.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());

        // Return top N candidates
        Ok(candidates.into_iter().take(limit).collect())
    }

    /// Get match suggestions from request
    pub async fn get_match_suggestions(
        &self,
        request: &MatchSuggestionsRequest,
        tenant_id: &str,
    ) -> Result<MatchSuggestionsResponse, sqlx::Error> {
        let vendor_sku_norm = VendorBillLine::normalize_sku(&request.vendor_sku);
        let limit = request.limit.unwrap_or(10);

        // First check for exact alias match if vendor_id provided
        if let Some(ref vendor_id) = request.vendor_id {
            if let Some(result) = self.match_by_alias(&vendor_sku_norm, vendor_id, tenant_id).await? {
                return Ok(MatchSuggestionsResponse {
                    suggestions: vec![MatchCandidate {
                        sku: result.matched_sku.clone(),
                        name: String::new(), // Will be populated by caller
                        confidence: result.confidence,
                        reason: result.reason,
                        product_id: None,
                        category: None,
                        cost: None,
                        quantity_on_hand: None,
                    }],
                    total_candidates: 1,
                });
            }
        }

        let suggestions = self.get_suggestions(&vendor_sku_norm, &request.description, tenant_id, limit).await?;
        let total = suggestions.len();

        Ok(MatchSuggestionsResponse {
            suggestions,
            total_candidates: total,
        })
    }

    /// Normalize string for matching (remove special chars, uppercase)
    fn normalize_for_matching(s: &str) -> String {
        s.trim()
            .to_uppercase()
            .chars()
            .filter(|c| c.is_alphanumeric())
            .collect()
    }

    /// Match by vendor SKU alias
    /// Requirements: 6.2, 7.2
    async fn match_by_alias(
        &self,
        vendor_sku_norm: &str,
        vendor_id: &str,
        tenant_id: &str,
    ) -> Result<Option<MatchResult>, sqlx::Error> {
        let alias = sqlx::query_as::<_, VendorSkuAlias>(
            r#"
            SELECT * FROM vendor_sku_aliases
            WHERE vendor_id = ? AND vendor_sku_norm = ? AND tenant_id = ?
            ORDER BY priority DESC, usage_count DESC
            LIMIT 1
            "#,
        )
        .bind(vendor_id)
        .bind(vendor_sku_norm)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(alias) = alias {
            // Get product details to verify it exists and is active
            let product = self.get_product(&alias.internal_sku, tenant_id).await?;
            
            if let Some(product) = product {
                // Verify product is active before returning match
                if !product.is_active {
                    tracing::warn!(
                        "Product {} matched by vendor SKU but is inactive",
                        alias.internal_sku
                    );
                    return Ok(None);
                }
                
                tracing::debug!(
                    "Product {} matched by vendor SKU alias: {} -> {}",
                    product.name,
                    vendor_sku_norm,
                    alias.internal_sku
                );
                
                return Ok(Some(MatchResult {
                    matched_sku: alias.internal_sku.clone(),
                    confidence: 1.0,
                    reason: format!("Matched by vendor SKU alias (used {} times)", alias.usage_count),
                    alternatives: vec![MatchCandidate {
                        sku: product.sku.clone(),
                        name: product.name.clone(),
                        confidence: 1.0,
                        reason: format!("Vendor alias match (used {} times)", alias.usage_count),
                        product_id: Some(product.id.clone()),
                        category: Some(product.category.clone()),
                        cost: Some(product.cost),
                        quantity_on_hand: Some(product.quantity_on_hand),
                    }],
                }));
            } else {
                // Alias exists but product doesn't - data inconsistency
                tracing::error!(
                    "Vendor SKU alias points to non-existent product: {}",
                    alias.internal_sku
                );
            }
        }

        Ok(None)
    }

    /// Match by MPN (Manufacturer Part Number) or barcode
    /// Requirements: 6.2, 20.2
    async fn match_by_mpn_or_barcode(
        &self,
        vendor_sku_norm: &str,
        tenant_id: &str,
    ) -> Result<Option<MatchResult>, sqlx::Error> {
        // Check barcode match
        let product = sqlx::query_as::<_, Product>(
            r#"
            SELECT * FROM products
            WHERE UPPER(REPLACE(REPLACE(REPLACE(barcode, '-', ''), ' ', ''), '_', '')) = ?
            AND tenant_id = ? AND is_active = 1
            LIMIT 1
            "#,
        )
        .bind(vendor_sku_norm)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(product) = product {
            return Ok(Some(MatchResult {
                matched_sku: product.sku.clone(),
                confidence: 0.85,
                reason: "Matched by barcode/MPN".to_string(),
                alternatives: vec![MatchCandidate {
                    sku: product.sku.clone(),
                    name: product.name.clone(),
                    confidence: 0.85,
                    reason: "Barcode/MPN match".to_string(),
                    product_id: Some(product.id.clone()),
                    category: Some(product.category.clone()),
                    cost: Some(product.cost),
                    quantity_on_hand: Some(product.quantity_on_hand),
                }],
            }));
        }

        // Check attributes for MPN field
        let products_with_mpn = sqlx::query_as::<_, Product>(
            r#"
            SELECT * FROM products
            WHERE tenant_id = ? AND is_active = 1
            AND (
                attributes LIKE '%"mpn":"' || ? || '"%'
                OR attributes LIKE '%"manufacturer_part_number":"' || ? || '"%'
                OR attributes LIKE '%"vendor_sku":"' || ? || '"%'
            )
            LIMIT 1
            "#,
        )
        .bind(tenant_id)
        .bind(vendor_sku_norm)
        .bind(vendor_sku_norm)
        .bind(vendor_sku_norm)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(product) = products_with_mpn {
            return Ok(Some(MatchResult {
                matched_sku: product.sku.clone(),
                confidence: 0.85,
                reason: "Matched by MPN in attributes".to_string(),
                alternatives: vec![MatchCandidate {
                    sku: product.sku.clone(),
                    name: product.name.clone(),
                    confidence: 0.85,
                    reason: "MPN attribute match".to_string(),
                    product_id: Some(product.id.clone()),
                    category: Some(product.category.clone()),
                    cost: Some(product.cost),
                    quantity_on_hand: Some(product.quantity_on_hand),
                }],
            }));
        }

        Ok(None)
    }

    /// Match by exact internal SKU
    /// Requirements: 6.2, 20.2
    async fn match_by_exact_sku(
        &self,
        vendor_sku_norm: &str,
        tenant_id: &str,
    ) -> Result<Option<MatchResult>, sqlx::Error> {
        let product = sqlx::query_as::<_, Product>(
            r#"
            SELECT * FROM products
            WHERE UPPER(REPLACE(REPLACE(REPLACE(sku, '-', ''), ' ', ''), '_', '')) = ?
            AND tenant_id = ? AND is_active = 1
            LIMIT 1
            "#,
        )
        .bind(vendor_sku_norm)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(product) = product {
            return Ok(Some(MatchResult {
                matched_sku: product.sku.clone(),
                confidence: 0.9,
                reason: "Matched by exact internal SKU".to_string(),
                alternatives: vec![MatchCandidate {
                    sku: product.sku.clone(),
                    name: product.name.clone(),
                    confidence: 0.9,
                    reason: "Exact SKU match".to_string(),
                    product_id: Some(product.id.clone()),
                    category: Some(product.category.clone()),
                    cost: Some(product.cost),
                    quantity_on_hand: Some(product.quantity_on_hand),
                }],
            }));
        }

        Ok(None)
    }

    /// Match by fuzzy description
    /// Requirements: 6.2, 6.4
    async fn match_by_description(
        &self,
        description: &str,
        tenant_id: &str,
    ) -> Result<Option<MatchResult>, sqlx::Error> {
        // Get all products for fuzzy matching
        let products = sqlx::query_as::<_, Product>(
            r#"
            SELECT * FROM products
            WHERE tenant_id = ? AND is_active = 1
            LIMIT 100
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await?;

        let mut candidates: Vec<MatchCandidate> = products
            .iter()
            .map(|p| {
                let similarity = Self::calculate_similarity(description, &p.name);
                MatchCandidate {
                    sku: p.sku.clone(),
                    name: p.name.clone(),
                    confidence: similarity * 0.8, // Fuzzy match penalty
                    reason: format!("Matched by description similarity ({:.0}%)", similarity * 100.0),
                    product_id: Some(p.id.clone()),
                    category: Some(p.category.clone()),
                    cost: Some(p.cost),
                    quantity_on_hand: Some(p.quantity_on_hand),
                }
            })
            .filter(|c| c.confidence > 0.5) // Only keep reasonable matches
            .collect();

        // Sort by confidence
        candidates.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());

        if let Some(best) = candidates.first() {
            let alternatives = candidates.iter().take(5).cloned().collect();
            
            return Ok(Some(MatchResult {
                matched_sku: best.sku.clone(),
                confidence: best.confidence,
                reason: best.reason.clone(),
                alternatives,
            }));
        }

        Ok(None)
    }

    /// Match by historical mapping
    /// Requirements: 6.2, 6.7
    async fn match_by_history(
        &self,
        vendor_sku_norm: &str,
        description: &str,
        vendor_id: &str,
        tenant_id: &str,
    ) -> Result<Option<MatchResult>, sqlx::Error> {
        // Find previously confirmed matches for similar items
        let historical = sqlx::query_as::<_, VendorBillLine>(
            r#"
            SELECT vbl.* FROM vendor_bill_lines vbl
            JOIN vendor_bills vb ON vbl.vendor_bill_id = vb.id
            WHERE vb.vendor_id = ? AND vb.tenant_id = ?
            AND vbl.matched_sku IS NOT NULL
            AND vbl.user_overridden = 1
            AND (vbl.vendor_sku_norm = ? OR vbl.desc_raw LIKE ?)
            ORDER BY vbl.created_at DESC
            LIMIT 1
            "#,
        )
        .bind(vendor_id)
        .bind(tenant_id)
        .bind(vendor_sku_norm)
        .bind(format!("%{}%", description))
        .fetch_optional(&self.pool)
        .await?;

        if let Some(hist) = historical {
            if let Some(matched_sku) = hist.matched_sku {
                // Get product details
                let product = self.get_product(&matched_sku, tenant_id).await?;
                
                let alternatives = if let Some(ref p) = product {
                    vec![MatchCandidate {
                        sku: p.sku.clone(),
                        name: p.name.clone(),
                        confidence: 0.75,
                        reason: "Historical mapping (previously confirmed)".to_string(),
                        product_id: Some(p.id.clone()),
                        category: Some(p.category.clone()),
                        cost: Some(p.cost),
                        quantity_on_hand: Some(p.quantity_on_hand),
                    }]
                } else {
                    Vec::new()
                };

                return Ok(Some(MatchResult {
                    matched_sku: matched_sku.clone(),
                    confidence: 0.75,
                    reason: "Matched by historical mapping (previously confirmed)".to_string(),
                    alternatives,
                }));
            }
        }

        Ok(None)
    }

    /// Calculate Levenshtein similarity between two strings
    fn calculate_similarity(s1: &str, s2: &str) -> f64 {
        let s1_lower = s1.to_lowercase();
        let s2_lower = s2.to_lowercase();
        
        let distance = Self::levenshtein_distance(&s1_lower, &s2_lower);
        let max_len = s1_lower.len().max(s2_lower.len()) as f64;
        
        if max_len == 0.0 {
            return 1.0;
        }
        
        1.0 - (distance as f64 / max_len)
    }

    /// Calculate Levenshtein distance
    fn levenshtein_distance(s1: &str, s2: &str) -> usize {
        let len1 = s1.chars().count();
        let len2 = s2.chars().count();
        
        let mut matrix = vec![vec![0; len2 + 1]; len1 + 1];
        
        for i in 0..=len1 {
            matrix[i][0] = i;
        }
        for j in 0..=len2 {
            matrix[0][j] = j;
        }
        
        for (i, c1) in s1.chars().enumerate() {
            for (j, c2) in s2.chars().enumerate() {
                let cost = if c1 == c2 { 0 } else { 1 };
                matrix[i + 1][j + 1] = (matrix[i][j + 1] + 1)
                    .min(matrix[i + 1][j] + 1)
                    .min(matrix[i][j] + cost);
            }
        }
        
        matrix[len1][len2]
    }

    /// Get product by SKU
    async fn get_product(&self, sku: &str, tenant_id: &str) -> Result<Option<Product>, sqlx::Error> {
        sqlx::query_as::<_, Product>(
            "SELECT * FROM products WHERE sku = ? AND tenant_id = ? AND is_active = 1"
        )
        .bind(sku)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await
    }

    /// Apply confidence thresholds
    /// Requirements: 10.2, 10.3
    pub fn apply_thresholds(confidence: f64, auto_accept: f64, review: f64) -> MatchStatus {
        if confidence >= auto_accept {
            MatchStatus::AutoAccept
        } else if confidence >= review {
            MatchStatus::Review
        } else {
            MatchStatus::Manual
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum MatchStatus {
    AutoAccept,
    Review,
    Manual,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_levenshtein_distance() {
        assert_eq!(MatchingEngine::levenshtein_distance("kitten", "sitting"), 3);
        assert_eq!(MatchingEngine::levenshtein_distance("hello", "hello"), 0);
        assert_eq!(MatchingEngine::levenshtein_distance("", "test"), 4);
    }

    #[test]
    fn test_calculate_similarity() {
        let sim1 = MatchingEngine::calculate_similarity("Motor Oil 5W-30", "Motor Oil 5W30");
        assert!(sim1 > 0.9); // Very similar

        let sim2 = MatchingEngine::calculate_similarity("Motor Oil", "Brake Fluid");
        assert!(sim2 < 0.5); // Not similar

        let sim3 = MatchingEngine::calculate_similarity("test", "test");
        assert_eq!(sim3, 1.0); // Identical
    }

    #[test]
    fn test_apply_thresholds() {
        assert_eq!(
            MatchingEngine::apply_thresholds(0.96, 0.95, 0.70),
            MatchStatus::AutoAccept
        );
        
        assert_eq!(
            MatchingEngine::apply_thresholds(0.85, 0.95, 0.70),
            MatchStatus::Review
        );
        
        assert_eq!(
            MatchingEngine::apply_thresholds(0.60, 0.95, 0.70),
            MatchStatus::Manual
        );
    }
}
