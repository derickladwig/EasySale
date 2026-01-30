use crate::models::vendor::{VendorBill, VendorBillLine, VendorBillParse};
use crate::services::file_service::FileService;
use crate::services::image_preprocessing::ImagePreprocessor;
use crate::services::multi_pass_ocr::MultiPassOCRService;
use crate::services::ocr_service::{OCRService, OCRResult};
use crate::services::parsing_service::{ParsingService, ParsedBill};
use crate::services::vendor_service::VendorService;
use chrono::Utc;
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;
use uuid::Uuid;

/// Service for orchestrating vendor bill ingestion
/// Coordinates file storage, OCR, parsing, and matching
#[allow(dead_code)] // Planned feature - full ingestion pipeline
pub struct BillIngestService {
    pool: SqlitePool,
    file_service: FileService,
    ocr_service: OCRService,
    multi_pass_ocr: MultiPassOCRService,
    preprocessor: ImagePreprocessor,
    vendor_service: VendorService,
    use_multi_pass: bool,
    use_preprocessing: bool,
}

#[derive(Debug)]
#[allow(dead_code)] // Planned feature
pub enum IngestError {
    FileError(String),
    OCRError(String),
    ParsingError(String),
    DatabaseError(String),
    DuplicateFile(String),
}

impl std::fmt::Display for IngestError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            IngestError::FileError(msg) => write!(f, "File error: {}", msg),
            IngestError::OCRError(msg) => write!(f, "OCR error: {}", msg),
            IngestError::ParsingError(msg) => write!(f, "Parsing error: {}", msg),
            IngestError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            IngestError::DuplicateFile(msg) => write!(f, "Duplicate file: {}", msg),
        }
    }
}

impl std::error::Error for IngestError {}

impl From<sqlx::Error> for IngestError {
    fn from(err: sqlx::Error) -> Self {
        IngestError::DatabaseError(err.to_string())
    }
}

impl BillIngestService {
    #[allow(dead_code)] // Planned feature
    pub fn new(
        pool: SqlitePool,
        file_service: FileService,
        ocr_service: OCRService,
        vendor_service: VendorService,
    ) -> Self {
        // Create multi-pass OCR service from base OCR service
        let multi_pass_ocr = MultiPassOCRService::with_defaults(
            ocr_service.engine.clone()
        );
        
        // Create image preprocessor with default pipeline
        let preprocessor = ImagePreprocessor::new();
        
        Self {
            pool,
            file_service,
            ocr_service,
            multi_pass_ocr,
            preprocessor,
            vendor_service,
            use_multi_pass: true, // Enable multi-pass by default
            use_preprocessing: true, // Enable preprocessing by default
        }
    }
    
    /// Enable or disable multi-pass OCR
    pub fn set_multi_pass(&mut self, enabled: bool) {
        self.use_multi_pass = enabled;
    }
    
    /// Enable or disable image preprocessing
    pub fn set_preprocessing(&mut self, enabled: bool) {
        self.use_preprocessing = enabled;
    }

    /// Upload and save vendor bill file
    /// Requirements: 1.1, 1.2, 5.1
    pub async fn upload_bill(
        &self,
        file_data: &[u8],
        filename: &str,
        mime_type: &str,
        vendor_id: Option<String>,
        tenant_id: &str,
        uploaded_by: &str,
    ) -> Result<String, IngestError> {
        // Generate bill ID
        let bill_id = Uuid::new_v4().to_string();
        
        // Get file extension
        let extension = FileService::extension_from_mime(mime_type);

        // Save file
        let (file_path, file_hash, file_size) = self.file_service
            .save_bill_file(tenant_id, &bill_id, file_data, extension)
            .await
            .map_err(|e| IngestError::FileError(e.to_string()))?;

        // Check for duplicate file hash
        if let Some(existing_path) = self.file_service
            .check_duplicate_hash(tenant_id, &file_hash)
            .map_err(|e| IngestError::FileError(e.to_string()))?
        {
            if existing_path != file_path {
                return Err(IngestError::DuplicateFile(format!(
                    "File already exists: {}",
                    existing_path
                )));
            }
        }

        // Detect vendor if not provided
        let detected_vendor_id = if let Some(vid) = vendor_id {
            vid
        } else {
            // Quick OCR preview for vendor detection
            let preview_text = format!("{}", filename);
            if let Ok(Some((vendor, _confidence))) = self.vendor_service
                .detect_vendor(&preview_text, Some(filename), tenant_id)
                .await
            {
                vendor.id
            } else {
                // No vendor detected, will need manual selection
                String::new()
            }
        };

        // Create vendor_bill record
        let now = Utc::now().to_rfc3339();
        let bill = sqlx::query_as::<_, VendorBill>(
            r#"
            INSERT INTO vendor_bills (
                id, vendor_id, invoice_no, invoice_date, po_number,
                subtotal, tax, total, file_path, file_hash, file_size, mime_type,
                status, idempotency_key, tenant_id, created_at, updated_at
            )
            VALUES (?, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, ?, ?, 'DRAFT', NULL, ?, ?, ?)
            RETURNING *
            "#,
        )
        .bind(&bill_id)
        .bind(&detected_vendor_id)
        .bind(&file_path)
        .bind(&file_hash)
        .bind(file_size)
        .bind(mime_type)
        .bind(tenant_id)
        .bind(&now)
        .bind(&now)
        .fetch_one(&self.pool)
        .await?;

        // Log to audit_log
        let _ = sqlx::query(
            r#"
            INSERT INTO audit_log (
                id, entity_type, entity_id, action, user_id, tenant_id, timestamp
            )
            VALUES (?, 'vendor_bill', ?, 'upload', ?, ?, ?)
            "#,
        )
        .bind(Uuid::new_v4().to_string())
        .bind(&bill_id)
        .bind(uploaded_by)
        .bind(tenant_id)
        .bind(&now)
        .execute(&self.pool)
        .await;

        Ok(bill.id)
    }

    /// Process OCR and parse bill
    /// Requirements: 2.1, 2.4, 3.1, 3.2
    pub async fn process_ocr(
        &self,
        bill_id: &str,
        tenant_id: &str,
    ) -> Result<(), IngestError> {
        // Get bill
        let bill = self.get_bill(bill_id, tenant_id).await?;

        // Check if already parsed (cache check)
        let cache_key = Self::generate_cache_key(&bill.file_hash, None, None);
        if let Some(_cached_parse) = self.get_cached_parse(bill_id).await? {
            // Already parsed, skip OCR
            return Ok(());
        }

        // Get file path
        let full_path = format!("data/uploads/{}", bill.file_path);
        
        // Preprocess image if enabled
        let ocr_input_path = if self.use_preprocessing {
            let preprocessed_path = format!("{}.preprocessed.png", full_path);
            
            match self.preprocessor.preprocess(&full_path, &preprocessed_path) {
                Ok(_result) => preprocessed_path,
                Err(e) => {
                    // Log preprocessing error but continue with original
                    eprintln!("Preprocessing failed: {}, using original image", e);
                    full_path.clone()
                }
            }
        } else {
            full_path.clone()
        };
        
        // Use multi-pass OCR if enabled, otherwise single-pass
        let (ocr_text, ocr_confidence, ocr_engine) = if self.use_multi_pass {
            let multi_result = self.multi_pass_ocr
                .process_image(&ocr_input_path)
                .await
                .map_err(|e| IngestError::OCRError(e.to_string()))?;
            
            (
                multi_result.text,
                multi_result.confidence,
                format!("multi-pass-{}", multi_result.pass_results.len()),
            )
        } else {
            let single_result = self.ocr_service
                .process_image(&ocr_input_path)
                .await
                .map_err(|e| IngestError::OCRError(e.to_string()))?;
            
            (
                single_result.text,
                single_result.confidence,
                single_result.engine,
            )
        };

        // Get vendor template if available
        let template = if !bill.vendor_id.is_empty() {
            self.vendor_service
                .get_vendor_templates(tenant_id)
                .await
                .ok()
                .and_then(|templates| templates.into_iter().next())
        } else {
            None
        };

        // Parse OCR text
        let parsed_bill = if let Some(ref tmpl) = template {
            ParsingService::parse_with_template(&ocr_text, tmpl)
                .map_err(|e| IngestError::ParsingError(e.to_string()))?
        } else {
            ParsingService::parse_generic(&ocr_text)
                .map_err(|e| IngestError::ParsingError(e.to_string()))?
        };

        // Validate totals
        let _ = ParsingService::validate_totals(&parsed_bill, 5.0); // 5% tolerance

        // Store parse result (with updated signature)
        self.store_parse_result_with_engine(
            bill_id,
            &ocr_text,
            ocr_confidence,
            &ocr_engine,
            &parsed_bill,
            template.as_ref(),
            &cache_key
        ).await?;

        // Create line items
        self.create_line_items(bill_id, &parsed_bill).await?;

        // Update bill with parsed header data
        self.update_bill_header(bill_id, &parsed_bill).await?;

        // Update bill status to REVIEW
        self.update_bill_status(bill_id, "REVIEW").await?;

        Ok(())
    }

    /// Get bill with parse and lines
    /// Requirements: 14.3
    pub async fn get_bill_with_parse(
        &self,
        bill_id: &str,
        tenant_id: &str,
    ) -> Result<(VendorBill, Option<VendorBillParse>, Vec<VendorBillLine>), IngestError> {
        let bill = self.get_bill(bill_id, tenant_id).await?;
        let parse = self.get_cached_parse(bill_id).await?;
        let lines = self.get_bill_lines(bill_id).await?;

        Ok((bill, parse, lines))
    }

    // Helper methods

    async fn get_bill(&self, bill_id: &str, tenant_id: &str) -> Result<VendorBill, IngestError> {
        sqlx::query_as::<_, VendorBill>(
            "SELECT * FROM vendor_bills WHERE id = ? AND tenant_id = ?"
        )
        .bind(bill_id)
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| IngestError::DatabaseError(e.to_string()))
    }

    async fn get_cached_parse(&self, bill_id: &str) -> Result<Option<VendorBillParse>, IngestError> {
        sqlx::query_as::<_, VendorBillParse>(
            "SELECT * FROM vendor_bill_parses WHERE vendor_bill_id = ? ORDER BY created_at DESC LIMIT 1"
        )
        .bind(bill_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| IngestError::DatabaseError(e.to_string()))
    }

    async fn get_bill_lines(&self, bill_id: &str) -> Result<Vec<VendorBillLine>, IngestError> {
        sqlx::query_as::<_, VendorBillLine>(
            "SELECT * FROM vendor_bill_lines WHERE vendor_bill_id = ? ORDER BY line_no"
        )
        .bind(bill_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| IngestError::DatabaseError(e.to_string()))
    }

    fn generate_cache_key(
        file_hash: &str,
        template_version: Option<&str>,
        config_hash: Option<&str>,
    ) -> String {
        let mut hasher = Sha256::new();
        hasher.update(file_hash.as_bytes());
        if let Some(tv) = template_version {
            hasher.update(tv.as_bytes());
        }
        if let Some(ch) = config_hash {
            hasher.update(ch.as_bytes());
        }
        format!("{:x}", hasher.finalize())
    }

    /// Store parse result in database
    /// 
    /// Note: Currently unused - reserved for future parse result storage.
    #[allow(dead_code)]
    async fn store_parse_result(
        &self,
        bill_id: &str,
        ocr_result: &OCRResult,
        parsed_bill: &ParsedBill,
        template: Option<&crate::models::vendor::VendorTemplate>,
        cache_key: &str,
    ) -> Result<(), IngestError> {
        self.store_parse_result_with_engine(
            bill_id,
            &ocr_result.text,
            ocr_result.confidence,
            &ocr_result.engine,
            parsed_bill,
            template,
            cache_key,
        ).await
    }

    async fn store_parse_result_with_engine(
        &self,
        bill_id: &str,
        ocr_text: &str,
        ocr_confidence: f64,
        ocr_engine: &str,
        parsed_bill: &ParsedBill,
        template: Option<&crate::models::vendor::VendorTemplate>,
        cache_key: &str,
    ) -> Result<(), IngestError> {
        let now = Utc::now().to_rfc3339();
        let parsed_json = serde_json::to_string(parsed_bill)
            .map_err(|e| IngestError::ParsingError(e.to_string()))?;

        let template_id = template.map(|t| t.id.clone());
        let template_version = template.map(|t| t.version);

        sqlx::query(
            r#"
            INSERT INTO vendor_bill_parses (
                id, vendor_bill_id, ocr_text, ocr_confidence, parsed_json,
                template_id, template_version, ocr_engine, config_hash, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(Uuid::new_v4().to_string())
        .bind(bill_id)
        .bind(ocr_text)
        .bind(ocr_confidence)
        .bind(&parsed_json)
        .bind(template_id)
        .bind(template_version)
        .bind(ocr_engine)
        .bind(cache_key)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn create_line_items(
        &self,
        bill_id: &str,
        parsed_bill: &ParsedBill,
    ) -> Result<(), IngestError> {
        let now = Utc::now().to_rfc3339();

        for item in &parsed_bill.line_items {
            let vendor_sku_norm = item.vendor_sku.as_ref()
                .map(|s| VendorBillLine::normalize_sku(s))
                .unwrap_or_default();

            sqlx::query(
                r#"
                INSERT INTO vendor_bill_lines (
                    id, vendor_bill_id, line_no, vendor_sku_raw, vendor_sku_norm,
                    desc_raw, qty_raw, unit_raw, unit_price_raw, ext_price_raw,
                    normalized_qty, normalized_unit, matched_sku, match_confidence,
                    match_reason, user_overridden, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, 0, ?)
                "#,
            )
            .bind(Uuid::new_v4().to_string())
            .bind(bill_id)
            .bind(item.line_no)
            .bind(&item.vendor_sku)
            .bind(&vendor_sku_norm)
            .bind(&item.description)
            .bind(&item.quantity)
            .bind(&item.unit)
            .bind(&item.unit_price)
            .bind(&item.extended_price)
            .bind(&now)
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    async fn update_bill_header(
        &self,
        bill_id: &str,
        parsed_bill: &ParsedBill,
    ) -> Result<(), IngestError> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            UPDATE vendor_bills
            SET invoice_no = ?, invoice_date = ?, po_number = ?,
                subtotal = ?, tax = ?, total = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&parsed_bill.header.invoice_no)
        .bind(&parsed_bill.header.invoice_date)
        .bind(&parsed_bill.header.po_number)
        .bind(parsed_bill.totals.subtotal)
        .bind(parsed_bill.totals.tax)
        .bind(parsed_bill.totals.total)
        .bind(&now)
        .bind(bill_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn update_bill_status(
        &self,
        bill_id: &str,
        status: &str,
    ) -> Result<(), IngestError> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE vendor_bills SET status = ?, updated_at = ? WHERE id = ?"
        )
        .bind(status)
        .bind(&now)
        .bind(bill_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_generate_cache_key() {
        let key1 = BillIngestService::generate_cache_key("hash1", Some("v1"), Some("config1"));
        let key2 = BillIngestService::generate_cache_key("hash1", Some("v1"), Some("config1"));
        let key3 = BillIngestService::generate_cache_key("hash1", Some("v2"), Some("config1"));

        // Same inputs should produce same key
        assert_eq!(key1, key2);
        
        // Different inputs should produce different keys
        assert_ne!(key1, key3);
    }
}
