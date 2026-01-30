-- Migration 018: Vendor Bill Parses Table
-- Creates the vendor_bill_parses table for caching OCR results

-- Vendor bill parses table (OCR cache)
CREATE TABLE IF NOT EXISTS vendor_bill_parses (
    id TEXT PRIMARY KEY,
    vendor_bill_id TEXT NOT NULL,
    
    -- Raw OCR output
    ocr_text TEXT NOT NULL,
    ocr_confidence REAL NOT NULL DEFAULT 0.0,
    
    -- Structured parse result (JSON)
    -- Example: {"header": {"invoice_no": "INV-001", "date": "2024-01-15", ...}, "lines": [...]}
    parsed_json TEXT NOT NULL,
    
    -- Versioning for cache invalidation
    template_id TEXT,
    template_version INTEGER NOT NULL DEFAULT 1,
    ocr_engine TEXT NOT NULL, -- 'tesseract', 'google-vision', 'aws-textract', etc.
    config_hash TEXT NOT NULL, -- Hash of parsing configuration for cache invalidation
    
    -- Timestamp
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Foreign keys
    FOREIGN KEY (vendor_bill_id) REFERENCES vendor_bills(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES vendor_templates(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bill_parses_bill ON vendor_bill_parses(vendor_bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_parses_template ON vendor_bill_parses(template_id);

-- Composite index for cache lookup
-- Cache key: vendor_bill_id + template_version + config_hash
CREATE INDEX IF NOT EXISTS idx_bill_parses_cache ON vendor_bill_parses(vendor_bill_id, template_version, config_hash);
