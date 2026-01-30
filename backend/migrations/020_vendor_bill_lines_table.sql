-- Migration 019: Vendor Bill Lines Table
-- Creates the vendor_bill_lines table for storing individual line items from vendor bills

-- Vendor bill lines table
CREATE TABLE IF NOT EXISTS vendor_bill_lines (
    id TEXT PRIMARY KEY,
    vendor_bill_id TEXT NOT NULL,
    line_no INTEGER NOT NULL,
    
    -- Raw vendor data (as extracted from OCR)
    vendor_sku_raw TEXT NOT NULL,
    vendor_sku_norm TEXT NOT NULL, -- Normalized for matching (uppercase, trimmed, no special chars)
    desc_raw TEXT NOT NULL,
    qty_raw TEXT NOT NULL,
    unit_raw TEXT NOT NULL,
    unit_price_raw TEXT NOT NULL,
    ext_price_raw TEXT NOT NULL,
    
    -- Normalized/parsed values
    normalized_qty REAL NOT NULL,
    normalized_unit TEXT NOT NULL,
    unit_price REAL NOT NULL,
    ext_price REAL NOT NULL,
    
    -- Matching result
    matched_sku TEXT, -- Internal SKU from products table
    match_confidence REAL NOT NULL DEFAULT 0.0, -- 0.0 to 1.0
    match_reason TEXT NOT NULL DEFAULT '', -- Explanation of how match was determined
    
    -- User override flag
    user_overridden INTEGER NOT NULL DEFAULT 0, -- 1 if user manually changed the match
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Foreign keys
    FOREIGN KEY (vendor_bill_id) REFERENCES vendor_bills(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_sku) REFERENCES products(sku) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bill_lines_bill ON vendor_bill_lines(vendor_bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_lines_vendor_sku ON vendor_bill_lines(vendor_sku_norm);
CREATE INDEX IF NOT EXISTS idx_bill_lines_matched ON vendor_bill_lines(matched_sku);
CREATE INDEX IF NOT EXISTS idx_bill_lines_confidence ON vendor_bill_lines(match_confidence);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bill_lines_bill_line ON vendor_bill_lines(vendor_bill_id, line_no);
CREATE INDEX IF NOT EXISTS idx_bill_lines_vendor_sku_matched ON vendor_bill_lines(vendor_sku_norm, matched_sku);
