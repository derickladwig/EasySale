-- Migration 046: OCR Jobs Table
-- Creates the ocr_jobs table for tracking OCR processing jobs

-- OCR jobs table for background processing queue
CREATE TABLE IF NOT EXISTS ocr_jobs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    
    -- Job status: QUEUED, PROCESSING, COMPLETED, FAILED, CANCELLED
    status TEXT NOT NULL DEFAULT 'QUEUED',
    
    -- Source file information
    source_file_path TEXT NOT NULL,
    source_file_type TEXT NOT NULL,
    source_file_hash TEXT NOT NULL,
    source_file_size INTEGER NOT NULL,
    
    -- Processing configuration
    ocr_profile TEXT NOT NULL DEFAULT 'full-page-default',
    priority INTEGER NOT NULL DEFAULT 0,
    
    -- Result references
    review_case_id TEXT,
    vendor_bill_id TEXT,
    
    -- Processing metadata
    started_at TEXT,
    completed_at TEXT,
    processing_time_ms INTEGER,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    
    -- Foreign keys
    FOREIGN KEY (review_case_id) REFERENCES review_cases(id) ON DELETE SET NULL,
    FOREIGN KEY (vendor_bill_id) REFERENCES vendor_bills(id) ON DELETE SET NULL
);

-- Indexes for job queue processing
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_status ON ocr_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_tenant ON ocr_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_priority ON ocr_jobs(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_created ON ocr_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_review_case ON ocr_jobs(review_case_id);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_vendor_bill ON ocr_jobs(vendor_bill_id);

-- Composite index for queue polling (status + priority + created_at)
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_queue ON ocr_jobs(status, priority DESC, created_at ASC);

-- Index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_file_hash ON ocr_jobs(source_file_hash, tenant_id);
