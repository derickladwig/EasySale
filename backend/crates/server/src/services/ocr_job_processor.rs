// OCR Job Processor Service
// Background worker for processing queued OCR jobs

use crate::services::ocr_engine::{OcrEngine, OcrProfile, TesseractEngine};
use crate::services::parsing_service::ParsingService;
use sqlx::SqlitePool;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tokio::time::sleep;

/// OCR Job Processor for background processing of queued jobs
pub struct OcrJobProcessor {
    pool: SqlitePool,
    ocr_engine: Arc<dyn OcrEngine>,
    is_running: Arc<Mutex<bool>>,
    poll_interval: Duration,
    batch_size: i64,
}

#[derive(Debug, sqlx::FromRow)]
#[allow(dead_code)]
struct OcrJob {
    id: String,
    tenant_id: String,
    source_file_path: String,
    source_file_type: String,
    ocr_profile: String,
    review_case_id: Option<String>,
    retry_count: i32,
    max_retries: i32,
}

impl OcrJobProcessor {
    /// Create a new OCR job processor with default Tesseract engine
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool,
            ocr_engine: Arc::new(TesseractEngine::new()),
            is_running: Arc::new(Mutex::new(false)),
            poll_interval: Duration::from_secs(5),
            batch_size: 10,
        }
    }

    /// Create with custom OCR engine
    pub fn with_engine(pool: SqlitePool, engine: Arc<dyn OcrEngine>) -> Self {
        Self {
            pool,
            ocr_engine: engine,
            is_running: Arc::new(Mutex::new(false)),
            poll_interval: Duration::from_secs(5),
            batch_size: 10,
        }
    }

    /// Start the background processor
    pub async fn start(&self) -> Result<(), String> {
        let mut running = self.is_running.lock().await;
        if *running {
            return Err("Processor already running".to_string());
        }
        *running = true;
        drop(running);

        tracing::info!("OCR Job Processor started");

        loop {
            let running = self.is_running.lock().await;
            if !*running {
                break;
            }
            drop(running);

            // Process batch of jobs
            if let Err(e) = self.process_batch().await {
                tracing::error!("Error processing OCR batch: {}", e);
            }

            sleep(self.poll_interval).await;
        }

        tracing::info!("OCR Job Processor stopped");
        Ok(())
    }

    /// Stop the background processor
    pub async fn stop(&self) {
        let mut running = self.is_running.lock().await;
        *running = false;
    }

    /// Process a batch of queued jobs
    async fn process_batch(&self) -> Result<usize, String> {
        // Fetch queued jobs ordered by priority and creation time
        let jobs = sqlx::query_as::<_, OcrJob>(
            r#"SELECT id, tenant_id, source_file_path, source_file_type, 
                      ocr_profile, review_case_id, retry_count, max_retries
               FROM ocr_jobs 
               WHERE status = 'QUEUED' AND retry_count < max_retries
               ORDER BY priority DESC, created_at ASC
               LIMIT ?"#
        )
        .bind(self.batch_size)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| format!("Failed to fetch jobs: {}", e))?;

        let job_count = jobs.len();
        
        for job in jobs {
            if let Err(e) = self.process_job(&job).await {
                tracing::error!("Failed to process job {}: {}", job.id, e);
                self.mark_job_failed(&job.id, &e).await;
            }
        }

        Ok(job_count)
    }

    /// Process a single OCR job
    async fn process_job(&self, job: &OcrJob) -> Result<(), String> {
        let start_time = std::time::Instant::now();
        let now = chrono::Utc::now().to_rfc3339();

        // Mark job as processing
        sqlx::query(
            "UPDATE ocr_jobs SET status = 'PROCESSING', started_at = ?, updated_at = ? WHERE id = ?"
        )
        .bind(&now)
        .bind(&now)
        .bind(&job.id)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to update job status: {}", e))?;

        // Get OCR profile
        let profile = match job.ocr_profile.as_str() {
            "numbers-only" => OcrProfile::numbers_only(),
            "table-dense" => OcrProfile::table_dense(),
            "header-fields" => OcrProfile::header_fields(),
            "single-word" => OcrProfile::single_word(),
            _ => OcrProfile::full_page_default(),
        };

        // Run OCR
        let ocr_result = self.ocr_engine
            .process(&job.source_file_path, &profile)
            .await
            .map_err(|e| format!("OCR failed: {}", e))?;

        // Parse the OCR text
        let parsed_result = ParsingService::parse_generic(&ocr_result.text)
            .map_err(|e| format!("Parsing failed: {}", e))?;

        // Build extracted fields JSON
        let extracted_fields = build_extracted_fields(&parsed_result, ocr_result.avg_confidence);
        let extracted_json = serde_json::to_string(&extracted_fields)
            .map_err(|e| format!("JSON serialization failed: {}", e))?;

        // Update review case with OCR results
        if let Some(ref case_id) = job.review_case_id {
            let validation_result = build_validation_result(&extracted_fields);
            let validation_json = serde_json::to_string(&validation_result)
                .map_err(|e| format!("Validation JSON failed: {}", e))?;

            sqlx::query(
                r#"UPDATE review_cases 
                   SET state = 'NeedsReview', 
                       confidence = ?,
                       extracted_data = ?,
                       validation_result = ?,
                       ocr_raw_text = ?,
                       updated_at = ?
                   WHERE id = ?"#
            )
            .bind((ocr_result.avg_confidence * 100.0) as i32)
            .bind(&extracted_json)
            .bind(&validation_json)
            .bind(&ocr_result.text)
            .bind(&now)
            .bind(case_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to update review case: {}", e))?;
        }

        let processing_time_ms = start_time.elapsed().as_millis() as i64;

        // Mark job as completed
        sqlx::query(
            r#"UPDATE ocr_jobs 
               SET status = 'COMPLETED', 
                   completed_at = ?, 
                   processing_time_ms = ?,
                   updated_at = ? 
               WHERE id = ?"#
        )
        .bind(&now)
        .bind(processing_time_ms)
        .bind(&now)
        .bind(&job.id)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to mark job complete: {}", e))?;

        tracing::info!(
            "Processed OCR job {} in {}ms (confidence: {:.1}%)",
            job.id,
            processing_time_ms,
            ocr_result.avg_confidence * 100.0
        );

        Ok(())
    }

    /// Mark a job as failed
    async fn mark_job_failed(&self, job_id: &str, error: &str) {
        let now = chrono::Utc::now().to_rfc3339();
        
        let result = sqlx::query(
            r#"UPDATE ocr_jobs 
               SET status = 'FAILED', 
                   error_message = ?,
                   updated_at = ? 
               WHERE id = ?"#
        )
        .bind(error)
        .bind(&now)
        .bind(job_id)
        .execute(&self.pool)
        .await;

        if let Err(e) = result {
            tracing::error!("Failed to mark job {} as failed: {}", job_id, e);
        }
    }

    /// Process a single job by ID (for manual triggering)
    pub async fn process_single(&self, job_id: &str) -> Result<(), String> {
        let job = sqlx::query_as::<_, OcrJob>(
            r#"SELECT id, tenant_id, source_file_path, source_file_type, 
                      ocr_profile, review_case_id, retry_count, max_retries
               FROM ocr_jobs WHERE id = ?"#
        )
        .bind(job_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| format!("Failed to fetch job: {}", e))?
        .ok_or_else(|| "Job not found".to_string())?;

        self.process_job(&job).await
    }
}

#[derive(Debug, serde::Serialize)]
struct ExtractedField {
    name: String,
    value: String,
    confidence: u8,
    source: String,
}

#[derive(Debug, serde::Serialize)]
struct ValidationResult {
    hard_flags: Vec<String>,
    soft_flags: Vec<String>,
    can_approve: bool,
}

fn build_extracted_fields(
    parsed: &crate::services::parsing_service::ParsedBill,
    avg_confidence: f64,
) -> Vec<ExtractedField> {
    let confidence = (avg_confidence * 100.0) as u8;
    let mut fields = vec![];

    if let Some(ref inv_no) = parsed.header.invoice_no {
        fields.push(ExtractedField {
            name: "invoice_number".to_string(),
            value: inv_no.clone(),
            confidence,
            source: "ocr".to_string(),
        });
    }

    if let Some(ref inv_date) = parsed.header.invoice_date {
        fields.push(ExtractedField {
            name: "invoice_date".to_string(),
            value: inv_date.clone(),
            confidence,
            source: "ocr".to_string(),
        });
    }

    if let Some(ref vendor) = parsed.header.vendor_name {
        fields.push(ExtractedField {
            name: "vendor_name".to_string(),
            value: vendor.clone(),
            confidence,
            source: "ocr".to_string(),
        });
    }

    if let Some(total) = parsed.totals.total {
        fields.push(ExtractedField {
            name: "total".to_string(),
            value: format!("{:.2}", total),
            confidence,
            source: "ocr".to_string(),
        });
    }

    fields
}

fn build_validation_result(fields: &[ExtractedField]) -> ValidationResult {
    let mut hard_flags = Vec::new();
    let mut soft_flags = Vec::new();

    // Check required fields
    let has_invoice_number = fields.iter().any(|f| f.name == "invoice_number" && !f.value.is_empty());
    let has_total = fields.iter().any(|f| f.name == "total" && !f.value.is_empty());

    if !has_invoice_number {
        hard_flags.push("Missing required field: invoice_number".to_string());
    }
    if !has_total {
        hard_flags.push("Missing required field: total".to_string());
    }

    // Check confidence levels
    for field in fields {
        if field.confidence < 50 {
            hard_flags.push(format!("Low confidence on field: {} ({}%)", field.name, field.confidence));
        } else if field.confidence < 70 {
            soft_flags.push(format!("Moderate confidence on field: {} ({}%)", field.name, field.confidence));
        }
    }

    ValidationResult {
        can_approve: hard_flags.is_empty(),
        hard_flags,
        soft_flags,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_validation_result_empty() {
        let fields: Vec<ExtractedField> = vec![];
        let result = build_validation_result(&fields);
        
        assert!(!result.can_approve);
        assert!(result.hard_flags.contains(&"Missing required field: invoice_number".to_string()));
        assert!(result.hard_flags.contains(&"Missing required field: total".to_string()));
    }

    #[test]
    fn test_build_validation_result_complete() {
        let fields = vec![
            ExtractedField {
                name: "invoice_number".to_string(),
                value: "INV-001".to_string(),
                confidence: 95,
                source: "ocr".to_string(),
            },
            ExtractedField {
                name: "total".to_string(),
                value: "100.00".to_string(),
                confidence: 90,
                source: "ocr".to_string(),
            },
        ];
        let result = build_validation_result(&fields);
        
        assert!(result.can_approve);
        assert!(result.hard_flags.is_empty());
    }

    #[test]
    fn test_build_validation_result_low_confidence() {
        let fields = vec![
            ExtractedField {
                name: "invoice_number".to_string(),
                value: "INV-001".to_string(),
                confidence: 40,
                source: "ocr".to_string(),
            },
            ExtractedField {
                name: "total".to_string(),
                value: "100.00".to_string(),
                confidence: 90,
                source: "ocr".to_string(),
            },
        ];
        let result = build_validation_result(&fields);
        
        assert!(!result.can_approve);
        assert!(result.hard_flags.iter().any(|f| f.contains("Low confidence")));
    }
}
