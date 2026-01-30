-- Migration 017: Vendor Bills Table
-- Creates the vendor_bills table for storing scanned/uploaded vendor invoices

-- Vendor bills table
CREATE TABLE IF NOT EXISTS vendor_bills (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL,
    
    -- Invoice details
    invoice_no TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    po_number TEXT,
    
    -- Financial totals
    subtotal REAL NOT NULL,
    tax REAL NOT NULL,
    total REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    
    -- Status: DRAFT (uploaded), REVIEW (parsed/matched), POSTED (received), VOID (cancelled)
    status TEXT NOT NULL DEFAULT 'DRAFT',
    
    -- File storage
    file_path TEXT NOT NULL,
    file_hash TEXT NOT NULL, -- SHA256 hash for duplicate detection
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    
    -- Idempotency key: hash of vendor_id + invoice_no + invoice_date
    -- Prevents receiving the same invoice twice
    idempotency_key TEXT NOT NULL UNIQUE,
    
    -- Posting information
    posted_at TEXT,
    posted_by TEXT,
    
    -- Multi-tenant isolation
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Foreign keys
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_bills_vendor ON vendor_bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_invoice ON vendor_bills(invoice_no);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_date ON vendor_bills(invoice_date);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_status ON vendor_bills(status);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_tenant ON vendor_bills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_store ON vendor_bills(store_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_idempotency ON vendor_bills(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_hash ON vendor_bills(file_hash);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_posted ON vendor_bills(posted_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_vendor_bills_vendor_status ON vendor_bills(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_tenant_status ON vendor_bills(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_date_status ON vendor_bills(invoice_date, status);
