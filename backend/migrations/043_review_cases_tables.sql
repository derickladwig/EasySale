-- Migration: Create review cases tables
-- Purpose: Support OCR document review workflow

-- Create review cases table
CREATE TABLE IF NOT EXISTS review_cases (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'NeedsReview',
    vendor_id TEXT,
    vendor_name TEXT,
    confidence INTEGER DEFAULT 0,
    source_file_path TEXT NOT NULL,
    source_file_type TEXT,
    extracted_data TEXT, -- JSON blob
    validation_result TEXT, -- JSON blob
    ocr_raw_text TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by TEXT,
    approved_by TEXT,
    approved_at TEXT
);

-- Create decisions table
CREATE TABLE IF NOT EXISTS review_case_decisions (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES review_cases(id),
    field_name TEXT NOT NULL,
    original_value TEXT,
    chosen_value TEXT NOT NULL,
    source TEXT NOT NULL, -- 'ocr', 'user', 'template'
    decided_at TEXT NOT NULL,
    decided_by TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_cases_tenant ON review_cases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_review_cases_state ON review_cases(state);
CREATE INDEX IF NOT EXISTS idx_review_cases_created ON review_cases(created_at);
CREATE INDEX IF NOT EXISTS idx_decisions_case ON review_case_decisions(case_id);
